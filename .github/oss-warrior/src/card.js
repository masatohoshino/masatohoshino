// Warrior card SVG (SPEC §5). Self-contained: gradients inline, avatar as data URI,
// system font stacks (rendered client-side by the viewer's browser).
import { METALS, LADDER } from './score.js';

const SANS = `system-ui,-apple-system,'Segoe UI',sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,monospace`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function hex2rgb(h) {
  const x = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
}
function mix(a, b, t) {
  const [r1, g1, b1] = hex2rgb(a), [r2, g2, b2] = hex2rgb(b);
  const f = (u, v) => Math.round(u * t + v * (1 - t));
  return `#${[f(r1, r2), f(g1, g2), f(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const wTxt = (s, px) => s.length * px * 0.60; // rough width estimate

export function card(p) {
  const M = p.overall ? METALS[p.overall.metal] : METALS.NONE;
  const D = METALS[p.dominant.metal] || M;
  const W = 640;
  const dbl = p.crowns >= 2;
  const honorH = p.honors.length ? 30 : 0;
  const H = 280 + honorH;
  const L = 30, R = W - 30;

  // league split line, ordered by power
  const order = Object.entries(p.leagues).sort((a, b) => b[1].power - a[1].power);
  const splitParts = order.map(([name, l]) => {
    const label = name.toUpperCase();
    if (l.rank < 0 || l.power <= 0) {
      return `<tspan fill="#5f6875">${label} —</tspan>`;
    }
    const mk = METALS[LADDER[l.rank].metal].rank;
    return `<tspan fill="#8b93a0">${label} </tspan><tspan fill="${mk}">◆</tspan>` +
      `<tspan fill="#dfe3e8" font-weight="600"> ${fmt(l.power)}</tspan>`;
  }).join(`<tspan fill="#5f6875"> · </tspan>`);

  // rank plaque (pips = crowns when 2+ leagues are superhuman); metal name only
  const tag = p.overall
    ? `${'◆'.repeat(p.pips)} ${p.overall.metal}` : 'UNRANKED';
  const tagW = Math.max(90, wTxt(tag, 11) + 30);
  const tagX = R - tagW;

  // badges row
  let bx = L;
  const pills = p.badges.map((b) => {
    const text = b.n !== undefined
      ? `${b.n}${b.glue ? '' : ' '}${b.text}` : b.text;
    const w = wTxt(text, 11.5) + 26;
    const el = `
    <g transform="translate(${bx},${230 + honorH})">
      <rect width="${w}" height="24" rx="12" fill="#181c22"
        stroke="${b.rare ? mix(M.rank, '#323a45', 0.6) : '#323a45'}"/>
      <text x="${w / 2}" y="16" text-anchor="middle" font-family="${SANS}"
        font-size="11.5" fill="${b.rare ? '#f2f5f8' : '#c9cfd8'}">${esc(text)}</text>
    </g>`;
    bx += w + 8;
    return bx - w - 8 + w <= R ? el : '';
  }).join('');

  const honor = p.honors.length ? (() => {
    const h = p.honors[0];
    const text = `⚜ ${h.name} — ${h.detail}`;
    const w = wTxt(`HONOR${text}`, 11) + 60;
    return `
    <g transform="translate(${L},${223})">
      <rect width="${w}" height="24" rx="6" fill="none" stroke="rgba(181,192,120,.35)"/>
      <rect x="4" y="5" width="42" height="14" rx="4" fill="#a8b473"/>
      <text x="25" y="15.5" text-anchor="middle" font-family="${MONO}" font-size="8"
        font-weight="700" letter-spacing="1.6" fill="#14171c">HONOR</text>
      <text x="54" y="16" font-family="${SANS}" font-size="11" fill="#b5c078">${esc(text)}</text>
    </g>`;
  })() : '';

  const aff = p.affiliation ? `
    <text x="104" y="92" font-family="${SANS}" font-size="15.5" font-weight="700"
      fill="${mix(M.f1, '#8b93a0', 0.62)}">${esc(p.affiliation.repo.split('/').pop())}
      <tspan font-weight="600" fill="${mix(M.f1, '#8b93a0', 0.45)}"> ${
        p.affiliation.stars >= 1000 ? Math.round(p.affiliation.stars / 1000) + 'k★' : p.affiliation.stars + '★'}</tspan>
      <tspan font-size="9.5" letter-spacing="1.1" fill="#7d8590">  ${p.affiliation.role}${
        p.affiliation.extraArenas > 0 ? ` · +${p.affiliation.extraArenas} ARENAS` : ''}</tspan>
    </text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
  viewBox="0 0 ${W} ${H}" role="img" aria-label="OSS Warrior card for ${esc(p.login)}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${M.f1}"/><stop offset=".3" stop-color="${M.f2}"/>
      <stop offset=".52" stop-color="${M.f1}"/><stop offset=".74" stop-color="${M.f2}"/>
      <stop offset="1" stop-color="${M.f3}"/>
    </linearGradient>
    <radialGradient id="bg" cx="16%" cy="-10%" r="140%">
      <stop offset="0" stop-color="${mix(M.rank, '#131114', 0.19)}"/>
      <stop offset=".5" stop-color="#121014"/><stop offset="1" stop-color="#0a090c"/>
    </radialGradient>
    <linearGradient id="num" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mix(D.f1, '#ffffff', 0.55)}"/>
      <stop offset=".42" stop-color="${D.f1}"/><stop offset="1" stop-color="${D.f3}"/>
    </linearGradient>
    <linearGradient id="plaque" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mix(M.f1, '#ffffff', 0.28)}"/>
      <stop offset=".46" stop-color="${M.f1}"/><stop offset="1" stop-color="${M.f3}"/>
    </linearGradient>
    <clipPath id="ava"><circle cx="58" cy="72" r="29"/></clipPath>
  </defs>

  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="15" fill="url(#frame)"/>
  <rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="13" fill="url(#bg)"/>
  ${dbl ? `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="9"
    fill="none" stroke="${mix(M.rank, '#000000', 0.38)}" opacity=".9"/>` : ''}

  <text x="${W / 2}" y="30" text-anchor="middle" font-family="${MONO}" font-size="9.5"
    font-weight="600" letter-spacing="4" fill="${mix(M.f1, '#8b93a0', 0.72)}">OPEN SOURCE SOFTWARE WARRIOR</text>
  <line x1="${L}" y1="27" x2="${W / 2 - 128}" y2="27" stroke="${mix(M.rank, '#323a45', 0.5)}" stroke-width="1"/>
  <line x1="${W / 2 + 128}" y1="27" x2="${R}" y2="27" stroke="${mix(M.rank, '#323a45', 0.5)}" stroke-width="1"/>

  ${p.avatar
    ? `<image href="${p.avatar}" x="29" y="43" width="58" height="58" clip-path="url(#ava)"/>`
    : `<circle cx="58" cy="72" r="29" fill="#1d222a"/>
       <text x="58" y="81" text-anchor="middle" font-family="${SANS}" font-size="25"
         font-weight="700" fill="#dfe3e8">${esc(p.login[0].toUpperCase())}</text>`}
  <circle cx="58" cy="72" r="30.5" fill="none" stroke="${M.rank}" stroke-width="2.5"/>
  ${dbl ? `<circle cx="58" cy="72" r="34.5" fill="none" stroke="${M.rank}" stroke-width="1.5"/>` : ''}

  <text x="104" y="72" font-family="${SANS}" font-size="25" font-weight="800"
    fill="#f2f5f8">${esc(p.login)}</text>
  ${aff}

  <g>
    <rect x="${tagX}" y="46" width="${tagW}" height="23" rx="7" fill="url(#plaque)"/>
    <line x1="${tagX + 4}" y1="47.5" x2="${tagX + tagW - 4}" y2="47.5"
      stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <line x1="${tagX + 4}" y1="67.5" x2="${tagX + tagW - 4}" y2="67.5"
      stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>
    <text x="${tagX + tagW / 2}" y="61.5" text-anchor="middle" font-family="${MONO}"
      font-size="11" font-weight="800" letter-spacing="1" fill="#14171c">${esc(tag)}</text>
  </g>

  <text x="${L}" y="160" font-family="${SANS}" font-size="64" font-weight="800"
    letter-spacing="-1.5" fill="url(#num)">${fmt(p.total)}${
      p.badges.some((b) => b.text === '⚡ Limit Break')
        ? `<tspan font-size="17" fill="#8b93a0" font-weight="500">+</tspan>` : ''}</text>
  <text x="${L}" y="189" font-family="${MONO}" font-size="10" letter-spacing="2.4"
    font-weight="600" fill="#8b93a0">${
      p.window.days === 90 ? '90 DAYS TOTAL POWER'
        : esc(`${p.window.from} → ${p.window.to} · 90D-NORMALIZED POWER`)}</text>

  <text x="${L}" y="211" font-family="${MONO}" font-size="11.5">${splitParts}</text>

  ${honor}
  ${pills}

  <text x="${R}" y="${H - 13}" text-anchor="end" font-family="${MONO}" font-size="9"
    letter-spacing="1.2" fill="#5f6875">SCAN ${esc(p.scannedAt)}</text>
</svg>`;
}
