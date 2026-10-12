// assets-src/art/*.png -> public/art/*.webp (resized). The full-size source PNGs are not in the repo
// (the optimised webps in public/art/ are); drop your own sources into assets-src/art/ to rebuild them.
// Engravings ("-src") stay lossless-ish
// because the stipple/ASCII renderers sample them; photos get normal quality.
// Full-bleed skies ("sky-") keep more pixels because they cover the whole viewport.
// Pass names to only rebuild those: `node scripts/optimize-art.mjs hand-adam sky-a`.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('assets-src/art');
const OUT = path.resolve('public/art');
const MAX_EDGE = 1600;
const SKY_MAX_EDGE = 2560;
const only = new Set(process.argv.slice(2));

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(SRC).filter(f => f.endsWith('.png'))) {
  const name = path.basename(file, '.png');
  if (only.size && !only.has(name)) continue;
  const isEngraving = name.endsWith('-src');
  const edge = name.startsWith('sky-') ? SKY_MAX_EDGE : MAX_EDGE;
  const out = path.join(OUT, `${name}.webp`);
  const info = await sharp(path.join(SRC, file))
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: isEngraving ? 90 : 78, effort: 5 })
    .toFile(out);
  console.log(`${name}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
