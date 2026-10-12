// #04 — a page torn out of the ledger for one day: what the day was about and how it felt, a thank
// you for it, a line one of us wrote that day, who wrote how much, the hours we talked, when the day
// started and when we fell asleep, a photo from it.
// Opens over the left column; arrows flip to the day before / after, esc puts it back.
import { clock } from './days-lenses.js';
import { MOODS, familyOf } from './days-cards.js';

const LOVE_URL = '/private/love.json';
const MIDNIGHT = 24 * 60;
const SUNRISE = MIDNIGHT + 6 * 60;
const CAT_ORDER = ['love', 'sweet', 'letter', 'miss']; // which kind of line to show first
const LINE_MAX = 220;
// reading on by itself: long enough to read the card, then the next day
const READ_MS = [7000, 16000];
const READ_MS_PER_CHAR = 32;
const HOVER_RETRY_MS = 1500;
const fmt = new Intl.NumberFormat('en');
const longDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const weekday = key => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
const plural = (n, word) => `${fmt.format(n)} ${word}${n === 1 ? '' : 's'}`;

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${fmt.format(n)}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let loveByDay = null;
/** the reviewed love lines (same file the love book reads), grouped by day */
function loveLines() {
  loveByDay ||= fetch(LOVE_URL, { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : { items: [], cats: [] }))
    .then(({ items = [], cats = [] }) => {
      const map = new Map();
      for (const [who, at, cat, text] of items) {
        if (!text || text.length > LINE_MAX) continue;
        const day = at.slice(0, 10);
        if (!map.has(day)) map.set(day, []);
        map.get(day).push({ who, text, rank: CAT_ORDER.indexOf(cats[cat]) });
      }
      map.forEach(list => list.sort((a, b) => a.rank - b.rank));
      return map;
    })
    .catch(() => new Map());
  return loveByDay;
}

/**
 * @param {{ section: HTMLElement, page: HTMLElement, DAYS: Record<string, any[]>, keys: string[],
 *   pictures: { get: (key: string) => ({ list: string[], kind: string, from?: string, i: number } | null),
 *     show: (key: string, i: number) => void },
 *   markFor: (key: string) => ({ name: string } | undefined), onSelect: (key: string | null) => void,
 *   deck: { cards: Map<string, import('./days-cards.js').DayCard>, total: number } }} opts
 */
export function createDayPage({ section, page, DAYS, keys, pictures, markFor, onSelect, deck }) {
  let current = null;
  let returnFocus = null;
  let reading = false; // flipping to the next day by itself
  let readTimer = 0;
  let hovered = false;
  page.addEventListener('pointerenter', () => { hovered = true; });
  page.addEventListener('pointerleave', () => { hovered = false; });

  function readNext() {
    clearTimeout(readTimer);
    if (!reading || !current) return;
    const card = deck.cards.get(current);
    const chars = card ? card.c.length + card.y.length : 0;
    const wait = Math.min(READ_MS[1], Math.max(READ_MS[0], chars * READ_MS_PER_CHAR));
    const tick = () => {
      if (!reading || !current) return;
      // her mouse on the card means she's still reading it
      if (hovered) { readTimer = setTimeout(tick, HOVER_RETRY_MS); return; }
      const i = keys.indexOf(current);
      if (i < keys.length - 1) api.open(keys[i + 1]);
      else setReading(false);
    };
    readTimer = setTimeout(tick, wait);
  }

  function setReading(on) {
    reading = on;
    page.classList.toggle('is-reading-on', on);
    const btn = page.querySelector('.dp-play');
    if (btn) { btn.textContent = on ? 'pause' : 'read on'; btn.setAttribute('aria-pressed', String(on)); }
    if (on) readNext(); else clearTimeout(readTimer);
  }

  function hours(r) {
    const wrap = el('div', 'dp-hours');
    wrap.setAttribute('aria-hidden', 'true');
    [...r[8]].forEach((d, h) => {
      const bar = el('i');
      bar.style.setProperty('--h', (Number(d) / 9).toFixed(2));
      if (d === '0') bar.className = 'is-quiet';
      bar.title = `${clock(h * 60)}`;
      wrap.append(bar);
    });
    const ticks = el('div', 'dp-ticks');
    ticks.setAttribute('aria-hidden', 'true');
    for (const t of ['12 am', '6 am', 'noon', '6 pm', '12 am']) ticks.append(el('span', '', t));
    return [wrap, ticks];
  }

  function times(r) {
    const list = el('ul', 'dp-times');
    list.append(el('li', '', `${r[10] ? 'you' : 'i'} texted first at ${clock(r[6])}`));
    if (r[9] >= SUNRISE) list.append(el('li', '', `we didn’t sleep · still talking at ${clock(r[9])}`));
    else if (r[9] >= MIDNIGHT) list.append(el('li', '', `we fell asleep at ${clock(r[9])}`));
    else if (r[9] >= 0) list.append(el('li', '', `goodnight at ${clock(r[9])}`));
    return list;
  }

  /** how the day felt and what to call it: these sit in the head, beside the polaroid */
  function naming(card) {
    const mood = el('p', 'dp-mood', MOODS[card.m]?.word || '');
    mood.style.setProperty('--c', familyOf(card.m).color);
    return [mood, el('p', 'dp-title', card.t)];
  }

  /** what happened that day, and its thank you */
  function story(card) {
    const box = el('div', 'dp-story');
    box.setAttribute('aria-label', 'what this day was');
    const thanks = el('figure', 'dp-thanks');
    const no = el('figcaption', 'dp-thanks-no');
    no.append(el('span', '', 'thank you'), el('b', '', `no. ${fmt.format(card.n)}`), el('span', '', `of ${fmt.format(deck.total)}`));
    thanks.append(no, el('p', '', card.y));
    box.append(el('p', 'dp-context', card.c), thanks);
    return box;
  }

  function line(key) {
    const box = el('figure', 'dp-line');
    box.hidden = true;
    loveLines().then(map => {
      if (current !== key) return;
      const card = deck.cards.get(key);
      const own = card?.q ? [{ who: card.w === 1 ? 1 : 0, text: card.q }] : [];
      const list = [...own, ...(map.get(key) || []).filter(l => l.text !== card?.q)];
      if (!list.length) return;
      let i = 0;
      const quote = el('blockquote');
      const cite = el('figcaption');
      const show = () => { quote.textContent = list[i].text; cite.textContent = list[i].who ? '— you' : '— me'; };
      show();
      box.append(quote, cite);
      if (list.length > 1) {
        const more = el('button', 'dp-more', `another · ${list.length}`);
        more.type = 'button';
        more.addEventListener('click', () => { i = (i + 1) % list.length; show(); });
        box.append(more);
      }
      box.hidden = false;
    });
    return box;
  }

  /** the day's picture as a taped polaroid; with more than one, a click shows the next */
  function polaroid(key) {
    const pic = pictures.get(key);
    if (!pic) return null;
    const fig = el('figure', 'dp-photo');
    const img = el('img');
    const cap = el('figcaption');
    const many = pic.list.length > 1;
    const frame = many ? el('button', 'dp-photo-next') : el('span', 'dp-photo-frame');
    let i = pic.i;
    const show = () => {
      const src = pic.list[i];
      img.src = src;
      img.alt = pic.kind === 'other' ? `us on ${longDate(pic.from)}` : `from ${longDate(key)}`;
      fig.classList.toggle('is-video', /\/(VID-|videos\/)/.test(src));
      if (pic.kind === 'other') cap.textContent = `from ${shortDate(pic.from)} ${pic.from.slice(0, 4)}`;
      else if (many) cap.textContent = `${i + 1} of ${pic.list.length}`;
      if (many) frame.setAttribute('aria-label', `next picture from this day (${i + 1} of ${pic.list.length})`);
      pictures.show(key, i);
    };
    if (many) {
      frame.type = 'button';
      frame.addEventListener('click', () => { i = (i + 1) % pic.list.length; show(); fig.classList.remove('is-turn'); void fig.offsetWidth; fig.classList.add('is-turn'); });
      // warm the others so the flip is instant
      pic.list.forEach(src => { new Image().src = src; });
    }
    show();
    frame.append(img);
    fig.append(frame);
    if (cap.textContent) fig.append(cap);
    return fig;
  }

  function render(key) {
    const r = DAYS[key];
    const i = keys.indexOf(key);
    const youN = r[0] - r[3], meN = r[3];
    const mark = markFor(key);
    page.replaceChildren();

    const close = el('button', 'dp-close', 'close');
    close.setAttribute('aria-label', 'close this day and go back to the ledger');
    close.type = 'button';
    close.addEventListener('click', () => api.close());

    const head = el('header', 'dp-head');
    head.append(el('p', 'dp-eyebrow', `${weekday(key)} · the ${ordinal(i + 1)} day we talked`));
    const h = el('h3', 'dp-date', longDate(key));
    h.id = 'dp-date';
    head.append(h);
    if (mark) head.append(el('p', 'dp-mark', `♥ ${mark.name}`));
    const card = deck.cards.get(key);
    if (card) head.append(...naming(card));

    const photo = polaroid(key);

    const count = el('p', 'dp-count');
    count.append(el('b', '', fmt.format(r[0])), document.createTextNode(r[0] === 1 ? ' message' : ' messages'));
    const split = el('div', 'dp-split');
    split.setAttribute('role', 'img');
    split.setAttribute('aria-label', `${youN} from you, ${meN} from me`);
    const you = el('span', 'dp-you');
    you.style.flexGrow = String(Math.max(youN, 1));
    you.append(el('b', '', 'you'), document.createTextNode(` ${fmt.format(youN)}`));
    const me = el('span', 'dp-me');
    me.style.flexGrow = String(Math.max(meN, 1));
    me.append(el('b', '', 'me'), document.createTextNode(` ${fmt.format(meN)}`));
    split.append(you, me);

    const meta = [];
    if (r[1]) meta.push(plural(r[1], 'photo'));
    if (r[2]) meta.push(plural(r[2], 'voice note'));
    if (r[5]) meta.push(r[5] === 1 ? 'i love you once' : `i love you ×${r[5]}`);

    const nav = el('nav', 'dp-nav');
    nav.setAttribute('aria-label', 'other days');
    const prev = el('button', 'dp-prev', i > 0 ? `‹ ${shortDate(keys[i - 1])}` : '');
    const next = el('button', 'dp-next', i < keys.length - 1 ? `${shortDate(keys[i + 1])} ›` : '');
    prev.type = next.type = 'button';
    prev.disabled = i === 0;
    next.disabled = i === keys.length - 1;
    prev.setAttribute('aria-label', 'the day before');
    next.setAttribute('aria-label', 'the day after');
    prev.addEventListener('click', () => api.open(keys[i - 1]));
    next.addEventListener('click', () => api.open(keys[i + 1]));
    const play = el('button', 'dp-play', reading ? 'pause' : 'read on');
    play.type = 'button';
    play.setAttribute('aria-pressed', String(reading));
    play.setAttribute('aria-label', 'turn to the next day by itself');
    play.disabled = i === keys.length - 1 && !reading;
    play.addEventListener('click', () => setReading(!reading));
    const mid = el('span', 'dp-nav-mid');
    mid.append(close, play);
    nav.append(prev, mid, next);

    page.append(head);
    if (photo) page.append(photo);
    if (card) page.append(story(card));
    page.append(line(key), count, split, el('p', 'dp-label', 'when we talked'), ...hours(r), times(r));
    if (meta.length) {
      const p = el('p', 'dp-meta');
      p.append(...meta.map(m => el('span', '', m)));
      page.append(p);
    }
    page.append(nav);
    page.classList.toggle('has-photo', Boolean(photo));
  }

  const onKey = e => {
    if (!current) return;
    if (e.key === 'Escape') { api.close(); return; }
    const i = keys.indexOf(current);
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); api.open(keys[i - 1]); }
    if (e.key === 'ArrowRight' && i < keys.length - 1) { e.preventDefault(); api.open(keys[i + 1]); }
  };

  const api = {
    get current() { return current; },
    open(key) {
      if (!DAYS[key]) return;
      const opening = !current;
      if (opening) returnFocus = document.activeElement;
      current = key;
      render(key);
      page.hidden = false;
      section.classList.add('is-reading');
      // flip animation for each new day
      page.classList.remove('is-flip');
      void page.offsetWidth;
      page.classList.add('is-flip');
      if (opening) {
        addEventListener('keydown', onKey);
        page.focus({ preventScroll: true });
      }
      onSelect(key);
      readNext();
    },
    /** the cards arrived after this page opened: draw it again with them */
    refresh() {
      if (current) render(current);
    },
    close() {
      if (!current) return;
      current = null;
      setReading(false);
      section.classList.remove('is-reading');
      removeEventListener('keydown', onKey);
      page.hidden = true;
      onSelect(null);
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    },
  };
  return api;
}
