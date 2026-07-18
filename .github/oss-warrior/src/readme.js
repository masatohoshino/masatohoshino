// Manage the oss-warrior block in the profile README.
//
// Safety contract for pre-existing READMEs:
// - Everything outside the marker pair is never touched.
// - If no markers exist, the block is appended at the end.
// - To choose the position, place an empty marker pair anywhere in the README:
//     <!-- oss-warrior:start --><!-- oss-warrior:end -->
//   and the block will be maintained there.
const START = '<!-- oss-warrior:start -->';
const END = '<!-- oss-warrior:end -->';

export function updateReadme(existing, { cardPath, intent, tableMd, targets = [], scouterUrl = '' }) {
  const scouter = targets.length ? `
### ⚡ Scouter readings

${targets.map((t) =>
    `<a href="${t.intent}"><img alt="${t.login} warrior card" src="${t.cardPath}" width="320"></a>`)
    .join('\n')}
` : '';
  const entry = scouterUrl
    ? `\n🔍 [**Scan any GitHub account with the scouter**](${scouterUrl})\n` : '';
  const block = `${START}
[![OSS Warrior card](${cardPath})](${intent})
${entry}${scouter}
<details><summary>Warrior status details</summary>

${tableMd}
</details>
${END}`;
  if (existing.includes(START) && existing.includes(END)) {
    return existing.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  }
  return `${existing.trimEnd()}\n\n${block}\n`;
}
