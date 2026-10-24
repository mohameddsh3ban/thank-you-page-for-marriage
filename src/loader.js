// The loading screen: a red moon fills from crescent to full while everything downloads, then the
// screen steps aside. It runs twice: before the gate (fonts, gate art, the song) and after the gate
// (the rest of the site, loaded once she is in).

const EASE = 0.14;          // how quickly the shown progress chases the real one, per frame
const SETTLED = 0.0008;
const AWAY_MS = 900;        // keep in sync with .loader.is-away in loader.css
const COMPLETE_MAX_MS = 1400; // the last stretch of the bar never takes longer than this
// the shadow disc (r 17, like the moon) slides off: at 0 a thin crescent shows, at 1 it just clears the rim
const SHADE_FROM = 14, SHADE_TRAVEL = 28;

const KICKERS = { gate: 'a letter for', site: 'a little museum for' };

/** @param {HTMLElement} el the #loader element from index.html */
export function createLoader(el) {
  const fill = el.querySelector('.ld-fill');
  const pct = el.querySelector('.ld-pct');
  const label = el.querySelector('.ld-label');
  const kicker = el.querySelector('.ld-kicker');
  const shade = el.querySelector('.ld-shade');
  const retry = el.querySelector('.ld-retry');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let target = 0, shown = 0, raf = 0;
  let caughtUp = null; // resolves when the shown progress reaches 100%

  function paint() {
    fill.style.transform = `scaleX(${shown.toFixed(4)})`;
    shade.setAttribute('cx', (SHADE_FROM - shown * SHADE_TRAVEL).toFixed(2));
    const n = Math.floor(shown * 100);
    pct.textContent = String(n).padStart(3, '0');
    el.setAttribute('aria-valuenow', String(n));
  }

  function tick() {
    shown += (target - shown) * (reduced ? 1 : EASE);
    if (target - shown < SETTLED) shown = target;
    paint();
    if (shown < target) { raf = requestAnimationFrame(tick); return; }
    raf = 0;
    if (shown >= 1) caughtUp?.resolve();
  }

  return {
    /** @param {'gate' | 'site'} phase */
    show(phase) {
      kicker.textContent = KICKERS[phase] || '';
      label.textContent = '';
      retry.hidden = true;
      target = shown = 0;
      paint();
      el.hidden = false;
      el.setAttribute('aria-busy', 'true');
      void el.offsetWidth; // start the fade-in from the transparent state
      el.classList.remove('is-away');
    },
    /** @param {number} progress 0..1 @param {string} [text] what is loading right now */
    set(progress, text) {
      target = Math.max(target, Math.min(1, progress)); // never runs backwards
      if (text !== undefined && label.textContent !== text) label.textContent = text;
      if (!raf) raf = requestAnimationFrame(tick);
    },
    /** Fill to 100% and wait until the moon is full (or snap there if frames aren't running, e.g. a background tab). */
    complete() {
      let resolve;
      const done = new Promise(r => { resolve = r; });
      caughtUp = { resolve };
      this.set(1);
      if (shown >= 1) resolve();
      setTimeout(() => {
        if (shown >= 1) return;
        cancelAnimationFrame(raf);
        raf = 0;
        shown = 1;
        paint();
        resolve();
      }, COMPLETE_MAX_MS);
      return done;
    },
    /** Fade away. Resolves once it is gone. */
    hide() {
      el.classList.add('is-away');
      el.removeAttribute('aria-busy');
      return new Promise(r => setTimeout(() => { el.hidden = true; r(); }, reduced ? 0 : AWAY_MS));
    },
    /** Something failed: offer a retry instead of a moon that never fills. */
    fail(text, onRetry) {
      label.textContent = text;
      retry.hidden = false;
      retry.onclick = () => { retry.hidden = true; onRetry(); };
      retry.focus({ preventScroll: true });
    },
  };
}
