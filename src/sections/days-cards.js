// #04 — the sweetest moment of every day: a title, how it felt, the moment, and a thank you for it,
// picked from reading that day's chat (scripts/build-day-cards.mjs). One thank you per day.
const CARDS_URL = '/private/day-cards.json';

/** how each mood reads on a card, and which colour family it joins on the ledger */
export const MOODS = {
  sweet: { word: 'a sweet day', fam: 'love' },
  big: { word: 'a big day', fam: 'love' },
  fun: { word: 'a silly day', fam: 'joy' },
  proud: { word: 'a proud day', fam: 'joy' },
  deep: { word: 'a heart to heart', fam: 'heart' },
  care: { word: 'a day we looked after each other', fam: 'soft' },
  missing: { word: 'a missing you day', fam: 'soft' },
  everyday: { word: 'a cozy ordinary day', fam: 'cozy' },
};

export const FAMILIES = [
  { id: 'love', name: 'love', color: 'var(--red)' },
  { id: 'joy', name: 'laughs', color: '#c99a3c' },
  { id: 'heart', name: 'heart to hearts', color: 'var(--navy)' },
  { id: 'soft', name: 'soft days', color: '#6f93cf' },
  { id: 'cozy', name: 'cozy days', color: 'rgb(43 55 84 / 0.4)' },
];
const FAMILY = Object.fromEntries(FAMILIES.map(f => [f.id, f]));

/** @param {string} mood */
export const familyOf = mood => FAMILY[MOODS[mood]?.fam] || FAMILY.cozy;

/**
 * @typedef {{ t: string, m: string, e: number, c: string, y: string, q?: string, w?: 0|1, n: number }} DayCard
 * q = a line one of us wrote that day, w = who wrote it (1 her, 0 him)
 * n = which thank you this is, counted from the first day in the chat
 */

let loading = null;
/** @returns {Promise<{ cards: Map<string, DayCard>, total: number }>} */
export function loadCards() {
  loading ||= fetch(CARDS_URL, { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : { moods: [], days: {} }))
    .then(({ moods = [], days = {} }) => {
      const cards = new Map();
      Object.keys(days).sort().forEach((key, i) => {
        const [t, m, e, c, y, q, w] = days[key];
        cards.set(key, { t, m: moods[m], e, c, y, q: q || undefined, w: w || undefined, n: i + 1 });
      });
      return { cards, total: cards.size };
    })
    .catch(() => ({ cards: new Map(), total: 0 }));
  return loading;
}
