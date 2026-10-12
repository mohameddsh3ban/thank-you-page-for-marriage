import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let jumping = false; // a programmatic scroll (nav jump) is in flight: gates let it pass

// Scroll gates: each one maps a wanted scroll y to the furthest y it allows right now, so a chapter
// whose animation runs on its own clock can hold the page until it catches up.
const gates = new Map();
/**
 * @param {(y: number) => number} gate  furthest y allowed right now for a wanted y
 * @param {() => number} [queueEnd]  input held back by this gate is replayed only up to here
 * @returns {() => void} removes the gate
 */
export function addScrollGate(gate, queueEnd = () => Infinity) { gates.set(gate, queueEnd); return () => gates.delete(gate); }
const capFor = y => { let cap = y; gates.forEach((_, g) => { cap = Math.min(cap, g(y)); }); return cap; };
const queueLimit = () => { let end = lenis.limit; gates.forEach(e => { end = Math.min(end, e()); }); return end; };

// where the reader is trying to get to; a gate delays the trip instead of throwing it away
let wanted = 0;
/** The scroll y the reader is heading for (ahead of the page while a gate holds it back). */
export const wantedScroll = () => (lenis ? Math.max(wanted, lenis.targetScroll) : window.scrollY);

// Site-wide speed limit, so every scroll-driven animation is seen at its intended pace: one wheel
// step moves at most MAX_WHEEL_STEP, and the page never runs more than MAX_LEAD ahead of where
// the smooth scroll has actually got to (that caps the top speed at roughly LERP * MAX_LEAD * 60 px/s,
// about 1,000 px/s, so a chapter change always takes a moment to pass).
const MAX_WHEEL_STEP = 90;
const MAX_LEAD = 240;
const LERP = 0.068;
const QUEUE_LERP = 0.08; // the pace a held-back scroll catches up at once a chapter lets go

// Rushing: how hard she is spinning the wheel (asked-for distance, before any limit), over a short
// window. Past RUSH_PX within RUSH_WINDOW_MS, listeners hear about it (speed-note.js asks her to slow
// down) at most once per RUSH_COOLDOWN_MS.
const RUSH_WINDOW_MS = 900;
const RUSH_PX = 2400;
const RUSH_COOLDOWN_MS = 2000;
const rushListeners = new Set();
const rushLog = [];
let lastRush = 0;
let calm = 1; // < 1 slows the page further for a while (while her note is up)
/** @param {() => void} fn called when she scrolls much faster than the page can follow. @returns {() => void} unsubscribe */
export function onScrollRush(fn) { rushListeners.add(fn); return () => rushListeners.delete(fn); }
/** Scale the top speed (1 = normal); the speed note slows things a little more while it's showing. */
export function setScrollCalm(f) { calm = Math.min(1, Math.max(0.2, f)); }
function noteIntent(deltaY) {
  const now = performance.now();
  rushLog.push([now, Math.abs(deltaY)]);
  while (rushLog.length && now - rushLog[0][0] > RUSH_WINDOW_MS) rushLog.shift();
  if (!rushListeners.size || now - lastRush < RUSH_COOLDOWN_MS) return;
  if (rushLog.reduce((sum, [, d]) => sum + d, 0) < RUSH_PX) return;
  lastRush = now;
  rushLog.length = 0;
  rushListeners.forEach(fn => fn());
}

/** Caps a wheel step to the site-wide speed limit; false when the step should be dropped. */
function throttleWheel(data) {
  const dir = Math.sign(data.deltaY);
  if (!dir) return true;
  const lead = (lenis.targetScroll - lenis.animatedScroll) * dir;
  const step = Math.min(Math.abs(data.deltaY), MAX_WHEEL_STEP * calm, Math.max(0, MAX_LEAD * calm - lead));
  if (step < 0.5) { data.event.preventDefault(); return false; }
  data.deltaY = step * dir;
  return true;
}

/** Lenis hook: applies the speed limit, then trims a step so it never runs past a gate (queuing the rest). */
function gateWheel(data) {
  if (data.event.ctrlKey) return true; // pinch-zoom, not scrolling
  if (!jumping) noteIntent(data.deltaY);
  if (!jumping && !throttleWheel(data)) return false;
  if (data.deltaY < 0) wanted = 0; // scrolling back up cancels anything queued
  if (!gates.size || jumping || data.deltaY <= 0) return true;
  const want = Math.max(wanted, lenis.targetScroll) + data.deltaY;
  const allowed = capFor(want) - lenis.targetScroll;
  if (allowed >= want - lenis.targetScroll) { wanted = 0; return true; }
  wanted = Math.min(want, queueLimit());
  if (allowed <= 0.5) { data.event.preventDefault(); return false; }
  data.deltaY = allowed;
  return true;
}
/** Each frame, let the page follow the queued scroll as far as the gates now allow. */
function releaseQueued() {
  if (!wanted || jumping) return;
  const cap = Math.min(wanted, capFor(wanted));
  if (cap > lenis.targetScroll + 0.5) lenis.scrollTo(cap, { lerp: QUEUE_LERP });
  if (cap >= wanted - 0.5) wanted = 0;
}
/** Keyboard and scrollbar scrolling skip the wheel hook, so pull those back to the gate too. */
function gateNative() {
  if (!gates.size || jumping) return;
  const cap = capFor(lenis.scroll);
  if (lenis.scroll > cap + 4) lenis.scrollTo(cap, { immediate: true, force: true });
}
const jump = (target, options) => {
  jumping = true;
  wanted = 0;
  lenis.scrollTo(target, { ...options, onComplete: () => { jumping = false; options.onComplete?.(); } });
};

/** Programmatic scroll that cooperates with smooth scrolling. */
export function scrollToEl(el, offset = 0) {
  if (lenis) jump(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Scroll to an absolute y, then call back once it lands. */
export function scrollToY(y, onDone) {
  if (lenis) jump(y, { duration: 0.9, onComplete: () => onDone?.() });
  else { window.scrollTo(0, y); onDone?.(); }
}

/** Follow a dragged scrollbar: the page glides after the pointer instead of jumping. */
export function scrollDrag(y) {
  if (lenis) lenis.scrollTo(y, { lerp: 0.2 });
  else window.scrollTo(0, y);
}

export const isScrollLocked = () => Boolean(lenis?.isStopped);
/** Smoothed scroll speed in px per frame (0 without smooth scrolling). */
export const scrollVelocity = () => lenis?.velocity ?? 0;

/** Freeze or release page scrolling (wheel goes nowhere while frozen). */
export function setScrollLocked(locked) {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/** Smooth scrolling (skipped for reduced motion) wired into GSAP's ticker. */
export function initScroll() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { gsap, ScrollTrigger };
  // dev-only: plain native scrolling for screenshot tests (?nolenis)
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('nolenis')) return { gsap, ScrollTrigger };
  lenis = new Lenis({ lerp: LERP, smoothWheel: true, virtualScroll: gateWheel });
  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', gateNative);
  if (import.meta.env.DEV) { window.__lenis = lenis; window.__jump = scrollToEl; } // lets test scripts jump around
  gsap.ticker.add(t => { releaseQueued(); lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  return { gsap, ScrollTrigger, lenis };
}

export { gsap, ScrollTrigger };
