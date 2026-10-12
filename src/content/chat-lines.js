// Sample lines from Mark and Mia's (invented) chat, used by #02 and #03.
// who: 1 = Mia (her), 0 = Mark (me, the writer).
import { CONFIG } from '../config.js';

/** #02 — the first DM after the rooftop party, then the years of messages that followed, in order.
 *  [who, text]; origin.js drops a time chip in between the runs. */
export const FIRST_NIGHT = [
  [1, 'ok so… where’s my photo 👀'],
  [0, `hey, it’s ${CONFIG.fromName.toLowerCase()} from the rooftop, here’s the photo i promised`],
  [1, 'wait i look so tall'],
  [0, 'you are so tall'],
  [0, 'coffee saturday?'],
  [1, 'it’s a date ☕'],
  [1, 'home safe. today was nice'],
  [0, 'just nice??'],
  [1, 'really really nice'],
  [0, 'can’t stop smiling'],
  [0, 'montauk this weekend?'],
  [1, 'already packed 🌊'],
  [1, 'WE HAVE KEYS'],
  [0, 'our tiny kitchen 🥲'],
  [1, 'lisbon >>>'],
  [0, 'kyoto next, promise'],
  [1, 'bring milk pls'],
  [0, 'on my way ♥'],
  [0, 'paris was everything'],
  [1, 'vienna?? why vienna'],
  [0, 'you’ll see'],
  [1, 'I SAID YES 💍'],
  [0, 'see you at the altar'],
  [1, 'i’ll be the one in white ♥'],
];

/** #03 — what a search for "love you" in our chat turns up: her lines, spread across the years. [iso, text] */
export const LOVE_LINES = [
  ['2019-12-24T23:58', 'ok fine. i love you. there, i said it first'],
  ['2020-08-15T08:12', 'love you, drive safe'],
  ['2021-08-01T22:40', 'first night in our place. love you so much'],
  ['2022-10-09T03:15', 'it’s 3am in kyoto and i love you'],
  ['2023-12-23T19:02', 'love you love you love you 💍'],
  ['2025-06-07T23:47', 'goodnight husband. love you forever'],
];

/** #03 — the last few lines above his new message on her phone, oldest first. [who, iso, text] */
export const RECENT = [
  [1, '2026-06-04T18:02', 'did you eat lunch'],
  [0, '2026-06-04T18:05', 'a sad desk salad'],
  [1, '2026-06-04T18:05', 'proud of you'],
  [0, '2026-06-04T23:31', 'come to bed'],
  [1, '2026-06-04T23:31', 'one more episode'],
  [1, '2026-06-05T08:14', 'you stole the blanket again'],
  [0, '2026-06-05T08:20', 'i was cold 🥺'],
  [0, '2026-06-05T12:47', 'dinner at 8? my treat'],
  [1, '2026-06-05T12:49', 'it’s a date ♥'],
];
