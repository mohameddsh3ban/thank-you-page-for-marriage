// Her home screen for #03's phone intro: three pages of apps over our photo, a dock, page dots.
// WhatsApp is on the third page, so the intro has to swipe to find it. Icons come from
// numbers-phone-icons.js. Positions are fixed by the grid so the intro can fly an app out of, or
// back into, its icon (numbers-phone-intro.js).
import { iconSvg } from './numbers-phone-icons.js';

// grid geometry, in cqw of the screen width (keep in sync with .np-page in numbers-phone.css)
const PAD_X = 6.5, PAD_TOP = 16, COL_GAP = 5, ROW_H = 21.5, TILE = 14.5;
const COL_W = (100 - 2 * PAD_X - 3 * COL_GAP) / 4;
/** Centre of the tile at [col, row], in cqw from the screen's top-left. */
export const tileCentre = ([col, row]) => [PAD_X + col * (COL_W + COL_GAP) + COL_W / 2, PAD_TOP + row * ROW_H + TILE / 2];
export const TILE_CQW = TILE;

const LABELS = {
  calendar: 'Calendar', photos: 'Photos', camera: 'Camera', clock: 'Clock', weather: 'Weather', notes: 'Notes', maps: 'Maps',
  settings: 'Settings', instagram: 'Instagram', health: 'Health', wallet: 'Wallet', books: 'Books', fitness: 'Fitness',
  files: 'Files', home: 'Home', memos: 'Voice Memos', translate: 'Translate', calculator: 'Calculator', compass: 'Compass',
  whatsapp: 'WhatsApp', phone: 'Phone', safari: 'Safari', messages: 'Messages', music: 'Music',
};
// pages of [app, [col, row]]; WhatsApp is on the last page
const PAGES = [
  [['calendar', [0, 0]], ['photos', [1, 0]], ['camera', [2, 0]], ['clock', [3, 0]], ['weather', [0, 1]], ['notes', [1, 1]], ['maps', [2, 1]], ['settings', [3, 1]], ['instagram', [0, 2]]],
  [['health', [0, 0]], ['wallet', [1, 0]], ['books', [2, 0]], ['fitness', [3, 0]], ['files', [0, 1]], ['home', [1, 1]], ['memos', [2, 1]], ['translate', [3, 1]]],
  [['calculator', [0, 0]], ['compass', [1, 0]], ['whatsapp', [2, 1]]],
];
const DOCK = ['phone', 'safari', 'messages', 'music'];
export const PLACE = { instagram: [0, 2], whatsapp: [2, 1] }; // [col, row] on their pages

/** @param {(tag: string, cls?: string, ...kids: any[]) => HTMLElement} h */
export function buildHome(h) {
  const tiles = {};
  const app = (key, labelled = true) => {
    const tile = h('i', `np-tile-icon is-${key}`, iconSvg(key));
    tiles[key] = tile;
    return h('span', 'np-icon', tile, labelled ? h('span', 'np-icon-label', LABELS[key]) : null);
  };
  const pages = PAGES.map(list => {
    const page = h('div', 'np-page');
    for (const [key, [col, row]] of list) {
      const icon = app(key);
      icon.style.gridArea = `${row + 1} / ${col + 1}`;
      page.append(icon);
    }
    return page;
  });
  const track = h('div', 'np-pages', ...pages);
  const dots = PAGES.map(() => h('i', ''));
  const node = h('div', 'np-app np-intro app-home',
    h('div', 'np-home-wall'),
    track,
    h('div', 'np-dots', ...dots),
    h('div', 'np-dock', ...DOCK.map(k => app(k, false))));
  return { node, track, dots, tiles };
}
