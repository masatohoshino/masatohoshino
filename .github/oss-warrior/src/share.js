// Share page (OGP) + X intent URL. The page is the viral landing:
// X unfurls og:image; humans who click through see the card + "measure yours".
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function intentUrl(profile, shareUrl, { scouted = false } = {}) {
  const metal = profile.overall ? profile.overall.metal : 'UNRANKED';
  const power = Math.round(profile.total).toLocaleString('en-US');
  const text = scouted
    ? `⚡ Scouter reading: ${profile.login} — power ${power}, RANK ${metal}\nEvery contribution counts.`
    : `⚡ My OSS power level: ${power} — RANK ${metal}\nEvery contribution counts.`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
}

// Scouter console: input + SCAN button → pre-filled issue (issue-ops bridge).
// Static page, no secrets; the workflow does the measuring and replies on the issue.
export function scouterConsoleHtml({ owner, repoName }) {
  const issueBase = `https://github.com/${owner}/${repoName}/issues/new`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>⚡ OSS Warrior Scouter</title>
<style>
 body{margin:0;background:#0c0d10;color:#e6e4df;font-family:system-ui,sans-serif;
   display:flex;flex-direction:column;align-items:center;gap:18px;padding:64px 16px;text-align:center}
 h1{font-size:26px;margin:0} p{color:#8f8d86;font-size:13.5px;max-width:46ch;margin:0}
 .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
 input{background:#16181d;border:1px solid #32363e;border-radius:10px;color:#e6e4df;
   font-size:16px;padding:12px 16px;width:min(300px,70vw)}
 button{background:linear-gradient(180deg,#f3dc9a,#cf9f3a);color:#14110a;font-weight:800;
   border:0;border-radius:10px;padding:12px 26px;font-size:16px;cursor:pointer}
 small{color:#5f6875}
</style>
</head>
<body>
<h1>⚡ OSS Warrior Scouter</h1>
<p>Point the scouter at any GitHub account. Submitting opens a pre-filled issue;
the scouter replies there with the power card in a couple of minutes.</p>
<div class="row">
  <input id="u" placeholder="GitHub username" autocomplete="off" autofocus>
  <button onclick="go()">SCAN</button>
</div>
<small>Public GitHub events only · every contribution counts</small>
<script>
function go(){
  var u=(document.getElementById('u').value||'').trim().replace(/^@/,'');
  if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(u)){alert('Enter a valid GitHub username');return}
  location.href='${issueBase}?title='+encodeURIComponent('scan: '+u)
    +'&body='+encodeURIComponent('Automated scouter scan. The power card will be posted here in a couple of minutes. \\u26a1');
}
document.getElementById('u').addEventListener('keydown',function(e){if(e.key==='Enter')go()});
</script>
</body>
</html>`;
}

export function shareHtml(profile, { pngUrl, shareUrl, repoUrl, cardSvg, scouted = false }) {
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
<a class="btn" href="${esc(intentUrl(profile, shareUrl, { scouted }))}">Post to X</a>
<p>Every figure derives from public GitHub events — reproducible by anyone.<br>
<a href="${esc(repoUrl)}">⚡ Measure your own power level</a> ·
<a href="scouter.html">🔍 Scan any account</a></p>
</body>
</html>`;
}
