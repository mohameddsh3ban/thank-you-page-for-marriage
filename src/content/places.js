// #06 — the places, in the order we went (src/sections/places.js draws them as numbered heart pins
// joined by a dotted thread, and lists them beside the map).
//   name       shown on the list, the pin's tooltip and the popup
//   when       short date label
//   note       one line in script inside the popup
//   lat, lng   where the pin goes. Private places (home, the cabin, the wedding venue) are only
//              approximate: a neighbourhood or a nearby town, never a real address.
//   photo      optional image for the popup (a 480px thumb is plenty)
export const PLACES = [
  {
    name: 'The rooftop',
    when: 'sep 2019',
    note: 'a friend\'s party, a terrible toast, and you',
    lat: 40.7193, lng: -73.9580, // Williamsburg, Brooklyn (approximate)
    photo: '/photos/mm-33.t.webp',
  },
  {
    name: 'Brooklyn Bridge',
    when: 'oct 2019',
    note: 'our first date: coffee, then all the way across',
    lat: 40.7061, lng: -73.9969,
    photo: '/photos/mm-01.t.webp',
  },
  {
    name: 'Montauk',
    when: 'aug 2020',
    note: 'the lighthouse, the wind, and sunburnt noses',
    lat: 41.0710, lng: -71.8573, // Montauk Point Lighthouse
    photo: '/photos/mm-02.t.webp',
  },
  {
    name: 'Our first home',
    when: 'aug 2021',
    note: 'one key, two key rings, a kitchen for one',
    lat: 40.6892, lng: -73.9742, // Fort Greene, Brooklyn (neighbourhood only)
    photo: '/photos/mm-34.t.webp',
  },
  {
    name: 'Lisbon',
    when: 'oct 2021',
    note: 'the yellow tram and getting lost on purpose',
    lat: 38.7118, lng: -9.1305, // Miradouro de Santa Luzia, Alfama
    photo: '/photos/mm-03.t.webp',
  },
  {
    name: 'Kyoto',
    when: 'apr 2022',
    note: 'cherry blossoms and ten thousand red gates',
    lat: 34.9671, lng: 135.7727, // Fushimi Inari-taisha
    photo: '/photos/mm-04.t.webp',
  },
  {
    name: 'Paris',
    when: 'may 2023',
    note: 'the ring in my pocket the whole time',
    lat: 48.8583, lng: 2.3375, // Pont des Arts
    photo: '/photos/mm-05.t.webp',
  },
  {
    name: 'Vienna',
    when: '23 dec 2023',
    note: 'the christmas market by the rathaus. you said yes',
    lat: 48.2108, lng: 16.3573, // Rathausplatz
    photo: '/photos/mm-35.t.webp',
  },
  {
    name: 'The cabin',
    when: 'oct 2024',
    note: 'falling leaves, a fire, no wifi, no plans',
    lat: 44.4654, lng: -72.6874, // near Stowe, Vermont (approximate)
    photo: '/photos/mm-06.t.webp',
  },
  {
    name: 'The garden',
    when: '07 jun 2025',
    note: 'where i got to marry you',
    lat: 41.9270, lng: -73.9126, // near Rhinebeck, Hudson Valley (approximate)
    photo: '/photos/mm-36.t.webp',
  },
  {
    name: 'Positano',
    when: 'jun 2025',
    note: 'lemons, a thousand steps, and the bluest sea',
    lat: 40.6281, lng: 14.4850,
    photo: '/photos/mm-07.t.webp',
  },
];
