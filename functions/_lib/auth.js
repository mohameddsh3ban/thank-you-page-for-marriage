// Shared by the Pages Functions: passcode checking + signed session cookie.
import ANSWERS from './answers.json';

export const COOKIE = 'tyl_session';
const MAX_AGE_S = 60 * 60 * 24 * 120; // 120 days
const enc = new TextEncoder();

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const PASSCODE = /^\d{4}$/;

/** The gate is her phone: four digits, checked only here (answers.json holds its SHA-256). */
export async function checkPasscode(code) {
  const value = String(code ?? '');
  if (!PASSCODE.test(value)) return false;
  return (await sha256(value)) === ANSWERS.passcode;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
}

export async function makeCookie(secret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const value = `${exp}.${await hmac(secret, String(exp))}`;
  return `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`;
}

export async function hasValidCookie(request, secret) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return (await hmac(secret, exp)) === sig;
}

export const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(init.headers || {}) } });
