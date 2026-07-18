#!/usr/bin/env node
// oss-warrior scan CLI: node src/cli.js <login> [--days 90 | --year 2025]
//   [--own-orgs org1,org2] [--out out]
import { mkdirSync, writeFileSync } from 'node:fs';
import { measure } from './measure.js';
import { score } from './score.js';
import { card } from './card.js';
import { table } from './table.js';

const args = process.argv.slice(2);
const login = args.find((a) => !a.startsWith('--'));
if (!login) {
  console.error('usage: oss-warrior <login> [--days 90 | --year 2025] [--own-orgs a,b] [--out dir]');
  process.exit(1);
}
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const opts = { ownOrgs: (opt('own-orgs') || '').split(',').filter(Boolean) };
if (opt('year')) {
  opts.from = `${opt('year')}-01-01`;
  opts.to = `${opt('year')}-12-31`;
} else {
  opts.days = +(opt('days') || 90);
}

const raw = await measure(login, opts);
const profile = score(raw);

const dir = `${opt('out') || 'out'}/${login}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/raw.json`, JSON.stringify(raw, (k, v) =>
  k === 'avatar' ? undefined : v));
writeFileSync(`${dir}/data.json`, JSON.stringify(profile, (k, v) =>
  k === 'avatar' ? undefined : v, 1));
writeFileSync(`${dir}/card.svg`, card(profile));
writeFileSync(`${dir}/table.md`, table(profile));

const L = profile.leagues;
console.log(`\n⚡ ${login} — TOTAL POWER ${Math.round(profile.total).toLocaleString()}`);
console.log(`   rank: ${profile.overall ? profile.overall.metal : 'UNRANKED'} (${profile.persona})`);
for (const [name, l] of Object.entries(L)) {
  console.log(`   ${name.padEnd(11)} power ${Math.round(l.power).toLocaleString().padStart(9)}  rank ${l.rank}`);
}
console.log(`   → ${dir}/card.svg, table.md, data.json`);
