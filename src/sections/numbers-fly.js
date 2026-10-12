// The phone's trip from #02 into #03. #02 ends on its lock screen (07:07, our day); when its pin lets
// go, #03's phone (numbers-phone.js) takes over at exactly that spot and tilt, so #02's own phone can
// hide. While #03 rises it glides to its place left of the stars and plays its intro
// (numbers-phone-intro.js: Instagram, home screen, WhatsApp, my chat, my message, my profile = the
// first number). It stays put through #03's pinned scenes and scrolls away after them.
//
// Like #02, the trip plays on its own clock, at the intro's natural speed at most, and the page waits
// for it (so the message gets read). The clock has momentum: it speeds up and slows down smoothly
// instead of following every wheel tick, so nothing on the phone ever jumps. Scrolling back rewinds.
import { gsap, ScrollTrigger, addScrollGate, wantedScroll } from '../scroll.js';
import { originPlayed } from './origin.js';

const SLOT_TILT = { x: 3, y: -9, z: -1.2 }; // degrees: turned a little toward the stars on the right
const ARC_PX = 46;            // the glide dips a little on its way down, like it's being carried
const GONE_AFTER_VH = 1.15;   // after #03, how far it scrolls away before it's hidden
const PERSPECTIVE_PX = 1500;
// keep in sync with .nphone in numbers-phone.css: --pw = min(280px, (100svh - 300px) / 2.05), left 30vw, top 50svh + 14px - pw * 1.0235
const SLOT_MAX_W = 280, SLOT_V_ROOM = 300, SLOT_H_RATIO = 2.05, SLOT_X = 0.3, SLOT_DROP = 14, DEVICE_ASPECT = 146.6 / 71.6;  // same as #02's .iphone-stage, so the hand-over tilt matches exactly
const REWIND_SPEEDUP = 3;
const CATCH_UP = 1.6;         // 1/s: how hard the clock leans toward where she is (it slows down near it)
const ACCEL = 5;              // 1/s: how quickly the clock's speed changes (momentum)
const LIFT = 0.035;           // the phone grows this much mid-flight, as if lifted toward her
const SCROLL_LEAD = 0.04;     // how far (in trip progress) scrolling may run ahead of the phone
const JUMP_PAST_VH = 1;
const ORIGIN_DONE = 0.999;    // #02's progress counts as finished from here (it settles a hair under 1)       // landing this far past the trip (a nav jump) skips straight to the end

const clamp01 = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * @param {{ root: HTMLElement, device: HTMLElement, setIntro(t: number): void, introSeconds: number }} phone
 * @param {{ originPin: ScrollTrigger, numbersPin: ScrollTrigger, introShare: number }} opts
 *   introShare: the part of #03's pin before its first number (the phone finishes its intro there)
 */
export function initPhoneFlight(phone, { originPin, numbersPin, introShare }) {
  const originPhone = document.getElementById('origin-phone');
  const originStage = originPhone.parentElement;
  const originShadow = originStage.querySelector('.iphone-shadow');
  const { root, device } = phone;

  let handedOver = null;
  let from = null; // #02's phone at the hand-over (measured once, not every frame)
  let slot = null; // where it lands (measured on refresh)
  const handOver = on => {
    if (on === handedOver) return;
    handedOver = on;
    from = null;
    root.classList.toggle('is-on', on);
    originPhone.style.visibility = on ? 'hidden' : '';
    if (originShadow) originShadow.style.visibility = on ? 'hidden' : '';
  };

  // scroll positions: #02 lets go → #03 pins → #03's first number → #03 lets go
  const marks = () => {
    const o = originPin.end, ns = numbersPin.start, ne = numbersPin.end;
    return { o, ns, ne, end: ns + introShare * (ne - ns) };
  };

  /** #02's phone as it stood while pinned (its section has since scrolled up by `since` px). */
  function originBox(since) {
    const stage = originStage.getBoundingClientRect();
    return {
      x: stage.left + originPhone.offsetLeft, y: stage.top + originPhone.offsetTop + since,
      w: originPhone.offsetWidth, h: originPhone.offsetHeight,
      rx: gsap.getProperty(originPhone, 'rotationX'), ry: gsap.getProperty(originPhone, 'rotationY'), rz: gsap.getProperty(originPhone, 'rotation'),
    };
  }

  /** Where the phone sits in #03, from the same formula as .nphone's CSS (no layout read). */
  function slotBox() {
    const pw = Math.min(SLOT_MAX_W, (innerHeight - SLOT_V_ROOM) / SLOT_H_RATIO);
    const h = pw * DEVICE_ASPECT;
    return { x: innerWidth * SLOT_X - pw / 2, y: innerHeight / 2 + SLOT_DROP - pw * 1.0235, w: pw, h };
  }

  let last = '';
  /** @param {number} y page scroll  @param {number} t trip progress (0..1, on the trip's own clock) */
  function place(y, t) {
    const key = `${Math.round(y)}|${t.toFixed(5)}`;
    if (key === last) return; // nothing moved: no style writes, no layout
    last = key;
    const { o, ns, ne, end } = marks();
    if (y < o || y > ne + innerHeight * GONE_AFTER_VH) { handOver(false); return; }
    // measure #02's phone before changing anything, so the read doesn't force a page layout
    const freshFrom = !handedOver && !from ? originBox(y - o) : null;
    handOver(true);
    if (freshFrom) from = freshFrom;
    phone.setIntro(t);
    const arrive = (ns - o) / Math.max(1, end - o); // the glide ends as #03 pins
    const e = easeInOut(clamp01(t / arrive));
    if (y > ne) {
      root.style.transform = `translate3d(0, ${-(y - ne)}px, 0)`; // scrolling away with #03
    } else if (e >= 1) {
      root.style.transform = 'none';
    } else {
      from ||= originBox(y - o);
      slot ||= slotBox();
      const dx = from.x + from.w / 2 - (slot.x + slot.w / 2);
      const dy = from.y + from.h / 2 - (slot.y + slot.h / 2);
      const s = lerp(from.w / slot.w, 1, e) * (1 + LIFT * Math.sin(Math.PI * e));
      root.style.transform = `translate3d(${lerp(dx, 0, e)}px, ${lerp(dy, 0, e) + Math.sin(Math.PI * e) * ARC_PX}px, 0) scale(${s})`;
      root.style.perspective = `${PERSPECTIVE_PX / s}px`; // scaling the wrapper scales its perspective too: undo that
      device.style.transform = `rotate(${lerp(from.rz, SLOT_TILT.z, e)}deg) rotateY(${lerp(from.ry, SLOT_TILT.y, e)}deg) rotateX(${lerp(from.rx, SLOT_TILT.x, e)}deg)`;
      return;
    }
    root.style.perspective = `${PERSPECTIVE_PX}px`;
    device.style.transform = `rotate(${SLOT_TILT.z}deg) rotateY(${SLOT_TILT.y}deg) rotateX(${SLOT_TILT.x}deg)`;
  }

  // the trip's own clock: it heads for where she is scrolling, never faster than the intro's natural
  // speed, and with momentum, so starts and stops ease in and out
  let shownT = 0;
  let speed = 0; // progress per second
  let synced = false; // #02's conversation copied into the phone's Instagram (done as #02 finishes, not at the hand-over)
  gsap.ticker.add((time, deltaMs) => {
    const { o, end } = marks();
    const y = window.scrollY;
    const played = originPlayed();
    if (!synced && played >= ORIGIN_DONE) { phone.syncFromOrigin(); synced = true; } // Instagram reopens exactly where #02 left it
    else if (synced && played < ORIGIN_DONE - 0.01) synced = false; // #02 rewound: copy it again when it ends
    const goal = clamp01((wantedScroll() - o) / Math.max(1, end - o));
    const dt = Math.min(deltaMs, 100) / 1000;
    const rate = 1 / phone.introSeconds;
    if (y > end + innerHeight * JUMP_PAST_VH) { shownT = goal; speed = 0; } // jumped in from the chapter menu
    const diff = goal - shownT;
    const wanted = Math.max(-rate * REWIND_SPEEDUP, Math.min(rate, diff * CATCH_UP));
    speed += (wanted - speed) * (1 - Math.exp(-dt * ACCEL));
    shownT = clamp01(shownT + speed * dt);
    if (Math.abs(diff) < 0.0003 && Math.abs(speed) < 0.001) { shownT = goal; speed = 0; }
    if (import.meta.env.DEV && typeof window.__phoneT === 'number') shownT = window.__phoneT; // dev: hold a frame for tests
    if (handedOver || y >= o - 1) place(y, shownT);
  });
  // ...and the page can't run past the trip faster than it plays
  addScrollGate(y => {
    const { o, end } = marks();
    // #02's phone must be at rest on 07:07 before this one takes its place: no hand-over mid-animation
    if (y > o && window.scrollY <= o + 1 && originPlayed() < ORIGIN_DONE) return Math.min(y, o);
    if (shownT >= 1 || y <= o || window.scrollY > end) return y;
    return Math.min(y, o + (shownT + SCROLL_LEAD) * (end - o));
  }, () => marks().end + innerHeight);
  ScrollTrigger.addEventListener('refresh', () => { slot = null; from = null; last = ''; place(window.scrollY, shownT); });
}
