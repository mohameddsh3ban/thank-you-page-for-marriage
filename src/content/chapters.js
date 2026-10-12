// #05 — the years, one panel each (src/sections/years.js).
//   year     the big number on the panel (photos come from PHOTOS.years[year] in chapter-photos.js)
//   title    the year's name, in italic serif beside its moon
//   line     one script line under the title
//   moon     0 (thin crescent) … 6 (full): the moon fills as the story does
//   moments  [when, what] pairs, oldest first (phones show the first four)
//   memento  optional { date, line } for the framed label, used when a year has no photos
//            and falls back to keepsakes.json (or to a plain card if that is empty too)
export const CHAPTERS = [
  {
    year: 2019,
    title: 'the roof',
    line: 'i only asked for your number to send you the photo',
    moon: 0,
    moments: [
      ['14 sep', 'a friend\'s rooftop in brooklyn. you laughed at my terrible toast'],
      ['14 sep', 'i texted you the photo that night. and then one more message'],
      ['05 oct', 'coffee, then a walk across the brooklyn bridge. our first date'],
      ['nov', 'three dates in one week and nobody said it was too fast'],
      ['31 dec', 'midnight on a fire escape, both pretending not to be cold'],
    ],
    memento: { date: 'sep 2019', line: 'the night on the roof' },
  },
  {
    year: 2020,
    title: 'the year everything slowed down',
    line: 'the whole world stopped and somehow we didn\'t',
    moon: 1,
    moments: [
      ['mar', 'the city went quiet. we called every night until we fell asleep'],
      ['apr', 'sourdough, puzzles, a thousand walks around the same block'],
      ['aug', 'montauk: the lighthouse, salt in your hair, sunburnt noses'],
      ['oct', 'one year. i cooked, badly. you ate all of it'],
      ['dec', 'a tiny tree on your windowsill, the first one we decorated together'],
    ],
    memento: { date: 'aug 2020', line: 'salt and sun' },
  },
  {
    year: 2021,
    title: 'one key',
    line: 'and suddenly it was our kitchen, even if it was too small',
    moon: 2,
    moments: [
      ['mar', 'you said "what if we just… lived together?" i said yes before you finished'],
      ['01 aug', 'moved into the brooklyn apartment. one key on two key rings'],
      ['aug', 'the kitchen fits one of us at a time. we learned to dance in it'],
      ['oct', 'lisbon: the yellow tram, pastéis de nata, you getting us lost on purpose'],
      ['dec', 'our first christmas at home, the oven alarm as the soundtrack'],
    ],
  },
  {
    year: 2022,
    title: 'far away, together',
    line: 'the furthest we\'d been, and the closest',
    moon: 3,
    moments: [
      ['feb', 'you started your new job. i made a cake that looked like a hat'],
      ['apr', 'kyoto in cherry blossom season. ten thousand red gates'],
      ['apr', 'you bowed to a deer in nara. the deer bowed back'],
      ['jul', 'summer nights on the roof again, three years after the first'],
      ['nov', 'a quiet thanksgiving, just the two of us and too many pies'],
    ],
  },
  {
    year: 2023,
    title: 'the question',
    line: 'i carried a ring through three cities before i found the nerve',
    moon: 4,
    moments: [
      ['may', 'paris: the pont des arts at dusk, croissants on the hotel bed'],
      ['may', 'the ring stayed in my pocket. it wasn\'t the moment yet'],
      ['sep', 'four years. i booked vienna and told you it was "just a trip"'],
      ['23 dec', 'the christmas market by the rathaus. i asked. you said yes'],
      ['23 dec', 'mulled wine, cold hands, both of us crying and laughing'],
    ],
  },
  {
    year: 2024,
    title: 'the plan',
    line: 'spreadsheets, tastings, and one cabin with no wifi',
    moon: 5,
    moments: [
      ['jan', 'we told everyone. your mom screamed. my dad cried'],
      ['mar', 'we found the garden in the hudson valley on the first visit'],
      ['jun', 'one hundred and twelve cake samples. we picked the first one'],
      ['oct', 'a cabin in vermont: falling leaves, a fire, no plans for once'],
      ['dec', 'invitations in the mail. it was real now'],
    ],
  },
  {
    year: 2025,
    title: 'the yes, out loud',
    line: 'in a garden, in front of everyone, i got to marry you',
    moon: 6,
    moments: [
      ['07 jun', 'the garden wedding in the hudson valley. you walked toward me'],
      ['07 jun', 'our vows. i forgot half of mine. you held my hand through it'],
      ['07 jun', 'we danced until they turned the lights on'],
      ['jun', 'positano: lemons, steps everywhere, the sea every shade of blue'],
      ['dec', 'our first christmas as husband and wife'],
    ],
  },
  {
    year: 2026,
    title: 'married, a year in',
    line: 'it turns out the ordinary days were the point all along',
    moon: 6,
    moments: [
      ['jan', 'we finally bought a bigger table. the kitchen is still too small'],
      ['mar', 'you started calling me "husband" just to see me smile'],
      ['may', 'a sunday where we did nothing at all. my favourite kind of day'],
      ['07 jun', 'one year married. i made you this to say thank you'],
    ],
  },
];
