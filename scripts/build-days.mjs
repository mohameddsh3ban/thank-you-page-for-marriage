// Builds src/content/days.json (the ledger of days) from your WhatsApp export: one row per day you
// talked. Setup (export location, CHAT_ME / CHAT_HER) is described in scripts/lib/chat.mjs.
// Usage: CHAT_ME="Mark" CHAT_HER="Mia" node scripts/build-days.mjs
//   [0] messages  [1] photos  [2] voice notes  [3] messages from him (hers = [0] - [3])
//   [4] messages sent after midnight that night, before we fell asleep
//   [5] times "i love you" was said that day (each in their own spelling, negation aware)
//   [6] when the day began: the first message after we woke up (minutes past midnight)
//   [7] last message that calendar day (minutes past midnight)
//   [8] 24 digits, one per hour: how busy that hour was (0 silent .. 9 very loud)
//   [9] when we fell asleep that night (minutes past this day's midnight, so 1690 = 04:10 the
//       next morning; -1 if we can't tell)
//   [10] who woke up and texted first (0 him, 1 her)
// Couples talk through the night, so a calendar day doesn't start at 00:00. "Waking up" is the
// message after the longest silence between 04:00 and 20:00, and "falling asleep" is the message
// before the longest silence between 20:00 and 14:00 the next day.
import fs from 'node:fs';
import path from 'node:path';
import { parseChat, norm } from './lib/chat.mjs';
import { LOVE_SAID, isNegatedOrQuoted, patternFor } from './lib/phrases.mjs';

const OUT = path.resolve('src', 'content', 'days.json');
const HOUR_STEPS = [0, 2, 5, 10, 20, 40, 70, 120, 200]; // upper bounds for hour digits 0..8; above = 9
const MIN_SLEEP_MS = 2 * 3600e3;                         // a silence shorter than this isn't a night's sleep
const WAKE_WINDOW = [4, 20];                             // hours of the day a wake-up can happen in
const SLEEP_WINDOW = [20, 24 + 14];                      // hours (from this day's midnight) a sleep can start in
const HOUR_MS = 3600e3;

const hourDigit = n => {
  const i = HOUR_STEPS.findIndex(max => n <= max);
  return i === -1 ? 9 : i;
};
const midnight = key => new Date(`${key}T00:00:00`).getTime();
const minutesOf = m => m.hour * 60 + m.minute;

const sent = parseChat().filter(m => m.kind !== 'missed-call');
const t = sent.map(m => m.at.getTime());
const rows = {};
const hours = {};
const firstIdx = {};
for (const [i, m] of sent.entries()) {
  const r = (rows[m.day] ||= [0, 0, 0, 0, 0, 0, -1, 0, '', -1, 0]);
  firstIdx[m.day] ??= i;
  r[0] += 1;
  if (m.kind === 'photo') r[1] += 1;
  if (m.kind === 'voice') r[2] += 1;
  if (m.who === 'him') r[3] += 1;
  r[7] = Math.max(r[7], minutesOf(m));
  (hours[m.day] ||= new Array(24).fill(0))[m.hour] += 1;
  if (m.text) {
    const s = norm(m.text);
    const hit = patternFor(LOVE_SAID, m.who).exec(s);
    if (hit && !isNegatedOrQuoted(s, hit.index)) r[5] += 1;
  }
}

/** index of the message with the longest silence on one side, among messages inside [from, to) */
function longestSilence(from, to, side) {
  let best = -1, bestGap = 0;
  let i = t.findIndex(x => x >= from);
  if (i === -1) return -1;
  for (; i < t.length && t[i] < to; i++) {
    const gap = side === 'before' ? (i > 0 ? t[i] - t[i - 1] : Infinity) : (i < t.length - 1 ? t[i + 1] - t[i] : 0);
    if (gap > bestGap) { bestGap = gap; best = i; }
  }
  return bestGap >= MIN_SLEEP_MS ? best : -1;
}

for (const [day, r] of Object.entries(rows)) {
  const m0 = midnight(day);
  r[8] = hours[day].map(hourDigit).join('');

  const wake = longestSilence(m0 + WAKE_WINDOW[0] * HOUR_MS, m0 + WAKE_WINDOW[1] * HOUR_MS, 'before');
  const opener = wake !== -1 ? sent[wake] : sent[firstIdx[day]];
  r[6] = minutesOf(opener);
  r[10] = opener.who === 'her' ? 1 : 0;

  const sleep = longestSilence(m0 + SLEEP_WINDOW[0] * HOUR_MS, m0 + SLEEP_WINDOW[1] * HOUR_MS, 'after');
  if (sleep === -1) continue;
  r[9] = Math.round((t[sleep] - m0) / 60e3);
  // everything between midnight and falling asleep is that night's "after midnight"
  const nextMidnight = m0 + 24 * HOUR_MS;
  for (let i = sleep; i >= 0 && t[i] >= nextMidnight; i--) r[4] += 1;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows));
const all = Object.values(rows);
const count = f => all.filter(f).length;
console.log(`${all.length} days · ${count(r => r[5] > 0)} love days · ${count(r => r[9] >= 1440)} nights past midnight · ${count(r => r[9] >= 1440 + 180)} past 3am → ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
