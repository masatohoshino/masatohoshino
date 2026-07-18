#!/usr/bin/env node
// Scouter on-demand scan (issue-ops / workflow_dispatch).
// Never touches the README — results live in the issue comment + share page.
// TITLE comes from an arbitrary user: parsed and validated here, never in shell.
import { mkdirSync, writeFileSync } from 'node:fs';
import { measure } from './measure.js';
import { score } from './score.js';
import { card } from './card.js';
import { renderPng } from './render-png.js';
import { shareHtml, intentUrl } from './share.js';

const repo = process.env.GITHUB_REPOSITORY || '';
const [owner, repoName] = repo.split('/');
const title = process.env.TITLE || '';
const fromTitle = title.match(/^scan:\s*@?([A-Za-z0-9][A-Za-z0-9-]{0,38})\s*$/i)?.[1];
const login = process.env.INPUT_LOGIN || fromTitle || '';
if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(login)) {
  throw new Error(`invalid or missing login (title: ${JSON.stringify(title.slice(0, 60))})`);
}
const baseUrl = (process.env.INPUT_BASE_URL
  || `https://${owner}.github.io/${repoName}`).replace(/\/$/, '');

const raw = await measure(login, { days: 90 });
const profile = score(raw);
const svg = card(profile);
const date = profile.scannedAt;
const metal = profile.overall ? profile.overall.metal : 'UNRANKED';
const power = Math.round(profile.total).toLocaleString('en-US');

mkdirSync('warrior/site', { recursive: true });
writeFileSync(`warrior/site/card-${login}-${date}.png`, renderPng(svg));
const shareUrl = `${baseUrl}/scan-${login}-${date}.html`;
writeFileSync(`warrior/site/scan-${login}-${date}.html`, shareHtml(profile, {
  pngUrl: `${baseUrl}/card-${login}-${date}.png`, shareUrl,
  repoUrl: 'https://github.com/masatohoshino/oss-warrior', cardSvg: svg, scouted: true,
}));

const rawPng = `https://raw.githubusercontent.com/${repo}/main/warrior/site/card-${login}-${date}.png`;
writeFileSync('warrior/last-scan-comment.md', `## ⚡ Scouter reading: \`${login}\`

![${login} warrior card](${rawPng})

**TOTAL POWER ${power} — RANK ${metal}**

[Post to X](${intentUrl(profile, shareUrl, { scouted: true })}) · [Share page](${shareUrl})

<sub>Measured from public GitHub events · scan window ${raw.window.from} → ${raw.window.to} · every contribution counts.</sub>
`);
console.log(`⚡ scouted ${login}: power ${power} (${metal})`);
