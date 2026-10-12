// Every photo the chapters show. The sample couple (Mark & Mia) is fictional and AI-generated
// (see public/photos/CREDITS.md). Swap in your own: run `npm run photos` to turn your pictures into
// /photos/<name>.webp + .t.webp (480px thumb), then list them here.
//   us    — the two of you; us[0] is the hero panel (and what the gate's phone dives into)
//   her   — just her; her[0] sits in the gold cameo of the #07 chapter
//   years — a few photos per year for the #05 timeline
const p = (n, caption) => ({ src: `/photos/mm-${n}.webp`, thumb: `/photos/mm-${n}.t.webp`, caption });

export const PHOTOS = {
  us: [
    p('01', 'the garden, 7 june 2025 · the best yes'),
    p('02', 'the rooftop, the night we met'),
    p('03', 'first date · the long way across the bridge'),
    p('09', 'vienna · you said yes before i finished the question'),
    p('11', 'our first dance · i stepped on your foot twice'),
    p('12', 'positano · honeymoon, sunburnt and stupidly happy'),
    p('04', 'montauk · the summer everything slowed down'),
    p('05', 'moving day · the kitchen was smaller than the photos'),
    p('06', 'lisbon · getting lost on purpose'),
    p('07', 'kyoto · a thousand gates, one hand to hold'),
    p('08', 'paris · blue hour by the seine'),
    p('10', 'the vermont cabin · one blanket, two people'),
    p('13', 'pasta night · flour everywhere'),
    p('14', 'sundays are ours'),
    p('15', 'new york rain · one umbrella is enough'),
    p('16', 'one year married'),
  ],
  her: [
    p('17', 'my favourite view'),
    p('18', 'that laugh, every single time'),
    p('19', 'rainy days and paperbacks'),
    p('20', 'montauk wind'),
    p('21', 'lisbon · pastel de nata number four'),
    p('22', 'kyoto, looking back at me'),
    p('23', 'paris · peonies and bread'),
    p('24', 'vienna snow in your hair'),
    p('25', 'the morning of'),
    p('26', 'the lemon grove'),
    p('27', 'asleep mid-chapter, again'),
    p('28', 'golden hour, golden you'),
  ],
  years: {
    2019: [p('02', 'the rooftop'), p('30', 'the camera i used as an excuse'), p('03', 'brooklyn bridge, first date'), p('18', 'that cafe, that laugh')],
    2020: [p('04', 'montauk'), p('20', 'wind and salt'), p('15', 'the city in the rain'), p('19', 'a slow year, indoors')],
    2021: [p('05', 'moving in'), p('35', 'two mugs on the windowsill'), p('06', 'lisbon'), p('21', 'azulejos')],
    2022: [p('07', 'kyoto'), p('39', 'fushimi inari at dawn'), p('22', 'higashiyama'), p('13', 'pasta nights')],
    2023: [p('08', 'paris'), p('23', 'peonies'), p('38', 'the market in vienna'), p('09', 'the yes'), p('24', 'snow')],
    2024: [p('10', 'the cabin'), p('32', 'trail in october'), p('14', 'planning a wedding from the couch'), p('29', 'coffee duty')],
    2025: [p('25', 'the morning of'), p('31', 'cufflinks'), p('01', 'the garden'), p('11', 'first dance'), p('12', 'positano'), p('37', 'the view from our terrace')],
    2026: [p('33', 'two rings'), p('16', 'one year'), p('27', 'ordinary sundays'), p('28', 'still golden')],
  },
};
