// The scrollbar, rebuilt as part of the page: the frame's right hairline is the track, a star
// rides it (spinning as she scrolls, swelling with speed, breathing with the song), every chapter
// is a tick she can jump to, and dragging the star scrubs through the whole story.
import { gsap, ScrollTrigger, scrollDrag, scrollToEl, isScrollLocked, scrollVelocity } from './scroll.js';
import { chapterName } from './flow.js';

const NS = 'http://www.w3.org/2000/svg';
// the star the hands hold in #01, with a fuller waist so it still reads as a star at 22px
const STAR_PATH = 'M0-50 10-10 50 0 10 10 0 50-10 10-50 0-10-10Z';
const IDLE_MS = 1500;
const SPIN_DEG_PER_PX = 0.12;
const SWELL_AT_SPEED = 60; // px per frame where the star reaches its full swell
const SWELL = 0.35;
const TAIL_PX_PER_SPEED = 2.6;
const TAIL_MAX_PX = 120; // keep in sync with .rail-tail height in rail.css
const RELEASE_HOLD_MS = 900; // after a drag, the star waits for the page to catch up

const clamp01 = v => Math.min(1, Math.max(0, v));
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
const el = (tag, className) => Object.assign(document.createElement(tag), { className });

function splitChapter(section) {
  const [num = '', ...rest] = chapterName(section).split('—');
  return { num: num.replace('#', '').trim(), name: rest.join('—').trim() };
}

/** A museum placard: tiny chapter number over the chapter name in script. */
function fillPlacard(placard, num, name) {
  const no = el('small', 'rail-no');
  no.textContent = num ? `N°${num}` : '';
  placard.replaceChildren(no, document.createTextNode(name));
}

function buildStar() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.append(path);
  return svg;
}

/** @param {{ playing?: boolean, energy?: () => number } | null} song */
export function initRail(song) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rail = el('div', 'scroll-rail');
  rail.setAttribute('aria-hidden', 'true'); // keyboard and wheel scrolling still work natively
  const line = el('div', 'rail-line');
  const fill = el('div', 'rail-fill');
  const tickList = el('ol', 'rail-ticks');
  const star = el('div', 'rail-star');
  const tail = el('span', 'rail-tail');
  const glyph = buildStar();
  const scrub = el('span', 'rail-scrub');
  star.append(tail, glyph, scrub);
  rail.append(line, fill, tickList, star);

  const marks = [...document.querySelectorAll('#site > section')]
    .map(section => ({ section, ...splitChapter(section), top: 0, at: 0 }))
    .filter(m => m.num);
  for (const m of marks) {
    m.li = el('li', 'rail-tick');
    const num = el('span', 'rail-num');
    num.textContent = m.num;
    const name = el('span', 'rail-name');
    fillPlacard(name, m.num, m.name);
    m.li.append(num, name);
    m.li.addEventListener('click', () => scrollToEl(m.section));
    tickList.append(m.li);
  }
  document.body.append(rail);
  document.documentElement.classList.add('has-rail'); // hides the native bar only once this exists

  let trackH = 0;
  function layout() {
    trackH = line.getBoundingClientRect().height;
    const max = maxScroll();
    for (const m of marks) {
      m.top = m.section.getBoundingClientRect().top + scrollY;
      m.at = clamp01(m.top / max);
      m.li.style.setProperty('--at', m.at.toFixed(4));
    }
  }
  ScrollTrigger.addEventListener('refresh', layout);
  addEventListener('resize', layout);
  layout();

  /* ---- dragging: the star follows the pointer, the page glides after it ---- */
  let dragP = null;
  let holdP = null;
  let holdUntil = 0;
  const pointerP = e => {
    const r = line.getBoundingClientRect();
    return clamp01((e.clientY - r.top) / r.height);
  };
  const drag = e => {
    dragP = pointerP(e);
    scrollDrag(dragP * maxScroll());
  };
  const endDrag = () => {
    if (dragP === null) return;
    holdP = dragP;
    holdUntil = performance.now() + RELEASE_HOLD_MS;
    dragP = null;
    rail.classList.remove('is-dragging');
    document.body.classList.remove('is-rail-dragging');
  };
  rail.addEventListener('pointerdown', e => {
    if (e.button !== 0 || isScrollLocked() || e.target.closest('.rail-tick')) return; // ticks are jumps
    e.preventDefault();
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('is-dragging');
    document.body.classList.add('is-rail-dragging');
    drag(e);
  });
  rail.addEventListener('pointermove', e => { if (dragP !== null) drag(e); });
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('lostpointercapture', endDrag);

  /* ---- every frame: place the star, the fill, the tail and the chapter marks ---- */
  let lastY = -1;
  let lastActive = 0;
  let scrubName = '';
  gsap.ticker.add(() => {
    const now = performance.now();
    const y = scrollY;
    const max = maxScroll();
    const v = scrollVelocity();
    if (holdP !== null && (now > holdUntil || Math.abs(y - holdP * max) < 2)) holdP = null;
    const p = dragP ?? holdP ?? clamp01(y / max);

    if (y !== lastY || dragP !== null || Math.abs(v) > 0.3) lastActive = now;
    lastY = y;
    rail.classList.toggle('is-active', now - lastActive < IDLE_MS);
    rail.classList.toggle('is-hidden', isScrollLocked() || document.body.classList.contains('is-love-open'));

    fill.style.transform = `translateX(-50%) scaleY(${p.toFixed(4)})`;
    star.style.transform = `translate3d(0, ${(p * trackH).toFixed(1)}px, 0)`;
    if (!reduce) {
      const swell = 1 + Math.min(Math.abs(v) / SWELL_AT_SPEED, 1) * SWELL;
      const beat = song?.playing ? 1 + (song.energy?.() ?? 0) * 0.3 : 1;
      glyph.style.transform = `rotate(${(y * SPIN_DEG_PER_PX) % 360}deg) scale(${(swell * beat).toFixed(3)})`;
      tail.style.transform = `translateX(-50%) scaleY(${(Math.min(Math.abs(v) * TAIL_PX_PER_SPEED, TAIL_MAX_PX) / TAIL_MAX_PX).toFixed(3)})`;
      tail.classList.toggle('is-up', v < 0);
    }

    const probe = y + innerHeight / 2;
    let here = -1;
    marks.forEach((m, i) => {
      const past = m.top <= probe;
      m.li.classList.toggle('is-past', past);
      if (past) here = i;
    });
    marks.forEach((m, i) => m.li.classList.toggle('is-here', i === here));

    if (dragP !== null) {
      const over = marks.filter(m => m.at <= dragP + 0.002).pop();
      const name = over?.name || '';
      if (name !== scrubName) { scrubName = name; fillPlacard(scrub, over?.num, name); }
    }
  });
}
