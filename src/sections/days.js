// #04 — "a ledger of us": one ink dot per day, read four ways (loud · late · love · who), our days
// as gold hearts, any stretches the export lost drawn as lost (never as silence), a time-lapse that
// fills the ledger from the first message to today, a taped note on hover, and a whole page for
// any day she clicks.
import DAYS from '../content/days.json';
import N from '../content/chat-numbers.json';
import DAY_PHOTOS from '../content/day-photos.json';
import { ScrollTrigger } from '../scroll.js';
import { makeLenses, whoColor } from './days-lenses.js';
import { createDayPage } from './days-page.js';
import { loadCards } from './days-cards.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// key = MM-DD (every year) or YYYY-MM-DD
const MARKS = [
  { key: '2019-09-14', name: 'the first message' },
  { key: '2019-10-05', name: 'our first date' },
  { key: '03-22', name: 'your birthday' },
  { key: '11-08', name: 'my birthday' },
  { key: N.loudestDay.day, name: 'our loudest day' },
  { key: '2021-08-01', name: 'we moved in' },
  { key: '2023-12-23', name: 'i asked · you said yes' },
  { key: '2025-06-07', name: 'we got married' },
];
// empty stretches explained, so a blank never reads as "we stopped", e.g.
//   { from: '2022-08-20', to: '2022-10-09', kind: 'lost', label: 'lost from the export · we were still talking every day' }
// (kind 'apart' draws the stretch in red instead, for time spent apart)
const RANGES = [];
const BEFORE_NOTE = 'it starts the night i sent you the photo from the roof · 14.09.2019, 11:30 pm';
const TIMELAPSE_MS = 3600;
const SWITCH_MS = 900;
const fmt = new Intl.NumberFormat('en');
const pad = n => String(n).padStart(2, '0');
const markFor = key => MARKS.find(m => m.key === key || m.key === key.slice(5));
const rangeFor = key => RANGES.find(r => key >= r.from && key <= r.to);
const dot = iso => iso.split('-').reverse().join('.');
const longDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/**
 * Every day's pictures (scripts/build-day-photos.mjs): what we picked that day, else a few sent
 * that day, else one picked photo from another day. Which one shows is random per visit, and the
 * hover note and the day page agree on it.
 */
function dayPictures() {
  const shown = new Map(); // day -> index showing this visit
  return {
    get(key) {
      const d = DAY_PHOTOS[key];
      if (!d?.s?.length) return null;
      if (!shown.has(key)) shown.set(key, Math.floor(Math.random() * d.s.length));
      return { list: d.s, kind: d.k, from: d.from, i: shown.get(key) };
    },
    show(key, i) { shown.set(key, i); },
  };
}

export function initDays() {
  const section = document.getElementById('days');
  const ledger = document.getElementById('ledger');
  const root = document.getElementById('days-years');
  const note = document.getElementById('day-note');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pictures = dayPictures();
  const keys = Object.keys(DAYS).sort();
  const first = keys[0], last = keys[keys.length - 1];
  const deck = { cards: new Map(), total: 0 }; // the day cards, once they arrive
  const lenses = makeLenses(DAYS, deck);
  const cells = new Map(); // key -> element, only real calendar days inside the chat

  const page = createDayPage({
    section, page: document.getElementById('day-page'), DAYS, keys, pictures, markFor, deck,
    onSelect: key => {
      cells.forEach((c, k) => c.classList.toggle('is-sel', k === key));
      // the page covers the facts, so a hover preview would never get its mouseleave: drop it
      highlight(pinned ? pinned.hl : null);
    },
  });

  /* ---------- the ledger: one block per year, one row per month ---------- */
  const [fy, fm] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  const nowKey = (() => { const d = new Date(`${last}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();

  function monthRow(grid, y, m) {
    grid.append(el('span', 'lmonth', MONTHS[m - 1]));
    const dim = new Date(y, m, 0).getDate();
    const monthKeys = Array.from({ length: dim }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
    const range = rangeFor(monthKeys[0]);
    // a whole month the export lost (or we spent apart) is one dashed line, not 30 empty dots
    if (range && monthKeys.every(k => rangeFor(k) === range && !DAYS[k] && !markFor(k))) {
      const hole = el('span', `lhole ${range.kind}`);
      hole.dataset.range = RANGES.indexOf(range);
      if (!grid.querySelector(`.lhole[data-range="${hole.dataset.range}"]`)) hole.append(el('em', '', range.label));
      grid.append(hole);
      return;
    }
    for (let d = 1; d <= 31; d++) {
      const c = el('span', 'ld');
      if (d > dim) { c.classList.add('void'); grid.append(c); continue; }
      const key = monthKeys[d - 1];
      c.style.setProperty('--col', d);
      c.style.setProperty('--row', m);
      if (key < first) c.classList.add('pre');
      else if (key === nowKey) { c.classList.add('now'); c.dataset.key = key; }
      else if (key > last) c.classList.add('future');
      else {
        const mark = markFor(key);
        c.dataset.key = key;
        if (DAYS[key]) c.classList.add('has');
        else if (rangeFor(key)) c.classList.add('gap', rangeFor(key).kind);
        if (mark) { c.classList.add('mark'); c.textContent = '♥'; }
        cells.set(key, c);
      }
      grid.append(c);
    }
  }

  for (let y = fy; y <= ly; y++) {
    const block = el('div', 'lyear');
    const grid = el('div', 'lgrid');
    for (let m = y === fy ? fm : 1; m <= (y === ly ? lm : 12); m++) monthRow(grid, y, m);
    block.append(el('h3', '', String(y)), grid);
    // the first year is short on the page: say why the ledger starts mid-story
    if (y === fy) block.append(el('p', 'lyear-note', BEFORE_NOTE));
    root.append(block);
  }

  /* ---------- the key: lens switch + legend, in the blank page space beside the last year ---------- */
  const key = el('div', 'ledger-key');
  key.append(el('p', 'lk-title', 'read it by'));
  const tabs = el('div', 'lk-lenses');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'read the ledger by');
  const legend = el('p', 'lk-legend');
  legend.setAttribute('aria-hidden', 'true');
  const legendLo = el('span'), legendHi = el('span');
  const samples = [0.4, 0.6, 0.8, 1].map(s => { const i = el('i', 'ld has is-in'); i.style.setProperty('--s', s); i.style.setProperty('--a', 0.4 + s * 0.6); return i; });
  legend.append(legendLo, ...samples, legendHi);
  // the felt lens colours by kind of day instead of sizing one thing, so it names its colours
  const swatches = el('p', 'lk-swatches');
  swatches.setAttribute('aria-hidden', 'true');
  swatches.hidden = true;
  const extras = el('p', 'lk-extras');
  extras.append(el('span', 'lk-heart', '♥ our days'));
  if (RANGES.some(r => r.kind === 'lost')) extras.append(el('span', 'lk-lost', 'lost from the export'));
  const replay = el('button', 'lk-replay', '↻ watch it fill again');
  replay.type = 'button';
  key.append(tabs, legend, swatches, extras, replay);
  root.append(key);

  /* ---------- facts (they change with the lens) + highlighting ---------- */
  const facts = document.getElementById('days-facts');
  const sub = document.getElementById('days-sub');
  let pinned = null; // a fact whose highlight stays on after a click

  function highlight(fn) {
    ledger.classList.toggle('is-hl', Boolean(fn));
    cells.forEach((c, k) => c.classList.toggle('hl', Boolean(fn && DAYS[k] && fn(k, DAYS[k]))));
  }

  function renderFacts(lens) {
    pinned = null;
    highlight(null);
    facts.replaceChildren();
    for (const f of lens.facts) {
      const row = el('div', 'fact');
      const dd = el('dd');
      const dt = el('dt', '', f.label);
      if (f.hl || f.day) {
        const b = el('button', 'fact-btn', f.value);
        b.type = 'button';
        b.setAttribute('aria-label', `${f.value} ${f.label} — ${f.day ? 'open that day' : 'show them in the ledger'}`);
        const preview = on => { if (!pinned) highlight(on ? (f.hl || (k => k === f.day)) : null); };
        row.addEventListener('mouseenter', () => preview(true));
        row.addEventListener('mouseleave', () => preview(false));
        b.addEventListener('focus', () => preview(true));
        b.addEventListener('blur', () => preview(false));
        b.addEventListener('click', () => {
          if (f.day) { page.open(f.day); return; }
          pinned = pinned === f ? null : f;
          facts.querySelectorAll('.fact').forEach(x => x.classList.toggle('is-pinned', x === row && pinned === f));
          highlight(pinned ? f.hl : null);
        });
        dd.append(b);
        row.classList.add('is-live');
      } else {
        dd.textContent = f.value;
      }
      row.append(dd, dt);
      facts.append(row);
    }
  }

  /* ---------- lenses ---------- */
  let switchTimer = 0;
  function applyLens(id, animate) {
    const lens = lenses.find(l => l.id === id);
    ledger.dataset.lens = id;
    if (animate && !reduced) {
      ledger.classList.add('is-switching');
      clearTimeout(switchTimer);
      switchTimer = setTimeout(() => ledger.classList.remove('is-switching'), SWITCH_MS + 400);
    }
    cells.forEach((c, k) => {
      const r = DAYS[k];
      if (!r) return;
      const v = lens.dot(r, k);
      c.style.setProperty('--s', v.s.toFixed(3));
      c.style.setProperty('--a', v.a.toFixed(3));
      if (v.c) c.style.setProperty('--c', v.c); else c.style.removeProperty('--c');
      c.classList.toggle('z', Boolean(v.z));
    });
    samples.forEach((s, i) => {
      if (id === 'who') { s.style.setProperty('--c', whoColor(-1 + (i * 2) / 3)); s.style.setProperty('--a', Math.abs(-1 + (i * 2) / 3) * 0.75 + 0.25); }
      else { s.style.removeProperty('--c'); s.style.setProperty('--a', 0.4 + [0.4, 0.6, 0.8, 1][i] * 0.6); }
    });
    [legendLo.textContent, legendHi.textContent] = lens.legend;
    legend.hidden = Boolean(lens.swatches);
    swatches.hidden = !lens.swatches;
    if (lens.swatches && !swatches.childElementCount) {
      swatches.append(...lens.swatches.map(f => { const sw = el('span', 'lk-swatch', f.name); sw.style.setProperty('--c', f.color); return sw; }));
    }
    tabs.querySelectorAll('[role=tab]').forEach(t => { const on = t.dataset.lens === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    sub.textContent = lens.sub;
    facts.classList.remove('is-swap');
    void facts.offsetWidth;
    facts.classList.add('is-swap');
    renderFacts(lens);
  }

  let picked = false; // she chose a lens herself: the cards arriving must not switch it
  for (const lens of lenses) {
    const t = el('button', 'lk-lens', lens.name);
    t.type = 'button';
    t.dataset.lens = lens.id;
    t.setAttribute('role', 'tab');
    t.addEventListener('click', () => { picked = true; if (ledger.dataset.lens !== lens.id) applyLens(lens.id, true); });
    tabs.append(t);
  }
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const all = [...tabs.children];
    const i = all.findIndex(t => t.dataset.lens === ledger.dataset.lens);
    const next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    next.focus();
    next.click();
  });
  applyLens('loud', false);
  loadCards().then(({ cards, total }) => {
    cards.forEach((c, k) => deck.cards.set(k, c));
    deck.total = total;
    // how the days felt is the truest way to read them, so it opens on that once the cards are here
    if (total && (!picked || ledger.dataset.lens === 'felt')) applyLens('felt', false);
    page.refresh();
  });

  /* ---------- our days: hover makes their hearts pulse, click opens the day ---------- */
  const list = document.getElementById('marked-days');
  for (const m of MARKS) {
    const li = el('li');
    const btn = el('button');
    btn.type = 'button';
    btn.append(el('time', '', m.key.length === 5 ? `${m.key.slice(3)}.${m.key.slice(0, 2)} · every year` : dot(m.key)), el('span', '', m.name));
    const match = k => k === m.key || k.slice(5) === m.key;
    const on = v => cells.forEach((c, k) => { if (match(k)) c.classList.toggle('is-pulse', v); });
    btn.addEventListener('mouseenter', () => on(true));
    btn.addEventListener('mouseleave', () => on(false));
    btn.addEventListener('focus', () => on(true));
    btn.addEventListener('blur', () => on(false));
    // the most recent time it happened that we have in the chat
    const target = [...keys].reverse().find(match);
    if (target) btn.addEventListener('click', () => { on(false); page.open(target); });
    li.append(btn);
    list.append(li);
  }

  /* ---------- the taped note on hover ---------- */
  const noteFor = k => {
    const r = DAYS[k];
    const mark = markFor(k);
    const bits = [];
    if (r?.[1]) bits.push(`${r[1]} photo${r[1] > 1 ? 's' : ''}`);
    if (r?.[2]) bits.push(`${r[2]} voice note${r[2] > 1 ? 's' : ''}`);
    if (mark) bits.push(mark.name);
    if (!r) bits.unshift(k === nowKey ? 'the export ends here · we’re still writing' : rangeFor(k)?.label || 'a quiet day · or a day we just called');
    const pic = r ? pictures.get(k) : null;
    if (pic?.kind === 'other') bits.push(`photo from ${dot(pic.from)}`);
    return { date: longDate(k), count: r ? `${fmt.format(r[0])} messages` : '', title: deck.cards.get(k)?.t || '', meta: bits.join(' · '), photo: pic?.list[pic.i], open: Boolean(r) };
  };
  const show = (info, x, y) => {
    document.getElementById('dn-date').textContent = info.date;
    document.getElementById('dn-count').textContent = info.count;
    document.getElementById('dn-title').textContent = info.title || '';
    document.getElementById('dn-meta').textContent = info.meta;
    const img = document.getElementById('dn-photo');
    img.hidden = !info.photo;
    if (info.photo) img.src = info.photo;
    note.classList.toggle('can-open', info.open);
    note.hidden = false;
    const w = note.offsetWidth, h = note.offsetHeight;
    note.style.left = `${Math.min(innerWidth - w - 16, x + 18)}px`;
    note.style.top = `${Math.max(16, Math.min(innerHeight - h - 16, y - h / 2))}px`;
  };
  root.addEventListener('pointermove', e => {
    const c = e.target.closest('.ld[data-key]');
    const hole = e.target.closest('.lhole');
    if (c) show(noteFor(c.dataset.key), e.clientX, e.clientY);
    else if (hole) show({ date: RANGES[hole.dataset.range].label, count: '', meta: '', open: false }, e.clientX, e.clientY);
    else note.hidden = true;
  });
  root.addEventListener('pointerleave', () => { note.hidden = true; });
  root.addEventListener('click', e => {
    const c = e.target.closest('.ld.has[data-key]');
    if (c) { note.hidden = true; page.open(c.dataset.key); }
  });

  /* ---------- time-lapse: fill the ledger day by day from the first message to today ---------- */
  const dateEl = document.getElementById('ledger-date');
  const totalEl = document.getElementById('ledger-total');
  const allKeys = [...cells.keys()].sort();
  const nowCell = root.querySelector('.ld.now');
  const grand = keys.reduce((s, k) => s + DAYS[k][0], 0);
  let playing = 0;
  const finish = () => {
    cells.forEach(c => c.classList.add('is-in'));
    nowCell?.classList.add('is-in');
    dateEl.textContent = `${dot(first)} → ${dot(last)}`;
    totalEl.textContent = fmt.format(grand);
    replay.hidden = false;
  };
  const play = () => {
    if (reduced) { finish(); return; }
    cancelAnimationFrame(playing);
    cells.forEach(c => c.classList.remove('is-in'));
    nowCell?.classList.remove('is-in');
    replay.hidden = true;
    const start = performance.now();
    let i = 0, total = 0;
    const step = now => {
      const target = Math.floor(Math.min(1, (now - start) / TIMELAPSE_MS) * allKeys.length);
      for (; i < target; i++) {
        const k = allKeys[i];
        cells.get(k).classList.add('is-in');
        total += DAYS[k]?.[0] || 0;
      }
      if (i > 0) {
        dateEl.textContent = new Date(`${allKeys[i - 1]}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        totalEl.textContent = fmt.format(total);
      }
      if (i < allKeys.length) playing = requestAnimationFrame(step); else finish();
    };
    playing = requestAnimationFrame(step);
  };
  replay.hidden = true;
  replay.addEventListener('click', play);
  ScrollTrigger.create({ trigger: ledger, start: 'top 70%', once: true, onEnter: play });
}
