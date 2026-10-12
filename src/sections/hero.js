import { PHOTOS } from '../content/chapter-photos.js';
import { gsap } from '../scroll.js';

/** Runs `onVisible`/`onHidden` as the element enters/leaves the viewport. */
export function whenVisible(el, onVisible, onHidden) {
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? onVisible() : onHidden?.()), { rootMargin: '100px' });
  io.observe(el);
  return () => io.disconnect();
}

/** The panel photo: the first "us" still (put your favourite first in PHOTOS.us), else the first of her. */
function heroPhoto() {
  return (PHOTOS.us || []).find(p => p.type !== 'video') || (PHOTOS.her || []).find(p => p.type !== 'video');
}

// How far apart the fingertips start (px each side) before scrolling brings them together.
const REACH_PX = 46;

/**
 * @param {{ energy(): number } | null} song
 * @param {{ arrival?: 'phone' }} [opts] arrival 'phone': the panel's photo flies in from her phone
 *   (src/dive.js) and lands exactly where the panel is, so the panel itself must not animate.
 */
export async function initHero(song, { arrival } = {}) {
  const hero = document.getElementById('hero');
  const star = document.getElementById('hero-star');
  const img = document.getElementById('hero-photo');
  const adam = document.getElementById('hand-adam');
  const god = document.getElementById('hand-god');
  const p = heroPhoto();
  if (p) { img.src = p.src; img.alt = p.caption || 'us'; }

  // closeness of the fingertips: 0 = apart, 1 = nearly touching (drives the spark)
  const reach = { near: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    reach.near = 1;
  } else {
    // the poster prints itself in, then the two hands drift in from the edges of the world
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from('.hero-kicker', { opacity: 0, y: -10, duration: 1.2 }, 0.1)
      .from('.hero-title', { opacity: 0, y: 30, letterSpacing: '0.2em', duration: 2, ease: 'expo.out' }, 0.15);
    if (arrival !== 'phone') intro.from('#hero-frame', { opacity: 0, y: 40, duration: 1.6 }, 0.35);
    intro
      .from('.hero-lines i', { scaleX: 0, scaleY: 0, duration: 1.4, stagger: 0.12 }, 0.6)
      .from('.hero-note, .hero-date, .hero-echo, .hero .counter, .hero-sign, .hero-rose', { opacity: 0, duration: 1.4, stagger: 0.08 }, 0.9)
      .from(adam, { xPercent: -75, opacity: 0, duration: 2.6, ease: 'power2.out' }, 0.7)
      .from(god, { xPercent: 75, opacity: 0, duration: 2.6, ease: 'power2.out' }, 0.7)
      .from(star, { opacity: 0, duration: 1 }, 2.8);

    // scrolling past the hero closes the last bit of distance between the fingertips
    gsap.fromTo(adam, { x: -REACH_PX }, { x: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.8 } });
    gsap.fromTo(god, { x: REACH_PX }, {
      x: 0, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.8, onUpdate: st => { reach.near = st.progress; } },
    });
  }

  let raf = 0;
  const beat = () => {
    const e = song ? song.energy() : 0;
    star.style.setProperty('--beat', (1 + e * 0.8).toFixed(3));
    star.style.setProperty('--near', (0.8 + reach.near * 0.7).toFixed(3));
    raf = requestAnimationFrame(beat);
  };
  whenVisible(hero, () => { if (!raf) beat(); }, () => { cancelAnimationFrame(raf); raf = 0; });
}
