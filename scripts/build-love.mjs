// Builds public/private/love.json (the love-messages chapter, also searched by the numbers phone)
// from your WhatsApp export: every "i love you", "i miss you", sweet line and long love letter
// either of you sent, with its time.
//
//   1. node scripts/build-love.mjs            → writes love.json, plus chat-export/love-candidates.json
//                                               (every kept line with its id and a little context)
//   2. read the candidates; put the ids of lines you'd rather not show in chat-export/love-skip.json
//      (a JSON array, e.g. [120, 4711]) and run it again. Explicit lines are always left out.
// Setup (export location, CHAT_ME / CHAT_HER) is described in scripts/lib/chat.mjs.
//
// Output: { generatedAt, fields, cats, counts: { total, him, her, byCat, years }, items: [[who, time, cat, text]] }
import fs from 'node:fs';
import path from 'node:path';
import { parseChat, norm, EXPORT_DIR } from './lib/chat.mjs';
import { LOVE_SAID, MISS_SAID, isNegatedOrQuoted, patternFor } from './lib/phrases.mjs';

const OUT = path.resolve('public', 'private', 'love.json');
const CANDIDATES = path.join(EXPORT_DIR, 'love-candidates.json');
const SKIP = path.join(EXPORT_DIR, 'love-skip.json');
const CATS = ['love', 'miss', 'sweet', 'letter'];
const LETTER_WORDS = 40; // a loving message at least this long counts as a letter
const CONTEXT = 2;       // messages either side in the candidates file, so you can read the moment

// sweet things that aren't "i love you"
const SWEET = new RegExp([
  String.raw`\bmy (everything|love|life|heart|world|person|home|safe ?place|forever|soulmate|favou?rite person)\b`,
  String.raw`\bsoul ?mate\b`, String.raw`\bforever\b`, String.raw`\bproud of you\b`, String.raw`\bso lucky\b`,
  String.raw`\bmarry (you|me)\b`, String.raw`\bthank (you|u) for (being|everything|loving)\b`,
  String.raw`\bmy (beautiful|gorgeous|pretty|angel|sunshine)\b|\blove of (my )?life\b`,
  String.raw`\bhug (you|me)\b|\bcan'?t wait to see (you|u)\b|\bi adore (you|u)\b`,
].join('|'));

// never on the page
const EXPLICIT = /\b(sex\w*|horny|nudes?|naked|boob\w*|dick|pussy|nipple\w*|orgasm|porn\w*|undress\w*|panties)\b/;

const skip = new Set(fs.existsSync(SKIP) ? JSON.parse(fs.readFileSync(SKIP, 'utf8')) : []);
const msgs = parseChat();

function category(m) {
  const t = norm(m.text);
  const words = t.split(' ').length;
  const love = patternFor(LOVE_SAID, m.who).exec(t);
  const miss = patternFor(MISS_SAID, m.who).exec(t);
  const isLove = love && !isNegatedOrQuoted(t, love.index);
  const isMiss = miss && !isNegatedOrQuoted(t, miss.index);
  const isSweet = SWEET.test(t);
  if (!isLove && !isMiss && !isSweet) return null;
  if (EXPLICIT.test(t)) return null;
  if (words >= LETTER_WORDS) return 'letter';
  return isLove ? 'love' : isMiss ? 'miss' : 'sweet';
}

const items = [];
const candidates = [];
for (const m of msgs) {
  if (m.kind !== 'text' || !m.text) continue;
  const cat = category(m);
  if (!cat) continue;
  const at = `${m.day}T${String(m.hour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')}`;
  const ctx = [];
  for (let j = Math.max(0, m.i - CONTEXT); j <= Math.min(msgs.length - 1, m.i + CONTEXT); j++) {
    if (j !== m.i) ctx.push(`${msgs[j].who}: ${msgs[j].kind === 'text' ? msgs[j].text.slice(0, 160).replace(/\n/g, ' / ') : `[${msgs[j].kind}]`}`);
  }
  candidates.push({ id: m.i, who: m.who, at, cat, skipped: skip.has(m.i), text: m.text, ctx });
  if (!skip.has(m.i)) items.push([m.who === 'him' ? 0 : 1, at, CATS.indexOf(cat), m.text.trim()]);
}

const count = fn => items.filter(fn).length;
const years = {};
for (const it of items) { const y = it[1].slice(0, 4); years[y] = (years[y] || 0) + 1; }
const out = {
  generatedAt: new Date().toISOString(),
  fields: ['who (0 him, 1 her)', 'local time', `category (${CATS.join(', ')})`, 'text'],
  cats: CATS,
  counts: {
    total: items.length, him: count(i => i[0] === 0), her: count(i => i[0] === 1),
    byCat: Object.fromEntries(CATS.map((c, k) => [c, count(i => i[2] === k)])), years,
  },
  items,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
fs.writeFileSync(CANDIDATES, JSON.stringify(candidates, null, 1));
console.log(out.counts, `skipped ${skip.size}`, `→ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`, `\nreview: ${CANDIDATES}`);
