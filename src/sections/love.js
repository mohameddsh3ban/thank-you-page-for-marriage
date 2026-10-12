// #09 — every love message from the chat. The section shows a river of real lines; the button opens
// the love book: a full-screen wall of all of them (same page, so the song never stops).
// Data: /private/love.json, built by scripts/build-love.mjs.

const DATA_URL = '/private/love.json';
const WHO = ['me', 'you']; // 0 = him (me, the writer), 1 = her (you, the reader)
const CAT_LETTER = 3;
const SHORT_CHARS = 34; // lines this short become whispers or big italic notes
const WHISPERS_MAX = 26; // tiny lines gathered into one card
const RENDER_BATCH = 90; // cards per frame of progressive rendering
const RIVER_ROWS = 3;
const RIVER_PER_ROW = 26;
const COL_WIDTH = 290;

const fmt = new Intl.NumberFormat('en');
const pad = n => String(n).padStart(2, '0');

function parseAt(at) {
  const [d, t] = at.split('T');
  const [y, m, day] = d.split('-');
  let [h, min] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return { year: y, date: `${day}.${m}.${y}`, short: `${day}.${m}`, time: `${h}:${pad(min)} ${ap}` };
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- the section ---------- */
function fillSection(data) {
  const { counts, items } = data;
  const first = parseAt(items[0][1]).date;
  const last = parseAt(items.at(-1)[1]).date;
  document.getElementById('love-meta').textContent =
    `${fmt.format(counts.total)} love messages · ${fmt.format(counts.her)} from you · ${fmt.format(counts.him)} from me · ${first} → ${last}`;

  const river = document.getElementById('love-river');
  const pool = shuffled(items.filter(it => it[3].length <= 40 && it[2] !== CAT_LETTER));
  for (let r = 0; r < RIVER_ROWS; r++) {
    const row = el('div', 'lr-row');
    row.style.setProperty('--dur', `${110 + r * 26}s`);
    const picks = pool.slice(r * RIVER_PER_ROW, (r + 1) * RIVER_PER_ROW);
    // twice, so the marquee loops seamlessly at -50%
    for (const it of [...picks, ...picks]) {
      const line = el('span', `lr-line${it[0] === 0 ? ' is-me' : ''}`, it[3]);
      line.append(el('small', '', parseAt(it[1]).date));
      row.append(line);
    }
    river.append(row);
  }
}

/* ---------- the book ---------- */
function buildBook(data, onClose) {
  const { counts, items } = data;
  const years = Object.keys(counts.years).sort();
  const state = { who: 'all', kind: 'all', year: 'all' };

  const book = el('div', 'love-book');
  book.id = 'love-book';
  book.hidden = true;
  book.setAttribute('role', 'dialog');
  book.setAttribute('aria-modal', 'true');
  book.setAttribute('aria-labelledby', 'lb-title');
  book.setAttribute('data-lenis-prevent', '');

  const scroller = el('div', 'lb-scroll');
  scroller.setAttribute('data-lenis-prevent', '');
  const close = el('button', 'lb-close', 'close ✕');
  close.type = 'button';

  const head = el('header', 'lb-head');
  head.append(el('p', 'eyebrow', '#09 — Every love message'));
  const title = el('h2', 'lb-title', 'Love ');
  title.id = 'lb-title';
  title.append(el('span', 'script', 'in writing'));
  head.append(title);
  const sub = el('p', 'lb-sub');
  const first = parseAt(items[0][1]).date;
  const last = parseAt(items.at(-1)[1]).date;
  const subParts = [
    ['b', fmt.format(counts.total)], ['', ' times we said it in writing'], ['br'],
    ['b', fmt.format(counts.her)], ['', ' from you · '], ['b', fmt.format(counts.him)], ['', ' from me · ' + first + ' → ' + last], ['br'],
    ['', 'oldest first · in our own words'],
  ];
  for (const [tag, text] of subParts) sub.append(tag ? el(tag, '', text) : document.createTextNode(text));
  head.append(sub);

  // filters
  const filters = el('nav', 'lb-filters');
  filters.setAttribute('aria-label', 'Filter the messages');
  const groups = {};
  const chip = (group, value, label, n) => {
    const b = el('button', 'lb-chip', label);
    b.type = 'button';
    b.dataset.group = group;
    b.dataset.value = value;
    if (n != null) b.append(el('i', '', fmt.format(n)));
    b.setAttribute('aria-pressed', String(state[group] === value));
    (groups[group] ||= el('div', 'lb-group')).append(b);
    return b;
  };
  chip('who', 'all', 'all of them', counts.total);
  chip('who', '1', 'from you', counts.her);
  chip('who', '0', 'from me', counts.him);
  chip('kind', 'all', 'everything');
  chip('kind', '3', 'letters', counts.byCat.letter);
  chip('kind', '0', 'i love you', counts.byCat.love);
  chip('kind', '1', 'i miss you', counts.byCat.miss);
  chip('kind', '2', 'sweet things', counts.byCat.sweet);
  chip('year', 'all', 'every year');
  for (const y of years) chip('year', y, y, counts.years[y]);
  const lucky = el('button', 'lb-chip is-lucky', 'one for me ✦');
  lucky.type = 'button';
  const luckyGroup = el('div', 'lb-group');
  luckyGroup.append(lucky);
  filters.append(groups.who, groups.kind, groups.year, luckyGroup);
  head.append(filters);

  const wall = el('div', 'lb-wall');
  const sentinel = el('div', 'lb-sentinel');
  const end = el('footer', 'lb-end');
  end.append(el('p', 'script', 'and still not enough'), el('p', 'eyebrow', 'only the ones the chat kept · the rest we said out loud'));
  scroller.append(head, wall, sentinel, end);
  book.append(scroller, close);
  document.body.append(book);

  /* --- filtering + progressive masonry --- */
  let list = [];
  let blocks = []; // [{ year, units: [] }]
  let cursor = { b: 0, u: 0 };
  let cols = [];
  let colH = [];
  let rendering = false;

  function filtered() {
    return items.filter(it =>
      (state.who === 'all' || String(it[0]) === state.who) &&
      (state.kind === 'all' || String(it[2]) === state.kind) &&
      (state.year === 'all' || it[1].startsWith(state.year)));
  }

  // group into per-year blocks of render units: whispers (runs of tiny lines) and single cards
  function plan(rows) {
    const out = [];
    let block = null;
    let whisper = null;
    const flush = () => { if (whisper) { block.units.push(whisper); whisper = null; } };
    rows.forEach((it, idx) => {
      const y = it[1].slice(0, 4);
      if (!block || block.year !== y) { flush(); block = { year: y, n: 0, units: [] }; out.push(block); }
      block.n += 1;
      const tiny = it[3].length <= SHORT_CHARS && it[2] !== CAT_LETTER && !/\n/.test(it[3]);
      if (tiny && state.kind !== '3') {
        whisper ||= { type: 'whisper', rows: [] };
        whisper.rows.push(idx);
        if (whisper.rows.length >= WHISPERS_MAX) flush();
      } else {
        block.units.push({ type: it[2] === CAT_LETTER ? 'letter' : 'note', idx });
      }
    });
    flush();
    return out;
  }

  function columnCount() {
    return Math.max(2, Math.min(5, Math.floor(wall.clientWidth / COL_WIDTH)));
  }

  function startBlock(block) {
    const head = el('div', 'lb-year');
    head.append(el('h3', '', block.year), el('p', '', `${fmt.format(block.n)} ${block.n === 1 ? 'message' : 'messages'}`));
    const row = el('div', 'lb-cols');
    const n = columnCount();
    cols = Array.from({ length: n }, () => row.appendChild(el('div', 'lb-col')));
    colH = Array(n).fill(0);
    wall.append(head, row);
  }

  // estimated height keeps masonry balanced without forcing a layout per card
  function estimate(unit) {
    if (unit.type === 'whisper') return 60 + Math.ceil(unit.rows.length / 3) * 40;
    const text = list[unit.idx][3];
    if (unit.type === 'letter') return 380;
    if (text.length <= SHORT_CHARS) return 110;
    return 70 + Math.ceil(text.length / 34) * 26;
  }

  function meta(it) {
    const p = parseAt(it[1]);
    const m = el('p', 'lb-meta');
    m.append(el('b', '', WHO[it[0]]), document.createTextNode(` · ${p.date} · ${p.time}`));
    return m;
  }

  function tilt(card, seed) {
    card.style.setProperty('--tilt', `${(((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2.4}deg`);
  }

  function renderUnit(unit) {
    let card;
    if (unit.type === 'whisper') {
      const rows = unit.rows.map(i => list[i]);
      card = el('article', 'lb-card lb-whispers');
      const a = parseAt(rows[0][1]);
      const b = parseAt(rows.at(-1)[1]);
      const span = a.date === b.date ? a.date : `${a.short} → ${b.date}`;
      card.append(el('p', 'lb-meta', `${span} · ${rows.length} little ones`));
      const ul = el('ul');
      for (const it of rows) {
        const li = el('li', `lb-w${it[0] === 1 ? ' is-her' : ''}`, it[3]);
        const p = parseAt(it[1]);
        li.title = `${WHO[it[0]]} · ${p.date} · ${p.time}`;
        ul.append(li);
      }
      card.append(ul);
    } else {
      const it = list[unit.idx];
      const isLetter = unit.type === 'letter';
      card = el('article', `lb-card ${isLetter ? 'lb-letter' : 'lb-note'}${it[0] === 1 ? ' is-her' : ''}${it[3].length <= SHORT_CHARS ? ' is-short' : ''}`);
      if (isLetter) card.append(el('p', 'lb-kicker', it[0] === 1 ? 'a letter from you' : 'a letter from me'));
      card.append(el('p', 'lb-text', it[3]), meta(it));
      if (isLetter) {
        const read = el('button', 'lb-read', 'read all of it →');
        read.type = 'button';
        read.addEventListener('click', () => openReader(unit.idx));
        card.append(read);
      }
      tilt(card, unit.idx);
    }
    let k = 0;
    for (let c = 1; c < colH.length; c++) if (colH[c] < colH[k]) k = c;
    cols[k].append(card);
    colH[k] += estimate(unit) + 18;
  }

  function renderBatch() {
    let budget = RENDER_BATCH;
    while (budget > 0 && cursor.b < blocks.length) {
      const block = blocks[cursor.b];
      if (cursor.u === 0) startBlock(block);
      while (budget > 0 && cursor.u < block.units.length) {
        renderUnit(block.units[cursor.u]);
        cursor.u += 1;
        budget -= 1;
      }
      if (cursor.u >= block.units.length) { cursor.b += 1; cursor.u = 0; }
    }
    end.hidden = cursor.b < blocks.length;
  }

  function renderMore() {
    if (rendering) return;
    rendering = true;
    requestAnimationFrame(() => {
      renderBatch();
      rendering = false;
      // keep filling while the sentinel is still near the screen
      const r = sentinel.getBoundingClientRect();
      if (cursor.b < blocks.length && r.top < innerHeight * 2.5) renderMore();
    });
  }

  function rebuild() {
    list = filtered();
    blocks = plan(list);
    cursor = { b: 0, u: 0 };
    wall.replaceChildren();
    if (!list.length) wall.append(el('p', 'lb-empty', 'none here · try another filter'));
    end.hidden = true;
    renderBatch(); // first screen right away, the rest as she scrolls
    renderMore();
  }

  new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) renderMore();
  }, { root: scroller, rootMargin: '1600px 0px' }).observe(sentinel);

  filters.addEventListener('click', e => {
    const b = e.target.closest('.lb-chip[data-group]');
    if (!b) return;
    state[b.dataset.group] = b.dataset.value;
    groups[b.dataset.group].querySelectorAll('.lb-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    rebuild();
    scroller.scrollTo({ top: head.offsetHeight - filters.offsetHeight - 10, behavior: 'smooth' });
  });

  /* --- reader: one message at a time --- */
  let reader = null;
  let readerIdx = -1;
  function openReader(idx) {
    readerIdx = idx;
    if (!reader) {
      reader = el('div', 'lb-reader');
      reader.addEventListener('click', e => { if (e.target === reader) closeReader(); });
      book.append(reader);
    }
    const it = list[idx];
    const sheet = el('article', 'lb-sheet');
    sheet.setAttribute('data-lenis-prevent', '');
    if (it[2] === CAT_LETTER) sheet.append(el('p', 'lb-kicker', it[0] === 1 ? 'a letter from you' : 'a letter from me'));
    sheet.append(el('p', `lb-text${it[3].length <= SHORT_CHARS ? ' is-short' : ''}`, it[3]), meta(it));
    const nav = el('div', 'lb-sheet-nav');
    const prev = el('button', '', '← older');
    const again = el('button', '', 'another one ✦');
    const next = el('button', '', 'newer →');
    for (const b of [prev, again, next]) b.type = 'button';
    prev.disabled = idx <= 0;
    next.disabled = idx >= list.length - 1;
    prev.addEventListener('click', () => openReader(idx - 1));
    next.addEventListener('click', () => openReader(idx + 1));
    again.addEventListener('click', () => openReader(luckyIndex()));
    nav.append(prev, again, next);
    sheet.append(nav);
    reader.replaceChildren(sheet);
    reader.hidden = false;
    again.focus({ preventScroll: true });
  }
  function closeReader() {
    if (reader) reader.hidden = true;
    readerIdx = -1;
  }
  // a random one worth reading on its own (skip the one-word ones)
  function luckyIndex() {
    const pool = [];
    list.forEach((it, i) => { if (it[3].length > SHORT_CHARS) pool.push(i); });
    const from = pool.length ? pool : list.map((_, i) => i);
    return from[Math.floor(Math.random() * from.length)];
  }
  lucky.addEventListener('click', () => { if (list.length) openReader(luckyIndex()); });

  /* --- open / close --- */
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    book.hidden = false;
    document.body.classList.add('is-love-open');
    if (!list.length && !wall.childElementCount) rebuild();
    requestAnimationFrame(() => book.classList.add('is-in'));
    close.focus({ preventScroll: true });
  }
  function shut() {
    closeReader();
    book.classList.remove('is-in');
    document.body.classList.remove('is-love-open');
    setTimeout(() => { book.hidden = true; onClose?.(); }, 500);
    lastFocus?.focus?.({ preventScroll: true });
  }
  close.addEventListener('click', shut);
  addEventListener('keydown', e => {
    if (book.hidden) return;
    if (e.key === 'Escape') { if (readerIdx >= 0) closeReader(); else shut(); }
    if (readerIdx >= 0 && e.key === 'ArrowLeft' && readerIdx > 0) openReader(readerIdx - 1);
    if (readerIdx >= 0 && e.key === 'ArrowRight' && readerIdx < list.length - 1) openReader(readerIdx + 1);
  });
  return { open };
}

/* ---------- the surprise: lid pops, real lines burst out, then the book opens ---------- */
const BURST_NOTES = 18;
const BURST_HEARTS = 10;
const OPEN_AFTER_MS = 750;

function burst(from, items) {
  const layer = el('div', 'gift-burst');
  document.body.append(layer);
  const r = from.getBoundingClientRect();
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height * 0.42; // the box opening, just under the lid
  const lines = shuffled(items.filter(it => it[3].length <= 22 && it[2] !== CAT_LETTER)).slice(0, BURST_NOTES);
  const pieces = [
    ...lines.map(it => el('span', `gift-note${it[0] === 1 ? ' is-her' : ''}`, it[3])),
    ...Array.from({ length: BURST_HEARTS }, () => el('span', 'gift-note is-heart', '♥')),
  ];
  let longest = 0;
  pieces.forEach((p, i) => {
    layer.append(p);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25; // mostly upward, fanning out
    const dist = 180 + Math.random() * Math.min(innerWidth, innerHeight) * 0.5;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spin = (Math.random() - 0.5) * 50;
    const dur = 1300 + Math.random() * 700;
    const delay = i * 18;
    longest = Math.max(longest, dur + delay);
    p.animate([
      { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(0.3) rotate(0deg)`, opacity: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: `translate(${x0 + dx}px, ${y0 + dy}px) translate(-50%, -50%) scale(1) rotate(${spin}deg)`, opacity: 1, offset: 0.62 },
      { transform: `translate(${x0 + dx * 1.08}px, ${y0 + dy + 140}px) translate(-50%, -50%) scale(0.9) rotate(${spin * 1.6}deg)`, opacity: 0 },
    ], { duration: dur, delay, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)', fill: 'both' });
  });
  setTimeout(() => layer.remove(), longest + 100);
}

export async function initLove() {
  const openBtn = document.getElementById('love-open');
  if (!openBtn) return;
  const res = await fetch(DATA_URL, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`love.json ${res.status}`);
  const data = await res.json();
  if (!data.items?.length) return;
  fillSection(data);
  // the box closes again behind the book, ready to be opened once more
  const book = buildBook(data, () => openBtn.classList.remove('is-opening'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  openBtn.addEventListener('click', () => {
    if (openBtn.classList.contains('is-opening')) return;
    if (reduced) { book.open(); return; }
    openBtn.classList.add('is-opening');
    burst(openBtn.querySelector('.gift'), data.items);
    setTimeout(() => book.open(), OPEN_AFTER_MS);
  });
  if (import.meta.env.DEV) window.__love = book; // dev-only handle for tests
}
