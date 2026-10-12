// Time-synced lyrics from an .lrc file.

const LINE_RE = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;

/** @param {string} text @returns {{t:number, text:string}[]} */
export function parseLrc(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.match(LINE_RE))
    .filter(Boolean)
    .map(m => ({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() }))
    .sort((a, b) => a.t - b.t);
}

/** Index of the line active at time t, or -1 before the first line. */
export function lineAt(lines, t) {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * Fetches and parses an .lrc file. The lyrics are optional: no url, a missing file (or an HTML
 * fallback page served in its place) or a file without timed lines all give an empty list.
 * @param {string} [url] @returns {Promise<{t:number, text:string}[]>}
 */
export async function loadLyrics(url) {
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) return [];
    return parseLrc(await res.text());
  } catch {
    return [];
  }
}

/**
 * Keeps the "now playing" strip in sync with the song. Without lyrics the two lines stay empty.
 * @param {{time:number}} song
 * @param {{url?:string, offset:number, nowEl:HTMLElement, prevEl:HTMLElement}} opts
 */
export async function startLyrics(song, { url, offset, nowEl, prevEl }) {
  const lines = await loadLyrics(url);
  if (!lines.length) {
    nowEl.textContent = '';
    prevEl.textContent = '';
    return lines;
  }
  let current = -2;
  const tick = () => {
    const i = lineAt(lines, song.time - offset);
    if (i !== current) {
      current = i;
      prevEl.textContent = i > 0 ? lines[i - 1].text : '';
      nowEl.textContent = i >= 0 ? (lines[i].text || '♪') : '♪';
      nowEl.classList.remove('is-new');
      void nowEl.offsetWidth; // restart the entrance animation
      nowEl.classList.add('is-new');
    }
    requestAnimationFrame(tick);
  };
  tick();
  return lines;
}
