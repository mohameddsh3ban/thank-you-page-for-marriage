import { createStipple } from '../stipple.js';
import { gsap, ScrollTrigger, addScrollGate, wantedScroll } from '../scroll.js';
import { FIRST_NIGHT } from '../content/chat-lines.js';

// Where each beat starts along the pinned scroll (0..1): her story · my yes · her message + the years of
// messages that followed · our day (the app swipes home to the lock screen).
const BEATS = [0, 0.16, 0.32, 0.86];
const PIN_LENGTH = '+=460%';
// The chapter plays on its own clock: however fast the page is scrolled, the whole story takes at
// least this long, and scrolling is held back until the animation catches up (rewinding is quicker).
const PLAY_SECONDS = 12;
const REWIND_SPEEDUP = 3;
const SCROLL_LEAD = 0.05; // how far (in pin progress) scrolling may run ahead of the animation
// inside beat 3: the thread opens first, then the flood runs between these two points
const FLOW_START = 0.16;
const FLOW_END = 0.94;
// her face for the Instagram avatar (story ring, Dynamic Island, the DM thread)
const AVATAR = '/photos/mm-17.t.webp';

// The flood (content/chat-lines.js): her first message, my reply, then the years that followed.
const CHIPS = { 4: '23:48', 10: '02:13', 16: '16:30', 21: '01:07' }; // time slipping by between runs
const CLOCK_START = 9 * 60 + 41;
const CLOCK_END = 7 * 60 + 6; // lands one minute before the 07:07 on the lock screen
const CLOCK_DAYS = 17; // whole days the status-bar clock races through during the flood
const CLOCK_SPIN_MIN = CLOCK_DAYS * 1440 + ((CLOCK_END - CLOCK_START + 1440) % 1440);

// sparkles around the phone on our day: [left %, top %, size px, delay s]
const SPARKLES = [[10, 12, 34, 0], [88, 6, 24, 0.5], [6, 58, 22, 1.1], [93, 44, 38, 0.3], [16, 90, 28, 0.8], [84, 86, 22, 1.4], [50, -2, 18, 1.9]];
const STAR_PATH = 'M0-48 4-6 46 0 4 6 0 48-4 6-46 0-4-6Z';

function addSparkles(stage) {
  const layer = document.createElement('div');
  layer.className = 'origin-sparkles';
  layer.setAttribute('aria-hidden', 'true');
  // static markup built from the constants above (no outside input)
  layer.innerHTML = SPARKLES.map(([x, y, s, d]) =>
    `<svg viewBox="-50 -50 100 100" style="left:${x}%;top:${y}%;--s:${s}px;--d:${d}s"><path d="${STAR_PATH}"/></svg>`).join('');
  stage.append(layer);
}

/** Builds the message nodes; returns them in the order they arrive. */
async function buildFlow(flow) {
  const lines = FIRST_NIGHT;
  const nodes = [];
  lines.forEach(([who, text], i) => {
    if (CHIPS[i]) {
      const chip = document.createElement('p');
      chip.className = 'chip';
      chip.textContent = CHIPS[i];
      nodes.push(chip);
    }
    const msg = document.createElement('p');
    msg.className = `msg ${who === 1 ? 'from-her' : 'from-me'}`; // not .her: that is #07's class
    msg.textContent = text;
    // the last bubble of a run gets the tail (and her avatar)
    const nextWho = lines[i + 1]?.[0];
    if (nextWho !== who || CHIPS[i + 1]) msg.classList.add('tail');
    nodes.push(msg);
  });
  flow.append(...nodes);
  return nodes;
}

const clock = minutes => {
  const m = Math.floor(minutes) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

let played = 0;
/** How far #02's story has played (0..1). #03's phone takes over only once this is 1 (numbers-fly.js). */
export const originPlayed = () => played;

export async function initOrigin() {
  const section = document.getElementById('origin');
  const phone = document.getElementById('origin-phone');
  const steps = section.querySelector('.origin-steps');
  const items = [...steps.children];
  const bars = [...section.querySelectorAll('.story-bars i')];
  const flowEl = document.getElementById('dm-flow');
  const timeEl = section.querySelector('.ip-time');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addSparkles(section.querySelector('.iphone-stage'));

  section.querySelectorAll('.ig-avatar').forEach(img => { img.src = AVATAR; img.decoding = 'async'; });
  section.querySelector('.ig-dm').style.setProperty('--her-avatar', `url("${AVATAR}")`);

  createStipple(document.getElementById('story-rose'), '/art/rose-src.webp', { revealMs: 2200 })
    .then(rose => ScrollTrigger.create({ trigger: section, start: 'top 60%', once: true, onEnter: () => rose.reveal() }))
    .catch(err => console.error(err));

  let flowNodes = [];
  let shown = -1;
  const setFlow = q => {
    const t = Math.min(1, Math.max(0, (q - FLOW_START) / (FLOW_END - FLOW_START)));
    const count = Math.round(t * flowNodes.length);
    if (count !== shown) {
      flowNodes.forEach((n, i) => n.classList.toggle('is-in', i < count));
      flowEl.classList.toggle('is-flowing', count > 0);
      shown = count;
    }
    timeEl.textContent = count > 0 ? clock(CLOCK_START + t * CLOCK_SPIN_MIN) : clock(CLOCK_START);
  };

  let lastP = 0;
  const setProgress = p => {
    lastP = p;
    let current = 1;
    BEATS.forEach((start, i) => {
      const on = p >= start;
      section.classList.toggle(`s${i + 1}`, on);
      if (on) current = i + 1;
    });
    items.forEach((li, i) => {
      li.classList.toggle('is-current', i + 1 === current);
      li.classList.toggle('is-reached', i + 1 < current);
    });
    steps.style.setProperty('--rail', p.toFixed(3));
    // the story's progress bars run while her story is on screen (beats 1–2)
    const storyP = Math.min(1, p / BEATS[2]);
    bars.forEach((b, i) => b.style.setProperty('--p', Math.min(1, Math.max(0, storyP * bars.length - i)).toFixed(3)));
    setFlow((p - BEATS[2]) / (BEATS[3] - BEATS[2]));
  };

  buildFlow(flowEl)
    .then(nodes => { flowNodes = nodes; shown = -1; setProgress(reduced ? 1 : lastP); })
    .catch(err => console.error('origin flow', err));

  if (reduced) { setProgress(1); return; }
  setProgress(0);

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const pin = ScrollTrigger.create({ id: 'origin-pin', trigger: section, start: 'top top', end: PIN_LENGTH, pin: section.querySelector('.origin-pin') }); // #03's phone takes over where this pin ends

  // the shown progress chases where the reader is heading, never faster than PLAY_SECONDS allows
  let shownP = 0;
  const span = () => pin.end - pin.start;
  gsap.ticker.add((time, deltaMs) => {
    const goal = Math.min(1, Math.max(0, (wantedScroll() - pin.start) / span()));
    const diff = goal - shownP;
    if (Math.abs(diff) < 0.0005) return;
    const step = (deltaMs / 1000) / PLAY_SECONDS;
    shownP += diff > 0 ? Math.min(diff, step) : Math.max(diff, -step * REWIND_SPEEDUP);
    played = shownP;
    setProgress(shownP);
    tl.progress(shownP);
  });
  // ...and the page can't scroll past the pinned story faster than it plays
  addScrollGate(y => {
    // no hold once it has played, before it starts, or if a nav jump already landed past it
    if (shownP >= 1 || y <= pin.start || pin.scroll() > pin.end) return y;
    return Math.min(y, pin.start + (shownP + SCROLL_LEAD) * span());
  }, () => pin.end + innerHeight); // a big flick finishes just past the chapter, not chapters later
  // the phone turns slowly toward her as the story goes on; light slides across the glass
  tl.fromTo(phone, { rotationY: -18, rotationX: 7, rotationZ: -2 }, { rotationY: 9, rotationX: -2, rotationZ: 1.5, duration: 1 }, 0)
    .fromTo(phone.querySelector('.ip-glare'), { '--glare': '-45%' }, { '--glare': '45%', duration: 1 }, 0)
    .fromTo('.origin-ghost', { x: 60, y: 30 }, { x: -60, y: -40, duration: 1 }, 0); // centred by CSS translate
}
