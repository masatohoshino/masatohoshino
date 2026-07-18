// GitHub API helpers: REST, GraphQL, throttled search pagination.
import { execFileSync } from 'node:child_process';

let _token = null;
export function token() {
  if (_token) return _token;
  _token = process.env.GITHUB_TOKEN
    || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  return _token;
}

const API = 'https://api.github.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(url, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'oss-warrior',
        ...init.headers,
      },
    });
    const exhausted = res.headers.get('x-ratelimit-remaining') === '0'
      || res.headers.get('retry-after');
    if (res.status === 429 || (res.status === 403 && exhausted)) {
      const reset = res.headers.get('x-ratelimit-reset');
      const wait = reset ? Math.min(90, +reset - Date.now() / 1000 + 1) : 30 * (attempt + 1);
      process.stderr.write(`[gh] rate limited, waiting ${Math.ceil(wait)}s\n`);
      await sleep(Math.max(1, wait) * 1000);
      continue;
    }
    return res;
  }
  throw new Error(`rate limited beyond retries: ${url}`);
}

export async function rest(path) {
  const res = await req(`${API}${path}`);
  if (res.status === 404) return { status: 404, data: null, headers: res.headers };
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

export async function graphql(query, variables = {}) {
  const res = await req(`${API}/graphql`, {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    const err = new Error(body.errors.map((e) => e.message).join('; '));
    err.gh = body.errors;
    throw err;
  }
  return body.data;
}

let lastSearch = 0;
export async function searchPRs(q, maxPages = 10) {
  const items = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    let body = null;
    // GITHUB_TOKEN gets low search priority: heavy queries can come back
    // empty with incomplete_results=true — retry rather than trust them.
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = lastSearch + 2100 - Date.now();
      if (wait > 0) await sleep(wait);
      lastSearch = Date.now();
      const res = await req(
        `${API}/search/issues?q=${encodeURIComponent(q)}&per_page=100&page=${page}`);
      body = await res.json();
      if (!body.items) throw new Error(`search failed: ${JSON.stringify(body).slice(0, 200)}`);
      if (body.items.length > 0 || !body.incomplete_results) break;
      process.stderr.write(`[gh] search incomplete (page ${page}, attempt ${attempt + 1}), retrying\n`);
      await sleep(4000 * (attempt + 1));
    }
    total = body.total_count;
    items.push(...body.items);
    if (body.items.length < 100) break;
  }
  return { total, items, truncated: total > items.length };
}

// contributors count via Link header (per_page=1); minus owner happens in caller
export async function contributorCount(repo) {
  const res = await req(`${API}/repos/${repo}/contributors?per_page=1&anon=0`);
  // 403 without exhausted quota = "history too large to list" (e.g. torvalds/linux)
  // — a repo that big has a maxed-out community by definition.
  if (res.status === 403) { await res.arrayBuffer(); return 500; }
  if (res.status !== 200) return 0;
  await res.arrayBuffer(); // drain
  const link = res.headers.get('link') || '';
  const m = link.match(/[?&]page=(\d+)>; rel="last"/);
  return m ? Math.min(+m[1], 500) : 1;
}

export function isBot(login, typename) {
  if (typename === 'Bot') return true;
  const low = (login || '').toLowerCase();
  return low.endsWith('[bot]') || low.endsWith('bot') || low.includes('actions');
}
