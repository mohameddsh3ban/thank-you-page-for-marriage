// The first seconds of #03's phone, between #02's lock screen and the first number, as one timeline:
// a swipe up unlocks it and #02's Instagram conversation comes back exactly where it was left; the
// home gesture sends it back into its icon; a fingertip pages through the home screen until it
// finds WhatsApp and opens it; my chat (MY_CONTACT_NAME) is tapped, I'm typing, my message arrives (a
// few lines about how much I miss her); my name is tapped and my profile slides in: that profile is
// the first number's screen. numbers-fly.js plays it on a smoothed clock (set(t), t = 0..1).
//
// Motion rules, so it feels like a real phone: whatever a finger drags follows it 1:1, then settles
// on its own; apps fly in and out of their icons on one continuous path (centre-origin transforms);
// only transform and opacity animate (plus two tiny highlights), so it stays smooth.
import { gsap } from '../scroll.js';
import { CONFIG } from '../config.js';
import { MISS_YOU, MY_CONTACT_NAME } from '../content/miss-you.js';
import { FIRST_NIGHT, RECENT } from '../content/chat-lines.js';
import { buildHome, tileCentre, TILE_CQW, PLACE } from './numbers-phone-home.js';

// used only if #02's conversation can't be found (it is cloned from #02 at the hand-over)
const IG_FALLBACK = FIRST_NIGHT.slice(-5);
const EARLIER = 9;          // recent lines above my new message (older ones scroll off the top)
const SKELETON_ROWS = 4;    // other chats in her list: shapes only, never invented people
// the screen, in cqw of its width: content height = (146.6/71.6 - 0.078) / 0.922 widths (see .gp-device/.gp-screen)
const SCREEN_H = 213.6;
// where the fingertip touches, in cqw of the screen
const ROW_AT = [46, 66];
const HEADER_AT = [36, 19];
const HOME_BAR = [50, 206];
const SWIPE_FROM = 82, SWIPE_DRAG = 42, SWIPE_Y = 120;
// #02 closes its DM by shrinking it to the home bar (origin.css, .origin.s4 .ig-dm): we reopen from there
const FROM_HOME_BAR = { yPercent: 34, scale: 0.28 };
// An app's corners while it flies in or out of its icon: the screen's own corner radius, so at full
// size they are hidden by the screen's rounded edge and the radius never has to animate (no repaints).
const APP_RADIUS = '14cqw';
const SETTLE = 'expo.out';          // things let go of by the finger, settling like iOS springs
const PUSH = 'power4.out';          // navigation pushes

const hhmm = d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
const dmy = iso => iso.slice(0, 10).split('-').reverse().join('.');
/** Transform that puts a centre-origin full-screen app exactly over the icon centred at (x, y) cqw. */
const atIcon = ([x, y]) => ({ xPercent: x - 50, yPercent: ((y - SCREEN_H / 2) / SCREEN_H) * 100, scale: TILE_CQW / 100 });

/** The newest lines of ours, oldest first. */
async function loadEarlier() {
  return RECENT.slice(-EARLIER);
}

/**
 * @param {{ h: Function, icon: Function, myAvatar(cls?: string): HTMLImageElement }} ui
 * @param {HTMLElement} root     the phone (is-locked hides the status bar clock, like iOS)
 * @param {HTMLElement} profile  the first number's screen (my contact info), pushed in at the end
 */
export function buildIntro(ui, root, profile) {
  const { h, icon } = ui;
  const now = new Date();

  // ---- Instagram: #02's conversation, cloned from #02 at the hand-over (see syncFromOrigin)
  const ig = h('div', 'np-app np-intro app-ig',
    h('div', 'np-ig-head', icon('back'), h('span', 'np-ig-who', h('b', '', CONFIG.herName.toLowerCase()), h('small', '', 'Active now'))),
    h('div', 'np-ig-thread', ...IG_FALLBACK.map(([who, text]) => h('p', `np-ig-msg ${who === 1 ? 'is-out' : 'is-in'}`, text))));

  // ---- her home screen (three pages; WhatsApp on the last)
  const home = buildHome(h);

  // ---- WhatsApp: her chat list, my chat on top with my new message
  const myRow = h('div', 'np-wa-row is-mine', ui.myAvatar('np-wa-avatar'),
    h('span', 'np-wa-text', h('b', '', MY_CONTACT_NAME), h('span', '', MISS_YOU.split('\n')[0])),
    h('span', 'np-wa-meta', h('small', '', hhmm(now)), h('i', 'np-wa-badge', '1')));
  const skeletons = Array.from({ length: SKELETON_ROWS }, () => h('div', 'np-wa-row is-blank', h('i', 'np-wa-avatar'), h('span', 'np-wa-text', h('i'), h('i'))));
  const list = h('div', 'np-app np-intro app-walist',
    h('div', 'np-nav', h('span', 'np-link', icon('more')), h('b', 'np-nav-title', ''), h('span', 'np-nav-right', icon('compose'))),
    h('h4', 'np-large', 'Chats'),
    h('div', 'np-wa-search', icon('search'), 'Search'),
    h('div', 'np-wa-chips', h('span', 'is-on', 'All'), h('span', '', 'Unread'), h('span', '', 'Favourites'), h('span', '', 'Groups')),
    myRow, ...skeletons);

  // ---- WhatsApp: the chat, then my message arriving
  const online = h('span', 'is-online', 'online');
  const typingLabel = h('span', 'is-typing', 'typing…');
  const header = h('div', 'np-wa-head', icon('back'), ui.myAvatar('np-wa-head-avatar'),
    h('span', 'np-wa-who', h('b', '', MY_CONTACT_NAME), h('small', 'np-wa-status', online, typingLabel)), icon('video'), icon('phone'));
  const earlier = h('div', 'np-wa-earlier');
  loadEarlier().then(items => {
    let day = '';
    for (const [who, iso, text] of items) {
      if (iso.slice(0, 10) !== day) { day = iso.slice(0, 10); earlier.append(h('p', 'np-wa-chip', dmy(iso))); }
      earlier.append(h('p', `np-wa-msg ${who === 1 ? 'is-out' : 'is-in'}`, text, h('small', '', iso.slice(11, 16))));
    }
  }).catch(err => console.error('numbers phone chat', err));
  const typing = h('p', 'np-wa-msg is-in np-wa-typing', h('i'), h('i'), h('i'));
  const message = h('p', 'np-wa-msg is-in np-wa-new', MISS_YOU, h('small', '', hhmm(now)));
  // each grows from nothing, pushing the older messages up like a real chat
  const typingSlot = h('div', 'np-wa-slot', typing);
  const messageSlot = h('div', 'np-wa-slot', message);
  const chat = h('div', 'np-app np-intro app-wachat',
    header,
    h('div', 'np-wa-body', earlier, h('p', 'np-wa-chip', 'Today'), typingSlot, messageSlot),
    h('div', 'np-wa-input', icon('plus'), h('span', 'np-wa-field'), icon('video'), icon('phone')));

  // ---- her fingertip
  const touch = h('i', 'np-touch');

  // ---------------- the timeline (seconds) ----------------
  const igIcon = atIcon(tileCentre(PLACE.instagram));
  const waAt = tileCentre(PLACE.whatsapp);
  const waIcon = atIcon(waAt);
  const lockscreen = root.querySelector('.np-lockscreen');
  const wall = root.querySelector('.np-wall');
  const apps = root.querySelector('.np-apps');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });

  const fingerDown = (at, [x, y]) => tl
    .set(touch, { '--tx': x, '--ty': y }, at)
    .fromTo(touch, { opacity: 0, scale: 1.35 }, { opacity: 0.9, scale: 1, duration: 0.16, ease: 'power2.out' }, at);
  const fingerUp = at => tl.to(touch, { opacity: 0, scale: 1.2, duration: 0.22, ease: 'power1.out' }, at);
  const tap = (at, xy) => { fingerDown(at, xy); tl.to(touch, { scale: 0.82, duration: 0.1, ease: 'power1.in' }, at + 0.18); fingerUp(at + 0.3); };
  /** Drag the pages one page left: they follow the finger 1:1, then settle on the next page. */
  const swipe = (at, page) => {
    const start = -100 * (page - 1);
    fingerDown(at, [SWIPE_FROM, SWIPE_Y]);
    tl.to(touch, { '--tx': SWIPE_FROM - SWIPE_DRAG, duration: 0.42, ease: 'power1.inOut' }, at + 0.12)
      .fromTo(home.track, { xPercent: start }, { xPercent: start - SWIPE_DRAG, duration: 0.42, ease: 'power1.inOut', immediateRender: false }, at + 0.12)
      .to(home.track, { xPercent: -100 * page, duration: 0.6, ease: SETTLE }, at + 0.54)
      .to(home.dots[page - 1], { opacity: 0.35, duration: 0.18 }, at + 0.54)
      .to(home.dots[page], { opacity: 1, duration: 0.18 }, at + 0.54);
    fingerUp(at + 0.54);
  };

  // starting state: #02's lock screen on top; everything else waiting where it comes from
  tl.set(lockscreen, { opacity: 1, yPercent: 0 }, 0)
    .set(wall, { yPercent: 0 }, 0)
    .set(apps, { opacity: 1, scale: 1 }, 0)
    .set([ig, list], { borderRadius: APP_RADIUS }, 0)
    .set(ig, { opacity: 0, xPercent: 0, ...FROM_HOME_BAR }, 0)
    .set([home.node, chat], { opacity: 0 }, 0)
    .set([home.node, list, chat], { visibility: 'hidden' }, 0)
    .set(home.node, { scale: 1.06, filter: 'brightness(1)' }, 0)
    .set(home.track, { xPercent: 0 }, 0)
    .set(home.dots, { opacity: 0.35 }, 0).set(home.dots[0], { opacity: 1 }, 0)
    .set(home.tiles.instagram, { opacity: 1 }, 0)
    .set(home.tiles.whatsapp, { scale: 1, filter: 'brightness(1)' }, 0)
    .set(list, { opacity: 0, ...waIcon, filter: 'brightness(1)' }, 0)
    .set(chat, { xPercent: 100, filter: 'brightness(1)' }, 0)
    .set(touch, { opacity: 0 }, 0)
    .set([typing, typingLabel], { opacity: 0 }, 0)
    .set([typingSlot, messageSlot], { gridTemplateRows: '0fr' }, 0)
    .set(message, { opacity: 0, yPercent: 0, scale: 1 }, 0)
    .set(profile, { '--intro-x': '100%' }, 0)
    .set([myRow, header], { backgroundColor: 'rgba(44,44,46,0)' }, 0)
    // first paints, staggered into quiet moments ahead of each screen's entrance
    .set(ig, { visibility: 'inherit' }, 0)
    .set(home.node, { visibility: 'inherit' }, 1.5)
    .set(list, { visibility: 'inherit' }, 4.9)
    .set(chat, { visibility: 'inherit' }, 7.9);

  // 1 · swipe up to unlock: the lock screen rides up with the finger, and #02's Instagram comes back
  //     out of the home bar, the way #02 put it away
  fingerDown(0.35, HOME_BAR);
  tl.to(touch, { '--ty': 118, duration: 0.6, ease: 'power1.out' }, 0.45)
    .to([lockscreen, wall], { yPercent: -100, duration: 0.85, ease: 'power3.inOut' }, 0.45)
    .to(lockscreen, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0.45)
    .to(ig, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0.62)
    .to(ig, { yPercent: 0, scale: 1, duration: 0.85, ease: SETTLE }, 0.62);
  fingerUp(1.0);
  // 2 · the home gesture: the app follows the finger up and shrinks, then flies home into its icon
  fingerDown(2.55, HOME_BAR);
  tl.to(touch, { '--ty': 150, duration: 0.4, ease: 'power1.out' }, 2.65)
    .to(ig, { yPercent: -12, scale: 0.72, duration: 0.4, ease: 'power1.out' }, 2.65)
    .to(home.node, { opacity: 1, scale: 1, duration: 0.7, ease: SETTLE }, 2.7)
    .set(home.tiles.instagram, { opacity: 0 }, 2.7)
    .to(ig, { ...igIcon, duration: 0.62, ease: SETTLE }, 3.05)
    .to(home.tiles.instagram, { opacity: 1, duration: 0.14 }, 3.42)
    .to(ig, { opacity: 0, duration: 0.14 }, 3.45);
  fingerUp(3.05);
  // 3 · paging through until WhatsApp shows up
  swipe(4.15, 1);
  swipe(5.55, 2);
  // 4 · tap WhatsApp: the icon dips, the app grows out of it, the home screen falls back behind
  tap(6.85, waAt);
  tl.to(home.tiles.whatsapp, { scale: 0.9, filter: 'brightness(0.6)', duration: 0.12, ease: 'power1.in' }, 6.98)
    .to(home.tiles.whatsapp, { scale: 1, filter: 'brightness(1)', duration: 0.25 }, 7.15)
    .to(list, { opacity: 1, duration: 0.1 }, 7.15)
    .to(list, { xPercent: 0, yPercent: 0, scale: 1, duration: 0.75, ease: SETTLE }, 7.15)
    .to(home.node, { scale: 1.07, filter: 'brightness(0.55)', duration: 0.75, ease: SETTLE }, 7.15)
    .set(home.node, { opacity: 0 }, 7.95);
  // 5 · tap my chat: the row lights up, the chat is pushed in over the list
  tap(8.5, ROW_AT);
  tl.to(myRow, { backgroundColor: 'rgba(44,44,46,1)', duration: 0.08 }, 8.66)
    .set(chat, { opacity: 1 }, 8.82)
    .to(chat, { xPercent: 0, duration: 0.7, ease: PUSH }, 8.82)
    .to(list, { xPercent: -30, filter: 'brightness(0.45)', duration: 0.7, ease: PUSH }, 8.82)
    .set(list, { opacity: 0 }, 9.6);
  // 6 · I'm typing…, then my message arrives
  tl.to(typingSlot, { gridTemplateRows: '1fr', duration: 0.4, ease: 'power2.out' }, 9.8)
    .to([typing, typingLabel], { opacity: 1, duration: 0.25 }, 9.85)
    .to(online, { opacity: 0, duration: 0.25 }, 9.8)
    .to([typing, typingLabel], { opacity: 0, duration: 0.2 }, 11.2)
    .to(typingSlot, { gridTemplateRows: '0fr', duration: 0.35, ease: 'power2.inOut' }, 11.25)
    .to(online, { opacity: 1, duration: 0.25 }, 11.3)
    .to(messageSlot, { gridTemplateRows: '1fr', duration: 0.65, ease: 'power3.out' }, 11.25)
    .fromTo(message, { opacity: 0, yPercent: 16, scale: 0.88 }, { opacity: 1, yPercent: 0, scale: 1, duration: 0.65, ease: 'back.out(1.4)' }, 11.3);
  // 7 · (she reads it) then my name is tapped and my profile slides in
  tap(15.35, HEADER_AT);
  tl.to(header, { backgroundColor: 'rgba(42,57,66,1)', duration: 0.08 }, 15.5)
    .to(profile, { '--intro-x': '0%', duration: 0.8, ease: PUSH }, 15.66)
    .to(chat, { xPercent: -30, filter: 'brightness(0.45)', duration: 0.8, ease: PUSH }, 15.66)
    .set(chat, { opacity: 0 }, 16.46)
    .to({}, { duration: 0.35 }, 16.46); // a breath on the profile before the number rolls in

  /** Put #02's DM, as it is right now, inside the Instagram screen ("where we left off"). */
  function syncFromOrigin() {
    const dm = document.querySelector('#origin .ig-dm');
    if (!dm) return;
    const copy = dm.cloneNode(true);
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    copy.classList.add('np-ig-dm');
    ig.replaceChildren(copy);
  }

  const screens = [ig, home.node, list, chat];
  let done = null;
  return {
    screens, touch, syncFromOrigin,
    /** Seconds the whole intro lasts at its natural speed. */
    duration: tl.duration(),
    /** @param {number} t 0..1 along the intro */
    set(t) {
      tl.progress(t);
      root.classList.toggle('is-locked', t * tl.duration() < 0.8);
      const finished = t >= 1;
      if (finished !== done) {
        done = finished;
        for (const n of screens) n.classList.toggle('is-done', finished); // out of the way of the numbers
      }
    },
    get done() { return done === true; },
  };
}
