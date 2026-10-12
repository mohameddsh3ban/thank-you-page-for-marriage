// #03's phone: the same iPhone that told the story in #02, now showing each number the way her phone
// would: WhatsApp, Notes, Voice Memos, a call, a search in our chat, Screen Time, a streak. Every value
// comes from stats.js / chat-numbers.json (and the search results from chat-lines.js).
// numbers-fly.js moves it in from #02; numbers.js tells it which scene is on.
import N from '../content/chat-numbers.json';
import { SCENES, SKY } from '../content/stats.js';
import { el, odometer, fmt } from './numbers-odo.js';
import { PHOTOS } from '../content/chapter-photos.js';
import { MY_AVATAR, MY_CONTACT_NAME } from '../content/miss-you.js';
import { LOVE_LINES } from '../content/chat-lines.js';
import { CONFIG } from '../config.js';
import { buildIntro } from './numbers-phone-intro.js';
import './numbers-phone.css';

const SEARCH = 'love you';
const LOVE_MATCH = /love you/i;
const RESULTS = 6;
const CALL_TICK_MS = 1000;
const MEDIA_THUMBS = 4;
const STREAK_MIN_SHADE = 0.35;            // the quietest day of the streak still shows clearly
const LATE_HOURS = 5;                     // midnight to 5 am
// what the status bar's clock reads on each app (late night's is our busiest hour)
const CLOCK_NOW = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' });

const sum = o => o.him + o.her;
const dmy = iso => iso.slice(0, 10).split('-').reverse().join('.');

// ---- tiny DOM helpers ----
function h(tag, cls, ...kids) {
  const e = el(tag, cls);
  for (const k of kids) if (k !== null && k !== undefined) e.append(k);
  return e;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
// 24×24 line icons, drawn with currentColor
const ICONS = {
  back: ['M15 4 7 12l8 8'],
  phone: ['M5 3.5h3.5l1.8 4.6-2.3 1.6a12 12 0 0 0 6.3 6.3l1.6-2.3 4.6 1.8V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2Z'],
  video: ['M3 7h12v10H3z', 'M15 10.5 21 7v10l-6-3.5'],
  search: ['M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z', 'M15.5 15.5 20 20'],
  share: ['M12 3v12', 'M8 7l4-4 4 4', 'M6 11H5v9h14v-9h-1'],
  more: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z', 'M8 12h.01M12 12h.01M16 12h.01'],
  check: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z', 'M8 12.5l2.7 2.7L16.5 9.5'],
  compose: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  play: ['M8 5v14l11-7z'],
  back15: ['M12 5a7 7 0 1 1-7 7', 'M12 2v6L8 5'],
  fwd15: ['M12 5a7 7 0 1 0 7 7', 'M12 2v6l4-3'],
  speaker: ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 8.5a5 5 0 0 1 0 7', 'M19 6a8.5 8.5 0 0 1 0 12'],
  mute: ['M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z', 'M5.5 11a6.5 6.5 0 0 0 13 0', 'M12 17.5V21', 'M4 3l16 18'],
  plus: ['M12 5v14', 'M5 12h14'],
  keypad: ['M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01'],
  end: ['M3 14.5c5-5 13-5 18 0l-2.5 2.5-3-1.5v-3a10 10 0 0 0-7 0v3l-3 1.5z'],
  up: ['M6 15l6-6 6 6'],
  down: ['M6 9l6 6 6-6'],
  heart: ['M12 20.5S3.5 15.2 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 6-8.5 11.3-8.5 11.3Z'],
  lock: ['M5 10.5h14v10H5z', 'M8 10.5V7.5a4 4 0 0 1 8 0v3'],
};
const FILLED = new Set(['play', 'end', 'heart']);
function icon(name, cls = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `np-i ${FILLED.has(name) ? 'is-fill' : ''} ${cls}`.trim());
  for (const d of ICONS[name]) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
const navBar = (back, title, right) => h('div', 'np-nav', h('span', 'np-back', icon('back'), back || ''), h('b', 'np-nav-title', title || ''), h('span', 'np-nav-right', ...(right || [])));
const big = (s, label) => {
  const odo = odometer(s.n, s.suffix);
  odo.root.classList.add('np-odo');
  return { odo, node: h('div', 'np-big', odo.root, label ? h('span', 'np-big-label', label) : null) };
};
const split = (her, him) => {
  const bar = h('div', 'np-split', h('i', 'np-split-her'), h('i', 'np-split-me'));
  bar.style.setProperty('--her', (her / (her + him)).toFixed(4));
  return bar;
};
const legend = (her, him, unit = '') => h('div', 'np-legend',
  h('span', 'np-key is-her', `you ${fmt.format(her)}${unit}`), h('span', 'np-key is-me', `me ${fmt.format(him)}${unit}`));
const cell = (label, value, sub) => h('div', 'np-cell', h('span', 'np-cell-label', label, sub ? h('small', '', sub) : null), h('span', 'np-cell-value', value));

// ---- one builder per scene ----
const BUILD = {
  messages(s, ctx) {
    const b = big(s, 'messages');
    const tiles = [['phone', 'Audio'], ['video', 'Video'], ['search', 'Search']].map(([i, t]) => h('span', 'np-tile', icon(i), t));
    return { odo: b.odo, node: h('div', 'np-app app-whatsapp',
      navBar('', 'Contact info', [h('span', 'np-link', 'Edit')]),
      h('div', 'np-profile', ctx.myAvatar(), h('b', 'np-name', MY_CONTACT_NAME), h('span', 'np-sub', `${dmy(N.from)} → ${dmy(N.to)}`)),
      h('div', 'np-tiles', ...tiles),
      h('div', 'np-group', h('p', 'np-caption', 'Messages'), b.node, split(N.messages.her, N.messages.him), legend(N.messages.her, N.messages.him)),
      h('div', 'np-group np-media', h('div', 'np-media-head', h('span', '', 'Media, links and docs'), h('span', 'np-cell-value', `${fmt.format(sum(N.photos) + sum(N.videos))} ›`)),
        h('div', 'np-thumbs', ...ctx.thumbs(MEDIA_THUMBS))),
      h('div', 'np-group np-list', cell('Days we talked', fmt.format(N.daysTalked)), cell('Voice notes', fmt.format(sum(N.voiceNotes))), cell('Stickers', fmt.format(sum(N.stickers)))),
    ) };
  },
  words(s) {
    const b = big(s, 'words');
    const novels = Math.round((sum(N.words) / SKY.wordsPerNovel) * 10) / 10;
    const line = (who, n) => h('p', 'np-check', icon('check'), h('span', '', `${who} · ${fmt.format(n)} words`));
    return { odo: b.odo, node: h('div', 'np-app app-notes',
      navBar('Notes', '', [icon('share'), icon('more')]),
      h('p', 'np-note-date', `${dmy(N.from)} → ${dmy(N.to)}`),
      h('h4', 'np-note-title', 'every word'),
      b.node,
      h('p', 'np-note-body', `enough to fill ${novels} novels`),
      line('me', N.words.him), line('you', N.words.her),
      h('p', 'np-note-body is-soft', 'i talk more · you say more'),
      sketch(),
      h('div', 'np-toolbar', icon('check'), icon('compose')),
    ) };
  },
  voice(s) {
    const b = big(s, 'voice notes');
    const hours = Math.round(sum(N.voiceMinutes) / 60);
    const hms = min => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}:00`;
    const memo = (title, sub, dur) => h('div', 'np-memo', h('b', '', title), h('span', 'np-memo-sub', h('span', '', sub), h('span', '', dur)));
    const wave = h('div', 'np-wave');
    for (let i = 0; i < 46; i++) { const bar = el('i'); bar.style.setProperty('--h', (0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 0.75).toFixed(2)); bar.style.setProperty('--d', `${(i % 9) * 0.07}s`); wave.append(bar); }
    return { odo: b.odo, node: h('div', 'np-app app-memos',
      navBar('', '', [h('span', 'np-link', 'Edit')]),
      h('h4', 'np-large', 'All Recordings'),
      h('div', 'np-group np-flat', b.node, h('p', 'np-sub-line', `${hours} hours if you played them all`), split(N.voiceNotes.her, N.voiceNotes.him), legend(N.voiceNotes.her, N.voiceNotes.him)),
      memo('your voice', `${fmt.format(N.voiceNotes.her)} notes`, hms(N.voiceMinutes.her)),
      h('div', 'np-memo is-open', h('b', '', 'mine'), h('span', 'np-memo-sub', h('span', '', `${fmt.format(N.voiceNotes.him)} notes`), h('span', '', hms(N.voiceMinutes.him))),
        wave, h('div', 'np-scrub', h('i')), h('div', 'np-transport', icon('back15'), icon('play'), icon('fwd15'))),
      h('span', 'np-rec'),
    ) };
  },
  calls(s, ctx) {
    const timer = h('span', 'np-call-timer', `${s.n}:00:00`);
    const btn = (i, t, cls = '') => h('span', `np-cbtn ${cls}`, h('span', 'np-cbtn-dot', icon(i)), t);
    const node = h('div', 'np-app app-call',
      h('div', 'np-call-bg', ctx.avatar('np-call-photo')),
      h('div', 'np-call-head', h('b', 'np-call-name', `${CONFIG.herName} ♥`), timer, h('span', 'np-call-note', s.phoneNote || s.note)),
      h('div', 'np-call-grid', btn('speaker', 'audio'), btn('video', 'FaceTime'), btn('mute', 'mute'), btn('plus', 'add'), btn('end', 'end', 'is-end'), btn('keypad', 'keypad')),
    );
    let tick = 0;
    let secs = 0;
    const show = () => {
      const m = Math.floor(secs / 60) % 60;
      timer.textContent = `${s.n + Math.floor(secs / 3600)}:${String(m).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    };
    return {
      node,
      odo: { set(on) { clearInterval(tick); secs = 0; show(); if (on) tick = setInterval(() => { secs += 1; show(); }, CALL_TICK_MS); } },
    };
  },
  love(s, ctx) {
    const b = big(s, 'times you wrote it');
    const thread = h('div', 'np-thread');
    ctx.loveLines.then(lines => {
      lines.forEach(([iso, text], i) => {
        const bubble = h('p', 'np-bubble');
        bubble.style.setProperty('--k', String(i));
        const m = text.match(LOVE_MATCH);
        const at = m ? m.index : -1;
        if (at < 0) bubble.append(text);
        else bubble.append(text.slice(0, at), h('mark', '', text.slice(at, at + m[0].length)), text.slice(at + m[0].length));
        bubble.append(h('small', '', dmy(iso)));
        thread.append(bubble);
      });
    }).catch(err => console.error('numbers phone love', err));
    return { odo: b.odo, node: h('div', 'np-app app-search',
      h('div', 'np-searchbar', h('span', 'np-field', icon('search'), SEARCH, h('i', 'np-caret')), h('span', 'np-link', 'Cancel')),
      thread,
      h('div', 'np-findbar', h('div', 'np-find-count', b.node, h('span', 'np-sub', `me ${fmt.format(N.love.him)} · plus ${fmt.format(N.adore.him)} “i adore you”`)), h('span', 'np-find-arrows', icon('up'), icon('down'))),
    ) };
  },
  first(s) {
    const b = big(s, 'times you texted first');
    const rows = SKY.rows.map(r => {
      const max = Math.max(r.her, r.him);
      const row = h('div', 'np-usage', h('span', 'np-usage-label', r.label),
        h('span', 'np-usage-bars', h('i', 'is-her'), h('i', 'is-me')),
        h('span', 'np-usage-n', `${fmt.format(r.her)} · ${fmt.format(r.him)}`));
      row.style.setProperty('--a', (r.her / max).toFixed(3));
      row.style.setProperty('--b', (r.him / max).toFixed(3));
      return row;
    });
    return { odo: b.odo, node: h('div', 'np-app app-screentime',
      navBar('Settings', '', []),
      h('h4', 'np-large', 'Screen Time'),
      h('div', 'np-seg', h('span', '', 'Week'), h('span', 'is-on', 'All Time')),
      h('div', 'np-group', h('p', 'np-caption', 'Who came back first'), b.node, h('p', 'np-sub-line', `me ${fmt.format(N.starters.him)} · after every silence of 3 hours or more`)),
      h('div', 'np-group', h('p', 'np-caption', 'Most kept score'), ...rows, h('div', 'np-legend', h('span', 'np-key is-her', 'you'), h('span', 'np-key is-me', 'me'))),
    ) };
  },
  late(s) {
    const b = big(s, 'messages after midnight');
    const max = Math.max(...N.byHour);
    const chart = h('div', 'np-chart');
    N.byHour.forEach((n, hr) => {
      const bar = h('i', `${hr < LATE_HOURS ? 'is-late' : ''} ${hr === N.peakHour ? 'is-peak' : ''}`.trim());
      bar.style.setProperty('--v', (n / max).toFixed(3));
      bar.style.setProperty('--i', String(hr));
      chart.append(bar);
    });
    const ampm = hr => `${hr % 12 || 12} ${hr < 12 ? 'am' : 'pm'}`;
    const quiet = N.byHour.indexOf(Math.min(...N.byHour));
    return { odo: b.odo, node: h('div', 'np-app app-screentime',
      navBar('Screen Time', 'All Messages', []),
      h('div', 'np-group', h('p', 'np-caption', 'Midnight to 5 am · all time'), b.node, h('p', 'np-sub-line', `${Math.round(N.lateNightSharePct)}% of everything we sent`),
        chart, h('div', 'np-axis', h('span', '', '12 am'), h('span', '', '6 am'), h('span', '', '12 pm'), h('span', '', '6 pm'))),
      h('div', 'np-group np-list', cell('Busiest hour', ampm(N.peakHour), `${fmt.format(N.byHour[N.peakHour])} messages`),
        cell('Quietest hour', ampm(quiet), `${fmt.format(N.byHour[quiet])} messages`),
        cell('You after midnight', fmt.format(N.lateNight.her)), cell('Me after midnight', fmt.format(N.lateNight.him))),
    ) };
  },
  streak(s) {
    const b = big(s, 'days in a row');
    const grid = h('div', 'np-days');
    const from = new Date(`${N.streakFrom}T12:00`), to = new Date(`${N.streakTo}T12:00`);
    const start = new Date(from); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to monday
    // each day shaded by how much we talked that day, like an activity calendar
    const perDay = new Map(SKY.days.map(([day, n]) => [day, n]));
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const inStreak = SKY.days.filter(([day]) => day >= N.streakFrom && day <= N.streakTo).map(([, n]) => n);
    const most = Math.max(1, ...inStreak);
    let n = 0;
    for (const d = new Date(start); d <= to; d.setDate(d.getDate() + 1)) {
      const on = d >= from;
      const dot = h('i', on ? 'is-on' : '');
      if (on) {
        dot.style.setProperty('--n', String(n++));
        dot.style.setProperty('--shade', (STREAK_MIN_SHADE + (1 - STREAK_MIN_SHADE) * Math.sqrt((perDay.get(iso(d)) || 0) / most)).toFixed(2));
      }
      grid.append(dot);
    }
    const [mornings, nights, loudest, replies] = SCENES.find(x => x.key === 'streak').facts;
    return { odo: b.odo, node: h('div', 'np-app app-streak',
      navBar('Summary', '', []),
      h('h4', 'np-large', 'Streak'),
      h('div', 'np-group np-badge', h('span', 'np-heart', icon('heart')), b.node, h('p', 'np-sub-line', `${dmy(N.streakFrom)} → ${dmy(N.streakTo)} · not one day missed`), grid),
      h('div', 'np-group np-list', cell('good morning', mornings[0], 'mornings'), cell('good night', nights[0], 'nights'),
        cell('loudest day', loudest[0], dmy(N.loudestDay.day)), cell('your replies', replies[0], 'under a minute')),
    ) };
  },
};

/** A little heart drawn with a finger, the way you scribble in Notes. */
function sketch() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 70');
  svg.setAttribute('class', 'np-sketch');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M60 62C38 48 18 36 20 20 22 6 42 4 52 16c4 5 6 9 8 13 2-6 6-13 13-17 11-7 27-2 27 12 0 18-24 30-40 38M88 54c6 2 13 1 20-4');
  path.setAttribute('pathLength', '1');
  svg.append(path);
  return svg;
}

/** Lines where she wrote it, spread across the years. */
async function loadLoveLines() {
  return LOVE_LINES.slice(0, RESULTS);
}

/** The lock screen exactly as #02 leaves it: 07:07 on our day, our photo behind. */
function lockScreen() {
  return h('div', 'np-lockscreen',
    icon('lock', 'np-lock-icon'),
    h('p', 'np-lock-date', 'Saturday, June 7'),
    h('p', 'np-lock-time', '07:07'),
    h('p', 'np-lock-widget', '♥ our wedding day'),
    h('span', 'np-lock-btn is-torch'), h('span', 'np-lock-btn is-cam'));
}

/**
 * @param {{ avatarSrc?: string }} opts
 * @returns {{ root: HTMLElement, device: HTMLElement, setScene(i: number): void, setUnlock(u: number): void }}
 */
export function createNumbersPhone({ avatarSrc }) {
  const ctx = {
    avatar(cls = 'np-avatar') { const img = el('img', cls); img.alt = ''; img.decoding = 'async'; if (avatarSrc) img.src = avatarSrc; return img; },
    myAvatar(cls = 'np-avatar') { const img = el('img', cls); Object.assign(img, { src: MY_AVATAR, alt: '', decoding: 'async' }); return img; },
    loveLines: loadLoveLines(),
    thumbs(count) {
      return (PHOTOS.us || []).filter(p => p.type !== 'video' && p.thumb).slice(0, count).map(p => {
        const img = el('img', 'np-thumb');
        Object.assign(img, { src: p.thumb, alt: '', decoding: 'async' });
        return img;
      });
    },
  };
  const apps = SCENES.map(s => ({ key: s.key, ...BUILD[s.key](s, ctx) }));
  const clock = h('span', 'np-clock', '');
  // the same signal / wifi / battery icons as the gate's phone
  const icons = document.querySelector('#g-phone .gp-icons')?.cloneNode(true) || h('span', 'gp-icons', h('span', 'gp-battery', el('i')));
  const status = h('div', 'gp-status np-status', clock, icons);
  const screen = h('div', 'gp-screen np-screen',
    h('div', 'np-wall'), lockScreen(), h('div', 'np-apps'),
    h('div', 'gp-island'), status, h('span', 'gp-homebar'), h('span', 'np-glare'));
  const device = h('div', 'gp-device np-device',
    h('span', 'gp-btn gp-action'), h('span', 'gp-btn gp-vol-up'), h('span', 'gp-btn gp-vol-down'), h('span', 'gp-btn gp-power'), screen);
  const root = h('div', 'nphone', h('div', 'np-shadow'), device);
  root.setAttribute('aria-hidden', 'true'); // the same numbers are in the chapter's text for screen readers
  const intro = buildIntro({ h, icon, myAvatar: ctx.myAvatar }, root, apps[0].node);
  screen.querySelector('.np-apps').append(...intro.screens, ...apps.map(a => a.node), intro.touch);

  let current = -2;
  const paintClock = () => {
    // one real clock throughout (a phone's clock never jumps between apps)
    const text = CLOCK_NOW.format(new Date());
    if (clock.textContent !== text) clock.textContent = text;
  };
  return {
    root, device,
    /** Pushes the scene's app in (forward) or pops back to it (backward); -1 = the first app, not yet counted. */
    setScene(i) {
      if (i === current) return;
      const shown = Math.max(0, i);
      apps.forEach((a, k) => {
        a.node.classList.toggle('is-on', k === shown);
        a.node.classList.toggle('is-past', k < shown);
        if (k === i) a.odo.set(true); else if (k === current) a.odo.set(false);
      });
      root.dataset.app = apps[shown].key;
      current = i;
      paintClock();
    },
    /** 0 = #02's lock screen … 1 = my profile, the first number (numbers-phone-intro.js). */
    setIntro(t) {
      intro.set(t);
      paintClock();
    },
    /** Seconds the intro lasts at its natural speed (numbers-fly.js plays it on its own clock). */
    introSeconds: intro.duration,
    /** Copy #02's Instagram conversation into the intro (called at the hand-over). */
    syncFromOrigin: intro.syncFromOrigin,
  };
}
