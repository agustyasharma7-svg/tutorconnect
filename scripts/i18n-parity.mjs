/**
 * Compare en.json / hi.json key trees for parity.
 * Run: node scripts/i18n-parity.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'messages');
const en = JSON.parse(readFileSync(join(root, 'en.json'), 'utf8'));
const hi = JSON.parse(readFileSync(join(root, 'hi.json'), 'utf8'));

function keys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...keys(v, p));
    else out.push(p);
  }
  return out;
}

const enKeys = new Set(keys(en));
const hiKeys = new Set(keys(hi));
const missingInHi = [...enKeys].filter((k) => !hiKeys.has(k));
const missingInEn = [...hiKeys].filter((k) => !enKeys.has(k));

if (missingInHi.length || missingInEn.length) {
  console.error('i18n key mismatch');
  if (missingInHi.length) console.error('Missing in hi:', missingInHi.join(', '));
  if (missingInEn.length) console.error('Missing in en:', missingInEn.join(', '));
  process.exit(1);
}

console.log(`i18n parity OK (${enKeys.size} keys)`);
