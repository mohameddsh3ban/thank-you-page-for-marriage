// When she scrolls much faster than the page can follow, a little note from me drops in asking her
// to slow down, and the page itself slows a bit more while it's up. scroll.js decides what counts
// as rushing; this only shows the note (at most once per COOLDOWN_MS) and lets it go again.
import { onScrollRush, setScrollCalm } from './scroll.js';
import { CONFIG } from './config.js';

const SHOW_MS = 6500;        // how long it stays (a thin line counts it down)
const COOLDOWN_MS = 30000;   // never nag: at most one note per half minute
const CALM_WHILE_SHOWN = 0.55;
const LINES = [
  'this took me hundreds of hours to make',
  'every point here is made with love and passion',
  'please enjoy its details and look closely',
];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function initSpeedNote() {
  const note = el('aside', 'speed-note');
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');
  note.hidden = true;
  // one line each, in my words
  const body = el('p', 'sn-body');
  for (const line of LINES) body.append(el('span', '', line));
  const close = el('button', 'sn-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the note');
  note.append(
    el('p', 'sn-kicker', 'a little request'),
    el('p', 'sn-title', `slow down, ${CONFIG.herName.toLowerCase()}`),
    body,
    el('p', 'sn-sign', `— ${CONFIG.fromName.toLowerCase()} ♥`),
    el('i', 'sn-timer'),
    close,
  );
  document.body.append(note);

  let hideTimer = 0;
  let lastShown = -Infinity;
  const hide = () => {
    clearTimeout(hideTimer);
    note.classList.remove('is-in');
    setScrollCalm(1);
    setTimeout(() => { if (!note.classList.contains('is-in')) note.hidden = true; }, 700);
  };
  const show = () => {
    const now = performance.now();
    if (now - lastShown < COOLDOWN_MS || note.classList.contains('is-in')) return;
    lastShown = now;
    note.hidden = false;
    void note.offsetWidth; // start the entrance from its resting state
    note.classList.add('is-in');
    note.style.setProperty('--show-ms', `${SHOW_MS}ms`);
    setScrollCalm(CALM_WHILE_SHOWN);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, SHOW_MS);
  };
  close.addEventListener('click', hide);
  addEventListener('keydown', e => { if (e.key === 'Escape' && note.classList.contains('is-in')) hide(); });
  onScrollRush(show);
}
