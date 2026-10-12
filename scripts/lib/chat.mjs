// Parses a WhatsApp chat export into message objects. Shared by build-days, mine-stats and
// build-love, which turn YOUR OWN chat into the site's data files (see the README).
//
// In WhatsApp: open the chat → ⋮ / contact name → Export chat (with media, if you want voice-note
// minutes) → unzip it into chat-export/ at the project root (git-ignored). Then tell the scripts
// who is who, with environment variables:
//   CHAT_EXPORT  the exported .txt (default: the first .txt in chat-export/; its folder holds the media)
//   CHAT_ME      your name exactly as the export writes it  ("him" in the data files: the writer)
//   CHAT_HER     her name exactly as the export writes it   ("her")
//   CHAT_DATES   dmy (default) or mdy: the date order of your phone's locale
// e.g.  CHAT_ME="Mark" CHAT_HER="Mia" node scripts/build-days.mjs
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DIR = path.resolve('chat-export');

function findExport() {
  if (process.env.CHAT_EXPORT) return path.resolve(process.env.CHAT_EXPORT);
  const txt = fs.existsSync(DEFAULT_DIR) ? fs.readdirSync(DEFAULT_DIR).find(f => f.toLowerCase().endsWith('.txt')) : null;
  return txt ? path.join(DEFAULT_DIR, txt) : path.join(DEFAULT_DIR, '_chat.txt');
}

export const EXPORT_TXT = findExport();
export const EXPORT_DIR = path.dirname(EXPORT_TXT);
export const HIM = process.env.CHAT_ME || '';
export const HER = process.env.CHAT_HER || '';
const DATE_ORDER = (process.env.CHAT_DATES || 'dmy').toLowerCase();

// Android: "14/09/2019, 11:42 pm - Name: text" (24-hour clocks and 2-digit years too)
// iOS:     "[14/09/2019, 11:42:10 PM] Name: text"
const HEADERS = [
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),? (\d{1,2}):(\d\d)(?::\d\d)?\s?([ap]\.?\s?m\.?)? - (.*)$/i,
  /^\[(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),? (\d{1,2}):(\d\d)(?::\d\d)?\s?([ap]\.?\s?m\.?)?\] (.*)$/i,
];
// Android attachment: "IMG-YYYYMMDD-WA0001.jpg (file attached)"; iOS: "<attached: 00000012-PHOTO-YYYY-MM-DD-hh-mm-ss.jpg>"
const ANDROID_FILE = /^([A-Z]{2,4})-\d{8}-WA\d+\.(\w+) \(file attached\)\s*([\s\S]*)$/;
const IOS_FILE = /^<attached: (\d+-([A-Z]+)-[\w-]+\.\w+)>\s*([\s\S]*)$/;
const ANY_FILE = /^(.+?\.\w{2,5}) \(file attached\)\s*([\s\S]*)$/;
const EDITED = /\s*<This message was edited>\s*$/;
const OMITTED = /^(<Media omitted>|(image|video|audio|sticker|GIF|document|Contact card) omitted)$/i;

const MEDIA_KIND = {
  IMG: 'photo', VID: 'video', PTT: 'voice', AUD: 'audio', STK: 'sticker', DOC: 'doc', // Android
  PHOTO: 'photo', VIDEO: 'video', AUDIO: 'voice', STICKER: 'sticker', GIF: 'video', // iOS
};

/**
 * @typedef {{ i: number, who: 'him'|'her', at: Date, day: string, hour: number, minute: number,
 *   kind: 'text'|'photo'|'video'|'voice'|'audio'|'sticker'|'doc'|'file'|'omitted'|'deleted'|'pending'|'missed-call'|'location'|'poll'|'view-once',
 *   text: string, file: string|null, edited: boolean }} Msg
 */

function classify(body) {
  const am = body.match(ANDROID_FILE);
  if (am) return { kind: MEDIA_KIND[am[1]] || 'file', file: body.split(' (file attached)')[0], text: am[3].trim() };
  const im = body.match(IOS_FILE);
  if (im) return { kind: MEDIA_KIND[im[2]] || 'file', file: im[1], text: im[3].trim() };
  const af = body.match(ANY_FILE);
  if (af) return { kind: 'file', file: af[1], text: af[2].trim() };
  if (OMITTED.test(body)) return { kind: 'omitted', file: null, text: '' };
  if (/^(This message was deleted|You deleted this message)\.?$/.test(body)) return { kind: 'deleted', file: null, text: '' };
  if (body.startsWith('Waiting for this message')) return { kind: 'pending', file: null, text: '' };
  if (/^Missed (voice|video) call/.test(body)) return { kind: 'missed-call', file: null, text: '' };
  if (body.startsWith('location: ') || body.startsWith('Location: ')) return { kind: 'location', file: null, text: '' };
  if (body.startsWith('POLL:')) return { kind: 'poll', file: null, text: body };
  if (/^View once (photo|video|voice message)/i.test(body) || body === 'null') return { kind: 'view-once', file: null, text: '' };
  return { kind: 'text', file: null, text: body };
}

/** Invisible marks some exports put around names and before "am/pm". */
const clean = line => line.replace(/[‎‏‪-‮]/g, '').replace(/[  ]/g, ' ');

/** @returns {Msg[]} */
export function parseChat(file = EXPORT_TXT) {
  if (!fs.existsSync(file)) {
    console.error(`No chat export at ${file}\nExport the chat from WhatsApp, unzip it into chat-export/ (or set CHAT_EXPORT).`);
    process.exit(1);
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map(clean);
  /** @type {Msg[]} */
  const out = [];
  const senders = new Map();
  const who = { [HIM]: 'him', [HER]: 'her' };
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const edited = EDITED.test(cur.raw);
    const body = cur.raw.replace(EDITED, '').trim();
    out.push({ i: out.length, who: cur.who, at: cur.at, day: cur.day, hour: cur.hour, minute: cur.minute, edited, ...classify(body) });
    cur = null;
  };
  for (const line of lines) {
    const m = HEADERS.map(re => line.match(re)).find(Boolean);
    if (!m) {
      if (cur) cur.raw += '\n' + line;
      continue;
    }
    flush();
    const rest = m[7];
    const sep = rest.indexOf(': ');
    const sender = sep > 0 ? rest.slice(0, sep) : '';
    if (sender) senders.set(sender, (senders.get(sender) || 0) + 1);
    if (!HIM || !HER || !who[sender]) continue; // system line (encryption notice, group events)
    let hour = Number(m[4]);
    const ampm = (m[6] || '').toLowerCase().replace(/[\s.]/g, '');
    if (ampm) hour = (hour % 12) + (ampm === 'pm' ? 12 : 0);
    const minute = Number(m[5]);
    const [a, b, y] = [m[1], m[2], m[3]];
    const [dd, mm] = (DATE_ORDER === 'mdy' ? [b, a] : [a, b]).map(n => n.padStart(2, '0'));
    const yyyy = y.length === 2 ? `20${y}` : y;
    cur = {
      who: who[sender],
      at: new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, minute),
      day: `${yyyy}-${mm}-${dd}`,
      hour, minute,
      raw: rest.slice(sep + 2),
    };
  }
  flush();
  if (!out.length) {
    const found = [...senders].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([name, n]) => `  "${name}" (${n})`).join('\n');
    console.error(`No messages matched CHAT_ME="${HIM}" and CHAT_HER="${HER}".\nSenders in the export:\n${found || '  (none — is the date format dmy/mdy right?)'}`);
    process.exit(1);
  }
  return out;
}

/** Lowercase, unify apostrophes and spaces so one pattern matches every spelling. */
export function norm(text) {
  return text.toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
}
