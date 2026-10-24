import { CONFIG } from './config.js';
import { createSong } from './audio.js';
import { startLyrics } from './lyrics.js';
import { createPhone } from './phone.js';
import { dive } from './dive.js';
import { assetUrl, decoded, preloadAll } from './preload.js';
import { createLoader } from './loader.js';
import GATE_ASSETS from 'virtual:gate-assets';

// Always start at the top (the gate); restored scroll positions also confuse smooth scrolling.
history.scrollRestoration = 'manual';
scrollTo(0, 0);

const $ = sel => document.querySelector(sel);
const gate = $('#gate');
const beginBtn = $('#begin');

const PHONE_DELAY_MS = 850;     // the letter slips away first, then her phone rises
const PHONE_FULL_HOLD_MS = 450; // the moon on her phone stays full for a moment before our photo

$('#np-title').textContent = `Now playing — ${CONFIG.song.title} · ${CONFIG.song.artist}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
// dev shortcuts: /?open skips the gate and every loader (fast iteration on the chapters);
// /?preload skips the gate but runs the private loading screen; /?phone goes straight to her
// phone (no letter, no music)
const DEV_FLAGS = import.meta.env.DEV ? new URLSearchParams(location.search) : new URLSearchParams();
const SKIP_GATE = DEV_FLAGS.has('open') || DEV_FLAGS.has('preload');

/* ---------- loading screen #1: fonts, the gate's art and the whole song, before the gate shows ---------- */
const loader = createLoader($('#loader'));
const FONT_FACES = [
  '400 1em "Celestial Display"', 'italic 400 1em "Celestial Display"', '400 1em "Pinyon Script"',
  '400 1em "Bodoni Moda"', 'italic 400 1em "Bodoni Moda"', '600 1em "Bodoni Moda"',
  '400 1em "Instrument Sans"', '500 1em "Instrument Sans"',
];
const FONT_BYTES = 260_000;      // about what the font files weigh, so they get their share of the bar
const FONT_SHEET_WAIT_MS = 5000; // give up on the Google stylesheet after this (offline, blocked)
const SONG_WAIT_MS = 6000;       // the YouTube fallback can hang; never hold the gate hostage for it
const GATE_KIND = [[/\.lrc$/, 'writing down the words', 2], [/^\/audio\//, 'tuning our song', 3], [/./, 'picking the roses', 1]];

async function loadFonts() {
  // the stylesheet arrives without blocking paint, and its faces only exist once it has applied
  const t0 = performance.now();
  const hasSheet = () => [...document.styleSheets].some(s => s.href?.startsWith('https://fonts.googleapis.com'));
  while (!hasSheet() && performance.now() - t0 < FONT_SHEET_WAIT_MS) await sleep(40);
  await Promise.all(FONT_FACES.map(f => document.fonts.load(f).catch(() => {})));
  document.documentElement.classList.add('fonts-ready');
}

function gateJobs() {
  const kind = url => GATE_KIND.find(([re]) => re.test(url));
  return [...GATE_ASSETS]
    .sort((a, b) => kind(a[0])[2] - kind(b[0])[2])
    .map(([url, bytes]) => ({ url, bytes, label: kind(url)[1] }));
}

// Resolve the song source before the tap so play() runs inside the gesture.
const gateLoaded = SKIP_GATE ? Promise.resolve() : preloadAll(
  [{ bytes: FONT_BYTES, label: 'setting the type', run: loadFonts }, ...gateJobs()],
  p => loader.set(p.progress, p.label),
);
const songReady = gateLoaded
  .then(() => createSong(CONFIG.song, 'yt-host', CONFIG.song.mp3 ? assetUrl(CONFIG.song.mp3) : undefined))
  .catch(err => {
    console.error(err);
    return null;
  });
let song = null;
songReady.then(s => {
  song = s;
  if (import.meta.env.DEV) window.__song = s; // dev-only handle for tests
});

// petals drifting behind the letter
const GATE_PETALS = 9;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const layer = $('#gate-petals');
  for (let i = 0; i < GATE_PETALS; i++) {
    const p = document.createElement('img');
    p.src = `/art/gate/petal-${(i % 6) + 1}.webp`;
    p.alt = '';
    p.style.setProperty('--x', `${Math.round(Math.random() * 100)}vw`);
    p.style.setProperty('--drift', `${Math.round(Math.random() * 30 - 15)}vw`);
    p.style.setProperty('--dur', `${(12 + Math.random() * 9).toFixed(1)}s`);
    p.style.setProperty('--delay', `${(-Math.random() * 20).toFixed(1)}s`);
    p.style.setProperty('--size', `${Math.round(26 + Math.random() * 30)}px`);
    p.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    layer.append(p);
  }
}
// reveal once everything is in and decoded, so nothing pops in half-drawn
async function revealGate() {
  await gateLoaded;
  await Promise.race([songReady, sleep(SONG_WAIT_MS)]);
  await decoded(gate.querySelectorAll('img'));
  await loader.complete();
  loader.hide();
  requestAnimationFrame(() => gate.classList.add('is-ready')); // its own entrance overlaps the fade
}
const gateShown = SKIP_GATE ? null : revealGate();

// The song can't be stopped: the play button only appears when the browser blocked autoplay.
function setPausedUi(paused) {
  document.body.classList.toggle('is-paused', paused);
  $('#player-ctrl').hidden = !paused;
}

/* ---------- step 0: tap the seal → the song starts, her phone rises ---------- */
function begin() {
  beginBtn.disabled = true;
  primeSong(); // inside the tap: Safari only lets sound start in a gesture
  startSong();
  gate.classList.add('is-playing'); // the letter slips away (class name kept for the CSS)
  setTimeout(showPhone, PHONE_DELAY_MS);
}

/* ---------- the song starts with the seal ----------
   prime() starts it silently inside the tap; startSong() rewinds it and fades it in. */
const SONG_FADE_IN_S = 0.4;
let primed = null;
function primeSong() {
  if (!song || song.playing) return;
  primed = song.prime().then(() => true, err => { console.error(err); return false; });
}
async function startSong() {
  if (!song) song = await songReady;
  if (!song) return;
  const playing = await (primed || song.prime().then(() => true, () => false));
  if (playing) {
    song.seek(0);
    song.setVolume(1, SONG_FADE_IN_S);
    setPausedUi(false);
  } else {
    setPausedUi(true);
    $('#gp-hint').textContent = 'music is shy · tap ▶ bottom right';
  }
  startLyrics(song, {
    url: CONFIG.song.lyricsUrl,
    offset: CONFIG.song.lyricOffsetSec,
    nowEl: $('#lyric-now'),
    prevEl: $('#lyric-prev'),
  }).catch(err => console.error(err));
  $('#now-playing').hidden = false;
}

/* ---------- her phone: a note on the lock screen, then she opens it ---------- */
let phone = null;
async function showPhone() {
  phone = createPhone($('#g-phone'));
  phone.show();
  await phone.opened;
  await phone.loading();
  arriveThroughPhone();
}

/* ---------- open: the rest of the site downloads, then the site ---------- */
// The gate only waits for its own art and the song; the site's code, photos, videos and art load
// after it, on her phone's screen.
const SITE_CODE_BYTES = 520_000; // the site's own code + styles, roughly, for their share of the bar
const SITE_KIND = [
  [/^\/private\//, 'gathering every love message', 1], [/^\/art\//, 'pressing the roses', 2],
  [/^\/photos\//, 'developing the photos', 3], [/^\/videos\//, 'rewinding the videos', 4],
];

/** @returns {Promise<{ startSite(song: object | null, opts?: object): void, gsap?: object, setScrollLocked?(on: boolean): void }>} */
async function loadSite() {
  const res = await fetch('/private/site.html', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error(`site.html ${res.status}`);
  $('#site').innerHTML = await res.text(); // our own protected fragment, not user input
  return import('./site.js');
}

/** @param {(progress: number, label: string) => void} onProgress */
async function loadPrivate(onProgress) {
  const { default: assets } = await import('./site-assets.js');
  const kind = url => SITE_KIND.find(([re]) => re.test(url)) || [null, 'opening the museum', 5];
  let mod = null;
  await preloadAll([
    { bytes: SITE_CODE_BYTES, label: 'opening the museum', run: async () => { mod = await loadSite(); } },
    ...[...assets].sort((a, b) => kind(a[0])[2] - kind(b[0])[2]).map(([url, bytes]) => ({ url, bytes, label: kind(url)[1] })),
  ], p => onProgress(p.progress, p.label));
  if (!mod) throw new Error('the site itself did not load');
  return mod;
}

/** Behind whatever covers the screen: swap the gate for the site and build every chapter. */
function buildSite(mod, opts) {
  $('#site').hidden = false;
  document.body.classList.remove('is-locked');
  scrollTo(0, 0);
  mod.gsap?.globalTimeline.pause(); // the hero's entrance waits for the reveal
  mod.startSite(song, opts);
}

async function arriveThroughPhone() {
  let mod;
  try {
    mod = await loadPrivate((p, label) => phone.progress(p, label));
  } catch (err) {
    console.error(err);
    phone.fail('something went wrong · check the wifi', () => { phone.loading(); arriveThroughPhone(); });
    return;
  }
  phone.progress(1);
  await sleep(PHONE_FULL_HOLD_MS);
  document.body.classList.add('is-arriving'); // the site is laid out for measuring, but not drawn until the photo covers it
  buildSite(mod, { arrival: 'phone' });
  mod.setScrollLocked?.(true); // no scrolling away while we fly in
  const heroImg = $('#hero-photo');
  await decoded([heroImg]);
  await phone.showHome(heroImg.currentSrc || heroImg.src, heroImg.alt);
  await dive(phone, {
    gate, target: $('#hero-frame'),
    onCovered: () => {
      document.body.classList.remove('is-arriving');
      gate.classList.add('is-gone');
      mod.gsap?.globalTimeline.resume(); // the hero prints itself in around the landing photo
    },
  });
  mod.setScrollLocked?.(false);
}

/* dev only (/?preload): the private download on the full loading screen, no gate */
async function enterSite() {
  let mod;
  try {
    mod = await loadPrivate((p, label) => loader.set(p, label));
  } catch (err) {
    console.error(err);
    loader.fail('something went wrong · check the wifi', () => { loader.show('site'); enterSite(); });
    return;
  }
  await loader.complete();
  buildSite(mod);
  gate.classList.add('is-gone');
  await decoded(document.querySelectorAll('#hero img'));
  mod.gsap?.globalTimeline.resume();
  loader.hide();
}

$('#toggle-play').addEventListener('click', async () => {
  if (!song || song.playing) return;
  try { await song.play(); song.setVolume(1, SONG_FADE_IN_S); setPausedUi(false); } catch (err) { console.error(err); }
});

beginBtn.addEventListener('click', begin);

// Dev shortcuts (see DEV_FLAGS): no music in either.
if (DEV_FLAGS.has('open')) {
  $('#loader').hidden = true;
  loadSite().then(({ startSite }) => {
    gate.classList.add('is-gone');
    $('#site').hidden = false;
    document.body.classList.remove('is-locked');
    startSite(null);
  });
} else if (DEV_FLAGS.has('preload')) {
  loader.show('site');
  loadFonts();
  enterSite();
} else if (DEV_FLAGS.has('phone')) {
  gateShown.then(() => { gate.classList.add('is-playing'); showPhone(); });
}
