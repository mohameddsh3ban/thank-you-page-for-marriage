// Laptop only. Phones (or a tiny window) get a sweet note instead of the site,
// and nothing else is downloaded — not even the song.
import { CONFIG, paintNames } from './config.js';
import { createStipple } from './stipple.js';

const PHONE_QUERY = '(hover: none) and (pointer: coarse), (max-width: 760px)';

document.title = `A letter for ${CONFIG.herName}`;
paintNames();

function showPhoneNote() {
  document.body.classList.add('is-phone');
  document.getElementById('gate')?.remove();
  const note = document.getElementById('phone-note');
  note.hidden = false;
  createStipple(document.getElementById('phone-cupid'), '/art/gate/cupid-src.webp', { revealMs: 2600 })
    .then(s => s.reveal())
    .catch(() => {});
}

const mq = matchMedia(PHONE_QUERY);
if (mq.matches) {
  showPhoneNote();
  // if a laptop window was just narrow, let it in once it's wide again
  mq.addEventListener('change', e => { if (!e.matches && !matchMedia('(pointer: coarse)').matches) location.reload(); });
} else {
  import('./main.js');
}
