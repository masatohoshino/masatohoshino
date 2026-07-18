// Share page (OGP) + X intent URL. The page is the viral landing:
// X unfurls og:image; humans who click through see the card + "measure yours".
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function intentUrl(profile, shareUrl) {
  const metal = profile.overall ? profile.overall.metal : 'UNRANKED';
  const text = `⚡ My OSS power level: ${Math.round(profile.total).toLocaleString('en-US')}` +
    ` — RANK ${metal}\nEvery contribution counts.`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
}

export function shareHtml(profile, { pngUrl, shareUrl, repoUrl, cardSvg }) {
  const metal = profile.overall ? profile.overall.metal : 'UNRANKED';
  const title = `⚡ ${profile.login} — OSS power ${Math.round(profile.total).toLocaleString('en-US')} (${metal})`;
  const desc = 'Open Source Software Warrior — every contribution counts. ' +
    'Measured from public GitHub events.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(pngUrl)}">
<meta property="og:url" content="${esc(shareUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(pngUrl)}">
<style>
 body{margin:0;background:#0c0d10;color:#e6e4df;font-family:system-ui,sans-serif;
   display:flex;flex-direction:column;align-items:center;gap:22px;padding:48px 16px}
 .card svg{max-width:100%;height:auto}
 a.btn{color:#0c0d10;background:#e6e4df;border-radius:10px;padding:10px 22px;
   text-decoration:none;font-weight:700}
 a{color:#9fb6d0} p{color:#8f8d86;font-size:13px;max-width:52ch;text-align:center}
</style>
</head>
<body>
<div class="card">${cardSvg}</div>
<a class="btn" href="${esc(intentUrl(profile, shareUrl))}">Post to X</a>
<p>Every figure derives from public GitHub events — reproducible by anyone.<br>
<a href="${esc(repoUrl)}">⚡ Measure your own power level</a></p>
</body>
</html>`;
}
