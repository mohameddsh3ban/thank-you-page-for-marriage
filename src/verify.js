// The gate's passcode check. Production asks the Pages Function (the code never ships to the
// browser); dev imports the same checker locally so the gate works under `vite`.

/** Her phone's passcode: the server checks it and sets the session cookie. */
export async function unlock(code) {
  if (import.meta.env.DEV) return (await import('../functions/_lib/auth.js')).checkPasscode(code);
  const res = await fetch('/api/unlock', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), credentials: 'same-origin',
  });
  if (res.status >= 500) throw new Error(`/api/unlock → ${res.status}`);
  return (await res.json()).ok === true;
}
