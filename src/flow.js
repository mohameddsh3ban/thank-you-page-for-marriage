// What ties the chapters together: a moon that fills from crescent to full across the whole site,
// the current chapter's name beside it, and a red hairline that draws in as each chapter arrives.
import { ScrollTrigger } from './scroll.js';
import { CONFIG } from './config.js';

const NS = 'http://www.w3.org/2000/svg';

export function chapterName(section) {
  const mark = section.querySelector('.eyebrow');
  if (section.id === 'hero') return `#01 — ${CONFIG.herName}`; // the hero's eyebrow is decorative, the chapter is her
  return (mark?.textContent || '').trim();
}

export function initFlow() {
  const nav = document.createElement('div');
  nav.className = 'moon-nav';
  nav.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  const lit = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 20, cy: 20, r: 17, class: 'moon-lit' }).forEach(([k, v]) => lit.setAttribute(k, v));
  const shade = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 20, cy: 20, r: 17, class: 'moon-shade' }).forEach(([k, v]) => shade.setAttribute(k, v));
  const ring = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 20, cy: 20, r: 18, class: 'moon-ring' }).forEach(([k, v]) => ring.setAttribute(k, v));
  svg.append(lit, shade, ring);
  const label = document.createElement('span');
  label.className = 'moon-label';
  nav.append(svg, label);
  document.body.append(nav);

  // moon phase follows overall progress: shade slides off the lit disc
  ScrollTrigger.create({
    trigger: '#site', start: 'top top', end: 'bottom bottom',
    onUpdate: self => shade.setAttribute('cx', (8 - self.progress * 46).toFixed(2)),
  });

  const sections = [...document.querySelectorAll('#site > section')];
  for (const section of sections) {
    section.querySelector('.eyebrow')?.classList.add('chapter-mark');
    ScrollTrigger.create({
      trigger: section, start: 'top 72%', once: true,
      onEnter: () => section.classList.add('is-arrived'),
    });
    ScrollTrigger.create({
      trigger: section, start: 'top center', end: 'bottom center',
      onToggle: self => {
        if (!self.isActive) return;
        label.textContent = chapterName(section);
        // match the moon's shadow to the chapter's ground, and pick ink that reads on it
        const bg = getComputedStyle(section).backgroundColor;
        const [r, g, b] = (bg.match(/\d+(\.\d+)?/g) || [11, 6, 7]).map(Number);
        const light = (r * 0.299 + g * 0.587 + b * 0.114) > 150;
        nav.style.setProperty('--moon-bg', bg);
        nav.classList.toggle('on-light', light);
        document.body.classList.toggle('ground-light', light); // the scroll rail reads this too
      },
    });
  }
  requestAnimationFrame(() => nav.classList.add('is-on'));
}
