// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Speed: answers are cached in memory for 60s and revalidated with the
// ETag the API returns (bound to the minute), in-flight requests are
// shared, and stale renders are cancelled by the router's run id.

const API = 'https://make.fun/api';
const TTL = 60000;
const cache = new Map(); // path -> { data, etag, at }
const inflight = new Map(); // path -> Promise

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < TTL) return hit.data;
  if (inflight.has(path)) return inflight.get(path);
  const p = (async () => {
    const headers = {};
    if (hit?.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(API + path, { headers });
    if (res.status === 304 && hit) {
      hit.at = now;
      return hit.data;
    }
    if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
    const data = await res.json();
    cache.set(path, { data, etag: res.headers.get('ETag'), at: now });
    return data;
  })();
  inflight.set(path, p);
  try {
    return await p;
  } finally {
    inflight.delete(path);
  }
}

/** The bounties: { items: [...] }. activity=times leaves out the activity a board does not show. */
export const getBounties = () => get('/competitions?status=open&activity=times&limit=100');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { entries: [{ rank, handle, title, values: { judge, valid, bytes } }] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** The all-time hunter rankings. */
export const getRankings = () => get('/rankings');

/** The newest entries across all bounties. */
export const getLatestEntries = () => get('/activity/entries/latest?limit=20');
