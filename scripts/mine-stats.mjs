// Mines the numbers chapter from your WhatsApp export (+ the media files it references, if exported
// with media). Writes chat-report.json next to the export (the full report — it quotes your messages,
// so it stays in the git-ignored chat-export/) and src/content/chat-numbers.json (what the site shows).
// Setup (export location, CHAT_ME / CHAT_HER) is described in scripts/lib/chat.mjs.
// Usage: CHAT_ME="Mark" CHAT_HER="Mia" node scripts/mine-stats.mjs   (SKIP_VIDEO=1 skips ffprobe)
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseChat, norm, EXPORT_DIR } from './lib/chat.mjs';
import { LOVE_SAID, MISS_SAID, MORNING, NIGHT, SORRY, ADORE, isNegatedOrQuoted, patternFor } from './lib/phrases.mjs';

const run = promisify(execFile);
const REPORT = path.join(EXPORT_DIR, 'chat-report.json');
const NUMBERS = path.resolve('src', 'content', 'chat-numbers.json');

const CONVERSATION_GAP_MIN = 180; // silence that makes the next message a conversation starter
const REPLY_WINDOW_MIN = 12 * 60; // replies slower than this are a new conversation, not a reply
const HOLE_DAYS = 21; // silences longer than this are listed as gaps in the export

const msgs = parseChat();
const sent = msgs.filter(m => m.kind !== 'missed-call');
const pair = () => ({ him: 0, her: 0 });
const inc = (o, who, by = 1) => { o[who] += by; };

/* ---------- counts by kind ---------- */
const byKind = {};
for (const m of msgs) (byKind[m.kind] ||= pair())[m.who] += 1;

/* ---------- words & characters ---------- */
const words = pair();
const chars = pair();
const longest = { him: null, her: null };
for (const m of sent) {
  if (!m.text) continue;
  const n = m.text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
  inc(words, m.who, n);
  inc(chars, m.who, m.text.length);
  if (m.kind === 'text' && (!longest[m.who] || n > longest[m.who].words)) {
    longest[m.who] = { words: n, day: m.day, preview: m.text.slice(0, 160) };
  }
}

/* ---------- days ---------- */
const dayCounts = new Map();
for (const m of sent) dayCounts.set(m.day, (dayCounts.get(m.day) || 0) + 1);
const days = [...dayCounts.keys()].sort();
const DAY_MS = 86400000;
const toDate = d => new Date(`${d}T12:00:00`);
const spanDays = Math.round((toDate(days.at(-1)) - toDate(days[0])) / DAY_MS) + 1;
let streak = { len: 1, from: days[0], to: days[0] };
let curLen = 1, curFrom = days[0];
const holes = [];
for (let i = 1; i < days.length; i++) {
  const gap = Math.round((toDate(days[i]) - toDate(days[i - 1])) / DAY_MS);
  if (gap === 1) {
    curLen += 1;
    if (curLen > streak.len) streak = { len: curLen, from: curFrom, to: days[i] };
  } else {
    curLen = 1; curFrom = days[i];
    if (gap > HOLE_DAYS) holes.push({ from: days[i - 1], to: days[i], days: gap - 1 });
  }
}
const busiestDay = [...dayCounts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([day, n]) => ({ day, n }));
const monthCounts = {};
for (const m of sent) { const k = m.day.slice(0, 7); monthCounts[k] = (monthCounts[k] || 0) + 1; }
const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([month, n]) => ({ month, n }));

/* ---------- hours ---------- */
const hours = Array(24).fill(0);
for (const m of sent) hours[m.hour] += 1;
const lateNight = pair(); // 00:00–04:59
for (const m of sent) if (m.hour < 5) inc(lateNight, m.who);
const latestHourShare = Math.round((hours.slice(0, 5).reduce((a, b) => a + b, 0) / sent.length) * 1000) / 10;

/* ---------- rhythm: starters, replies, double texts ---------- */
const starters = pair();
const replyGaps = { him: [], her: [] };
let run1 = { who: null, len: 0 };
const longestRun = { him: { len: 0 }, her: { len: 0 } };
for (let i = 0; i < sent.length; i++) {
  const m = sent[i], prev = sent[i - 1];
  const gapMin = prev ? (m.at - prev.at) / 60000 : Infinity;
  if (gapMin >= CONVERSATION_GAP_MIN) inc(starters, m.who);
  if (prev && prev.who !== m.who && gapMin < REPLY_WINDOW_MIN) replyGaps[m.who].push(gapMin);
  if (run1.who === m.who) run1.len += 1; else run1 = { who: m.who, len: 1, day: m.day };
  if (run1.len > longestRun[m.who].len) longestRun[m.who] = { len: run1.len, day: run1.day };
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const within = (a, lim) => Math.round((a.filter(x => x <= lim).length / a.length) * 1000) / 10;
const replies = {
  him: { median: median(replyGaps.him), within1min: within(replyGaps.him, 1), n: replyGaps.him.length },
  her: { median: median(replyGaps.her), within1min: within(replyGaps.her, 1), n: replyGaps.her.length },
};

/* ---------- phrases (context aware) ---------- */
function countPhrase(table) {
  const msgsHit = pair();
  const daysHit = new Set();
  const firsts = { him: null, her: null };
  for (const m of sent) {
    if (!m.text) continue;
    const t = norm(m.text);
    const pat = patternFor(table, m.who);
    const hit = pat.exec(t);
    pat.lastIndex = 0;
    if (!hit || isNegatedOrQuoted(t, hit.index)) continue;
    inc(msgsHit, m.who);
    daysHit.add(m.day);
    firsts[m.who] ||= { day: m.day, text: m.text.slice(0, 140) };
  }
  return { msgs: msgsHit, days: daysHit.size, firsts };
}
const love = countPhrase(LOVE_SAID);
const miss = countPhrase(MISS_SAID);
const morning = countPhrase(MORNING);
const night = countPhrase(NIGHT);
const sorry = countPhrase(SORRY);
const adore = countPhrase(ADORE);

/* ---------- emoji ---------- */
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const PICTO = /\p{Extended_Pictographic}/u;
const HEART = /^(❤|♥|🧡|💛|💚|💙|💜|🖤|🤍|🤎|💕|💞|💓|💗|💖|💘|💝|❣|💟|❤‍🔥|❤‍🩹|🩷|🩵|🩶)$/u;
const emoji = { him: {}, her: {} };
const emojiTotal = pair();
const hearts = pair();
for (const m of sent) {
  if (!m.text) continue;
  for (const { segment } of seg.segment(m.text)) {
    if (!PICTO.test(segment)) continue;
    const e = segment.replace(/[️\u{1F3FB}-\u{1F3FF}]/gu, '');
    emoji[m.who][e] = (emoji[m.who][e] || 0) + 1;
    inc(emojiTotal, m.who);
    if (HEART.test(e)) inc(hearts, m.who);
  }
}
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12);
const em = (who, e) => emoji[who][e] || 0;

/* ---------- voice notes: real durations from the Ogg/Opus files ---------- */
function opusSeconds(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const head = Buffer.alloc(Math.min(size, 512));
    fs.readSync(fd, head, 0, head.length, 0);
    const oh = head.indexOf('OpusHead');
    const preSkip = oh >= 0 ? head.readUInt16LE(oh + 10) : 0;
    const tailLen = Math.min(size, 65536);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, size - tailLen);
    const at = tail.lastIndexOf('OggS');
    if (at < 0) return null;
    const granule = Number(tail.readBigInt64LE(at + 6));
    return Math.max(0, (granule - preSkip) / 48000);
  } finally {
    fs.closeSync(fd);
  }
}
const voiceSec = pair();
const voiceFound = pair();
let longestVoice = { sec: 0 };
for (const m of msgs) {
  if (m.kind !== 'voice' && m.kind !== 'audio') continue;
  const f = path.join(EXPORT_DIR, m.file);
  if (!fs.existsSync(f)) continue;
  const s = opusSeconds(f);
  if (s == null || s > 4 * 3600) continue;
  inc(voiceSec, m.who, s);
  inc(voiceFound, m.who);
  if (s > longestVoice.sec) longestVoice = { sec: Math.round(s), who: m.who, day: m.day, file: m.file };
}

/* ---------- videos: durations via ffprobe ---------- */
async function videoSeconds(file) {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const s = parseFloat(stdout);
    return Number.isFinite(s) ? s : null;
  } catch { return null; }
}
const videoSec = pair();
const videoFound = pair();
// SKIP_VIDEO=1 skips ffprobe (minutes on Windows); video durations only feed the private report
const vids = process.env.SKIP_VIDEO ? [] : msgs.filter(m => m.kind === 'video' && fs.existsSync(path.join(EXPORT_DIR, m.file)));
const CONCURRENCY = 8;
for (let i = 0; i < vids.length; i += CONCURRENCY) {
  const batch = vids.slice(i, i + CONCURRENCY);
  const secs = await Promise.all(batch.map(m => videoSeconds(path.join(EXPORT_DIR, m.file))));
  batch.forEach((m, j) => { if (secs[j] != null) { inc(videoSec, m.who, secs[j]); inc(videoFound, m.who); } });
}

/* ---------- report ---------- */
const total = o => o.him + o.her;
const round = o => ({ him: Math.round(o.him), her: Math.round(o.her) });
const report = {
  generatedAt: new Date().toISOString(),
  source: { first: days[0], last: days.at(-1), spanDays, rawItems: msgs.length },
  definitions: {
    messages: 'every item either of you sent: texts, photos, videos, voice notes, stickers, files, deleted and undecryptable ones; missed-call events excluded',
    words: 'whitespace-separated tokens containing a letter or digit, in text messages and media captions',
    love: 'messages saying I love you in any spelling (i love you / love you / luv u / ily), excluding negations (don\'t love you) and quotes of the other (you said i love you); see scripts/lib/phrases.mjs',
    starters: `first message after ${CONVERSATION_GAP_MIN} min of silence`,
    replies: `time from the other's message to your next one, only when under ${REPLY_WINDOW_MIN / 60}h (minute precision)`,
    calls: 'not in the export (WhatsApp exports never include call logs) — add call hours by hand',
  },
  messages: { ...pair(), ...Object.fromEntries(['him', 'her'].map(w => [w, sent.filter(m => m.who === w).length])) },
  byKind,
  words, chars, longest,
  days: { talked: days.length, span: spanDays, longestStreak: streak, holes, busiestDay, busiestMonth, perTalkedDay: Math.round(sent.length / days.length) },
  hours: { byHour: hours, lateNight, lateNightSharePct: latestHourShare, peakHour: hours.indexOf(Math.max(...hours)) },
  rhythm: { starters, replies, longestRun },
  phrases: { love, adore, miss, morning, night, sorry },
  emoji: { total: emojiTotal, hearts, laugh: { him: em('him', '😂'), her: em('her', '😂') }, kiss: { him: em('him', '😘'), her: em('her', '😘') }, pleading: { him: em('him', '🥹'), her: em('her', '🥹') }, top: { him: top(emoji.him), her: top(emoji.her) } },
  voice: { notes: voiceFound, seconds: round(voiceSec), hours: Math.round(total(voiceSec) / 360) / 10, longest: longestVoice },
  video: { clips: videoFound, seconds: round(videoSec), hours: Math.round(total(videoSec) / 360) / 10 },
  missedCalls: byKind['missed-call'] || pair(),
};
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

// what the site shows — numbers only; copy lives in src/content/stats.js
const numbers = {
  from: days[0], to: days.at(-1),
  messages: report.messages, words, daysTalked: days.length, spanDays,
  streak: streak.len, streakFrom: streak.from, streakTo: streak.to,
  loudestDay: busiestDay[0],
  photos: byKind.photo, videos: byKind.video, voiceNotes: byKind.voice, stickers: byKind.sticker,
  voiceMinutes: { him: Math.round(voiceSec.him / 60), her: Math.round(voiceSec.her / 60) },
  love: love.msgs, loveDays: love.days, adore: adore.msgs, miss: miss.msgs,
  mornings: morning.msgs, morningDays: morning.days, nights: night.msgs, nightDays: night.days,
  sorry: sorry.msgs,
  laugh: report.emoji.laugh, hearts, kisses: report.emoji.kiss,
  lateNight, lateNightSharePct: latestHourShare, peakHour: report.hours.peakHour, byHour: hours,
  starters, replyMedianMin: { him: replies.him.median, her: replies.her.median },
  replyWithinMinutePct: { him: replies.him.within1min, her: replies.her.within1min },
};
fs.mkdirSync(path.dirname(NUMBERS), { recursive: true });
fs.writeFileSync(NUMBERS, JSON.stringify(numbers, null, 2));

console.log(JSON.stringify({ ...report, emoji: { ...report.emoji, top: undefined } }, null, 1));
console.log(`\n→ ${REPORT}\n→ ${NUMBERS}`);
