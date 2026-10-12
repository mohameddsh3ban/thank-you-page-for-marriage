// Collage layer: cut-out roses, clouds, torn paper and lace that overlap the seams between
// chapters, plus drifting petals in the romantic chapters. Purely decorative (aria-hidden).
import { gsap, ScrollTrigger } from './scroll.js';

// section id -> pieces placed inside it. `speed` = parallax drift as the section scrolls by,
// `fly` = how far (px) a cupid travels sideways across the chapter while it is on screen.
const PIECES = {
  numbers: [{ cls: 'd-cupid c-numbers', src: '/art/cupid-bow.webp', speed: -120, fly: 90 }],
  places: [{ cls: 'd-cupid c-places', src: '/art/cupid-arrow.webp', speed: -110, fly: -60 }],
  her: [{ cls: 'd-cupid c-her', src: '/art/cupid-bow.webp', speed: -90, fly: -80 }],
  letter: [
    { cls: 'd-cupid c-letter', src: '/art/cupid-arrow.webp', speed: -80, fly: -60 },
    { cls: 'd-roses d-tl', src: '/art/roses-garland.webp', speed: -70 },
    { cls: 'd-roses d-tr', src: '/art/roses-garland.webp', speed: -40 },
  ],
  thanks: [
    { cls: 'd-knight', src: '/art/knight-rose.webp', speed: 40 },
    { cls: 'd-roses d-bl', src: '/art/roses-garland.webp', speed: 50 },
    { cls: 'd-roses d-br', src: '/art/roses-garland.webp', speed: 80 },
    { cls: 'd-ranunculus', src: '/art/ranunculus.webp', speed: 30 },
  ],
};
const PETAL_SECTIONS = ['letter', 'thanks']; // not the hero: the poster stays clean
const PETAL_COUNT = 11;

function placePieces(reduced) {
  for (const [id, pieces] of Object.entries(PIECES)) {
    const section = document.getElementById(id);
    if (!section) continue;
    for (const p of pieces) {
      const img = document.createElement('img');
      img.className = `decor ${p.cls}`;
      img.src = p.src;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      section.append(img);
      if (!reduced && (p.speed || p.fly)) {
        gsap.fromTo(img, { y: -(p.speed || 0) / 2, x: -(p.fly || 0) / 2 }, {
          y: (p.speed || 0) / 2, x: (p.fly || 0) / 2, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    }
  }
}

// A layered cloud bank at the bottom of the hero: whole cloud pieces (never cropped) at different
// sizes and depths, drifting slowly, melting into the cream of the next chapter.
const CLOUDS = [
  // back row: smaller, higher, softer
  { x: -10, y: 6, w: 46, depth: 30, drift: 'a', o: 0.88 },
  { x: 24, y: 0, w: 50, depth: 45, drift: 'b', o: 0.92 },
  { x: 58, y: 7, w: 48, depth: 35, drift: 'a', o: 0.88 },
  // front row: bigger, lower, brighter — their flat bottoms sink into the fade
  { x: 2, y: 22, w: 44, depth: 80, drift: 'b', o: 1 },
  { x: 36, y: 26, w: 42, depth: 100, drift: 'a', o: 1 },
  { x: 70, y: 21, w: 40, depth: 70, drift: 'b', o: 1 },
]

function cloudBank(reduced) {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const bank = document.createElement('div');
  bank.className = 'cloud-bank';
  bank.setAttribute('aria-hidden', 'true');
  for (const c of CLOUDS) {
    const img = document.createElement('img');
    img.src = '/art/clouds.webp';
    img.alt = '';
    img.decoding = 'async';
    img.className = `cloud drift-${c.drift}`;
    img.style.cssText = `left:${c.x}%;top:${c.y}%;width:${c.w}%;opacity:${c.o}`;
    bank.append(img);
    if (!reduced) {
      gsap.fromTo(img, { y: c.depth * 0.6 }, {
        y: -c.depth * 0.4, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'bottom bottom', end: 'bottom top', scrub: true },
      });
    }
  }
  hero.append(bank);
}

// Seams: one chapter's paper is torn and laid over the next, like a collage. Each tear is generated
// in its chapter's exact tone (scripts/make-tears.mjs) and that edge of the chapter fades to the same
// flat tone (a "feather"), so paper and page never disagree. `from` is the chapter the paper belongs
// to; `dir: 'down'` = it hangs over the next chapter, `'up'` = it rises over the previous one.
// Tears live in #site (not inside the chapters, several of which clip their overflow) and are
// re-placed whenever ScrollTrigger refreshes, since pinned chapters move everything below them.
const TEARS = [
  { seam: 'numbers', from: 'origin', dir: 'down', tone: 'cream', v: 1 },
  // #03 now ends in full night, the same navy #04 starts on, so that seam needs no tear
  { seam: 'years', from: 'years', dir: 'up', tone: 'morning', v: 2 },
  { seam: 'places', from: 'places', dir: 'up', tone: 'night', v: 2 },
  { seam: 'her', from: 'places', dir: 'down', tone: 'night', v: 3 },
  { seam: 'gallery', from: 'her', dir: 'down', tone: 'cream', v: 2 },
  { seam: 'love', from: 'love', dir: 'up', tone: 'night', v: 1 },
  { seam: 'letter', from: 'love', dir: 'down', tone: 'night', v: 2 },
  // a knight's gauntlet offers a rose beside the envelope, its cuff hidden under the torn edge
  { seam: 'thanks', from: 'letter', dir: 'down', tone: 'cream', v: 3,
    rise: { src: '/art/knight-hand.webp', ratio: 1005 / 377, left: 0.13, width: 0.085 } },
];
const TEAR_ASPECT = 150 / 2880;
const TEAR_EDGE = 62 / 150;     // where the torn edge sits in the image, from its paper-less side
const TEAR_REACH = 0.33;        // how far past the seam the edge lands, in tear heights

function tears() {
  const site = document.getElementById('site');
  const placed = [];
  for (const t of TEARS) {
    const seam = document.getElementById(t.seam);
    const from = document.getElementById(t.from);
    if (!seam || !from) continue;
    const feather = document.createElement('div');
    feather.className = `feather feather-${t.dir === 'up' ? 'top' : 'bottom'} tone-${t.tone}`;
    feather.setAttribute('aria-hidden', 'true');
    from.append(feather);
    const img = document.createElement('img');
    img.className = `tear tear-${t.dir}`;
    img.src = `/art/tear-${t.tone}-${t.v}${t.dir === 'down' ? '-down' : ''}.webp`;
    img.alt = '';
    img.decoding = 'async';
    img.setAttribute('aria-hidden', 'true');
    site.append(img);
    let rise = null;
    if (t.rise) { // art that rises from behind this paper's torn edge
      // a clipping window ending just under the torn edge, so the art's cut-off base never shows
      rise = document.createElement('div');
      rise.className = 'tear-rise';
      rise.setAttribute('aria-hidden', 'true');
      const art = document.createElement('img');
      art.src = t.rise.src;
      art.alt = '';
      art.decoding = 'async';
      rise.append(art);
      site.append(rise);
      gsap.fromTo(art, { y: 90 }, {
        y: 0, ease: 'none',
        scrollTrigger: { trigger: seam, start: 'top bottom', end: 'top 45%', scrub: true },
      });
    }
    placed.push({ img, seam, dir: t.dir, rise, art: t.rise, src: img.src });
  }
  const place = () => {
    const h = site.clientWidth * TEAR_ASPECT;
    const base = site.getBoundingClientRect().top + scrollY;
    for (const p of placed) {
      const y = p.seam.getBoundingClientRect().top + scrollY - base;
      const top = p.dir === 'up'
        ? y - TEAR_REACH * h - TEAR_EDGE * h
        : y + TEAR_REACH * h + TEAR_EDGE * h - h;
      p.img.style.top = `${top.toFixed(1)}px`;
      if (p.rise) { // its cut-off bottom sits behind the paper, just under the torn edge
        const w = site.clientWidth * p.art.width, artH = w * p.art.ratio, room = 120; // room for its shadow
        if (p.dir === 'up') { // rising paper: the art stands behind it, its base hidden under the paper
          const baseY = y - TEAR_REACH * h + 0.3 * h;
          p.rise.style.cssText = `left:${(p.art.left * 100).toFixed(2)}%;width:${w.toFixed(1)}px;top:${(baseY - artH - room).toFixed(1)}px;height:${(artH + room).toFixed(1)}px`;
        } else { // hanging paper: the art passes in front of it and is cut exactly along its torn edge
          const x = site.clientWidth * p.art.left, winH = artH + room, winTop = y + TEAR_REACH * h + 0.25 * h - winH; // base reaches past the deepest notch
          const above = top - winTop; // window rows above the tear image are fully shown
          p.rise.style.cssText = `left:${x.toFixed(1)}px;width:${w.toFixed(1)}px;top:${winTop.toFixed(1)}px;height:${winH.toFixed(1)}px;z-index:9;` +
            `--mask:linear-gradient(#000,#000) 0 0/100% ${above.toFixed(1)}px no-repeat,url(${p.src}) ${(-x).toFixed(1)}px ${above.toFixed(1)}px/${site.clientWidth}px ${h.toFixed(1)}px no-repeat`;
          p.rise.classList.add('is-masked');
        }
      }
    }
  };
  place();
  ScrollTrigger.addEventListener('refresh', place);
}

function petals(reduced) {
  if (reduced) return;
  const layer = document.createElement('div');
  layer.className = 'petal-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < PETAL_COUNT; i++) {
    const p = document.createElement('img');
    p.src = `/art/petal-${(i % 6) + 1}.webp`;
    p.alt = '';
    p.className = 'petal';
    p.style.setProperty('--x', `${Math.round(Math.random() * 100)}vw`);
    p.style.setProperty('--drift', `${Math.round(Math.random() * 30 - 15)}vw`);
    p.style.setProperty('--dur', `${(11 + Math.random() * 9).toFixed(1)}s`);
    p.style.setProperty('--delay', `${(-Math.random() * 20).toFixed(1)}s`);
    p.style.setProperty('--size', `${Math.round(28 + Math.random() * 34)}px`);
    p.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    layer.append(p);
  }
  document.body.append(layer);
  const active = new Set();
  for (const id of PETAL_SECTIONS) {
    ScrollTrigger.create({
      trigger: `#${id}`, start: 'top 80%', end: 'bottom 20%',
      onToggle: self => {
        if (self.isActive) active.add(id); else active.delete(id);
        layer.classList.toggle('is-on', active.size > 0);
      },
    });
  }
}

export function initDecor() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  placePieces(reduced);
  cloudBank(reduced);
  tears();
  petals(reduced);
}
