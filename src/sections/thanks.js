import { ScrollTrigger } from '../scroll.js';
import { parseLrc } from '../lyrics.js';
import { CONFIG } from '../config.js';
import { loadCards } from './days-cards.js';

const FADE_MS = 700;
const LEAD_IN_S = 2.2;      // start a little before the line so the music breathes in
const SAFETY_MS = 6000;     // reveal anyway if the line never arrives (paused, seek failed…)
const CHORUS_GAP_S = 20;      // a longer gap between "thank you" lines means a new chorus

/**
 * The last chorus: "thank you" lines come in blocks; return the first line of the last block.
 * Optional: with no lyrics file (or one without timestamps) the chapter simply reveals on arrival.
 */
async function findFinalChorus() {
  const url = CONFIG.song?.lyricsUrl;
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const hits = parseLrc(await res.text()).filter(l => /thank you/i.test(l.text));
  if (!hits.length) return null;
  let start = hits.length - 1;
  while (start > 0 && hits[start].t - hits[start - 1].t < CHORUS_GAP_S) start -= 1;
  return hits[start];
}

/** @param {{ playing:boolean, time:number, seek(t:number):void, setVolume(v:number, s?:number):void } | null} song */
export function initThanks(song) {
  const section = document.getElementById('thanks');
  const reveal = () => section.classList.add('is-in');
  const chorusReady = findFinalChorus().catch(() => null);

  // every day in the ledger got its own thank you: say how many, and send her back to them
  const count = document.getElementById('thanks-count');
  loadCards().then(({ total }) => {
    if (!total || !count) return;
    count.textContent = `and ${new Intl.NumberFormat('en').format(total)} more · one for every day we wrote · they’re waiting in the ledger`;
    count.hidden = false;
  });

  ScrollTrigger.create({
    trigger: section, start: 'top 45%', once: true,
    onEnter: async () => {
      const chorus = await chorusReady;
      if (!song || !song.playing || !chorus) { reveal(); return; }
      // fade out, jump to the last chorus, fade back in — the title lands on the sung "thank you"
      song.setVolume(0, FADE_MS / 1000);
      setTimeout(() => {
        song.seek(Math.max(0, chorus.t - LEAD_IN_S));
        song.setVolume(1, FADE_MS / 1000);
        const started = performance.now();
        const wait = () => {
          if (song.time >= chorus.t - 0.05 || performance.now() - started > SAFETY_MS) reveal();
          else requestAnimationFrame(wait);
        };
        wait();
      }, FADE_MS);
    },
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: true,
    onUpdate: self => section.style.setProperty('--zoom', (1.15 - self.progress * 0.15).toFixed(3)),
  });
}
