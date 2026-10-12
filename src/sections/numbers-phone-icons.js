// App icons for #03's phone home screen, drawn as SVG on a 60×60 tile to read like the real iOS ones
// (the tile's rounded corners come from CSS). Everything is static markup from this file; it is
// parsed once per icon with DOMParser (no network, no outside input).
const FONT = "-apple-system, 'SF Pro Display', 'Instrument Sans', system-ui, sans-serif";

/** Gear outline with `teeth` teeth (outer radius R, root radius r) and a round hole, as one evenodd path. */
function gear(cx, cy, teeth, R, r, hole) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const rad = i % 4 === 1 || i % 4 === 2 ? R : r;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z M${cx + hole} ${cy}a${hole} ${hole} 0 1 0 ${-2 * hole} 0a${hole} ${hole} 0 1 0 ${2 * hole} 0Z`;
}
const ticks = (cx, cy, r1, r2, n, w, color) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return `<line x1="${cx + Math.sin(a) * r1}" y1="${cy - Math.cos(a) * r1}" x2="${cx + Math.sin(a) * r2}" y2="${cy - Math.cos(a) * r2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}).join('');
const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const HANDSET = 'M21.6 17.2c.7-.8 1.9-.8 2.5.1l2.6 3.7c.5.7.4 1.6-.2 2.2l-1.7 1.6c1.6 3.4 4.3 6.1 7.7 7.7l1.6-1.7c.6-.6 1.5-.7 2.2-.2l3.7 2.6c.9.6.9 1.8.1 2.5l-1.6 1.6c-1.6 1.6-4.1 2-6.1.9-5.5-2.9-10-7.4-12.9-12.9-1.1-2-.7-4.5.9-6.1z';

function svg(body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const ICONS = {
  calendar: () => {
    const d = new Date();
    return svg(`<rect width="60" height="60" fill="#fff"/>
      <text x="30" y="18" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="600" fill="#ff3b30" letter-spacing=".3">${DAYS[d.getDay()]}</text>
      <text x="30" y="48" text-anchor="middle" font-family="${FONT}" font-size="31" font-weight="300" fill="#1c1c1e">${d.getDate()}</text>`);
  },
  photos: () => svg(`<rect width="60" height="60" fill="#fff"/>
    <g style="mix-blend-mode:multiply" opacity=".92">${['#f9a01b', '#fcd02c', '#9ac741', '#3fb8a9', '#2a96d5', '#8a5ba6', '#e2477e', '#ef5b30']
      .map((c, i) => `<rect x="26" y="9" width="8.5" height="17" rx="4.25" fill="${c}" transform="rotate(${i * 45} 30 30)"/>`).join('')}</g>`),
  camera: () => svg(`<rect width="60" height="60" fill="url(#np-cam)"/>
    <path d="M14 22h7l3-4h12l3 4h7a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3z" fill="#2c2c2e"/>
    <circle cx="30" cy="33" r="9.5" fill="#1c1c1e" stroke="#8e8e93" stroke-width="2"/>
    <circle cx="30" cy="33" r="5.5" fill="#3a3a5c"/><circle cx="28" cy="31" r="1.6" fill="#9fb4ff" opacity=".8"/>
    <circle cx="44" cy="26" r="1.3" fill="#ffd60a"/>`, grad('np-cam', [[0, '#f2f2f7'], [1, '#aeaeb2']])),
  clock: () => {
    const now = new Date();
    const hA = ((now.getHours() % 12) + now.getMinutes() / 60) * 30, mA = now.getMinutes() * 6;
    return svg(`<rect width="60" height="60" fill="#000"/>
      <circle cx="30" cy="30" r="24" fill="#fff"/>${ticks(30, 30, 20.5, 22.5, 12, 1.4, '#1c1c1e')}
      <line x1="30" y1="30" x2="30" y2="17" stroke="#1c1c1e" stroke-width="2.6" stroke-linecap="round" transform="rotate(${hA} 30 30)"/>
      <line x1="30" y1="30" x2="30" y2="12" stroke="#1c1c1e" stroke-width="1.8" stroke-linecap="round" transform="rotate(${mA} 30 30)"/>
      <line x1="30" y1="35" x2="30" y2="11" stroke="#ff9500" stroke-width=".9" transform="rotate(${mA + 147} 30 30)"/>
      <circle cx="30" cy="30" r="1.8" fill="#ff9500"/>`);
  },
  weather: () => svg(`<rect width="60" height="60" fill="url(#np-sky)"/>
    <circle cx="23" cy="24" r="9" fill="#ffd426"/>
    <path d="M21 44h22a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0-1 13z" fill="#fff"/>`, grad('np-sky', [[0, '#47a4f7'], [1, '#1663d6']])),
  notes: () => svg(`<rect width="60" height="60" fill="#fff"/><rect width="60" height="16" fill="url(#np-nt)"/>
    <path d="M0 16h60" stroke="#e5c33b" stroke-width="1"/>${[26, 34, 42, 50].map(y => `<path d="M8 ${y}h44" stroke="#e5e5ea" stroke-width="1.2"/>`).join('')}`,
  grad('np-nt', [[0, '#ffdd55'], [1, '#fec82f']])),
  maps: () => svg(`<rect width="60" height="60" fill="#f2ecd9"/>
    <path d="M0 0h26L0 22z" fill="#bfe4a1"/><path d="M60 60H30l30-26z" fill="#9fd0f5"/>
    <path d="M-2 40L62 12M18 -2L44 62" stroke="#fff" stroke-width="6"/><path d="M-2 40L62 12" stroke="#ffd04d" stroke-width="2.2"/>
    <circle cx="33" cy="27" r="8" fill="#fff"/><path d="M33 21.5l4.5 10.5-4.5-2.2-4.5 2.2z" fill="#1a8cff"/>`),
  settings: () => svg(`<rect width="60" height="60" fill="url(#np-set)"/>
    <path d="${gear(30, 30, 14, 22, 18.5, 9.5)}" fill="#3a3a3c" fill-rule="evenodd"/>
    <path d="${gear(30, 30, 10, 14, 11.5, 4.5)}" fill="#8e8e93" fill-rule="evenodd"/>`, grad('np-set', [[0, '#c7c7cc'], [1, '#8e8e93']])),
  instagram: () => svg(`<rect width="60" height="60" fill="url(#np-ig)"/>
    <rect x="15" y="15" width="30" height="30" rx="9" fill="none" stroke="#fff" stroke-width="3.6"/>
    <circle cx="30" cy="30" r="7.2" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="38.6" cy="21.4" r="2.2" fill="#fff"/>`,
  `<radialGradient id="np-ig" cx=".3" cy="1.07" r="1.3"><stop offset="0" stop-color="#fdf497"/><stop offset=".05" stop-color="#fdf497"/><stop offset=".45" stop-color="#fd5949"/><stop offset=".6" stop-color="#d6249f"/><stop offset=".9" stop-color="#285aeb"/></radialGradient>`),
  health: () => svg(`<rect width="60" height="60" fill="#fff"/>
    <path d="M44 31.5S30 23.6 30 14.3a7.1 7.1 0 0 1 14-1.7 7.1 7.1 0 0 1 14 1.7c0 9.3-14 17.2-14 17.2z" fill="url(#np-hl)" transform="translate(-6 3) scale(.9)"/>`,
  grad('np-hl', [[0, '#ff6482'], [1, '#ff2d55']])),
  wallet: () => svg(`<rect width="60" height="60" fill="#000"/>
    ${[['#3fb950', 13], ['#f6c142', 18], ['#f08a24', 23], ['#e94b3c', 28]].map(([c, y]) => `<rect x="10" y="${y}" width="40" height="18" rx="3.5" fill="${c}"/>`).join('')}
    <path d="M8 34h13c2 0 3 4 9 4s7-4 9-4h13v13a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#1c1c1e"/>`),
  books: () => svg(`<rect width="60" height="60" fill="url(#np-bk)"/>
    <path d="M30 20c-4-3-10-3.6-15-2.4v23c5-1.2 11-.6 15 2.4 4-3 10-3.6 15-2.4v-23c-5-1.2-11-.6-15 2.4z" fill="#fff"/><path d="M30 20v23" stroke="#ff8a00" stroke-width="1.4"/>`,
  grad('np-bk', [[0, '#ffb340'], [1, '#ff7a00']])),
  fitness: () => svg(`<rect width="60" height="60" fill="#000"/>
    ${[[21, '#fa114f', '#3a0d18', 0.82], [15.2, '#a6ff00', '#24360a', 0.7], [9.4, '#00f5ea', '#073836', 0.9]].map(([r, c, t, p]) =>
      `<circle cx="30" cy="30" r="${r}" fill="none" stroke="${t}" stroke-width="5"/>
       <circle cx="30" cy="30" r="${r}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * r * p).toFixed(1)} 999" transform="rotate(-90 30 30)"/>`).join('')}`),
  files: () => svg(`<rect width="60" height="60" fill="#fff"/>
    <path d="M10 19a3 3 0 0 1 3-3h10l4 4h20a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="url(#np-fl)"/>`,
  grad('np-fl', [[0, '#5ab0ff'], [1, '#1a78f2']])),
  home: () => svg(`<rect width="60" height="60" fill="url(#np-hm)"/>
    <path d="M30 14 13 28.5h4.5V45h9.5v-9.5h6V45h9.5V28.5H47z" fill="#fff"/>`, grad('np-hm', [[0, '#ffc23d'], [1, '#ff9500']])),
  memos: () => svg(`<rect width="60" height="60" fill="#000"/>
    ${[3, 7, 12, 18, 10, 22, 14, 8, 16, 6, 11, 4].map((hgt, i) => `<rect x="${9.5 + i * 3.6}" y="${30 - hgt / 2}" width="2" height="${hgt}" rx="1" fill="#ff3b30"/>`).join('')}`),
  translate: () => svg(`<rect width="60" height="60" fill="url(#np-tr)"/>
    <rect x="9" y="12" width="24" height="24" rx="5" fill="#fff"/><text x="21" y="31" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="#1a5fd8">A</text>
    <rect x="27" y="24" width="24" height="24" rx="5" fill="#0b3b9c"/><text x="39" y="42" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="#fff">文</text>`,
  grad('np-tr', [[0, '#4a8cff'], [1, '#1c54d6']])),
  calculator: () => svg(`<rect width="60" height="60" fill="#1c1c1e"/>
    ${[[17, 17, '#a5a5aa', '−'], [43, 17, '#ff9f0a', '+'], [17, 43, '#a5a5aa', '×'], [43, 43, '#ff9f0a', '=']].map(([x, y, c, s]) =>
      `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="500" fill="${c === '#ff9f0a' ? '#fff' : '#1c1c1e'}">${s}</text>`).join('')}`),
  compass: () => svg(`<rect width="60" height="60" fill="#000"/>
    <circle cx="30" cy="30" r="21" fill="none" stroke="#fff" stroke-width="1.4"/>${ticks(30, 30, 17, 20, 24, 1, '#fff')}
    <path d="M30 13l3.5 17h-7z" fill="#ff3b30"/><path d="M30 47l-3.5-17h7z" fill="#fff"/>`),
  whatsapp: () => svg(`<rect width="60" height="60" fill="url(#np-wa)"/>
    <path d="M30 12.5a17.3 17.3 0 0 0-14.9 26.1L12.6 47.5l9.2-2.4A17.3 17.3 0 1 0 30 12.5z" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="${HANDSET}" fill="#fff" transform="translate(2.4 2.2) scale(.92)"/>`, grad('np-wa', [[0, '#5ffb7d'], [1, '#25c045']])),
  phone: () => svg(`<rect width="60" height="60" fill="url(#np-ph)"/><path d="${HANDSET}" fill="#fff" transform="translate(-9 -9) scale(1.3)"/>`,
    grad('np-ph', [[0, '#68f283'], [1, '#2bc552']])),
  safari: () => svg(`<rect width="60" height="60" fill="url(#np-sf)"/>
    <circle cx="30" cy="30" r="22" fill="url(#np-sfd)"/>${ticks(30, 30, 18.5, 21, 36, 0.8, '#fff')}
    <path d="M30 30l11-11-6.5 15.5z" fill="#ff3b30"/><path d="M30 30L19 41l6.5-15.5z" fill="#fff"/>`,
  grad('np-sf', [[0, '#fdfdfd'], [1, '#e2e2e7']]) + grad('np-sfd', [[0, '#19d6ff'], [1, '#1662f0']])),
  messages: () => svg(`<rect width="60" height="60" fill="url(#np-ms)"/>
    <path d="M30 13c10.5 0 19 6.9 19 15.4S40.5 43.8 30 43.8c-2 0-4-.2-5.8-.7L15 47.5l2.4-8C13.5 36.8 11 32.8 11 28.4 11 19.9 19.5 13 30 13z" fill="#fff"/>`,
  grad('np-ms', [[0, '#68f283'], [1, '#2bc552']])),
  music: () => svg(`<rect width="60" height="60" fill="url(#np-mu)"/>
    <path d="M24 39.5V19l17-3.5v20.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>
    <ellipse cx="20.5" cy="40" rx="5" ry="4" fill="#fff"/><ellipse cx="37.5" cy="36.5" rx="5" ry="4" fill="#fff"/>`,
  grad('np-mu', [[0, '#fc5c7d'], [1, '#fa233b']])),
};

const parser = new DOMParser();
/** A fresh <svg> element for the app `key`. */
export function iconSvg(key) {
  const doc = parser.parseFromString(ICONS[key](), 'image/svg+xml');
  const node = document.importNode(doc.documentElement, true);
  node.setAttribute('class', 'np-app-svg');
  node.setAttribute('aria-hidden', 'true');
  return node;
}
