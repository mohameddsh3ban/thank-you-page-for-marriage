// #03 — Us, in numbers. One scene per number (numbers.js, numbers-phone.js) and the data the star
// pictures are drawn from (numbers-forms.js). Every figure is derived from chat-numbers.json and
// chat-days.json (sample data: an invented chat between Mark and Mia, 14.09.2019 → 06.06.2026).
import N from './chat-numbers.json';
import DAYS from './chat-days.json';

const fmt = new Intl.NumberFormat('en').format;
const sum = o => o.her + o.him;
const WORDS_PER_NOVEL = 90000;
const CALL_HOURS = 414;
const novels = (sum(N.words) / WORDS_PER_NOVEL).toFixed(1);
const voiceHours = Math.round(sum(N.voiceMinutes) / 60);
const lateTotal = sum(N.lateNight);

// the "who did it more" picture (and Screen Time on the phone): you on the left, me on the right
const ROWS = [
  { label: 'said good night first', her: 1488, him: 702 },
  { label: 'sent a photo', her: N.photos.her, him: N.photos.him },
  { label: 'said sorry first', her: 233, him: 347 },
  { label: 'sent a song', her: 412, him: 689 },
  { label: 'asked “what’s for dinner?”', her: 1904, him: 611 },
];

export const SCENES = [
  {
    key: 'messages', n: sum(N.messages), eyebrow: 'every message', label: 'messages between us',
    note: 'from one photo sent off a rooftop to last night’s “come to bed”. every star up there is a hundred of them.',
    legend: 'one star for every 100 messages, placed on the day we sent them',
    duel: { her: N.messages.her, him: N.messages.him },
  },
  {
    key: 'words', n: sum(N.words), eyebrow: 'every word', label: 'words',
    note: `enough to fill ${novels} novels. you sent more messages, i used more words. we both know who wins arguments.`,
    legend: 'an open book: your pages on the left, mine on the right',
    duel: { her: N.words.her, him: N.words.him },
  },
  {
    key: 'voice', n: sum(N.voiceNotes), eyebrow: 'every voice note', label: 'voice notes',
    note: `${voiceHours} hours of us, if you played them back to back. half of yours start with “ok so”.`,
    legend: 'one long voice note: the pink part is yours',
    duel: { her: N.voiceNotes.her, him: N.voiceNotes.him },
  },
  {
    key: 'calls', n: CALL_HOURS, suffix: ' h', eyebrow: 'every call', label: 'hours on the phone',
    note: 'over four hundred hours of “no, you hang up first”, from two apartments, three airports and one very long work trip.',
    phoneNote: `${CALL_HOURS}+ hours of “no, you hang up first”`,
    legend: `six rings of sound around you, each one ${Math.round(CALL_HOURS / 6)} hours on the phone`,
  },
  {
    key: 'love', n: N.love.her, eyebrow: 'every i love you', label: 'times you wrote “i love you”',
    note: `and i wrote it ${fmt(N.love.him)} times, plus ${fmt(N.adore.him)} “i adore you”s that i’m counting too.`,
    legend: 'two hearts, sized by every i love you',
    duel: { her: N.love.her, him: N.love.him },
  },
  {
    key: 'first', n: N.starters.her, eyebrow: 'every hello', label: 'times you texted first',
    note: `after every silence of three hours or more. i came back first ${fmt(N.starters.him)} times, but who’s counting (me, apparently).`,
    legend: 'who did it more: you on the left, me on the right',
  },
  {
    key: 'late', n: lateTotal, eyebrow: 'every late night', label: 'messages after midnight',
    note: `${Math.round(N.lateNightSharePct)}% of everything we ever sent, between midnight and 5 am. ${N.peakHour % 12 || 12} pm is still our busiest hour.`,
    legend: 'a long exposure of our nights: every streak a message, at the hour it was sent',
    duel: { her: N.lateNight.her, him: N.lateNight.him },
  },
  {
    key: 'streak', n: N.streak, eyebrow: 'every day', label: 'days in a row',
    note: 'from the rooftop night into february, not one day without a message, until the first day we spent together from breakfast to goodnight.',
    legend: 'every day of the streak, lit one by one',
    facts: [
      [fmt(1912), 'good mornings'],
      [fmt(ROWS[0].her + ROWS[0].him), 'good nights'],
      [fmt(N.loudestDay.n), 'messages on our loudest day'],
      ['71%', 'of your replies came in under a minute'],
    ],
  },
];

export const SKY = {
  count: Math.round(sum(N.messages) / 100), // one star for every 100 messages
  days: DAYS, // [iso day, messages, hers] for every day we talked
  from: N.from,
  to: N.to,
  loudestDay: N.loudestDay,
  share: { words: N.words.her / sum(N.words), voice: N.voiceNotes.her / sum(N.voiceNotes) },
  words: N.words,
  wordsPerNovel: WORDS_PER_NOVEL,
  voice: { her: N.voiceNotes.her, him: N.voiceNotes.him, hours: voiceHours },
  callHours: CALL_HOURS,
  love: { her: N.love.her, him: N.love.him, adore: N.adore.him },
  rows: ROWS,
  byHour: N.byHour,
  peakHour: N.peakHour,
  lateNight: lateTotal,
  lateShare: Math.round(N.lateNightSharePct),
  streak: { n: N.streak, from: N.streakFrom, to: N.streakTo },
};
