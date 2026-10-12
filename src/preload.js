// Fetches a list of assets up front with byte-level progress, so nothing pops in later.
// Videos and the song are kept in memory as blob URLs (instant start, instant seeking); everything
// else lands in the browser cache and is read back from there by the page. Every fetch revalidates
// (cache: 'no-cache'), so a redeploy never leaves stale art behind and a second visit costs only 304s.

const KEEP_IN_MEMORY = /\.(mp4|webm|mp3|m4a)$/i;
const CONCURRENCY = 10; // production is HTTP/2, so small files should not queue behind big ones
const STALL_MS = 20000; // a fetch that receives nothing for this long is given up on

const blobs = new Map(); // site path -> blob: URL

/** The in-memory copy of a preloaded video or song, or the path itself. */
export function assetUrl(path) {
  return blobs.get(path) || path;
}

/** @param {string} url @param {(bytes: number) => void} onBytes */
async function fetchAsset(url, onBytes) {
  const ctrl = new AbortController();
  let timer = 0;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), STALL_MS); };
  arm();
  try {
    const res = await fetch(url, { cache: 'no-cache', credentials: 'same-origin', signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const keep = KEEP_IN_MEMORY.test(url);
    const chunks = [];
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arm();
      onBytes(value.byteLength);
      if (keep) chunks.push(value);
    }
    if (keep) blobs.set(url, URL.createObjectURL(new Blob(chunks, { type: res.headers.get('content-type') || '' })));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @typedef {{ bytes: number, label: string, url?: string, run?: () => Promise<unknown> }} Job
 *   `url` jobs are fetched; `run` jobs (fonts, code) are awaited and count as `bytes` when done.
 * @param {Job[]} jobs started in order, a few at a time
 * @param {(p: { progress: number, label: string }) => void} onProgress
 * @returns {Promise<{ failed: string[] }>} what could not be loaded (the page still works without it)
 */
export async function preloadAll(jobs, onProgress) {
  const total = jobs.reduce((s, j) => s + j.bytes, 0) || 1;
  const finished = new Array(jobs.length).fill(false);
  const failed = [];
  let loaded = 0;
  let next = 0;
  let first = 0; // earliest unfinished job: its label is the one shown, so labels only move forward

  const report = () => {
    while (first < jobs.length && finished[first]) first += 1;
    onProgress({ progress: Math.min(1, loaded / total), label: jobs[Math.min(first, jobs.length - 1)]?.label || '' });
  };

  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      const job = jobs[i];
      let counted = 0;
      const onBytes = n => {
        const add = Math.min(n, job.bytes - counted); // a file that grew since the build can't overshoot
        counted += add;
        loaded += add;
        report();
      };
      try {
        if (job.run) await job.run();
        else await fetchAsset(job.url, onBytes);
      } catch (err) {
        failed.push(job.url || job.label);
        console.warn('preload:', job.url || job.label, err);
      }
      loaded += job.bytes - counted; // settle the job's full share (compressed bodies, failures)
      finished[i] = true;
      report();
    }
  }

  report();
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return { failed };
}

/** Wait for images to be decoded (so the first frame after the loader is fully painted), but never long. */
export function decoded(imgs, timeoutMs = 1500) {
  const all = Promise.all([...imgs].filter(img => img.src).map(img => img.decode().catch(() => {})));
  return Promise.race([all, new Promise(r => setTimeout(r, timeoutMs))]);
}
