// #03 — one sky. Every star is 100 of our messages, and the same stars rearrange into each number's
// picture (numbers-forms.js). This file only renders: glowing star sprites, comet streaks while the stars
// fly between pictures, long-exposure arcs for the star trails, a little depth that follows the cursor,
// and the odd meteor in the open sky. numbers.js drives it with set(sceneFloat) from the pinned scroll.
import { buildForms, PALETTE, TAU, rng } from './numbers-forms.js';

const MORPH = 0.42; // first part of each scene is the flight from the last picture to this one
const STAGGER = 0.35; // stars leave at slightly different moments, like a flock
const REPEL_R = 90;
const REPEL_PX = 16;
const PARALLAX = [14, 10]; // px of depth shift across the screen
const TRAIL_RAD = 0.26; // radians of arc each star sweeps in the long exposure
const EXPOSE_S = 2.8; // how long the exposure takes to build up
const METEOR_EVERY = 4.5; // seconds
const OPEN_SKY = new Set(['messages', 'streak']); // meteors only cross the open sky

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = t => 1 - (1 - t) ** 3;

/** A soft glowing star in one colour: white-hot core, coloured halo. */
function sprite([r, g, b]) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, 0.95)`);
  grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.28)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, 64, 64);
  return c;
}

export function createStarSky(canvas, data) {
  const N = data.count;
  const seeds = rng(1234);
  const R = new Float32Array(N * 8).map(() => seeds());
  const r = (i, k) => R[i * 8 + k];
  const size = Float32Array.from({ length: N }, (_, i) => (r(i, 5) < 0.03 ? 2.2 : r(i, 5) < 0.18 ? 1.4 : 0.75 + r(i, 6) * 0.45));
  const twSpeed = Float32Array.from({ length: N }, (_, i) => 0.6 + r(i, 6) * 1.8);
  const twPhase = Float32Array.from({ length: N }, (_, i) => r(i, 7) * TAU);
  const delay = Float32Array.from({ length: N }, (_, i) => r(i, 3) * STAGGER);
  const sprites = PALETTE.map(sprite);
  const strokes = PALETTE.map(c => `rgb(${c.join(' ')})`);
  const prevX = new Float32Array(N).fill(NaN);
  const prevY = new Float32Array(N).fill(NaN);

  let geo = null;
  let forms = null;
  let sceneFloat = -1;
  let pointer = null;
  const par = { x: 0, y: 0 };
  let raf = 0;
  let current = -2;
  let arrivedAt = 0;
  const t0 = performance.now();

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    geo = { W, H, dpr, cx: W * 0.68, cy: H * 0.52, s: Math.min(W * 0.42, H * 0.66) };
    forms = buildForms({ geo, N, r, data: { ...data, size } });
    prevX.fill(NaN);
  }

  function meteor(g, t) {
    const k = Math.floor(t / METEOR_EVERY);
    const ph = (t % METEOR_EVERY) / 0.9;
    if (ph > 1) return;
    const mr = rng(k * 7 + 3);
    const { W, H } = geo;
    const x = W * (0.45 + mr() * 0.5) - ph * W * 0.18;
    const y = H * (0.05 + mr() * 0.3) + ph * H * 0.12;
    const tail = g.createLinearGradient(x, y, x + W * 0.09, y - H * 0.06);
    tail.addColorStop(0, `rgba(255, 244, 248, ${0.85 * (1 - ph)})`);
    tail.addColorStop(1, 'rgba(255, 244, 248, 0)');
    g.globalAlpha = 1;
    g.strokeStyle = tail;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + W * 0.09, y - H * 0.06); g.stroke();
  }

  const pa = { x: 0, y: 0, a: 0 };
  const pb = { x: 0, y: 0, a: 0 };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!geo) return;
    const { dpr, W, H } = geo;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    if (sceneFloat < 0) { prevX.fill(NaN); return; }
    const t = (now - t0) / 1000;
    const list = forms.list;
    const k = Math.min(list.length - 1, Math.floor(sceneFloat));
    if (k !== current) { current = k; arrivedAt = now; }
    const local = sceneFloat - k;
    const A = k === 0 ? forms.hidden : list[k - 1];
    const B = list[k];
    const m = clamp01(local / MORPH);
    const since = (now - arrivedAt) / 1000;
    const ctxA = { t, local: 1, since: 99 };
    const ctxB = { t, local, since };
    const expose = TRAIL_RAD * easeOut(clamp01(since / EXPOSE_S));
    // depth: the sky leans a little away from the cursor
    const tx = pointer ? (0.5 - pointer.x / W) * PARALLAX[0] : 0;
    const ty = pointer ? (0.5 - pointer.y / H) * PARALLAX[1] : 0;
    par.x += (tx - par.x) * 0.06;
    par.y += (ty - par.y) * 0.06;

    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const e = ease(clamp01((m - delay[i]) / (1 - STAGGER)));
      pa.x = A.x[i]; pa.y = A.y[i]; pa.a = A.a[i];
      pb.x = B.x[i]; pb.y = B.y[i]; pb.a = B.a[i];
      if (e < 1) A.anim?.(i, t, pa, ctxA);
      if (e > 0) B.anim?.(i, t, pb, ctxB);
      const z = A.z[i] + (B.z[i] - A.z[i]) * e;
      let x = pa.x + (pb.x - pa.x) * e + par.x * (0.4 + z * 0.4);
      let y = pa.y + (pb.y - pa.y) * e + par.y * (0.4 + z * 0.4);
      let a = (pa.a + (pb.a - pa.a) * e) * (0.68 + 0.32 * Math.sin(t * twSpeed[i] + twPhase[i]));
      if (pointer) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < REPEL_R && d > 0.01) { const push = REPEL_PX * (1 - d / REPEL_R) ** 2; x += (dx / d) * push; y += (dy / d) * push; a = Math.min(1, a * 1.5); }
      }
      const px = prevX[i];
      const py = prevY[i];
      prevX[i] = x;
      prevY[i] = y;
      if (a < 0.01) continue;
      const rad = size[i] * z;
      const pal = e > 0.5 ? B.p[i] : A.p[i];
      // comet streaks while a star is flying between pictures
      if (px === px) {
        const dist = Math.hypot(x - px, y - py);
        if (dist > 2.2 && dist < 400) {
          g.globalAlpha = a * 0.45 * Math.min(1, dist / 18);
          g.strokeStyle = strokes[pal];
          g.lineWidth = Math.max(0.6, rad * 0.8);
          g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
        }
      }
      const trailW = (A.trail ? 1 - e : 0) + (B.trail ? e : 0);
      if (trailW > 0.05) { // long exposure: each star sweeps an arc around the pole
        const T = B.trail ? B : A;
        const len = (B.trail ? expose : TRAIL_RAD) * trailW;
        const ang = Math.atan2(y - T.cy, x - T.cx);
        const dist = Math.hypot(x - T.cx, y - T.cy);
        g.globalAlpha = a;
        g.strokeStyle = strokes[pal];
        g.lineWidth = Math.max(0.7, rad * 0.95);
        g.beginPath(); g.arc(T.cx, T.cy, dist, ang - len, ang); g.stroke();
        g.globalAlpha = a * 0.9;
        const head = rad * 5;
        g.drawImage(sprites[pal], x - head / 2, y - head / 2, head, head);
        continue;
      }
      const sp = rad * 7.5;
      if (e < 1) { g.globalAlpha = a * (1 - e); g.drawImage(sprites[A.p[i]], x - sp / 2, y - sp / 2, sp, sp); }
      if (e > 0) { g.globalAlpha = a * e; g.drawImage(sprites[B.p[i]], x - sp / 2, y - sp / 2, sp, sp); }
    }
    if (OPEN_SKY.has(data.order[k]) && m === 1) meteor(g, t);
    g.globalCompositeOperation = 'source-over';
    if (A.overlay && m < 1) A.overlay(g, (1 - m) ** 2, ctxA);
    if (B.overlay && m > 0) B.overlay(g, m ** 2, ctxB);
    g.globalAlpha = 1;
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    /** -1 = before the first scene; 2.5 = halfway through the third. */
    set(v) { sceneFloat = v; },
    pointer(p) { pointer = p; },
    geometry: () => geo,
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    onResize(fn) { new ResizeObserver(() => requestAnimationFrame(fn)).observe(canvas); },
  };
}
