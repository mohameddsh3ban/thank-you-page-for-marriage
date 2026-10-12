import { PHOTOS } from '../content/chapter-photos.js';
import { ScrollTrigger } from '../scroll.js';
import { makeMedia } from '../media.js';

const HER_GRID_MAX = 12;
const TILTS = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3, -4, 2];

export function initHer() {
  const grid = document.getElementById('her-grid');
  const list = PHOTOS.her || [];
  const cameo = document.getElementById('her-cameo');
  if (!list.length) {
    cameo.hidden = true;
    const p = document.createElement('p');
    p.className = 'her-empty';
    p.textContent = 'her photos will hang here · add them to PHOTOS.her';
    grid.append(p);
    return;
  }

  // her portrait in the gold cameo — the first still photo of her
  const portrait = list.find(p => p.type !== 'video') || list[0];
  const img = document.getElementById('her-cameo-photo');
  img.src = portrait.src;
  img.alt = portrait.caption || 'her portrait';
  document.getElementById('her-cameo-cap').textContent = portrait.caption || 'my favourite view';

  // a scrapbook of taped prints; everything else lives in the #08 canvas
  list.filter(p => p !== portrait).slice(0, HER_GRID_MAX).forEach((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'her-print';
    fig.style.setProperty('--tilt', `${TILTS[i % TILTS.length]}deg`);
    fig.append(makeMedia(p, { sizes: '(min-width: 1100px) 24vw, 45vw' }));
    if (p.caption) { const c = document.createElement('figcaption'); c.textContent = p.caption; fig.append(c); }
    grid.append(fig);
    ScrollTrigger.create({ trigger: fig, start: 'top 92%', once: true, onEnter: () => fig.classList.add('is-in') });
  });
}
