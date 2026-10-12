// #03 — Us, in numbers. A pinned night: the sky darkens and the stars come out (one for every 100 messages),
// then the same stars rearrange into a picture for each number (numbers-stars.js) while its figure rolls in
// on an odometer beside it. Everything is scrubbed by the scroll, so scrolling back rewinds it.
import { SCENES, SKY } from '../content/stats.js';
import { ScrollTrigger } from '../scroll.js';
import { createStarSky } from './numbers-stars.js';
import { el, odometer, fmt } from './numbers-odo.js';
import { createNumbersPhone } from './numbers-phone.js';
import { initPhoneFlight } from './numbers-fly.js';

const PIN_PER_SCENE = 110; // % of the viewport height each scene gets
const INTRO_VH = 120; // % of the viewport height before the first number (the phone opens my chat there)
const PIN_TOTAL = SCENES.length * PIN_PER_SCENE + INTRO_VH;
const INTRO = INTRO_VH / PIN_TOTAL; // the title alone, before the first number
const NIGHT_TO = 0.12; // the sky is fully dark by the end of the first scene
const NIGHT_INK = 0.5; // past this much night the type turns cream
const HER_AVATAR = '/photos/mm-19.t.webp';

function duelBar(d) {
  const wrap = el('div', 'duel');
  wrap.style.setProperty('--her', (d.her / (d.her + d.him)).toFixed(3));
  const bar = el('span', 'duel-bar');
  bar.append(el('i', 'db-her'), el('i', 'db-me'));
  wrap.append(el('span', 'duel-you', `you ${fmt.format(d.her)}`), bar, el('span', 'duel-me', `me ${fmt.format(d.him)}`));
  return wrap;
}

function buildScene(s, i) {
  const li = el('li', `num-scene scene-${s.key}`);
  li.setAttribute('aria-label', `${fmt.format(s.n)}${s.suffix || ''} ${s.label}`);
  const text = el('div', 'ns-text');
  const odo = odometer(s.n, s.suffix);
  text.append(el('p', 'ns-eyebrow', `03.${i + 1} — ${s.eyebrow}`), odo.root, el('p', 'ns-label', s.label), el('p', 'ns-note', s.note));
  if (s.duel) text.append(duelBar(s.duel));
  if (s.facts) {
    const facts = el('dl', 'ns-facts');
    for (const [v, t] of s.facts) { const d = el('div'); d.append(el('dt', '', t), el('dd', '', v)); facts.append(d); }
    text.append(facts);
  }
  li.append(text);
  return { li, odo };
}

/** The call scene's centre: her photo and a timer that has passed the call hours and keeps going. */
const herPhoto = () => HER_AVATAR;

function callOverlay(scene) {
  const box = document.getElementById('num-call');
  const timer = document.getElementById('num-call-timer');
  const avatar = herPhoto();
  if (avatar) box.querySelector('img').src = avatar;
  let tick = 0;
  let secs = 0;
  const show = () => {
    const m = Math.floor(secs / 60) % 60;
    timer.textContent = `${scene.n + Math.floor(secs / 3600)}:${String(m).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  };
  return {
    start() { clearInterval(tick); secs = 0; show(); tick = setInterval(() => { secs += 1; show(); }, 1000); },
    stop() { clearInterval(tick); },
  };
}

const clamp01 = v => Math.min(1, Math.max(0, v));

export function initNumbers() {
  const section = document.getElementById('numbers');
  const list = document.getElementById('num-scenes');
  const nowEl = document.getElementById('num-now');
  const barEl = document.getElementById('num-bar');
  const legend = document.getElementById('num-legend');
  document.getElementById('num-all').textContent = String(SCENES.length).padStart(2, '0');
  const scenes = SCENES.map(buildScene);
  list.append(...scenes.map(s => s.li));

  // the moon rises as the sky darkens (opacity and lift follow --dark in numbers.css)
  const moon = el('img', 'num-moon');
  Object.assign(moon, { src: '/art/num-moon.webp', alt: '', decoding: 'async' });
  moon.setAttribute('aria-hidden', 'true');
  section.querySelector('.num-canvas').before(moon);
  // painted layers around the stars: the milky way's glow behind them, our hill in front of them
  const layer = (cls, src) => {
    const img = el('img', cls);
    Object.assign(img, { src, alt: '', decoding: 'async' });
    img.setAttribute('aria-hidden', 'true');
    return img;
  };
  moon.before(layer('num-glow', '/art/num-milkyway.webp'));
  section.querySelector('.num-canvas').after(layer('num-horizon', '/art/num-horizon.webp'));

  const sky = createStarSky(document.getElementById('num-canvas'), { ...SKY, order: SCENES.map(s => s.key) });
  // overlays (legend, call) sit on the same stage as the star pictures
  const placeOverlays = () => {
    const g = sky.geometry();
    if (!g) return;
    section.style.setProperty('--sx', `${g.cx}px`);
    section.style.setProperty('--sy', `${g.cy}px`);
    section.style.setProperty('--ss', `${g.s}px`);
  };
  sky.onResize(placeOverlays);
  placeOverlays();
  const call = callOverlay(SCENES.find(s => s.key === 'calls'));
  // the numbers themselves live on her phone (#02's phone, carried over); the text list stays for screen readers
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noPhone = reduced || (import.meta.env.DEV && new URLSearchParams(location.search).has('nophone')); // dev: A/B without it
  const phone = noPhone ? null : createNumbersPhone({ avatarSrc: herPhoto() });
  if (phone) {
    document.body.append(phone.root);
    section.classList.add('has-phone');
    phone.setScene(-1);
    phone.setIntro(0);
  }

  let active = -2;
  const activate = idx => {
    if (idx === active) return;
    scenes.forEach((s, i) => {
      s.li.classList.toggle('is-on', i === idx);
      s.li.classList.toggle('is-past', i < idx);
      if (i === idx) s.odo.set(true); else if (i === active) s.odo.set(false);
    });
    const key = SCENES[idx]?.key || '';
    section.dataset.scene = key;
    legend.classList.remove('is-in');
    if (idx >= 0) {
      requestAnimationFrame(() => { legend.textContent = SCENES[idx].legend; legend.classList.add('is-in'); });
      nowEl.textContent = String(idx + 1).padStart(2, '0');
    }
    if (key === 'calls') call.start(); else call.stop();
    phone?.setScene(idx);
    active = idx;
  };

  section.addEventListener('pointermove', e => {
    const rect = section.querySelector('.num-canvas').getBoundingClientRect();
    sky.pointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  });
  section.addEventListener('pointerleave', () => sky.pointer(null));

  if (reduced) {
    section.classList.add('is-static', 'is-docked', 'is-night');
    section.style.setProperty('--dark', '1');
    scenes.forEach(s => { s.li.classList.add('is-on'); s.odo.set(true); });
    sky.set(0.99); // just the sky of stars, still
    sky.start();
    return;
  }

  const setProgress = p => {
    section.classList.toggle('is-docked', p > INTRO * 0.6);
    const night = clamp01(p / NIGHT_TO);
    section.style.setProperty('--dark', night.toFixed(3));
    section.classList.toggle('is-night', night > NIGHT_INK);
    const t = (p - INTRO) / (1 - INTRO);
    sky.set(t < 0 ? -1 : Math.min(scenes.length - 0.001, t * scenes.length));
    activate(t < 0 ? -1 : Math.min(scenes.length - 1, Math.floor(t * scenes.length)));
    barEl.style.transform = `scaleX(${clamp01(t).toFixed(3)})`;
  };
  setProgress(0);

  const pin = ScrollTrigger.create({
    id: 'numbers-pin', trigger: section, start: 'top top', end: `+=${PIN_TOTAL}%`,
    pin: section.querySelector('.num-pin'), scrub: true,
    onUpdate: self => setProgress(self.progress),
  });
  const originPin = ScrollTrigger.getById('origin-pin');
  if (phone && originPin) initPhoneFlight(phone, { originPin, numbersPin: pin, introShare: INTRO });
  // keep drawing while the chapter is anywhere on screen (also just before and after the pin)
  new IntersectionObserver(([e]) => (e.isIntersecting ? sky.start() : sky.stop())).observe(section);
}
