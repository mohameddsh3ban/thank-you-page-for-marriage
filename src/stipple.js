// Turns an engraving into red ink dots (ref 2) and "prints" them in progressively.

const SAMPLE_WIDTH = 360;
const INK = ['#C1121F', '#A30E1A', '#D4202C'];

/** @param {string} src */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * Rejection-sample dots weighted by darkness.
 * @returns {{x:number,y:number,r:number,c:string,o:number}[]} coordinates in sample space
 */
function sampleDots(img, count) {
  const w = SAMPLE_WIDTH;
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const dark = (x, y) => {
    const i = ((y | 0) * w + (x | 0)) * 4;
    return 1 - (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  };
  const dots = [];
  const focus = { x: w * 0.52, y: h * 0.22 }; // ink starts near the face and spreads out
  for (let tries = 0; dots.length < count && tries < count * 40; tries++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const d = dark(x, y);
    if (d < 0.1 || Math.random() > Math.pow(d, 1.25)) continue;
    const dist = Math.hypot(x - focus.x, y - focus.y) / Math.hypot(w, h);
    dots.push({ x, y, r: 0.35 + d * 0.75, c: INK[(Math.random() * INK.length) | 0], o: dist + Math.random() * 0.18 });
  }
  dots.sort((a, b) => a.o - b.o);
  return { dots, w, h };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} src
 * @param {{ revealMs?: number }} [opts]
 */
export async function createStipple(canvas, src, { revealMs = 3200 } = {}) {
  const img = await loadImage(src);
  const small = matchMedia('(max-width: 700px)').matches;
  const { dots, w, h } = sampleDots(img, small ? 11000 : 18000);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const baked = document.createElement('canvas');
  let scale = 1, ox = 0, oy = 0, dpr = 1, shown = 0, pulse = 0, raf = 0;

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = Math.min(canvas.width / w, canvas.height / h);
    ox = (canvas.width - w * scale) / 2;
    oy = (canvas.height - h * scale) / 2;
    baked.width = canvas.width; baked.height = canvas.height;
  }

  function drawDots(target, from, to) {
    for (let i = from; i < to; i++) {
      const d = dots[i];
      target.fillStyle = d.c;
      target.beginPath();
      target.arc(ox + d.x * scale, oy + d.y * scale, Math.max(0.6 * dpr, d.r * scale * 0.8), 0, Math.PI * 2);
      target.fill();
    }
  }

  function bake() {
    const b = baked.getContext('2d');
    b.clearRect(0, 0, baked.width, baked.height);
    drawDots(b, 0, shown);
  }

  function paint() {
    if (!baked.width || !baked.height) return; // canvas collapsed (hidden or zero-size viewport)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = 1 + pulse * 0.025;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(s, s);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(baked, 0, 0);
    ctx.restore();
  }

  layout();
  addEventListener('resize', () => { layout(); bake(); paint(); });

  return {
    /** Print the dots in. Resolves when finished. */
    reveal() {
      if (reduced) { shown = dots.length; bake(); paint(); return Promise.resolve(); }
      return new Promise(resolve => {
        const start = performance.now();
        const bctx = baked.getContext('2d');
        const step = now => {
          // rAF timestamps can precede `start`; clamp so the dot cursor never goes negative
          const t = Math.min(1, Math.max(0, (now - start) / revealMs));
          const eased = 1 - Math.pow(1 - t, 2.2);
          const next = Math.floor(eased * dots.length);
          drawDots(bctx, shown, next);
          shown = next;
          paint();
          if (t < 1) raf = requestAnimationFrame(step); else resolve();
        };
        raf = requestAnimationFrame(step);
      });
    },
    /** @param {number} level 0..1 beat energy */
    pulse(level) {
      if (reduced || Math.abs(level - pulse) < 0.01) return;
      pulse = level;
      paint();
    },
    stop() { cancelAnimationFrame(raf); },
  };
}
