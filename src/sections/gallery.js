// #08 — an infinite canvas of every photo (and video, if any).
// Scroll drifts it, drag wanders it (with momentum), it wraps forever. Tiles grow toward the
// centre and fade to grey at the edges (Codrops grid-scroll / skiper79 feel).
// "dive in" lifts the canvas to fill the screen: page scroll freezes, and wheel, drag and
// arrow keys all wander the canvas until esc or "come back up".
import { PHOTOS } from '../content/chapter-photos.js';
import { ScrollTrigger, scrollToY, setScrollLocked } from '../scroll.js';
import { makeMedia } from '../media.js';

const COLS = 8;                 // columns in the repeating base grid
const SCROLL_PAN = 2.4;         // canvas heights travelled over the pinned scroll
const FRICTION = 0.92;          // drag inertia decay per frame
const MIN_SCALE = 0.55;
const PIN_LENGTH = '+=500%';
const DIVE_ZOOM = 1.28;         // how far the canvas leans in while diving (keep in sync with gallery.css)
const WHEEL_GAIN = 1 - FRICTION; // wheel delta -> velocity, so total travel ≈ the wheel delta
const KEY_PUSH = 9;             // velocity added per arrow-key press while diving
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End']);

function allMedia() {
  const seen = new Set();
  const out = [];
  const add = list => list.forEach(p => { if (!seen.has(p.src)) { seen.add(p.src); out.push(p); } });
  add(PHOTOS.us || []);
  add(PHOTOS.her || []);
  Object.keys(PHOTOS.years || {}).sort().forEach(y => add(PHOTOS.years[y]));
  return out;
}

export function initGallery() {
  const section = document.getElementById('gallery');
  const stage = document.getElementById('gallery-stage');
  const items = allMedia();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moving = items.filter(i => i.type === 'video').length;
  document.getElementById('gallery-count').textContent = items.length
    ? `${items.length} of our moments${moving ? ` · ${moving} moving` : ''}`
    : 'no photos yet · add some to fill the wall';
  if (!items.length) return;

  const ROWS = Math.ceil(items.length / COLS);
  const cache = new Map(); // item index -> media element (videos keep their state)
  let cellW = 0, cellH = 0, slots = [];
  let panX = 0, panY = 0, dragX = 0, dragY = 0, velX = 0, velY = 0, scrollY = 0;
  let dragging = false, lastX = 0, lastY = 0, raf = 0, visible = false, diving = false;

  function mediaFor(index) {
    if (!cache.has(index)) {
      const fig = document.createElement('figure');
      fig.className = `g-tile${items[index].type === 'video' ? ' is-video' : ''}`;
      fig.append(makeMedia(items[index], { sizes: '24vw' }));
      if (items[index].caption) {
        const c = document.createElement('figcaption');
        c.textContent = items[index].caption;
        fig.append(c);
      }
      cache.set(index, fig);
    }
    return cache.get(index);
  }

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    cellW = Math.max(200, w / 5.4);
    cellH = cellW * 1.25;
    const cols = Math.ceil(w / cellW) + 2;
    const rows = Math.ceil(h / cellH) + 3;
    stage.querySelectorAll('.g-slot').forEach(s => s.remove());
    slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const slot = document.createElement('div');
        slot.className = 'g-slot';
        slot.style.width = `${cellW}px`;
        slot.style.height = `${cellH}px`;
        stage.prepend(slot);
        slots.push({ el: slot, c, r, item: -1 });
      }
    }
  }

  function frame() {
    if (!dragging) { dragX += velX; dragY += velY; velX *= FRICTION; velY *= FRICTION; }
    panX = dragX;
    panY = dragY + scrollY;
    const w = stage.clientWidth, h = stage.clientHeight;
    const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy);
    // which base-grid cell sits at the top-left slot
    const baseC = Math.floor(-panX / cellW);
    const baseR = Math.floor(-panY / cellH);
    const offX = panX + baseC * cellW;
    const offY = panY + baseR * cellH;
    for (const s of slots) {
      const col = baseC + s.c - 1;
      const row = baseR + s.r - 1;
      const gc = ((col % COLS) + COLS) % COLS;
      const gr = ((row % ROWS) + ROWS) % ROWS;
      const index = (gr * COLS + gc) % items.length;
      // stagger odd columns by half a cell for an organic wall
      const stagger = (((col % 2) + 2) % 2) * cellH * 0.5;
      const x = offX + (s.c - 1) * cellW;
      const y = offY + (s.r - 1) * cellH + stagger;
      if (s.item !== index) {
        s.item = index;
        s.el.replaceChildren(mediaFor(index));
      }
      const d = Math.hypot(x + cellW / 2 - cx, y + cellH / 2 - cy) / maxD;
      const k = Math.min(1, d * 1.15);
      const scale = 1 - k * (1 - MIN_SCALE);
      s.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      s.el.style.setProperty('--fade', k.toFixed(3));
    }
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  // dive in: the canvas fills the screen and becomes the whole world until she comes back up
  function initDive() {
    const pin = section.querySelector('.gallery-pin');
    const diveBtn = document.getElementById('gallery-dive');
    const surfaceBtn = document.getElementById('gallery-surface');

    const enter = () => {
      diving = true;
      velX = velY = 0;
      setScrollLocked(true);
      section.classList.add('is-diving');
      document.documentElement.classList.add('gallery-diving'); // lets page chrome step aside
      surfaceBtn.focus({ preventScroll: true });
    };
    const leave = () => {
      if (!diving) return;
      diving = false;
      velX = velY = 0;
      section.classList.remove('is-diving');
      document.documentElement.classList.remove('gallery-diving');
      setScrollLocked(false);
      diveBtn.focus({ preventScroll: true });
    };

    diveBtn.addEventListener('click', () => {
      if (diving) return;
      // dive from the pinned spot so the canvas never jumps; glide there first if needed
      if (Math.abs(pin.getBoundingClientRect().top) < 2) enter();
      else scrollToY(section.getBoundingClientRect().top + window.scrollY + 1, enter);
    });
    surfaceBtn.addEventListener('click', leave);

    pin.addEventListener('wheel', e => {
      if (!diving) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1; // Firefox reports lines, not pixels
      velX -= (e.shiftKey ? e.deltaY : e.deltaX) * unit * WHEEL_GAIN;
      velY -= (e.shiftKey ? 0 : e.deltaY) * unit * WHEEL_GAIN;
    }, { passive: false });

    addEventListener('keydown', e => {
      if (!diving) return;
      if (e.key === 'Escape') { leave(); return; }
      const push = { ArrowLeft: [KEY_PUSH, 0], ArrowRight: [-KEY_PUSH, 0], ArrowUp: [0, KEY_PUSH], ArrowDown: [0, -KEY_PUSH] }[e.key];
      if (push) { e.preventDefault(); velX += push[0]; velY += push[1]; }
      else if (SCROLL_KEYS.has(e.key) && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
    });
  }

  // drag to wander
  stage.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; velX = velY = 0;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    // while diving the stage is scaled up, so divide to keep the photo under the pointer
    const z = diving ? DIVE_ZOOM : 1;
    const dx = (e.clientX - lastX) / z, dy = (e.clientY - lastY) / z;
    dragX += dx; dragY += dy; velX = dx; velY = dy;
    lastX = e.clientX; lastY = e.clientY;
  });
  const end = () => { dragging = false; stage.classList.remove('is-dragging'); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  initDive();
  layout();
  addEventListener('resize', () => { layout(); });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) frame();
  }).observe(stage);

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: PIN_LENGTH, pin: '.gallery-pin',
    onUpdate: self => { scrollY = reduced ? 0 : -self.progress * stage.clientHeight * SCROLL_PAN; },
  });
}
