#!/usr/bin/env node
// GitHub Action entry: scan → card/table/png/share → README block.
// Inputs via env (composite action): INPUT_LOGIN, INPUT_DAYS, INPUT_OWN_ORGS,
// INPUT_BASE_URL, INPUT_README. Writes into the user's repo working tree:
//   warrior/{raw,data}.json card.svg table.md
//   warrior/site/{index.html, share-<date>.html, card-<date>.png, card.png}
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { measure } from './measure.js';
import { score } from './score.js';
import { card } from './card.js';
import { table } from './table.js';
import { renderPng } from './render-png.js';
import { shareHtml, intentUrl, scouterConsoleHtml } from './share.js';
import { updateReadme } from './readme.js';

const repo = process.env.GITHUB_REPOSITORY || '';
const [owner, repoName] = repo.split('/');
const login = process.env.INPUT_LOGIN || owner;
if (!login) throw new Error('no login (set INPUT_LOGIN or GITHUB_REPOSITORY)');
const days = +(process.env.INPUT_DAYS || 90);
const ownOrgs = (process.env.INPUT_OWN_ORGS || '').split(',').filter(Boolean);
const baseUrl = (process.env.INPUT_BASE_URL
  || `https://${owner}.github.io/${repoName}`).replace(/\/$/, '');

const raw = await measure(login, { days, ownOrgs });
const profile = score(raw);
const svg = card(profile);
const md = table(profile);
const date = profile.scannedAt;

mkdirSync('warrior/site', { recursive: true });
writeFileSync('warrior/raw.json', JSON.stringify(raw, (k, v) => (k === 'avatar' ? undefined : v)));
writeFileSync('warrior/data.json', JSON.stringify(profile, (k, v) => (k === 'avatar' ? undefined : v), 1));
writeFileSync('warrior/card.svg', svg);
writeFileSync('warrior/table.md', md);

const png = renderPng(svg);
writeFileSync(`warrior/site/card-${date}.png`, png);
writeFileSync('warrior/site/card.png', png);

const shareUrl = `${baseUrl}/share-${date}.html`;
const repoUrl = 'https://github.com/masatohoshino/oss-warrior';
const html = shareHtml(profile, {
  pngUrl: `${baseUrl}/card-${date}.png`, shareUrl, repoUrl, cardSvg: svg,
});
writeFileSync(`warrior/site/share-${date}.html`, html);
writeFileSync('warrior/site/index.html', html);
writeFileSync('warrior/site/scouter.html', scouterConsoleHtml({ owner, repoName }));

// scouter: measure other accounts (a failing target never fails the run)
const targets = (process.env.INPUT_TARGETS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const targetData = [];
if (targets.length) mkdirSync('warrior/targets', { recursive: true });
for (const spec of targets) {
  // "login" or "login:org1|org2" (pin private-org realms, e.g. steipete:openclaw)
  const [t, orgSpec] = spec.split(':');
  try {
    const traw = await measure(t, { days,
      ownOrgs: (orgSpec || '').split('|').filter(Boolean) });
    const tprof = score(traw);
    const tsvg = card(tprof);
    writeFileSync(`warrior/targets/${t}.svg`, tsvg);
    writeFileSync(`warrior/site/card-${t}-${date}.png`, renderPng(tsvg));
    const tShare = `${baseUrl}/scan-${t}-${date}.html`;
    writeFileSync(`warrior/site/scan-${t}-${date}.html`, shareHtml(tprof, {
      pngUrl: `${baseUrl}/card-${t}-${date}.png`, shareUrl: tShare, repoUrl,
      cardSvg: tsvg, scouted: true,
    }));
    targetData.push({ login: t, cardPath: `warrior/targets/${t}.svg`,
      intent: intentUrl(tprof, tShare, { scouted: true }) });
    console.log(`   scouted ${t}: power ${Math.round(tprof.total).toLocaleString()}`);
  } catch (e) {
    console.error(`   target ${t} failed: ${e.message}`);
  }
}

const readmePath = process.env.INPUT_README || 'README.md';
const existing = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : `# ${login}\n`;
writeFileSync(readmePath, updateReadme(existing, {
  cardPath: 'warrior/card.svg',
  intent: intentUrl(profile, shareUrl),
  tableMd: md,
  targets: targetData,
  scouterUrl: `${baseUrl}/scouter.html`,
}));

console.log(`⚡ ${login} — TOTAL POWER ${Math.round(profile.total).toLocaleString()} ` +
  `(${profile.overall ? profile.overall.metal : 'UNRANKED'})`);
console.log(`   share: ${shareUrl}`);
