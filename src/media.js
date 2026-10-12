// Photo or silent looping video, depending on the item type.
//
// Videos are the most expensive thing on the page: starting one spins up a hardware decoder, and on
// laptop GPUs that freezes the whole page for up to ~0.9s (measured: ~18 serial decode calls on the
// GPU thread per start). So a video only gets its source once it is properly on screen and the page
// has stopped moving, decoders start one at a time, at most MAX_PLAYING play at once, and every other
// video simply shows its poster. Resuming a video that already started is cheap, so that never waits.
import { assetUrl } from './preload.js';

const MAX_PLAYING = 2;
const VISIBLE = 0.6;      // share of a video that must be on screen before it plays
const IDLE_MS = 280;      // no scrolling, wheeling or dragging for this long = the page has settled
const START_GAP_MS = 500; // never start two decoders back to back

const ratios = new Map(); // video -> how much of it is on screen (0..1)
const playing = new Set();
let lastActivity = 0;
let lastStart = -Infinity;
let timer = 0;

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(update, Math.max(0, ms));
}

function update() {
  const now = performance.now();
  const wanted = [...ratios].filter(([, r]) => r >= VISIBLE).sort((a, b) => b[1] - a[1]).slice(0, MAX_PLAYING).map(([v]) => v);
  for (const v of playing) {
    if (!wanted.includes(v)) { v.pause(); playing.delete(v); }
  }
  const play = v => { playing.add(v); v.play().catch(() => playing.delete(v)); };
  // warm videos (decoder already up) resume right away
  for (const v of wanted) if (!playing.has(v) && v.src) play(v);
  // one cold start at a time, once the page is calm and the previous decoder has had its moment
  const cold = wanted.find(v => !playing.has(v) && !v.src);
  if (!cold) return;
  const wait = Math.max(IDLE_MS - (now - lastActivity), START_GAP_MS - (now - lastStart));
  if (wait > 0) { schedule(wait); return; }
  cold.src = cold.dataset.src;
  lastStart = now;
  play(cold);
  if (wanted.some(v => !v.src)) schedule(START_GAP_MS);
}

const io = new IntersectionObserver(entries => {
  for (const e of entries) ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
  schedule(0);
}, { threshold: [0, VISIBLE, 0.9] });

// anything that moves the page counts as activity (the gallery canvas drags without scrolling)
const busy = () => { lastActivity = performance.now(); schedule(IDLE_MS); };
addEventListener('scroll', busy, { passive: true, capture: true });
addEventListener('wheel', busy, { passive: true });
addEventListener('pointermove', e => { if (e.buttons) busy(); }, { passive: true });
addEventListener('keydown', busy, { passive: true });

/** @param {{ type?: string, src: string, thumb?: string, caption?: string }} item */
export function makeMedia(item, { sizes = '(min-width: 1100px) 30vw, 50vw' } = {}) {
  if (item.type === 'video') {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (item.thumb) v.poster = item.thumb;
    // no src yet (any src makes the browser spin up a decoder); the in-memory copy from the loading
    // screen is attached when the video is about to play, so it still starts instantly
    v.dataset.src = assetUrl(item.src);
    v.setAttribute('aria-label', item.caption || 'a moment of us');
    io.observe(v);
    return v;
  }
  const img = document.createElement('img');
  // thumb (480px) for small tiles, full (1400px) for big tiles / retina — the browser picks
  img.src = item.thumb || item.src;
  if (item.thumb) { img.srcset = `${item.thumb} 480w, ${item.src} 1400w`; img.sizes = sizes; }
  img.alt = item.caption || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}
