import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { assetManifest } from './scripts/asset-manifest.mjs';

const LRC_PATH = path.resolve('public/lyrics.lrc');
const MAX_LRC_BYTES = 64 * 1024;

// Dev-only endpoint used by sync.html to save re-timed lyrics to public/lyrics.lrc (optional and
// git-ignored: lyrics are copyrighted). Never part of the build.
function lyricsSaver() {
  return {
    name: 'lyrics-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-lyrics', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        req.on('data', c => { body += c; if (body.length > MAX_LRC_BYTES) req.destroy(); });
        req.on('end', () => {
          if (!/^\[\d+:\d+\.\d+\]/m.test(body)) { res.statusCode = 400; return res.end('not an lrc'); }
          if (fs.existsSync(LRC_PATH)) fs.writeFileSync(LRC_PATH + '.bak', fs.readFileSync(LRC_PATH));
          fs.writeFileSync(LRC_PATH, body);
          res.end('saved');
        });
      });
    },
  };
}

// Everything that belongs to the site behind the gate (site.js + its CSS + shared deps it pulls in
// only after unlocking) is emitted under assets/private/, which the Pages middleware protects.
const isPrivate = name => /^(site|sections|content)/.test(name || '');

export default defineConfig({
  plugins: [lyricsSaver(), assetManifest()], // assetManifest: the lists the loading screens fetch
  server: { port: Number(process.env.PORT) || 5173 }, // PORT lets parallel preview servers pick their own
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: chunk => (isPrivate(chunk.name) ? 'assets/private/[name]-[hash].js' : 'assets/[name]-[hash].js'),
        assetFileNames: asset => (isPrivate(asset.names?.[0]) ? 'assets/private/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
});
