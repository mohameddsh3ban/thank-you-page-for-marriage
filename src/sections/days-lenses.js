// #04 — the ways to read the ledger. Each lens sizes (and colours) every day's dot from that day's
// row in days.json (see scripts/build-days.mjs for the columns) and brings its own facts.
import N from '../content/chat-numbers.json';
import { FAMILIES, familyOf } from './days-cards.js';

const fmt = new Intl.NumberFormat('en');
const MIDNIGHT = 24 * 60;
const SUNRISE = MIDNIGHT + 6 * 60;  // "we didn't sleep": still talking at 06:00
const LATE_SCALE = 9 * 60;          // 09:00 the next morning is the biggest moon
const WHO_SPREAD = 0.15;            // a day 65/35 or more one-sided is fully rose / fully navy
const her = r => r[0] - r[3];
const LAUGH_MOODS = new Set(['fun']);
const NEVER_FORGET = 4;             // a card weighted 4 or 5 is a day we keep

/** -1 (all me) .. 1 (all you) → navy .. rose */
export const whoColor = lean => `color-mix(in oklab, var(--red) ${Math.round((lean + 1) * 50)}%, var(--navy))`;

/** "4:22 am" from minutes past midnight (wraps into the next day) */
export function clock(mins) {
  const m = ((mins % MIDNIGHT) + MIDNIGHT) % MIDNIGHT;
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

const median = list => {
  const s = [...list].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * @param {Record<string, any[]>} DAYS
 * @param {{ cards: Map<string, import('./days-cards.js').DayCard>, total: number }} deck filled once
 *   the day cards arrive, so the felt lens reads it lazily
 * @returns {Array<{ id: string, name: string, sub: string, legend: string[], swatches?: typeof FAMILIES,
 *   dot: (r: any[], key: string) => { s: number, a: number, c?: string, z?: boolean },
 *   facts: Array<{ value: string, label: string, hl?: (key: string, r: any[]) => boolean, day?: string }> }>}
 */
export function makeLenses(DAYS, deck) {
  const rows = Object.entries(DAYS);
  const maxMsgs = Math.max(...rows.map(([, r]) => r[0]));
  const maxLove = Math.max(...rows.map(([, r]) => r[5]));
  const nights = rows.filter(([, r]) => r[9] >= MIDNIGHT);
  const loudness = r => Math.sqrt(r[0] / maxMsgs);

  return [
    {
      id: 'felt',
      name: 'felt',
      sub: 'the sweetest moment of every day we talked · and a thank you for each one',
      legend: ['', ''],
      swatches: FAMILIES,
      dot: (r, key) => {
        const card = deck.cards.get(key);
        if (!card) return { s: 0.22, a: 0.5, z: true };
        const w = (card.e - 1) / 4;
        return { s: 0.38 + 0.62 * w, a: 0.55 + 0.45 * w, c: familyOf(card.m).color };
      },
      get facts() {
        const cards = [...deck.cards.values()];
        const count = f => fmt.format(cards.filter(f).length);
        return [
          { value: fmt.format(deck.total), label: 'thank yous · one for every day', hl: k => deck.cards.has(k) },
          { value: count(c => LAUGH_MOODS.has(c.m)), label: 'days we just laughed', hl: k => LAUGH_MOODS.has(deck.cards.get(k)?.m) },
          { value: count(c => c.e >= NEVER_FORGET), label: 'days we’ll never forget', hl: k => deck.cards.get(k)?.e >= NEVER_FORGET },
        ];
      },
    },
    {
      id: 'loud',
      name: 'loud',
      sub: 'one dot for every day we talked · the bigger the dot the louder the day',
      legend: ['quiet', 'loud'],
      dot: r => ({ s: 0.35 + 0.65 * loudness(r), a: 0.45 + 0.55 * loudness(r) }),
      facts: [
        { value: fmt.format(rows.length), label: 'days we talked', hl: () => true },
        { value: `${N.streak} days`, label: 'longest streak', hl: k => k >= N.streakFrom && k <= N.streakTo },
        { value: `${fmt.format(N.loudestDay.n)} msgs`, label: 'loudest day', day: N.loudestDay.day },
      ],
    },
    {
      id: 'late',
      name: 'late',
      sub: 'the nights we didn’t sleep · the bigger the moon the later we fell asleep',
      legend: ['before 12', 'sunrise'],
      dot: r => {
        if (r[9] < MIDNIGHT) return { s: 0.22, a: 0.5, z: true };
        const k = Math.min(1, (r[9] - MIDNIGHT) / LATE_SCALE);
        return { s: 0.3 + 0.7 * Math.sqrt(k), a: 0.5 + 0.5 * k };
      },
      facts: [
        { value: fmt.format(nights.length), label: 'nights past midnight', hl: (k, r) => r[9] >= MIDNIGHT },
        { value: clock(median(rows.filter(([, r]) => r[9] >= 0).map(([, r]) => r[9]))), label: 'our usual bedtime' },
        { value: fmt.format(nights.filter(([, r]) => r[9] >= SUNRISE).length), label: 'nights till sunrise', hl: (k, r) => r[9] >= SUNRISE },
      ],
    },
    {
      id: 'love',
      name: 'love',
      sub: 'every day one of us said i love you · the bigger the heart the more we said it',
      legend: ['once', 'over and over'],
      dot: r => (r[5] ? { s: 0.5 + 0.5 * Math.sqrt(r[5] / maxLove), a: 0.6 + 0.4 * Math.sqrt(r[5] / maxLove) } : { s: 0.22, a: 0.5, z: true }),
      facts: [
        { value: fmt.format(rows.filter(([, r]) => r[5]).length), label: 'days we said it', hl: (k, r) => r[5] > 0 },
        { value: fmt.format(N.love.her), label: 'times you said it' },
        { value: fmt.format(N.love.him), label: 'times i said it' },
      ],
    },
    {
      id: 'who',
      name: 'who',
      sub: 'who wrote more · rose is you and navy is me · the even days fade',
      legend: ['me', 'you'],
      dot: r => {
        // most days are close to half and half, so stretch the difference: ±WHO_SPREAD reads as all one colour
        const lean = Math.max(-1, Math.min(1, (her(r) / r[0] - 0.5) / WHO_SPREAD));
        return { s: 0.35 + 0.65 * loudness(r), a: 0.25 + 0.75 * Math.abs(lean), c: whoColor(lean) };
      },
      facts: [
        { value: fmt.format(N.messages.her), label: 'messages from you' },
        { value: fmt.format(rows.filter(([, r]) => r[10] === 1).length), label: 'days you texted first', hl: (k, r) => r[10] === 1 },
        { value: fmt.format(rows.filter(([, r]) => her(r) > r[3]).length), label: 'days you wrote more', hl: (k, r) => her(r) > r[3] },
      ],
    },
  ];
}
