// Collect raw activity for one login across the three leagues (SPEC §1–§2, §7).
import { rest, graphql, searchPRs, contributorCount, isBot } from './gh.js';

const iso = (d) => d.toISOString().slice(0, 10);

export async function measure(login, opts = {}) {
  const to = opts.to ? new Date(opts.to) : new Date();
  const from = opts.from ? new Date(opts.from)
    : new Date(to.getTime() - (opts.days ?? 90) * 86400e3);
  const windowDays = Math.max(1, Math.round((to - from) / 86400e3));
  const norm = 90 / windowDays; // SPEC §7: counts scale to 90d-equivalent
  const range = `${iso(from)}..${iso(to)}`;
  const log = (m) => process.stderr.write(`[measure] ${m}\n`);

  const user = (await rest(`/users/${login}`)).data;
  if (!user) throw new Error(`unknown user: ${login}`);
  const orgs = ((await rest(`/users/${login}/orgs`)).data || []).map((o) => o.login);
  const ownSet = new Set(
    [login, ...orgs, ...(opts.ownOrgs || [])].map((s) => s.toLowerCase()));
  const isInternal = (repo) => ownSet.has(repo.split('/')[0].toLowerCase());

  // ---- contributor: merged PRs in window ---------------------------------
  log(`contributor: merged PRs ${range}`);
  const merged = await searchPRs(`is:pr author:${login} is:merged merged:${range}`);
  const extRepos = {}; // repo -> {count, mergedAts[]}
  let selfCount = 0;
  for (const it of merged.items) {
    const repo = it.repository_url.split('/').slice(-2).join('/');
    if (isInternal(repo)) { selfCount++; continue; }
    (extRepos[repo] ??= { count: 0, mergedAts: [] }).count++;
    extRepos[repo].mergedAts.push(it.pull_request?.merged_at || it.closed_at);
  }
  const scale = merged.truncated && merged.items.length
    ? merged.total / merged.items.length : 1;

  // ---- merger rule (SPEC §1): repos where the user merges OTHER people's
  // PRs are internal realms, even when org membership is private
  // (steipete/openclaw case — no config needed).
  const probeList = Object.entries(extRepos)
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10).map(([r]) => r);
  const MPQ = `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){
    pullRequests(states:[MERGED], first:40, orderBy:{field:UPDATED_AT, direction:DESC}){
      nodes{ author{login} mergedBy{login} }}}}`;
  const internalOwners = [];
  for (const repo of probeList) {
    const [o, n] = repo.split('/');
    try {
      const d = await graphql(MPQ, { owner: o, name: n });
      const hit = (d.repository?.pullRequests.nodes || []).some((x) =>
        x.mergedBy?.login === login && x.author?.login && x.author.login !== login);
      if (hit && !ownSet.has(o.toLowerCase()) && !internalOwners.includes(o)) {
        internalOwners.push(o);
      }
    } catch { /* deleted repo etc. */ }
  }
  if (internalOwners.length) {
    log(`merger rule: internal realms detected: ${internalOwners.join(', ')}`);
    for (const o of internalOwners) ownSet.add(o.toLowerCase());
    for (const repo of Object.keys(extRepos)) {
      if (isInternal(repo)) { selfCount += extRepos[repo].count; delete extRepos[repo]; }
    }
  }

  // ---- maintainer: mergedBy over own+org repos (SPEC §8 discovery cap) ---
  log('maintainer: arena discovery');
  const arenas = [];
  const repoLists = [await rest(`/users/${login}/repos?sort=pushed&per_page=100`)];
  for (const o of new Set([...orgs, ...(opts.ownOrgs || []), ...internalOwners])) {
    let r = await rest(`/orgs/${o}/repos?sort=pushed&per_page=100`);
    if (r.status === 404) r = await rest(`/users/${o}/repos?sort=pushed&per_page=100`);
    repoLists.push(r);
  }
  for (const { data } of repoLists) {
    for (const r of data || []) {
      if (!r.private && new Date(r.pushed_at) >= from) arenas.push(r.full_name);
    }
  }
  const capped = [...new Set(arenas)].slice(0, 30);
  const served = {}; // `${repo}|${author}` -> count
  const PRQ = `query($owner:String!,$name:String!,$cursor:String){
    repository(owner:$owner,name:$name){
      pullRequests(states:[MERGED], first:100, after:$cursor,
                   orderBy:{field:UPDATED_AT, direction:DESC}){
        pageInfo{hasNextPage endCursor}
        nodes{ mergedAt author{login __typename} mergedBy{login} }}}}`;
  for (const repo of capped) {
    const [owner, name] = repo.split('/');
    let cursor = null;
    for (let page = 0; page < 3; page++) {
      let data;
      try {
        data = await graphql(PRQ, { owner, name, cursor });
      } catch { break; }
      const conn = data.repository?.pullRequests;
      if (!conn) break;
      const inWin = conn.nodes.filter((n) => n.mergedAt
        && new Date(n.mergedAt) >= from && new Date(n.mergedAt) <= to);
      for (const n of inWin) {
        const a = n.author?.login;
        if (n.mergedBy?.login !== login || !a || a === login) continue;
        if (isBot(a, n.author.__typename)) continue;
        served[`${repo}|${a}`] = (served[`${repo}|${a}`] || 0) + 1;
      }
      if ((conn.nodes.length && !inWin.length) || !conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }
  }

  // ---- solo: commit contributions, monthly-chunk fallback ----------------
  log('solo: contributionsCollection');
  const soloRepos = {}; // repo -> {commits, stars}
  let soloTruncated = false;
  const CCQ = `query($u:String!,$from:DateTime!,$to:DateTime!){
    user(login:$u){ contributionsCollection(from:$from, to:$to){
      commitContributionsByRepository(maxRepositories:100){
        contributions{totalCount}
        repository{nameWithOwner stargazerCount isPrivate owner{login}}}}}}`;
  const collectSolo = async (f, t) => {
    const d = await graphql(CCQ, { u: login, from: f.toISOString(), to: t.toISOString() });
    for (const e of d.user.contributionsCollection.commitContributionsByRepository) {
      const r = e.repository;
      if (r.isPrivate || !ownSet.has(r.owner.login.toLowerCase())) continue;
      const cur = (soloRepos[r.nameWithOwner] ??= { commits: 0, stars: r.stargazerCount });
      cur.commits += e.contributions.totalCount;
    }
  };
  try {
    await collectSolo(from, to);
  } catch {
    log('solo: falling back to monthly chunks');
    for (let t = new Date(to); t > from;) {
      const f = new Date(Math.max(from, t.getTime() - 30 * 86400e3));
      try { await collectSolo(f, t); } catch { soloTruncated = true; }
      t = f;
    }
  }

  // ---- repo meta: stars + C_ext ------------------------------------------
  const needMeta = new Set([
    ...Object.keys(extRepos),
    ...Object.keys(served).map((k) => k.split('|')[0]),
  ]);
  log(`meta: ${needMeta.size} repos (stars) + C_ext`);
  const stars = {};
  const metaList = [...needMeta];
  for (let i = 0; i < metaList.length; i += 40) {
    const batch = metaList.slice(i, i + 40);
    const q = 'query{' + batch.map((r, j) => {
      const [o, n] = r.split('/');
      return `r${j}: repository(owner:${JSON.stringify(o)}, name:${JSON.stringify(n)})
        { nameWithOwner stargazerCount }`;
    }).join(' ') + '}';
    try {
      const d = await graphql(q);
      for (const v of Object.values(d)) if (v) stars[v.nameWithOwner] = v.stargazerCount;
    } catch { /* deleted repos etc. */ }
  }
  for (const [r, v] of Object.entries(soloRepos)) stars[r] = v.stars;
  const cext = {};
  for (const r of new Set([...needMeta, ...Object.keys(soloRepos)])) {
    cext[r] = Math.max(0, (await contributorCount(r)) - 1);
  }

  // ---- extras: avatar, sponsors, streak ----------------------------------
  let avatar = null;
  try {
    const res = await fetch(`${user.avatar_url}&size=120`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type')?.split(';')[0]
      || (buf[0] === 0x89 ? 'image/png' : 'image/jpeg');
    avatar = `data:${mime};base64,${buf.toString('base64')}`;
  } catch { /* card falls back to initial */ }
  let sponsors = 0;
  try {
    const d = await graphql(
      `query($u:String!){ user(login:$u){ sponsorshipsAsMaintainer(first:1){totalCount} }}`,
      { u: login });
    sponsors = d.user.sponsorshipsAsMaintainer.totalCount;
  } catch { /* orgs / older accounts */ }
  const weeks = new Set(Object.values(extRepos).flatMap((r) => r.mergedAts)
    .filter(Boolean).map((t) => Math.floor(new Date(t).getTime() / (7 * 86400e3))));
  let streak = 0;
  for (let w = Math.floor(to.getTime() / (7 * 86400e3)); weeks.has(w) || weeks.has(w - 1); w--) {
    if (!weeks.has(w)) continue;
    streak++;
  }

  return {
    login, avatar, scannedAt: iso(to), window: { from: iso(from), to: iso(to), days: windowDays, norm },
    contributor: { extRepos, selfCount, scale, truncated: merged.truncated },
    maintainer: { served, arenasScanned: capped.length },
    solo: { repos: soloRepos, truncated: soloTruncated },
    meta: { stars, cext },
    extras: { sponsors, streakWeeks: streak, orgs },
  };
}
