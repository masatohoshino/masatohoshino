#!/usr/bin/env node
// Re-score saved raw.json without re-scanning: node src/rescore.js <login> [--out out]
import { readFileSync, writeFileSync } from 'node:fs';
import { score } from './score.js';
import { card } from './card.js';
import { table } from './table.js';

const args = process.argv.slice(2);
const login = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const dir = `${outIdx >= 0 ? args[outIdx + 1] : 'out'}/${login}`;

const raw = JSON.parse(readFileSync(`${dir}/raw.json`, 'utf8'));
if (!raw.avatar) {
  try {
    const res = await fetch(`https://github.com/${login}.png?size=120`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type')?.split(';')[0]
      || (buf[0] === 0x89 ? 'image/png' : 'image/jpeg');
    raw.avatar = `data:${mime};base64,${buf.toString('base64')}`;
  } catch { /* initial-letter fallback */ }
}
const profile = score(raw);
writeFileSync(`${dir}/data.json`, JSON.stringify(profile, (k, v) =>
  k === 'avatar' ? undefined : v, 1));
writeFileSync(`${dir}/card.svg`, card(profile));
writeFileSync(`${dir}/table.md`, table(profile));
console.log(`⚡ ${login.padEnd(14)} POWER ${Math.round(profile.total).toLocaleString().padStart(9)}  ` +
  `${(profile.overall ? profile.overall.metal : 'UNRANKED').padEnd(9)} (${profile.persona})`);
