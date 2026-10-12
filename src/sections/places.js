// #06 — a real street map (OpenStreetMap tiles) tinted into the site's palette,
// with a heart pin per place. The list and the pins are linked: tap either to fly there.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACES } from '../content/places.js';
import { ScrollTrigger } from '../scroll.js';

// OSM's tile policy needs a Referer, but the whole site sends none (Referrer-Policy: no-referrer), so the
// tiles alone are told to send the site's origin (not the path) — see referrerPolicy below.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const FLY_ZOOM = 15;

function heart(index) {
  return L.divIcon({
    className: 'heart-pin',
    html: `<span class="hp-heart" aria-hidden="true">♥</span><span class="hp-num">${index + 1}</span>`,
    iconSize: [40, 44],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
  });
}

function popupNode(p) {
  const box = document.createElement('div');
  box.className = 'place-pop';
  if (p.photo) {
    const img = document.createElement('img');
    img.src = p.photo;
    img.alt = p.name;
    box.append(img);
  }
  const t = document.createElement('b'); t.textContent = p.name;
  const w = document.createElement('time'); w.textContent = p.when || '';
  const n = document.createElement('p'); n.textContent = p.note || '';
  box.append(t, w, n);
  return box;
}

export function initPlaces() {
  const list = document.getElementById('place-list');
  const el = document.getElementById('map');
  if (!PLACES.length) return;

  const map = L.map(el, {
    scrollWheelZoom: false, // never hijack the page scroll
    zoomControl: true,
    attributionControl: true,
    worldCopyJump: true,
  });
  L.tileLayer(TILES, {
    attribution: ATTRIBUTION, maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin', // without it OSM answers every tile with "Access blocked"
  }).addTo(map);

  const markers = PLACES.map((p, i) => {
    const m = L.marker([p.lat, p.lng], { icon: heart(i), title: p.name, riseOnHover: true })
      .addTo(map)
      .bindPopup(popupNode(p), { className: 'paper-popup', maxWidth: 260, closeButton: false });
    return m;
  });

  // dotted red thread connecting the places in the order we went
  if (PLACES.length > 1) {
    L.polyline(PLACES.map(p => [p.lat, p.lng]), { color: '#C1121F', weight: 2, dashArray: '4 8', opacity: 0.8 }).addTo(map);
  }

  const bounds = L.latLngBounds(PLACES.map(p => [p.lat, p.lng]));
  const fitAll = (animate = false) => map.fitBounds(bounds.pad(0.25), { animate, maxZoom: 14 });
  fitAll();

  const select = i => {
    [...list.children].forEach((li, j) => li.classList.toggle('is-on', j === i));
    map.flyTo([PLACES[i].lat, PLACES[i].lng], FLY_ZOOM, { duration: 1.4 });
    markers[i].openPopup();
  };

  PLACES.forEach((p, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const num = document.createElement('span'); num.className = 'pl-num'; num.textContent = String(i + 1).padStart(2, '0');
    const b = document.createElement('b'); b.textContent = p.name;
    const t = document.createElement('time'); t.textContent = p.when || '';
    btn.append(num, b, t);
    btn.addEventListener('click', () => select(i));
    li.append(btn);
    list.append(li);
    markers[i].on('click', () => [...list.children].forEach((x, j) => x.classList.toggle('is-on', j === i)));
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'map-reset';
  reset.textContent = 'show all';
  reset.addEventListener('click', () => { map.closePopup(); fitAll(true); [...list.children].forEach(x => x.classList.remove('is-on')); });
  el.parentElement.append(reset);

  // the map was sized while offscreen; re-measure when it first comes into view
  ScrollTrigger.create({ trigger: el, start: 'top bottom', once: true, onEnter: () => { map.invalidateSize(); fitAll(); } });
  new ResizeObserver(() => map.invalidateSize()).observe(el);
}
