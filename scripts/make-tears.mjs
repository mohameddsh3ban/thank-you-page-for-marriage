// Procedural torn-paper edges, one per chapter tone, so a tear always matches the paper it belongs
// to exactly. Paper fills the bottom of the image; the torn edge runs across the top with a ragged
// white fibre rim (the paper's core, exposed where it ripped) and a few loose fibres.
// The shadow is baked in along the torn edge only (a CSS drop-shadow would also outline the
// straight edge of the strip). Output: public/art/tear-<tone>-<n>.webp (2880 x 150)
import sharp from 'sharp';
import path from 'node:path';

const W = 2880, H = 150, BASE = 62;
const TONES = { cream: '#FBF1EE', night: '#1D2640', morning: '#DCE6F6' };
const RIM = { cream: '#FFFFFF', night: '#C3C8DA', morning: '#FFFFFF' };
const VARIANTS = 3;

function rng(seed) {
  let x = seed;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}
/** smooth 1-D value noise: random points every `step` px, cosine-interpolated */
function noise1d(rand, step) {
  const pts = Array.from({ length: Math.ceil(W / step) + 2 }, () => rand() * 2 - 1);
  return x => {
    const i = Math.floor(x / step), t = (x / step) - i;
    const k = (1 - Math.cos(t * Math.PI)) / 2;
    return pts[i] * (1 - k) + pts[i + 1] * k;
  };
}

function tear(tone, seed) {
  const rand = rng(seed * 7919 + 17);
  const big = noise1d(rand, 520), mid = noise1d(rand, 110), small = noise1d(rand, 22);
  const rimN = noise1d(rand, 34), rimN2 = noise1d(rand, 9);
  const outer = [], inner = [];
  for (let x = 0; x <= W; x += 2) {
    const jag = (rand() - 0.5) * 2.2; // the fine tooth of a hand tear
    const y = BASE + big(x) * 9 + mid(x) * 4.5 + small(x) * 2.4 + jag;
    const rim = Math.max(0.6, 5 + rimN(x) * 5.5 + rimN2(x) * 2); // exposed core, 0..9px
    outer.push([x, y]);
    inner.push([x, y + rim + (rand() - 0.5) * 0.8]);
  }
  const poly = pts => pts.map(([x, y]) => `${x},${y.toFixed(2)}`).join(' ');
  const close = pts => `${poly(pts)} ${W},${H} 0,${H}`;
  // loose fibres poking out of the rim
  let fibres = '';
  for (let i = 0; i < 260; i++) {
    const [x, y] = outer[Math.floor(rand() * outer.length)];
    const len = 1.5 + rand() * 5, a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
    fibres += `<line x1="${x}" y1="${(y + 1).toFixed(1)}" x2="${(x + Math.cos(a) * len).toFixed(1)}" y2="${(y + 1 + Math.sin(a) * len).toFixed(1)}" stroke="${RIM[tone]}" stroke-opacity="${(0.35 + rand() * 0.5).toFixed(2)}" stroke-width="${(0.5 + rand() * 0.7).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><filter id="soft"><feGaussianBlur stdDeviation="0.45"/></filter><filter id="shadow" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>
  <polygon points="${close(outer)}" fill="#1A2236" fill-opacity="0.26" transform="translate(0 -4)" filter="url(#shadow)"/>
  <polygon points="${close(outer)}" fill="#1A2236" fill-opacity="0.22" transform="translate(0 -1)" filter="url(#soft)"/>
  <g filter="url(#soft)">${fibres}<polygon points="${close(outer)}" fill="${RIM[tone]}" fill-opacity="0.94"/></g>
  <polygon points="${close(inner)}" fill="${TONES[tone]}"/>
</svg>`;
}

for (const tone of Object.keys(TONES)) {
  for (let v = 1; v <= VARIANTS; v++) {
    const png = await sharp(Buffer.from(tear(tone, v + tone.length * 13))).png().toBuffer();
    // "-down" is the same tear turned over, for paper hanging from the chapter above. A flipped
    // file (not a CSS rotate) so it can also serve as a mask for art clipped along its edge.
    for (const [suffix, img] of [['', sharp(png)], ['-down', sharp(png).rotate(180)]]) {
      const out = path.resolve(`public/art/tear-${tone}-${v}${suffix}.webp`);
      const info = await img.webp({ quality: 92, alphaQuality: 100, effort: 5 }).toFile(out);
      console.log(path.basename(out), info.width, 'x', info.height, Math.round(info.size / 1024), 'KB');
    }
  }
}
