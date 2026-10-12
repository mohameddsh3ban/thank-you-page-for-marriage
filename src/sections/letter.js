import { LETTER, LETTER_TITLE, LETTER_SIGN } from '../content/letter.js';
import { ScrollTrigger, scrollToEl } from '../scroll.js';

export function initLetter() {
  const section = document.getElementById('letter');
  const envelope = document.getElementById('envelope');
  const paper = document.getElementById('letter-paper');
  const body = document.getElementById('letter-body');
  document.getElementById('letter-title').textContent = LETTER_TITLE;
  document.getElementById('letter-sign').textContent = LETTER_SIGN;

  for (const text of LETTER) {
    const p = document.createElement('p');
    p.textContent = text;
    body.append(p);
  }

  envelope.addEventListener('click', () => {
    section.classList.add('is-open');
    envelope.setAttribute('aria-expanded', 'true');
    paper.hidden = false;
    body.querySelectorAll('p').forEach(p => {
      ScrollTrigger.create({ trigger: p, start: 'top 88%', once: true, onEnter: () => p.classList.add('is-in') });
    });
    ScrollTrigger.refresh();
    scrollToEl(paper, -40);
  });
}
