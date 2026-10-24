// Her phone, the gate: a lock screen with a note from me. A tap, a swipe up or any key opens it
// (and it opens by itself if she just watches); then the phone shows the site downloading, then
// our photo, and src/dive.js flies into it.

const SWIPE_PX = 24;          // an upward drag this long on the lock screen opens it
const AUTO_OPEN_MS = 4200;    // long enough to read the note, short enough that nobody waits
const OPEN_HOLD_MS = 380;     // the lock screen slides away before the download shows
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** @param {HTMLElement} root  #g-phone */
export function createPhone(root) {
  const q = sel => root.querySelector(sel);
  const device = q('#gp-device');
  const screen = q('#gp-screen');
  const fill = q('#gp-load-fill');
  const label = q('#gp-load-label');
  const shade = q('.gp-moon-shade');
  const load = q('#gp-load');
  const retry = q('#gp-retry');
  const home = q('#gp-home');

  let resolveOpened;
  const opened = new Promise(r => { resolveOpened = r; });
  let autoOpen = null;

  // a real clock and date, like her lock screen
  const paintClock = () => {
    const now = new Date();
    q('#gp-time').textContent = TIME.format(now).replace(/\s?[ap]m$/i, '');
    q('#gp-date').textContent = DATE.format(now).replace(',', '');
  };
  paintClock();
  const clock = setInterval(paintClock, 10_000);

  const state = () => root.dataset.state;
  const setState = s => { root.dataset.state = s; };

  function open() {
    if (state() !== 'lock') return;
    clearTimeout(autoOpen);
    clearInterval(clock);
    removeEventListener('keydown', onKey);
    resolveOpened();
  }

  // ---- input: tap the lock screen, swipe it up, or press a key on the laptop ----
  q('#gp-lock').addEventListener('click', open);
  let dragY = null;
  screen.addEventListener('pointerdown', e => { if (state() === 'lock') dragY = e.clientY; });
  screen.addEventListener('pointermove', e => { if (dragY !== null && dragY - e.clientY > SWIPE_PX) { dragY = null; open(); } });
  addEventListener('pointerup', () => { dragY = null; });

  function onKey(e) {
    if (root.hidden || state() !== 'lock' || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    open();
  }
  addEventListener('keydown', onKey);

  return {
    root, device, screen,
    /** Resolves once she has opened the phone (or it opened by itself). */
    opened,
    show() {
      root.hidden = false;
      root.closest('.gate')?.classList.add('has-phone');
      q('#gp-lock').focus({ preventScroll: true });
      autoOpen = setTimeout(open, AUTO_OPEN_MS);
    },
    /** Switch to the download screen. */
    async loading() {
      retry.hidden = true;
      setState('load');
      await sleep(OPEN_HOLD_MS);
    },
    /** @param {number} p 0..1 @param {string} [text] */
    progress(p, text) {
      const v = Math.max(0, Math.min(1, p));
      fill.style.transform = `scaleX(${v.toFixed(4)})`;
      shade.setAttribute('cx', (14 - v * 28).toFixed(2)); // the moon fills from crescent to full
      load.setAttribute('aria-valuenow', String(Math.round(v * 100)));
      if (text && label.textContent !== text) label.textContent = text;
    },
    fail(text, onRetry) {
      label.textContent = text;
      retry.hidden = false;
      retry.onclick = () => { retry.hidden = true; onRetry(); };
      retry.focus({ preventScroll: true });
    },
    /** Our photo lights up the screen. Resolves once it has faded in. */
    async showHome(src, alt = '') {
      home.src = src;
      home.alt = alt;
      try { await home.decode(); } catch { /* it still shows once loaded */ }
      setState('home');
      await sleep(1000);
    },
    get homeImage() { return home; },
  };
}
