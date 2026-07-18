// README evaluation table (the pilot's dashboard — progress lives here, not on the card).
import { LADDER, THRESHOLDS } from './score.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');

function nextRank(power, rank) {
  if (rank >= LADDER.length - 1) return 'MAX RANK';
  const t = LADDER[rank + 1], th = THRESHOLDS[rank + 1];
  const pct = power > 0 ? Math.min(99, Math.round(100 * power / th)) : 0;
  return `${t.metal} at ${fmt(th)} (${pct}%)`;
}

export function table(p) {
  const rows = Object.entries(p.leagues).map(([name, l]) => {
    const rank = l.rank >= 0 ? `${LADDER[l.rank].metal} (${LADDER[l.rank].persona})` : 'UNCHARTED';
    return `| ${name.toUpperCase()} | ${fmt(l.power)} | ${rank} | ${nextRank(l.power, l.rank)} |`;
  });
  const oRank = p.overall ? LADDER.findIndex((l) => l.metal === p.overall.metal) : -1;

  const badges = p.badges.map((b) =>
    `- ${b.n !== undefined ? `**${b.n}**${b.glue ? '' : ' '}${b.text}` : `**${b.text}**`}`);
  const honors = p.honors.map((h) => `- ⚜ **${h.name}** — ${h.detail}`);

  return `### Warrior status — \`${p.login}\`

| League | Power | Rank | Next rank |
|---|---:|---|---|
${rows.join('\n')}

**TOTAL POWER ${fmt(p.total)}** — ${p.overall ? p.overall.metal : 'UNRANKED'} · ${
    nextRank(p.total, oRank)} · window ${p.window.from} → ${p.window.to} (90d-normalized ×${p.window.norm.toFixed(2)})

${honors.length ? `**Honors**\n${honors.join('\n')}\n` : ''}
**Badges**
${badges.join('\n') || '- First scan — the journey begins'}

<sub>Every figure derives from public GitHub events. Formulas: [SPEC](./SPEC.md).</sub>
`;
}
