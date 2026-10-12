// #05 — the years: a pinned horizontal scroll, one panel per year (content/chapters.js), each with
// its moon, its moments and a mosaic of that year's photos.
import { CHAPTERS } from '../content/chapters.js';
import { PHOTOS } from '../content/chapter-photos.js';
import { gsap, ScrollTrigger } from '../scroll.js';
import { makeMedia } from '../media.js';
import KEEPSAKES from '../content/keepsakes.json';

const MAX_PHOTOS = 9;
const MAX_PRINTS = 3; // taped prints around a keepsake frame (positions in years.css)
// the framed label for a year without photos: its chapter's memento ({ date, line }), if any
const MEMENTO = Object.fromEntries(CHAPTERS.filter(ch => ch.memento).map(ch => [ch.year, ch.memento]));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Moon for phase 0 (thin crescent) … 6 (full), drawn as two circles. */
function moon(phase) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'moon');
  svg.setAttribute('aria-hidden', 'true');
  const lit = document.createElementNS(NS, 'circle');
  lit.setAttribute('cx', '20'); lit.setAttribute('cy', '20'); lit.setAttribute('r', '18');
  lit.setAttribute('fill', '#C3182B'); // --red
  svg.append(lit);
  if (phase < 6) {
    const shade = document.createElementNS(NS, 'circle');
    shade.setAttribute('cx', String(20 - 6 - phase * 5.5)); shade.setAttribute('cy', '20'); shade.setAttribute('r', '18');
    shade.setAttribute('fill', '#F1E1E5'); // the blush of the daylight wash
    svg.append(shade);
  }
  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('cx', '20'); ring.setAttribute('cy', '20'); ring.setAttribute('r', '18.5');
  ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#C3182B'); ring.setAttribute('stroke-width', '1');
  svg.append(ring);
  return svg;
}

/** A year with no photos in PHOTOS.years: its first keepsake (keepsakes.json) is framed in gold, the rest are taped prints around it. */
function keepsakeCollage(year) {
  const box = el('div', 'yp-photos is-keepsake');
  const [cover, ...prints] = KEEPSAKES[year] || [];
  const memento = el('figure', 'yp-memento');
  if (cover) {
    const opening = el('div', 'yp-mat has-photo');
    opening.append(makeMedia(cover, { sizes: '30vw' }));
    memento.append(opening);
  } else {
    const mat = el('div', 'yp-mat');
    mat.append(el('span', 'yp-mat-date', MEMENTO[year]?.date || String(year)), el('span', 'yp-mat-line', MEMENTO[year]?.line || ''));
    memento.append(mat);
  }
  const frame = el('img', 'yp-mat-frame'); frame.src = '/art/gold-frame.webp'; frame.alt = '';
  const roses = el('img', 'yp-mat-roses'); roses.src = '/art/roses-garland.webp'; roses.alt = '';
  memento.append(frame, roses);
  if (cover) { // the museum label under the frame
    const label = el('figcaption', 'yp-label');
    label.append(el('span', 'yp-mat-date', MEMENTO[year]?.date || String(year)), el('span', 'yp-mat-line', MEMENTO[year]?.line || ''));
    memento.append(label);
  }
  box.append(memento);
  prints.slice(0, MAX_PRINTS).forEach((p, i) => {
    const print = el('figure', `yp-print yp-print-${i + 1}`);
    print.append(makeMedia(p, { sizes: '15vw' }));
    box.append(print);
  });
  return box;
}

function photoGrid(year) {
  const list = (PHOTOS.years[year] || []).slice(0, MAX_PHOTOS);
  if (!list.length) return keepsakeCollage(year);
  const box = el('div', 'yp-photos');
  list.forEach((p, i) => {
    const fig = el('figure', 'yp-photo');
    fig.append(makeMedia(p, { sizes: i === 0 ? '40vw' : '15vw' })); // first tile is the big one
    if (p.caption) fig.append(el('figcaption', '', p.caption));
    box.append(fig);
  });
  return box;
}

export function initYears() {
  const track = document.getElementById('years-track');
  const ticks = document.getElementById('years-ticks');
  if (!track || !ticks || !CHAPTERS.length) return;
  for (const ch of CHAPTERS) {
    const panel = el('article', 'year-panel');
    panel.setAttribute('aria-label', `${ch.year} — ${ch.title}`);
    const text = el('div', 'yp-text');
    const row = el('div', 'yp-title-row');
    row.append(moon(ch.moon), el('h3', 'yp-title', ch.title));
    const list = el('ol', 'yp-moments');
    for (const [when, what] of ch.moments) {
      const li = el('li');
      li.append(el('time', '', when), el('span', '', what));
      list.append(li);
    }
    text.append(el('p', 'yp-year', String(ch.year)), row, el('p', 'yp-line', ch.line), list);
    panel.append(text, photoGrid(ch.year));
    track.append(panel);
    ticks.append(el('li', '', String(ch.year)));
  }

  const tickEls = [...ticks.children];
  const setTick = p => {
    const i = Math.min(tickEls.length - 1, Math.round(p * (tickEls.length - 1)));
    tickEls.forEach((t, j) => t.classList.toggle('is-on', j <= i));
  };
  setTick(0);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.style.overflowX = 'auto';
    return;
  }
  const distance = () => track.scrollWidth - window.innerWidth;
  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#years', start: 'top top', end: () => `+=${distance()}`,
      pin: '.years-pin', scrub: 0.6, invalidateOnRefresh: true,
      // each year settles fully in view instead of resting between two panels
      snap: { snapTo: 1 / (CHAPTERS.length - 1), duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
      onUpdate: self => setTick(self.progress),
    },
  });
  // photos load lazily as panels slide in
  ScrollTrigger.refresh();
}
