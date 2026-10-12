// The dive: from her unlocked phone into our photo, and back out onto the hero.
//   1. A copy of the phone's photo sits exactly over its screen. The phone and the copy grow
//      together until the photo is past the edges of the window: we're inside the phone.
//   2. Under that cover the gate goes away and the site is already there. The copy is swapped for
//      one shaped like the hero's panel that shows exactly the same pixels.
//   3. That copy shrinks and lands in the hero's panel, the same photo in the same crop, so handing
//      over to the real panel is invisible.
// Both moves are transform/opacity only, so they run on the compositor even while the main thread
// is still busy with the site underneath. The copy is laid out at its biggest size and scaled down,
// so it stays sharp (the phone itself is a scaled layer and would blur). The hero's colour grade is
// baked into a canvas once: a CSS filter or blend on a layer this big costs the GPU a full extra
// pass every frame, which this laptop's GPU can't afford.

const DIVE_MS = 1500;
const DIVE_EASE = 'cubic-bezier(0.7, 0, 0.25, 1)';
const DEEP = 1.22;            // how far past "just covers the window" the dive goes
const HOLD_MS = 260;          // inside the photo for a breath (also lets the swapped copy raster)
const BACK_MS = 2000;
const BACK_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const BLOOM_PEAK = 0.4;
const HANDOFF_MS = 450;       // the copy fades onto the real panel (which brings its print grain)
const HERO_GRADE = 'saturate(0.92) contrast(1.04) sepia(0.08)'; // keep in sync with .hero-photo

const finished = anim => anim.finished.catch(() => {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const place = (el, x, y, w, h) => Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
const scalePx = (css, k) => css.replace(/(-?\d*\.?\d+)px/g, (_, n) => `${(Number(n) * k).toFixed(2)}px`);

/** The photo's area inside the screen's black border. */
function screenArea(screen) {
  const r = screen.getBoundingClientRect();
  const cs = getComputedStyle(screen);
  const b = parseFloat(cs.borderTopWidth) || 0;
  const radius = Math.max(0, (parseFloat(cs.borderTopLeftRadius) || 0) - b);
  return { x: r.left + b, y: r.top + b, w: r.width - 2 * b, h: r.height - 2 * b, r: radius };
}

/**
 * A box with aspect `aspect`, centred like `from`, in which object-fit: cover draws the image at
 * the same scale as in `from`, so swapping one for the other changes nothing on screen.
 */
function sameImageBox(from, img, aspect) {
  const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
  const c = Math.max(from.w / iw, from.h / ih);
  const dw = iw * c, dh = ih * c; // the drawn image
  const w = Math.min(dw, dh * aspect), h = w / aspect;
  return { x: from.x + (from.w - w) / 2, y: from.y + (from.h - h) / 2, w, h };
}

/** The photo with the hero's colour grade painted in, at its own resolution. */
function gradedCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || 1;
  c.height = img.naturalHeight || 1;
  const ctx = c.getContext('2d');
  ctx.filter = HERO_GRADE;
  ctx.drawImage(img, 0, 0);
  return c;
}

/** The copy: a clipping box (phone screen, then hero panel) around the whole drawn photo. */
function makeCopy(img) {
  const layer = document.createElement('div');
  layer.className = 'dive';
  layer.setAttribute('aria-hidden', 'true');
  const part = cls => Object.assign(document.createElement('div'), { className: cls });
  const clip = part('dive-clip');
  const photo = gradedCanvas(img);
  photo.className = 'dive-photo';
  clip.append(photo);
  layer.append(part('dive-shadow'), clip);
  return { layer, clip, photo, shadow: layer.firstChild };
}

/** Lays the copy's box out at `b` (window px) with the photo drawn at `drawn`, centred in the window. */
function layout(copy, b, drawn, vw, vh) {
  place(copy.layer, b.x, b.y, b.w, b.h);
  place(copy.photo, vw / 2 - drawn.w / 2 - b.x, vh / 2 - drawn.h / 2 - b.y, drawn.w, drawn.h);
}

/**
 * @param {{ root: HTMLElement, device: HTMLElement, screen: HTMLElement, homeImage: HTMLImageElement }} phone
 * @param {{ gate: HTMLElement, target: HTMLElement, onCovered(): void }} opts
 *   onCovered runs once the photo hides everything: swap the gate for the site there.
 */
export async function dive(phone, { gate, target, onCovered }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onCovered();
    return;
  }
  const { device, screen, homeImage } = phone;
  const s = screenArea(screen);
  const vw = innerWidth, vh = innerHeight;

  // ---- 1 · in: the phone and the copy grow by `k` about the screen's centre, which travels to the window's centre
  const k = Math.max(vw / s.w, vh / s.h) * DEEP;
  const deep = { x: vw / 2 - (s.w * k) / 2, y: vh / 2 - (s.h * k) / 2, w: s.w * k, h: s.h * k };
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const dx = cx - vw / 2, dy = cy - vh / 2; // from the window's centre to the screen's
  const onScreen = `translate(${dx}px, ${dy}px) scale(${1 / k})`;

  const copy = makeCopy(homeImage);
  const { layer, clip, shadow } = copy;
  // object-fit: cover by hand: the photo's drawn size at the deepest point, kept for the whole flight
  const iw = homeImage.naturalWidth || 1, ih = homeImage.naturalHeight || 1;
  const fit = Math.max(deep.w / iw, deep.h / ih);
  const drawn = { w: iw * fit, h: ih * fit };
  layout(copy, deep, drawn, vw, vh);
  clip.style.borderRadius = `${s.r * k}px`;
  layer.style.transform = onScreen;
  const bloom = document.createElement('div');
  bloom.className = 'dive-bloom';
  document.body.append(layer, bloom);
  await new Promise(requestAnimationFrame); // let the copy reach the GPU before anything moves

  performance.mark('dive:in');
  const d = device.getBoundingClientRect();
  device.style.transformOrigin = `${cx - d.left}px ${cy - d.top}px`;
  gate.classList.add('is-diving');
  phone.root.dataset.state = 'dive';
  const timing = { duration: DIVE_MS, easing: DIVE_EASE, fill: 'forwards' };
  const inPhone = device.animate([{ transform: 'none' }, { transform: `translate(${-dx}px, ${-dy}px) scale(${k})` }], timing);
  const inPhoto = layer.animate([{ transform: onScreen }, { transform: 'none' }], timing);
  bloom.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: BLOOM_PEAK }], timing);
  await finished(inPhoto);

  // ---- 2 · covered: the gate goes, the site is underneath; the copy takes the panel's shape
  performance.mark('dive:covered');
  onCovered();
  gate.style.visibility = 'hidden'; // gone at once: the phone must not be seen snapping back
  inPhone.cancel();
  const t = target.getBoundingClientRect();
  const big = sameImageBox(deep, homeImage, t.width / t.height);
  const shrink = t.width / big.w;
  layout(copy, big, drawn, vw, vh);
  layer.style.transform = 'none';
  inPhoto.cancel();
  clip.style.borderRadius = '0';
  shadow.style.boxShadow = scalePx(getComputedStyle(target).boxShadow, 1 / shrink);
  await sleep(HOLD_MS);

  // ---- 3 · back out, onto the hero's panel
  performance.mark('dive:back');
  const tx = t.left + t.width / 2 - (big.x + big.w / 2), ty = t.top + t.height / 2 - (big.y + big.h / 2);
  const back = { duration: BACK_MS, easing: BACK_EASE, fill: 'forwards' };
  const outPhoto = layer.animate([{ transform: 'none' }, { transform: `translate(${tx}px, ${ty}px) scale(${shrink})` }], back);
  shadow.animate([{ opacity: 0 }, { opacity: 1 }], back);
  bloom.animate([{ opacity: BLOOM_PEAK }, { opacity: 0 }], { duration: BACK_MS * 0.4, easing: 'ease-out', fill: 'forwards' });
  await finished(outPhoto);

  // the real panel is right underneath, the same photo in the same crop: fade onto it
  performance.mark('dive:end');
  bloom.remove();
  await finished(layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: HANDOFF_MS, easing: 'ease-out', fill: 'forwards' }));
  layer.remove();
}
