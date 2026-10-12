// Turns your own photos into what the site serves: public/photos/<name>.webp (max 1400px on the long
// edge) + <name>.t.webp (a 480px thumbnail), EXIF rotation applied and metadata (GPS!) stripped.
// Prints ready-to-paste { src, thumb, caption } items for src/content/chapter-photos.js.
// Usage: node scripts/import-photos.mjs <photo or folder> ... [--prefix us]
//   --prefix us  names the files us-01.webp, us-02.webp … instead of after the originals
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('public', 'photos');
const MAX_EDGE = 1400;
const THUMB_EDGE = 480;
const IMAGE = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;

const args = process.argv.slice(2);
const pi = args.indexOf('--prefix');
const prefix = pi >= 0 ? args.splice(pi, 2)[1] : null;
const files = args.flatMap(a => (fs.statSync(a).isDirectory()
  ? fs.readdirSync(a).filter(f => IMAGE.test(f)).sort((x, y) => x.localeCompare(y, 'en', { numeric: true })).map(f => path.join(a, f))
  : [a]));
if (!files.length) { console.error('Usage: node scripts/import-photos.mjs <photo or folder> ... [--prefix name]'); process.exit(1); }

const slug = f => path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
fs.mkdirSync(OUT, { recursive: true });
const items = [];
for (const [i, file] of files.entries()) {
  const base = prefix ? `${prefix}-${String(i + 1).padStart(2, '0')}` : slug(file);
  const img = sharp(file).rotate(); // respect the phone's EXIF orientation; output carries no metadata
  await img.clone().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, `${base}.webp`));
  await img.clone().resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toFile(path.join(OUT, `${base}.t.webp`));
  items.push({ src: `/photos/${base}.webp`, thumb: `/photos/${base}.t.webp`, caption: '' });
  console.error(`${path.basename(file)} -> ${base}.webp`);
}
console.log(JSON.stringify(items, null, 2));
