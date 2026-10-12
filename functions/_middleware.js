// Everything is private except the gate itself (and the song, which isn't ours to hide).
import { hasValidCookie } from './_lib/auth.js';

const PUBLIC_EXACT = new Set(['/', '/index.html', '/lyrics.lrc', '/art/cupid-src.webp', '/favicon.ico', '/robots.txt']);
const PUBLIC_PREFIX = ['/api/', '/audio/', '/art/gate/']; // gate art only — all other art is private

function isPublic(pathname) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIX.some(p => pathname.startsWith(p))) return true;
  // gate JS/CSS is public; the site chunk lives under /assets/private/
  return pathname.startsWith('/assets/') && !pathname.startsWith('/assets/private/');
}

const SECURITY_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

// The loading screens fetch every asset once (revalidating, so a redeploy is never stale) and the
// page then reads them back from the browser cache. That only works if they may be cached:
// hashed bundles forever, media for a day. `private` keeps them out of any shared cache.
const DAY_S = 60 * 60 * 24;
function cacheControl(pathname, isPrivate) {
  const scope = isPrivate ? 'private' : 'public';
  if (pathname.startsWith('/assets/')) return `${scope}, max-age=31536000, immutable`;
  if (pathname === '/private/site.html') return 'private, no-store';
  if (/^\/(art|photos|videos|audio|private)\//.test(pathname) || pathname === '/lyrics.lrc') return `${scope}, max-age=${DAY_S}`;
  return null; // index.html and the rest keep the platform default (always revalidated)
}

export async function onRequest({ request, next, env }) {
  const { pathname } = new URL(request.url);
  const isPrivate = !isPublic(pathname);
  if (isPrivate && !(env.SITE_SECRET && (await hasValidCookie(request, env.SITE_SECRET)))) {
    return new Response('not yet', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS } });
  }
  const res = await next();
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  // a 304's headers replace the cached copy's, so it must carry the same policy as the 200
  const cc = res.ok || res.status === 304 ? cacheControl(pathname, isPrivate) : 'no-store';
  if (cc) out.headers.set('Cache-Control', cc);
  else if (isPrivate) out.headers.set('Cache-Control', 'private, no-store');
  return out;
}
