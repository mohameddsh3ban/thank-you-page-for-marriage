// Her phone, the gate: a lock screen with a note from me, then the iOS passcode pad. The code is
// only ever checked by the server (see verify.js). After the right code the phone shows the
// site downloading, then our photo, and src/dive.js flies into it.

const CODE_LENGTH = 4;
const WRONG_RESET_MS = 520;    // the dots shake, then empty
const UNLOCKED_HOLD_MS = 650;  // all four dots stay lit for a beat before the pad lets go
const SWIPE_PX = 24;           // an upward drag this long on the lock screen opens the pad
const KEY_FLASH_MS = 140;
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

/**
 * @param {HTMLElement} root  #g-phone
 * @param {{ check(code: string): Promise<boolean>, replies: string[], onTry?(): void, onMiss?(): void }} opts
 *   onTry runs inside the tap or key press that completes the code; onMiss after a wrong one.
 */
export function createPhone(root, { check, replies, onTry, onMiss }) {
  const q = sel => root.querySelector(sel);
  const device = q('#gp-device');
  const screen = q('#gp-screen');
  const dots = [...q('#gp-dots').children];
  const del = q('#gp-del');
  const hint = q('#gp-hint');
  const count = q('#gp-count');
  const pass = q('#gp-pass');
  const fill = q('#gp-load-fill');
  const label = q('#gp-load-label');
  const shade = q('.gp-moon-shade');
  const load = q('#gp-load');
  const retry = q('#gp-retry');
  const home = q('#gp-home');

  let code = '';
  let busy = false;
  let misses = 0;
  let resolveUnlocked;
  const unlocked = new Promise(r => { resolveUnlocked = r; });

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

  function paintDots() {
    dots.forEach((d, i) => d.classList.toggle('is-on', i < code.length));
    del.textContent = code.length ? 'Delete' : 'Cancel';
    count.textContent = code.length ? `${code.length} of ${CODE_LENGTH}` : '';
  }

  function openPad() {
    if (state() !== 'lock') return;
    setState('pass');
    hint.textContent = '';
    q('.gp-key[data-digit="1"]').focus({ preventScroll: true });
  }

  async function press(digit) {
    if (busy || code.length >= CODE_LENGTH) return;
    code += digit;
    paintDots();
    if (code.length === CODE_LENGTH) await submit();
  }

  function back() {
    if (busy) return;
    if (!code.length) { setState('lock'); q('#gp-lock').focus({ preventScroll: true }); return; }
    code = code.slice(0, -1);
    paintDots();
  }

  async function submit() {
    busy = true;
    pass.classList.add('is-busy');
    onTry?.();
    let ok = false;
    try {
      ok = await check(code);
    } catch (err) {
      console.error(err);
      hint.textContent = 'something went wrong · try once more';
    }
    if (ok) {
      await sleep(UNLOCKED_HOLD_MS);
      clearInterval(clock);
      resolveUnlocked();
      return;
    }
    onMiss?.();
    replay(q('#gp-dots'), 'is-wrong');
    replay(device, 'is-buzz');
    if (!hint.textContent.startsWith('something')) {
      hint.textContent = replies[misses % replies.length];
      replay(hint, 'is-new');
    }
    misses += 1;
    await sleep(WRONG_RESET_MS);
    code = '';
    paintDots();
    busy = false;
    pass.classList.remove('is-busy');
  }

  // ---- input: tap the keys, or type on the laptop's keyboard ----
  q('#gp-lock').addEventListener('click', openPad);
  let dragY = null;
  screen.addEventListener('pointerdown', e => { if (state() === 'lock') dragY = e.clientY; });
  screen.addEventListener('pointermove', e => { if (dragY !== null && dragY - e.clientY > SWIPE_PX) { dragY = null; openPad(); } });
  addEventListener('pointerup', () => { dragY = null; });
  root.querySelectorAll('.gp-key').forEach(k => k.addEventListener('click', () => press(k.dataset.digit)));
  del.addEventListener('click', back);

  function onKey(e) {
    if (root.hidden || !['lock', 'pass'].includes(state())) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      openPad();
      const k = q(`.gp-key[data-digit="${e.key}"]`);
      k.classList.add('is-down');
      setTimeout(() => k.classList.remove('is-down'), KEY_FLASH_MS);
      press(e.key);
    } else if (e.key === 'Backspace' && state() === 'pass') {
      e.preventDefault();
      back();
    } else if (state() === 'lock' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp')) {
      e.preventDefault();
      openPad();
    }
  }
  addEventListener('keydown', onKey);

  return {
    root, device, screen,
    /** Resolves once the right code is in and the server has let her through. */
    unlocked,
    show() {
      root.hidden = false;
      root.closest('.gate')?.classList.add('has-phone');
    },
    /** Switch to the download screen. */
    loading() {
      removeEventListener('keydown', onKey);
      retry.hidden = true;
      setState('load');
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
