// Finds every asset the site can show by scanning the source for public paths, so the loading
// screens can fetch all of it up front with exact byte totals. Nothing is hand-listed: new art
// referenced anywhere in src/ (or site.html) is picked up on the next build or dev reload.
//
// Two lists, matching what the Pages middleware lets through:
//   gate — public before unlock (/art/gate/, /audio/, /lyrics.lrc), fetched by the first loader
//   site — everything private (/art/, /photos/, /videos/, /private/), fetched after unlock
//
// Template literals such as `/art/tear-${t.tone}-${t.v}.webp` become wildcards and match every
// file on disk with that shape.
import fs from 'node:fs';
import path from 'node:path';

const ASSET_EXT = 'webp|png|jpe?g|avif|gif|svg|mp4|webm|mp3|m4a|json|lrc';
const ROOTS = '(?:art|photos|videos|audio|private)';
// a cache-busting query (keepsakes use "?v=hash") is part of the URL the page asks for, so keep it
const LITERAL_RE = new RegExp(`/${ROOTS}/[\\w\\-./]+?\\.(?:${ASSET_EXT})(?![\\w])(?:\\?[\\w=&.\\-]+)?|/lyrics\\.lrc`, 'g');
const TEMPLATE_RE = /`[^`]*`/g;
const TEMPLATE_PATH_RE = new RegExp(`/${ROOTS}/[^\`\\s'"]*?\\.(?:${ASSET_EXT})`, 'g');
const SCAN_EXT = /\.(js|mjs|css|json|html)$/;

// Files that only run on phones (they never see a loader) or only in dev.
const SKIP = new Set(['src/boot.js', 'sync.html']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every file under public/, as site paths ("/art/x.webp"). */
function publicFiles(publicDir) {
  if (!fs.existsSync(publicDir)) return [];
  return listAll(publicDir).map(f => '/' + path.relative(publicDir, f).split(path.sep).join('/'));
}

function listAll(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listAll(full, out);
    else out.push(full);
  }
  return out;
}

const HOLE = '\u0001';

/** Collapses every `${...}` (nested braces and spaces included) into one HOLE character. */
function punchHoles(tpl) {
  let out = '';
  for (let i = 0; i < tpl.length; i++) {
    if (tpl[i] === '$' && tpl[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < tpl.length && depth) { if (tpl[i] === '{') depth++; else if (tpl[i] === '}') depth--; i++; }
      i -= 1;
      out += HOLE;
    } else out += tpl[i];
  }
  return out;
}

/** A path with holes → regex where each hole matches any run of non-slash characters. */
function holesToRegex(p) {
  const parts = p.split(HOLE).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('[^/]*?')}$`);
}

function referencesIn(text, onDisk) {
  const found = new Set(text.match(LITERAL_RE) || []);
  for (const tpl of text.match(TEMPLATE_RE) || []) {
    if (!tpl.includes('${')) continue;
    for (const p of punchHoles(tpl).match(TEMPLATE_PATH_RE) || []) {
      if (!p.includes(HOLE)) continue;
      const re = holesToRegex(p);
      for (const f of onDisk) if (re.test(f)) found.add(f);
    }
  }
  return found;
}

const isGate = p => p.startsWith('/art/gate/') || p.startsWith('/audio/') || p === '/lyrics.lrc';

/**
 * @param {string} root project root (the folder with index.html)
 * @returns {{ gate: [string, number][], site: [string, number][] }} [path, bytes], in discovery order
 */
export function collectAssets(root) {
  const publicDir = path.join(root, 'public');
  const onDisk = new Set(publicFiles(publicDir));
  const sources = [path.join(root, 'index.html'), ...walk(path.join(root, 'src')), path.join(publicDir, 'private', 'site.html')]
    .filter(f => fs.existsSync(f) && !SKIP.has(path.relative(root, f).split(path.sep).join('/')));

  const seen = new Set();
  const gate = [];
  const site = [];
  for (const file of sources) {
    for (const ref of referencesIn(fs.readFileSync(file, 'utf8'), onDisk)) {
      const diskPath = ref.split('?')[0];
      if (seen.has(ref) || !onDisk.has(diskPath)) continue;
      seen.add(ref);
      const bytes = fs.statSync(path.join(publicDir, diskPath)).size;
      (isGate(ref) ? gate : site).push([ref, bytes]);
    }
  }
  return { gate, site };
}

const VIRTUAL = { 'virtual:gate-assets': 'gate', 'virtual:site-assets': 'site' };

/** Vite plugin: `import GATE from 'virtual:gate-assets'` / `'virtual:site-assets'`. */
export function assetManifest() {
  let root = process.cwd();
  let server = null;
  return {
    name: 'asset-manifest',
    configResolved(config) { root = config.root; },
    configureServer(s) {
      server = s;
      // any edit can add or drop a reference: rebuild the lists on the next request
      const invalidate = () => {
        for (const id of Object.keys(VIRTUAL)) {
          const mod = server.moduleGraph.getModuleById('\0' + id);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
      };
      s.watcher.on('change', invalidate);
      s.watcher.on('add', invalidate);
      s.watcher.on('unlink', invalidate);
    },
    resolveId(id) { return id in VIRTUAL ? '\0' + id : null; },
    load(id) {
      const key = VIRTUAL[id.slice(1)];
      if (!id.startsWith('\0') || !key) return null;
      return `export default ${JSON.stringify(collectAssets(root)[key])};`;
    },
  };
}

// `node scripts/asset-manifest.mjs` prints what each loader will fetch.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('asset-manifest.mjs')) {
  const { gate, site } = collectAssets(process.cwd());
  const mb = list => (list.reduce((s, [, b]) => s + b, 0) / 1e6).toFixed(1);
  const byRoot = list => list.reduce((acc, [p, b]) => { const k = p.split('/')[1]; acc[k] = (acc[k] || 0) + b; return acc; }, {});
  console.log(`gate: ${gate.length} files, ${mb(gate)} MB`, byRoot(gate));
  console.log(`site: ${site.length} files, ${mb(site)} MB`, byRoot(site));
  if (process.argv.includes('--list')) for (const [p, b] of [...gate, ...site]) console.log(String(b).padStart(9), p);
}
