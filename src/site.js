// Everything behind the gate. Built into /assets/private/ and loaded once her phone opens.
import { CONFIG, paintNames } from './config.js';
import { initScroll, ScrollTrigger } from './scroll.js';
export { gsap, setScrollLocked } from './scroll.js'; // the gate holds the hero's entrance (and the scroll) until it has flown in
import { initHero } from './sections/hero.js';
import { initOrigin } from './sections/origin.js';
import { initNumbers } from './sections/numbers.js';
import { initDays } from './sections/days.js';
import { initLetter } from './sections/letter.js';
import { initThanks } from './sections/thanks.js';
import { initYears } from './sections/years.js';
import { initPlaces } from './sections/places.js';
import { initHer } from './sections/her.js';
import { initGallery } from './sections/gallery.js';
import { initLove } from './sections/love.js';
import { initFlow } from './flow.js';
import { initDecor } from './decor.js';
import { initRail } from './rail.js';
import { initSpeedNote } from './speed-note.js';
import './decor.css';
import './rail.css';
import './speed-note.css';
import './sections/gallery.css';
import './sections/years.css';
import './sections/places.css';
import './sections/her.css';
import './sections/hero.css';
import './sections/origin.css';
import './sections/numbers.css';
import './sections/days.css';
import './sections/love.css';
import './sections/letter.css';
import './sections/thanks.css';

function startCounter() {
  const since = new Date(CONFIG.metOn).getTime();
  const cells = Object.fromEntries([...document.querySelectorAll('#hero [data-unit]')].map(el => [el.dataset.unit, el]));
  if (!cells.days || !cells.hours || !cells.minutes || !cells.seconds) return; // no counter in the hero
  const fmt = new Intl.NumberFormat('en');
  const tick = () => {
    const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
    cells.days.textContent = fmt.format(Math.floor(s / 86400));
    cells.hours.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    cells.minutes.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
    cells.seconds.textContent = String(s % 60).padStart(2, '0');
  };
  tick();
  setInterval(tick, 1000);
}

/** @param {object | null} song */
/** @param {{ arrival?: 'phone' }} [opts] arrival 'phone': the hero's photo flies in from her phone */
export function startSite(song, opts = {}) {
  paintNames(document.getElementById('site')); // [data-her-name], [data-from-name], [data-script-name] in the chapters
  startCounter();
  initScroll();
  const safe = (name, fn) => { try { const r = fn(); r?.catch?.(err => console.error(name, err)); } catch (err) { console.error(name, err); } };
  safe('hero', () => initHero(song, opts));
  safe('origin', () => initOrigin());
  safe('numbers', () => initNumbers());
  safe('days', () => initDays());
  safe('years', () => initYears());
  safe('places', () => initPlaces());
  safe('her', () => initHer());
  safe('gallery', () => initGallery());
  safe('love', () => initLove());
  safe('letter', () => initLetter());
  safe('thanks', () => initThanks(song));
  safe('flow', () => initFlow());
  safe('decor', () => initDecor());
  safe('rail', () => initRail(song));
  safe('speed note', () => initSpeedNote());
  requestAnimationFrame(() => ScrollTrigger.refresh());

  // Lazy photos/videos change the page height as they load; re-measure every trigger when that
  // settles, otherwise chapter labels, reveals and the final-chorus sync fire at stale positions.
  let refreshTimer = 0;
  let lastHeight = 0;
  new ResizeObserver(() => {
    const h = document.getElementById('site').offsetHeight;
    if (Math.abs(h - lastHeight) < 40) return;
    lastHeight = h;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), REFRESH_DEBOUNCE_MS);
  }).observe(document.getElementById('site'));
}

const REFRESH_DEBOUNCE_MS = 350;
