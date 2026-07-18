// Formulas v3 (SPEC §2–§6): unified PR-equivalent units, no Q,
// one power scale, rank = power on a single ladder.

export const W0 = 3.0;
export const LADDER = [
  { persona: 'Rookie', metal: 'BRONZE', n: 1 },
  { persona: 'Weekend Warrior', metal: 'SILVER', n: 12 },
  { persona: 'Mainstay', metal: 'GOLD', n: 60 },
  { persona: 'Pro', metal: 'PLATINUM', n: 180 },
  { persona: 'Super Warrior', metal: 'DIAMOND', n: 900 },
  { persona: 'AI Sorcerer', metal: 'MYTHIC', n: 9000 },
];
// power thresholds = capacity anchors at the standard arena with realistic
// persona breadth k (higher personas naturally span more repos; Σ√ is
// super-additive in breadth): threshold = 100 × √(W0 × n × k),
// k = [1, 1, 1.5, 2.5, 5, 10] → rounded constants (SPEC §4, cal v3.1).
export const THRESHOLDS = [175, 600, 1650, 3700, 11600, 52000];
export const UNIT = { contributor: 1, maintainer: 2, solo: 3 }; // acts per PR-equivalent
export const METALS = {
  NONE: { rank: '#3d4552', f1: '#262b33', f2: '#262b33', f3: '#262b33' },
  BRONZE: { rank: '#b0713a', f1: '#d9a06b', f2: '#6e4522', f3: '#c08a52' },
  SILVER: { rank: '#aab3c0', f1: '#e2e7ee', f2: '#6f7885', f3: '#c5ccd6' },
  GOLD: { rank: '#d4af37', f1: '#f3dc9a', f2: '#8a6614', f3: '#e7c368' },
  PLATINUM: { rank: '#9fd0d6', f1: '#eaf6f8', f2: '#5f939b', f3: '#c3e2e6' },
  DIAMOND: { rank: '#7fc4f0', f1: '#dff2ff', f2: '#3f7fb4', f3: '#a8dcff' },
  MYTHIC: { rank: '#b9a5f2', f1: '#ffd9a0', f2: '#8f7fd4', f3: '#8fd4f0' },
};

export const wOf = (stars, cext) => Math.log10(1 + (stars || 0) + 50 * (cext || 0));

export const rankOf = (power) => {
  let idx = -1;
  for (let i = 0; i < THRESHOLDS.length; i++) if (power >= THRESHOLDS[i]) idx = i;
  return idx; // -1 = uncharted
};

const leaguePower = (repos) =>
  100 * repos.reduce((s, r) => s + Math.sqrt(r.w * r.n), 0);

export function score(raw) {
  const { norm } = raw.window;
  const w = (repo) => wOf(raw.meta.stars[repo], raw.meta.cext[repo]);

  // contributor: merged PRs, ≥2 wins gate
  const c = raw.contributor;
  const cRepos = Object.entries(c.extRepos)
    .map(([repo, v]) => ({ repo, n: v.count * c.scale * norm, w: w(repo) }))
    .filter((r) => r.n >= 2 && r.w > 0);

  // maintainer: external human PRs served, aggregated per repo, ÷2
  const servedByRepo = {};
  for (const [k, count] of Object.entries(raw.maintainer.served)) {
    servedByRepo[k.split('|')[0]] = (servedByRepo[k.split('|')[0]] || 0) + count;
  }
  const mRepos = Object.entries(servedByRepo)
    .map(([repo, count]) => ({ repo, n: count * norm / UNIT.maintainer, w: w(repo) }))
    .filter((r) => r.w > 0);
  const challengers = new Set(Object.keys(raw.maintainer.served)
    .map((k) => k.split('|')[1])).size;
  const servedPRs = Math.round(Object.values(raw.maintainer.served)
    .reduce((s, v) => s + v, 0) * norm);

  // solo: commits ÷3
  const sRepos = Object.entries(raw.solo.repos)
    .map(([repo, v]) => ({ repo, n: v.commits * norm / UNIT.solo, w: w(repo) }))
    .filter((r) => r.w > 0);

  const build = (repos, extra) => {
    const power = leaguePower(repos);
    return { power, rank: rankOf(power), repos, ...extra };
  };
  const leagues = {
    contributor: build(cRepos,
      { wins: Math.round(cRepos.reduce((s, r) => s + r.n, 0)) }),
    maintainer: build(mRepos, { servedPRs, challengers }),
    solo: build(sRepos,
      { commits: Math.round(sRepos.reduce((s, r) => s + r.n * UNIT.solo, 0)) }),
  };
  const total = leagues.contributor.power + leagues.maintainer.power + leagues.solo.power;
  const overallIdx = rankOf(total);
  const overall = overallIdx >= 0 ? LADDER[overallIdx] : null;
  const crowns = Object.values(leagues).filter((l) => l.rank >= 4).length;
  const dominant = Object.entries(leagues).sort((a, b) => b[1].power - a[1].power)[0];

  // affiliation: strongest single repo term across leagues
  const allTerms = [
    ...cRepos.map((r) => ({ ...r, role: 'CONTRIBUTOR' })),
    ...mRepos.map((r) => ({ ...r, role: 'MAINTAINER' })),
    ...sRepos.map((r) => ({ ...r, role: 'FOUNDER' })),
  ].sort((a, b) => Math.sqrt(b.w * b.n) - Math.sqrt(a.w * a.n));
  const affTop = allTerms[0] || null;
  const affiliation = affTop && {
    repo: affTop.repo,
    stars: raw.meta.stars[affTop.repo] || 0,
    role: affTop.repo.split('/')[0].toLowerCase() === raw.login.toLowerCase()
      ? 'FOUNDER' : affTop.role,
    extraArenas: new Set(allTerms.map((t) => t.repo)).size - 1,
  };

  // badges (counters) + rare — no merge-rate: rejections are not anti-contribution
  const badges = [];
  if (Object.values(leagues).filter((l) => l.rank >= 1).length === 3) {
    badges.push({ rare: true, text: '⚔ Triple Wielder' });
  }
  if (c.truncated || raw.solo.truncated) {
    badges.push({ rare: true, text: '⚡ Limit Break' });
  }
  if (leagues.contributor.wins) badges.push({ n: leagues.contributor.wins, text: 'arena wins' });
  if (challengers) badges.push({ n: challengers, text: 'challengers served' });
  if (leagues.solo.commits) badges.push({ n: leagues.solo.commits, text: 'commits shipped' });
  if (raw.extras.streakWeeks >= 2) {
    badges.push({ n: raw.extras.streakWeeks, text: '-week merge streak', glue: true });
  }

  const honors = [];
  if (raw.extras.sponsors > 0) {
    honors.push({ name: 'Community Funded',
      detail: `backed by ${raw.extras.sponsors} sponsor${raw.extras.sponsors > 1 ? 's' : ''}` });
  }

  return {
    login: raw.login, avatar: raw.avatar, scannedAt: raw.scannedAt, window: raw.window,
    total, leagues, overall, pips: crowns >= 2 ? 2 : 1, crowns,
    dominant: { league: dominant[0], metal: dominant[1].rank >= 0 ? LADDER[dominant[1].rank].metal : 'NONE' },
    affiliation, badges: badges.slice(0, 5), honors,
    persona: overall ? overall.persona : 'First scan — the journey begins',
  };
}
