// POST { code } → sets the signed session cookie when it's her phone's passcode.
import { checkPasscode, makeCookie, json } from '../_lib/auth.js';

// Four digits are easy to guess in bulk, so every wrong try costs the guesser a pause.
const WRONG_DELAY_MS = 700;

export async function onRequestPost({ request, env }) {
  if (!env.SITE_SECRET) return json({ ok: false, error: 'server not configured' }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!(await checkPasscode(body?.code))) {
    await new Promise(r => setTimeout(r, WRONG_DELAY_MS));
    return json({ ok: false }, { status: 401 });
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': await makeCookie(env.SITE_SECRET) } });
}
