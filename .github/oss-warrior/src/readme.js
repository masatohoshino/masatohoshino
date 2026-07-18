// Manage the oss-warrior block in the profile README:
// card image wrapped in an X intent link, evaluation table in <details>.
const START = '<!-- oss-warrior:start -->';
const END = '<!-- oss-warrior:end -->';

export function updateReadme(existing, { cardPath, intent, tableMd }) {
  const block = `${START}
[![OSS Warrior card](${cardPath})](${intent})

<details><summary>Warrior status details</summary>

${tableMd}
</details>
${END}`;
  if (existing.includes(START) && existing.includes(END)) {
    return existing.replace(
      new RegExp(`${START}[\\s\\S]*?${END}`), block);
  }
  return `${existing.trimEnd()}\n\n${block}\n`;
}
