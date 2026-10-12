// Builds public/private/site.html (the markup behind the gate) from the chapter fragments in
// site-src/, in file-name order. Edit the fragments, then run: node scripts/assemble-site.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('site-src');
const OUT = path.resolve('public/private/site.html');

const parts = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).sort();
const html = parts.map(f => `<!-- ${f} -->\n${fs.readFileSync(path.join(SRC, f), 'utf8').trim()}\n`).join('\n');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`site.html ← ${parts.length} fragment(s): ${parts.join(', ')}`);
