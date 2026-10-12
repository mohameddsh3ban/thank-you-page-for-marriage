// Optional: fetches time-synced lyrics for your song from LRCLIB (lrclib.net) into public/lyrics.lrc,
// for your own copy of the site. Lyrics are copyrighted, so that file is git-ignored: keep it local
// (or deploy it privately behind the gate), never commit it to a public repo.
// Usage: node scripts/fetch-lyrics.mjs            (searches CONFIG.song's title + artist)
//        node scripts/fetch-lyrics.mjs <lrclibId>  (a specific track, if the search picks the wrong one)
// Then fine-tune the timing against your mp3 at http://localhost:5173/sync.html (dev only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'lyrics.lrc');
const HEADERS = { 'User-Agent': 'thank-you-page-for-marriage (lyrics fetch script)' };

async function getTrack(id) {
  if (id) {
    const res = await fetch(`https://lrclib.net/api/get/${id}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`LRCLIB ${res.status} for id ${id}`);
    return res.json();
  }
  const q = new URLSearchParams({ track_name: CONFIG.song.title, artist_name: CONFIG.song.artist });
  const res = await fetch(`https://lrclib.net/api/search?${q}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`LRCLIB search ${res.status}`);
  const hits = (await res.json()).filter(t => t.syncedLyrics);
  for (const t of hits.slice(0, 8)) console.log(`  ${t.id}  ${t.trackName} — ${t.artistName} (${t.duration}s)`);
  if (!hits.length) throw new Error(`No synced lyrics found for "${CONFIG.song.title}" — ${CONFIG.song.artist}`);
  return hits[0];
}

const track = await getTrack(process.argv[2] ? Number(process.argv[2]) : null);
if (!track.syncedLyrics) throw new Error(`Track ${track.id} has no synced lyrics`);
fs.writeFileSync(OUT, track.syncedLyrics);
const lines = track.syncedLyrics.split('\n').filter(l => /^\[\d+:\d+/.test(l)).length;
console.log(`Saved ${lines} timed lines from "${track.trackName}" — ${track.artistName} (${track.duration}s, id ${track.id}) to ${OUT}`);
