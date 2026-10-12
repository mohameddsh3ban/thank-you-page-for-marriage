// Shared by #03's text column and its phone: a tiny element helper and the rolling-digit odometer.

export const fmt = new Intl.NumberFormat('en');

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Rolling digits: every digit is a strip of 0–9 twice, so it spins a full turn before landing. */
export function odometer(n, suffix = '') {
  const root = el('p', 'odo');
  root.setAttribute('aria-label', fmt.format(n) + suffix);
  const strips = [];
  [...fmt.format(n)].forEach((ch, i, all) => {
    if (!/\d/.test(ch)) { root.append(el('span', 'odo-sep', ch)); return; }
    const col = el('span', 'odo-col');
    col.dataset.d = ch; // lets a face narrow the column for its final digit
    col.setAttribute('aria-hidden', 'true');
    const strip = el('span', 'odo-strip');
    for (let k = 0; k < 20; k++) strip.append(el('span', '', String(k % 10)));
    strip.style.setProperty('--d', String(10 + Number(ch)));
    strip.style.setProperty('--k', String(all.length - i)); // right-hand digits spin a little longer
    col.append(strip);
    root.append(col);
    strips.push(strip);
  });
  if (suffix) root.append(el('span', 'odo-sep odo-suffix', suffix));
  return {
    root,
    set(on) {
      root.classList.toggle('is-set', on);
      for (const s of strips) {
        if (!on) { s.style.transition = 'none'; s.style.transform = 'translateY(0)'; continue; }
        s.style.transition = '';
        s.style.transform = 'translateY(calc(var(--d) * -1em))';
      }
    },
  };
}
