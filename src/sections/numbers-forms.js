// #03 — the pictures the stars make, one per number, each with its own labels drawn into the art.
// Every builder fills a form (positions, alpha, size, palette per star) and may add:
//   anim(i, t, p, ctx)  idle motion of star i (p = {x, y, a} is changed in place)
//   overlay(g, w, ctx)  labels and lines, drawn on top with opacity w (0..1)
//   trail               stars are drawn as long-exposure arcs around (cx, cy)
// ctx = { t, local (0..1 through the scene), since (seconds since this picture arrived) }.
export const TAU = Math.PI * 2;
export const P = { HER: 0, ME: 1, PEAK: 2, GOLD: 3, BLUSH: 4 };
export const PALETTE = [[255, 186, 204], [228, 238, 255], [255, 143, 168], [241, 217, 160], [255, 208, 220]];

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = t => 1 - (1 - t) ** 3;
const fmt = new Intl.NumberFormat('en').format;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const dayMs = 86400e3;
const ddmmyyyy = iso => iso.split('-').reverse().join('.');

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The classic heart curve, about 2 units wide; y grows downward to the tip. */
export function heartPoint(t) {
  const x = 16 * Math.sin(t) ** 3;
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return [x / 17, y / 17 - 0.12];
}
/** n points spaced evenly along the heart's outline (by arc length), starting at the top dip. */
function heartOutline(n) {
  const STEPS = 2000;
  const pts = [];
  const len = [0];
  for (let i = 0; i <= STEPS; i++) pts.push(heartPoint((i / STEPS) * TAU));
  for (let i = 1; i <= STEPS; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * len[STEPS];
    while (len[j + 1] < target) j++;
    out.push(pts[j]);
  }
  return out;
}

/* ---- drawing helpers for the labels ---- */
const FONTS = {
  label: s => `600 ${s}px "Bodoni Moda", serif`,
  serif: s => `italic 400 ${s}px "Bodoni Moda", serif`,
  display: s => `300 ${s}px "Celestial Display", serif`,
  script: s => `400 ${s}px "Pinyon Script", cursive`,
};
function text(g, str, x, y, { size = 12, font = 'label', color = 'rgba(251, 241, 238, 0.75)', align = 'center', base = 'middle', spacing = 0 } = {}) {
  g.font = FONTS[font](Math.round(size));
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  g.letterSpacing = `${spacing}px`;
  g.shadowColor = 'rgba(10, 14, 26, 0.85)'; // a soft dark halo so labels read over bright stars
  g.shadowBlur = 6;
  g.fillText(str, x, y);
  g.shadowBlur = 0;
  g.letterSpacing = '0px';
}
function line(g, x1, y1, x2, y2, color = 'rgba(251, 241, 238, 0.35)', width = 0.8, dash = null) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.setLineDash(dash || []);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.setLineDash([]);
}
function dot(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

/* ---- the builders ---- */
export function buildForms({ geo, N, r, data }) {
  const make = () => ({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N), z: new Float32Array(N), p: new Uint8Array(N), cx: geo.cx, cy: geo.cy });
  const put = (f, i, x, y, pal, a, z) => { f.x[i] = x; f.y[i] = y; f.p[i] = pal; f.a[i] = a; f.z[i] = z; };
  const { W, H, cx, cy, s } = geo;
  const LABEL = Math.max(10, s * 0.02);
  const SMALL = Math.max(11, s * 0.024);

  /* 1 · our whole chat as a milky way: every star is 100 messages, placed on the day they were sent */
  function timeline(alphaMul = 1, sizeMul = 1) {
    const f = make();
    const days = data.days;
    const t0 = Date.parse(days[0][0]);
    const t1 = Date.parse(days[days.length - 1][0]);
    const total = days.reduce((a, d) => a + d[1], 0);
    const [sx, sy, ex, ey] = [0.12 * W, 0.97 * H, 0.97 * W, 0.16 * H];
    const len = Math.hypot(ex - sx, ey - sy);
    const [nx, ny] = [-(ey - sy) / len, (ex - sx) / len]; // points down-right of the band
    const at = (u, off = 0) => [sx + (ex - sx) * u + nx * off, sy + (ey - sy) * u + ny * off];
    let d = 0;
    let seen = days[0][1];
    for (let i = 0; i < N; i++) {
      const m = ((i + 0.5) / N) * total;
      while (seen < m && d < days.length - 1) { d++; seen += days[d][1]; }
      const [iso, n, her] = days[d];
      const u = (Date.parse(iso) - t0) / (t1 - t0);
      const across = (r(i, 1) + r(i, 2) + r(i, 4) - 1.5) * 0.11 * H + Math.sin(u * 9 + 1) * 0.02 * H;
      const [x, y] = at(u + (r(i, 0) - 0.5) * 0.004, across);
      put(f, i, x, y, r(i, 2) < her / n ? P.HER : P.ME, (0.6 + 0.4 * Math.min(1, data.size[i] / 1.6)) * alphaMul, sizeMul);
    }
    const uOf = iso => (Date.parse(iso) - t0) / (t1 - t0);
    const years = [];
    for (let y = new Date(t0).getFullYear() + 1; y <= new Date(t1).getFullYear(); y++) years.push([String(y), uOf(`${y}-01-01`)]);
    const loud = data.loudestDay;
    f.overlay = (g, w) => {
      g.globalAlpha = w;
      for (const [label, u] of years) { // year marks beside the band, on whichever side keeps clear of the numbers
        const up = at(u, -0.085 * H);
        const side = up[0] < 0.44 * W && up[1] < 0.72 * H ? 1 : -1;
        const [bx, by] = at(u, side * 0.045 * H);
        const [lx, ly] = at(u, side * 0.085 * H);
        line(g, bx, by, lx, ly - side * 10, 'rgba(251, 241, 238, 0.3)');
        text(g, label, lx, ly, { size: SMALL * 1.5, font: 'display', color: 'rgba(251, 241, 238, 0.75)' });
      }
      const [s0x, s0y] = at(0.02, -0.07 * H);
      text(g, ddmmyyyy(data.from), s0x, s0y, { size: LABEL, align: 'left', spacing: 2, color: 'rgba(251, 241, 238, 0.55)' });
      const [e0x, e0y] = at(1, -0.07 * H);
      text(g, ddmmyyyy(data.to), e0x - 4, e0y, { size: LABEL, align: 'right', spacing: 2, color: 'rgba(251, 241, 238, 0.55)' });
      // the loudest day, called out above the band
      const [px, py] = at(uOf(loud.day));
      const [qx, qy] = [px + 0.12 * W, py + 0.035 * H];
      dot(g, px, py, 3.5, 'rgba(255, 186, 204, 0.95)');
      line(g, px + 5, py + 2, qx - 6, qy - 4, 'rgba(255, 186, 204, 0.6)');
      text(g, fmt(loud.n), qx, qy - 6, { size: SMALL * 1.9, font: 'display', align: 'left', color: 'rgb(255 196 212)' });
      text(g, `messages on ${ddmmyyyy(loud.day)} · our loudest day`, qx, qy + 18, { size: LABEL, align: 'left', spacing: 1.5, color: 'rgba(251, 241, 238, 0.75)' });
    };
    return f;
  }

  /* 2 · an open book: your pages on the left, mine on the right */
  function book() {
    const f = make();
    const bw = s * 1.12;
    const bh = s * 0.64;
    const gap = s * 0.028;
    const pageW = bw / 2 - gap;
    const margin = pageW * 0.1;
    const LINES = 13;
    const lineGap = bh / (LINES + 1.3);
    const nLeft = Math.round(N * data.share.words);
    const dip = d => s * 0.04 * (1 - d) ** 3; // the pages curve down into the spine
    let i = 0;
    for (const page of [0, 1]) {
      const count = page === 0 ? nLeft : N - nLeft;
      const pal = page === 0 ? P.HER : P.ME;
      const lineRand = rng(99 + page);
      const lens = Array.from({ length: LINES }, (_, l) => (l % 4 === 3 ? 0.35 + lineRand() * 0.3 : 0.84 + lineRand() * 0.16));
      const total = lens.reduce((a, b) => a + b, 0);
      const nBorder = Math.round(count * 0.13);
      const nLines = count - nBorder;
      const pageX0 = page === 0 ? cx - gap - pageW : cx + gap;
      const xAt = d => (page === 0 ? cx - gap - d * pageW : cx + gap + d * pageW); // d = distance from the spine, 0..1
      for (let k = 0; k < nLines; k++, i++) {
        let u = ((k + 0.5) / nLines) * total;
        let l = 0;
        while (u > lens[l]) { u -= lens[l]; l++; }
        const x = pageX0 + margin + u * (pageW - margin * 2);
        const d = page === 0 ? (cx - gap - x) / pageW : (x - cx - gap) / pageW;
        put(f, i, x, cy - bh / 2 + (l + 1) * lineGap + dip(d) + (r(i, 4) - 0.5) * 1.6, pal, 1, 1.05);
      }
      for (let k = 0; k < nBorder; k++, i++) { // the page edge: top, outer side, bottom
        const u = ((k + 0.5) / nBorder) * (pageW * 2 + bh);
        let x;
        let y;
        if (u < pageW) { const d = 1 - u / pageW; x = xAt(d); y = cy - bh / 2 + dip(d) - s * 0.012; }
        else if (u < pageW + bh) { x = xAt(1); y = cy - bh / 2 + (u - pageW); }
        else { const d = 1 - (u - pageW - bh) / pageW; x = xAt(d); y = cy + bh / 2 + dip(d); }
        put(f, i, x, y, pal, 0.6, 0.8);
      }
    }
    f.overlay = (g, w, { t }) => {
      g.globalAlpha = w;
      const top = cy - bh / 2 - s * 0.075;
      for (const [page, who, words, color] of [[0, 'yours', data.words.her, 'rgb(255 196 212)'], [1, 'mine', data.words.him, 'rgba(236, 242, 255, 0.95)']]) {
        const x = page === 0 ? cx - gap - pageW / 2 : cx + gap + pageW / 2;
        text(g, who, x, top - s * 0.02, { size: s * 0.06, font: 'script', color });
        text(g, `${fmt(words)} words · ${(words / data.wordsPerNovel).toFixed(1)} novels`, x, top + s * 0.035, { size: LABEL, spacing: 1.5, color: 'rgba(251, 241, 238, 0.65)' });
      }
      // a ribbon bookmark hanging from the spine, swaying a little
      const sway = Math.sin(t * 0.9) * s * 0.012;
      g.strokeStyle = 'rgba(255, 143, 168, 0.85)';
      g.lineWidth = Math.max(3, s * 0.008);
      g.beginPath();
      g.moveTo(cx, cy - bh / 2 + s * 0.02);
      g.bezierCurveTo(cx + s * 0.01, cy, cx - s * 0.015 + sway, cy + bh * 0.4, cx + sway, cy + bh / 2 + s * 0.12);
      g.stroke();
      line(g, cx, cy - bh / 2 + s * 0.01, cx, cy + bh / 2 + s * 0.01, 'rgba(251, 241, 238, 0.18)', 1);
    };
    return f;
  }

  /* 3 · a voice note: the pink part of it is yours */
  function wave() {
    const f = make();
    const BARS = 64;
    const width = s * 1.2;
    const x0 = cx - width / 2;
    const hRand = rng(23);
    let prev = 0.5;
    const heights = Array.from({ length: BARS }, () => (prev = Math.min(1, Math.max(0.14, prev + (hRand() - 0.5) * 0.55))) * s * 0.52);
    const hers = Math.round(BARS * data.share.voice);
    const perBar = Math.ceil(N / BARS);
    const barX = b => x0 + (b + 0.5) * (width / BARS);
    const bar = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      const b = i % BARS;
      bar[i] = b;
      const u = (Math.floor(i / BARS) + 0.5) / perBar;
      put(f, i, barX(b) + (r(i, 4) - 0.5) * 1.2, cy + (u - 0.5) * heights[b], b < hers ? P.HER : P.ME, 1, 1.02);
    }
    const play = t => (t * 0.07) % 1; // playhead position along the note
    f.anim = (i, t, p) => {
      const near = Math.exp(-(((barX(bar[i]) - (x0 + play(t) * width)) / (width * 0.05)) ** 2));
      p.y = cy + (p.y - cy) * (0.66 + 0.24 * Math.sin(t * 2.4 - bar[i] * 0.32) + 0.3 * near);
      p.a *= 0.75 + 0.5 * near;
    };
    const split = x0 + hers * (width / BARS);
    f.overlay = (g, w, { t }) => {
      g.globalAlpha = w;
      const px = x0 + play(t) * width;
      const grad = g.createLinearGradient(0, cy - s * 0.32, 0, cy + s * 0.32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      line(g, px, cy - s * 0.32, px, cy + s * 0.32, grad, 1.2);
      const by = cy + s * 0.34;
      for (const [a, b, label, color] of [[x0, split - 4, `yours · ${fmt(data.voice.her)} notes`, 'rgb(255 196 212)'], [split + 4, x0 + width, `mine · ${fmt(data.voice.him)}`, 'rgba(236, 242, 255, 0.9)']]) {
        line(g, a, by, b, by, color, 1);
        line(g, a, by - 5, a, by, color, 1);
        line(g, b, by - 5, b, by, color, 1);
        text(g, label, (a + b) / 2, by + 16, { size: LABEL, spacing: 1.5, color });
      }
      text(g, '0:00', x0, cy - s * 0.33, { size: LABEL, align: 'left', color: 'rgba(251, 241, 238, 0.5)', spacing: 1 });
      text(g, `${data.voice.hours} hours`, x0 + width, cy - s * 0.33, { size: LABEL, align: 'right', color: 'rgba(251, 241, 238, 0.5)', spacing: 1 });
    };
    return f;
  }

  /* 4 · six rings of sound around you: each ring is a sixth of our hours on the phone */
  function rings() {
    const f = make();
    const K = 6;
    const R0 = s * 0.2;
    const dR = s * 0.062;
    const weights = Array.from({ length: K }, (_, k) => R0 + k * dR);
    const sum = weights.reduce((a, b) => a + b, 0);
    const ring = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      let u = r(i, 0) * sum;
      let k = 0;
      while (u > weights[k]) { u -= weights[k]; k++; }
      ring[i] = k;
      const ang = r(i, 1) * TAU;
      const rad = R0 + k * dR + (r(i, 4) - 0.5) * 2;
      put(f, i, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, k % 2 ? P.ME : P.HER, 0.95, 0.95);
    }
    // a pulse of sound travelling outward through the rings
    const pulse = t => R0 + ((t * 0.45) % 1) * K * dR;
    f.anim = (i, t, p) => { p.a *= 0.45 + 0.75 * Math.exp(-(((R0 + ring[i] * dR - pulse(t)) / (dR * 0.7)) ** 2)); };
    const per = Math.round(data.callHours / K);
    f.overlay = (g, w) => {
      g.globalAlpha = w;
      const ang = -Math.PI / 4;
      for (let k = 0; k < K; k++) {
        const rad = R0 + k * dR;
        text(g, `${per * (k + 1)} h`, cx + Math.cos(ang) * rad + 6, cy + Math.sin(ang) * rad - 6, { size: LABEL, align: 'left', spacing: 1, color: k === K - 1 ? 'rgb(255 196 212)' : 'rgba(251, 241, 238, 0.55)' });
      }
    };
    return f;
  }

  /* 5 · two hearts, sized by every i love you */
  function hearts() {
    const f = make();
    const { her, him } = data.love;
    const max = Math.max(her, him);
    const nHer = Math.round(N * her / (her + him));
    const spec = [
      { x: cx - s * 0.21, y: cy - s * 0.04, k: s * 0.34 * Math.sqrt(her / max), pal: P.HER },
      { x: cx + s * 0.27, y: cy + s * 0.05, k: s * 0.34 * Math.sqrt(him / max), pal: P.ME },
    ];
    const which = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const w = i < nHer ? 0 : 1;
      const h = spec[w];
      const [hx, hy] = heartPoint(r(i, 1) * TAU);
      const edge = r(i, 2) < 0.42;
      const k = edge ? 0.97 + r(i, 4) * 0.03 : Math.sqrt(r(i, 4)) * 0.95;
      which[i] = w;
      put(f, i, h.x + hx * h.k * k, h.y + hy * h.k * k, h.pal, edge ? 1 : 0.85, edge ? 1.1 : 0.95);
    }
    // a heartbeat: two quick bumps every 1.6 s, his a beat behind hers
    const beat = (t, w) => {
      const ph = ((t + w * 0.18) % 1.6) / 1.6;
      return 1 + 0.05 * (Math.exp(-(((ph - 0.08) / 0.05) ** 2)) + 0.6 * Math.exp(-(((ph - 0.26) / 0.05) ** 2)));
    };
    f.anim = (i, t, p) => {
      const h = spec[which[i]];
      const k = beat(t, which[i]);
      p.x = h.x + (p.x - h.x) * k;
      p.y = h.y + (p.y - h.y) * k;
    };
    f.overlay = (g, w) => {
      g.globalAlpha = w;
      const [a, b] = spec;
      // a gold thread from her heart to his
      g.strokeStyle = 'rgba(241, 217, 160, 0.55)';
      g.lineWidth = 1;
      g.setLineDash([2, 5]);
      g.beginPath();
      g.moveTo(a.x + a.k * 0.55, a.y + a.k * 0.75);
      g.quadraticCurveTo(cx + s * 0.05, cy + s * 0.42, b.x - b.k * 0.2, b.y + b.k * 0.85);
      g.stroke();
      g.setLineDash([]);
      text(g, `${fmt(her + him)} times in all`, cx + s * 0.04, cy + s * 0.4, { size: LABEL, spacing: 1.5, color: 'rgba(241, 217, 160, 0.85)' });
      text(g, 'yours', a.x, a.y - a.k * 1.02, { size: s * 0.055, font: 'script', color: 'rgb(255 196 212)' });
      text(g, fmt(her), a.x, a.y + s * 0.02, { size: s * 0.08, font: 'display', color: 'rgba(255, 240, 245, 0.9)' });
      text(g, 'mine', b.x, b.y - b.k * 1.05, { size: s * 0.05, font: 'script', color: 'rgba(236, 242, 255, 0.95)' });
      text(g, fmt(him), b.x, b.y + s * 0.015, { size: s * 0.065, font: 'display', color: 'rgba(236, 242, 255, 0.9)' });
      text(g, `+ ${fmt(data.love.adore)} “i adore you”`, b.x, b.y + s * 0.07, { size: LABEL, spacing: 1, color: 'rgba(236, 242, 255, 0.6)' });
    };
    return f;
  }

  /* 6 · who did it more: you on the left, me on the right */
  function score() {
    const f = make();
    const rows = data.rows;
    const n = rows.length;
    const per = Math.ceil(N / n);
    const lMax = s * 0.5;
    const gap = s * 0.02;
    const rowY = j => cy - s * 0.34 + j * (s * 0.74 / (n - 1));
    for (let i = 0; i < N; i++) {
      const j = i % n;
      const k = Math.floor(i / n);
      const row = rows[j];
      const top = Math.max(row.her, row.him);
      const herCount = Math.round(per * row.her / (row.her + row.him));
      const mine = k >= herCount;
      const u = mine ? (k - herCount + 0.5) / (per - herCount) : (k + 0.5) / herCount;
      const len = lMax * (mine ? row.him : row.her) / top;
      put(f, i, mine ? cx + gap + u * len : cx - gap - u * len, rowY(j) + (r(i, 4) - 0.5) * s * 0.024, mine ? P.ME : P.HER, 1, 1);
    }
    f.overlay = (g, w) => {
      g.globalAlpha = w;
      line(g, cx, cy - s * 0.44, cx, cy + s * 0.44, 'rgba(251, 241, 238, 0.18)', 1);
      text(g, 'you', cx - gap - s * 0.03, cy - s * 0.46, { size: s * 0.05, font: 'script', align: 'right', color: 'rgb(255 196 212)' });
      text(g, 'me', cx + gap + s * 0.03, cy - s * 0.46, { size: s * 0.05, font: 'script', align: 'left', color: 'rgba(236, 242, 255, 0.95)' });
      rows.forEach((row, j) => {
        const y = rowY(j);
        const top = Math.max(row.her, row.him);
        text(g, row.label, cx, y - s * 0.045, { size: s * 0.03, font: 'serif', color: 'rgba(251, 241, 238, 0.85)' });
        text(g, fmt(row.her), cx - gap - lMax * row.her / top - s * 0.025, y, { size: s * 0.05, font: 'display', align: 'right', color: row.her >= row.him ? 'rgb(255 196 212)' : 'rgba(251, 241, 238, 0.5)' });
        text(g, fmt(row.him), cx + gap + lMax * row.him / top + s * 0.025, y, { size: s * 0.05, font: 'display', align: 'left', color: row.him > row.her ? 'rgb(236 242 255)' : 'rgba(251, 241, 238, 0.5)' });
      });
    };
    return f;
  }

  /* 7 · a long exposure of our nights: every streak is a message, at the hour it was sent */
  function trails() {
    const f = make();
    const maxR = s * 0.46; // leaves room for the dial's numerals above the legend
    const minR = s * 0.09;
    const total = data.byHour.reduce((a, b) => a + b, 0);
    const cdf = [];
    data.byHour.reduce((acc, v, h) => (cdf[h] = acc + v / total), 0);
    const angOf = h => (h / 24) * TAU - Math.PI / 2;
    for (let i = 0; i < N; i++) {
      let h = 0;
      while (cdf[h] < r(i, 0)) h++;
      const rad = minR + (maxR - minR) * Math.sqrt(r(i, 2));
      const ang = angOf(h + r(i, 1));
      const peak = h === data.peakHour;
      put(f, i, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, peak ? P.PEAK : h < 5 ? P.HER : P.ME, peak ? 1 : 0.8, peak ? 1.25 : 0.9);
    }
    f.trail = true;
    const quiet = data.byHour.indexOf(Math.min(...data.byHour));
    const hourName = h => (h === 0 ? '12 am' : h === 12 ? '12 pm' : h < 12 ? `${h} am` : `${h - 12} pm`);
    f.overlay = (g, w, { since }) => {
      g.globalAlpha = w;
      // midnight → 5 am, glowing pink behind the arcs
      const wedge = g.createRadialGradient(cx, cy, minR, cx, cy, maxR);
      wedge.addColorStop(0, 'rgba(255, 143, 168, 0)');
      wedge.addColorStop(1, 'rgba(255, 143, 168, 0.13)');
      g.fillStyle = wedge;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, maxR, angOf(0), angOf(5)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255, 160, 182, 0.75)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, maxR + s * 0.018, angOf(0), angOf(5)); g.stroke();
      // the dial: 24 ticks, a numeral every three hours
      for (let h = 0; h < 24; h++) {
        const a = angOf(h);
        const long = h % 3 === 0;
        const r1 = maxR + s * 0.032;
        const r2 = r1 + (long ? s * 0.022 : s * 0.011);
        line(g, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, 'rgba(251, 241, 238, 0.45)', long ? 1.2 : 0.7);
        if (long) {
          const rt = maxR + s * 0.085;
          text(g, hourName(h), cx + Math.cos(a) * rt, cy + Math.sin(a) * rt, { size: LABEL, spacing: 1, color: h < 5 ? 'rgb(255 196 212)' : 'rgba(251, 241, 238, 0.6)' });
        }
      }
      // the busiest hour, called out
      const pa = angOf(data.peakHour + 0.5);
      const ax = cx + Math.cos(pa) * (maxR * 0.86);
      const ay = cy + Math.sin(pa) * (maxR * 0.86);
      const lx = Math.min(W - 64, cx + s * 0.98);
      const ly = cy - s * 0.62;
      dot(g, ax, ay, 3.2, 'rgb(255 160 182)');
      line(g, ax, ay, lx - s * 0.36, ly + s * 0.12, 'rgba(255, 160, 182, 0.7)', 1);
      text(g, hourName(data.peakHour), lx, ly, { size: s * 0.085, font: 'display', align: 'right', color: 'rgb(255 170 190)' });
      text(g, `${fmt(data.byHour[data.peakHour])} messages · our busiest hour`, lx, ly + s * 0.065, { size: LABEL, align: 'right', spacing: 1.2, color: 'rgba(251, 241, 238, 0.75)' });
      text(g, `midnight → 5 am · ${fmt(data.lateNight)} · ${data.lateShare}% of everything`, lx, ly + s * 0.105, { size: LABEL, align: 'right', spacing: 1.2, color: 'rgba(255, 196, 212, 0.85)' });
      // the quietest hour, softly
      const qa = angOf(quiet + 0.5);
      text(g, `${hourName(quiet)} · our quietest hour · ${fmt(data.byHour[quiet])}`, cx + Math.cos(qa) * (minR + s * 0.07), cy + Math.sin(qa) * (minR + s * 0.07), { size: LABEL * 0.9, spacing: 1, color: 'rgba(251, 241, 238, 0.45)' });
      // the pole star the night turns around
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.05);
      glow.addColorStop(0, `rgba(255, 244, 220, ${0.85 * clamp01(since / 2)})`);
      glow.addColorStop(1, 'rgba(255, 244, 220, 0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(cx, cy, s * 0.05, 0, TAU); g.fill();
    };
    return f;
  }

  /* 8 · the longest streak of days in a row, drawn into a heart, lighting up one by one */
  function heartOfDays() {
    const f = timeline(0.26, 0.7); // everything else drifts back into the milky way, dimmer
    const n = data.streak.n;
    const scale = s * 0.42;
    const hy = cy - s * 0.01;
    const pts = heartOutline(n).map(([x, y]) => [cx + x * scale, hy + y * scale]);
    pts.forEach(([x, y], k) => put(f, k, x, y, k < n / 2 ? P.GOLD : P.BLUSH, 1, 2));
    const litAt = local => clamp01((local - 0.42) / 0.58) * 1.12 * n; // how many days are lit
    f.anim = (i, t, p, { local }) => { if (i < n) p.a *= 0.15 + 0.85 * clamp01(litAt(local) - i); };
    const start = Date.parse(data.streak.from);
    const marks = [];
    for (let k = 1; k < n; k++) {
      const d = new Date(start + k * dayMs);
      if (d.getDate() === 1) marks.push([k, MONTHS[d.getMonth()]]);
    }
    f.overlay = (g, w, { local }) => {
      g.globalAlpha = w;
      const lit = litAt(local);
      for (const [k, name] of marks) { // months along the outline, pointing outward from the heart's centre
        const [x, y] = pts[k];
        const dx = x - cx;
        const dy = y - hy;
        const d = Math.hypot(dx, dy) || 1;
        g.globalAlpha = w * (0.25 + 0.75 * clamp01(lit - k));
        line(g, x + (dx / d) * 8, y + (dy / d) * 8, x + (dx / d) * 18, y + (dy / d) * 18, 'rgba(241, 217, 160, 0.7)', 1);
        text(g, name, x + (dx / d) * 34, y + (dy / d) * 30, { size: LABEL * 1.05, spacing: 2, color: 'rgba(241, 217, 160, 0.9)' });
      }
      g.globalAlpha = w;
      const [sx, sy] = pts[0];
      text(g, `day 1 · ${ddmmyyyy(data.streak.from)}`, sx - s * 0.03, sy - s * 0.06, { size: LABEL, align: 'right', spacing: 1.2, color: 'rgba(241, 217, 160, 0.9)' });
      g.globalAlpha = w * clamp01(lit - n + 1);
      text(g, `day ${n} · ${ddmmyyyy(data.streak.to)}`, sx + s * 0.03, sy - s * 0.06, { size: LABEL, align: 'left', spacing: 1.2, color: 'rgb(255 208 220)' });
      g.globalAlpha = w;
      text(g, 'every day', cx, hy + s * 0.06, { size: s * 0.085, font: 'script', color: 'rgba(255, 214, 223, 0.9)' });
      text(g, `${Math.min(n, Math.floor(lit))} of ${n}`, cx, hy + s * 0.15, { size: LABEL * 1.1, spacing: 2.5, color: 'rgba(251, 241, 238, 0.6)' });
    };
    return f;
  }

  const BUILD = { messages: () => timeline(), words: book, voice: wave, calls: rings, love: hearts, first: score, late: trails, streak: heartOfDays };
  return { hidden: timeline(0, 1), list: data.order.map(key => BUILD[key]()) };
}
