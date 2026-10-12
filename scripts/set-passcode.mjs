// Sets the gate's passcode: stores only its SHA-256 in functions/_lib/answers.json, which the
// Pages Function (and `vite` in dev) checks against. The code itself is never written anywhere.
// Usage: npm run passcode -- 0607   (four digits, like a phone's passcode)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const code = String(process.argv[2] ?? '');
if (!/^\d{4}$/.test(code)) {
  console.error('Usage: npm run passcode -- <4 digits>');
  process.exit(1);
}
const out = path.resolve('functions', '_lib', 'answers.json');
const passcode = crypto.createHash('sha256').update(code).digest('hex');
fs.writeFileSync(out, JSON.stringify({ passcode }, null, 1) + '\n');
console.log(`passcode set → ${path.relative(process.cwd(), out)}`);
