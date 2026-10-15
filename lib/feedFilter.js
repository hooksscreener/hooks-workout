// Social feed audience filtering. Pure functions, no UI and no data fetching, so the same logic can run
// against real authenticated accounts and a real social graph later.
//
// Modes:
//   "friends"   direct friends only (degree 1)
//   "fof"       direct friends and friends of friends (degree 1 and 2)
//   null        Community Discovery: degrees 1 to 3, with limits on degree 3, plus eligible recommendations
//
// Inputs (all plain data, supplied by a source such as lib/mockSocial.js or a future API):
//   viewerId   id of the signed-in user
//   users      { [id]: { id, name, discoverable, isMock?, tags? } }
//              discoverable: the person opted in to being shown beyond friends of friends
//   edges      [[idA, idB], ...] mutual friendships
//   blocks     [[blockerId, blockedId], ...] a block in either direction hides both people from each other
//   posts      [{ id, authorId, text, ts, visibility, achievement }]
//              visibility: "private" | "friends" | "fof" | "public"
//   opts       { thirdDegreeLimit, perAuthorLimit, recommendationLimit, limit }

export const FEED_MODES = { FRIENDS: "friends", FOF: "fof", DISCOVERY: null };

const DEFAULT_OPTS = { thirdDegreeLimit: 6, perAuthorLimit: 2, recommendationLimit: 4, limit: 40 };

function blockedSet(viewerId, blocks) {
  const hidden = new Set();
  (blocks || []).forEach(([a, b]) => {
    if (a === viewerId) hidden.add(b);
    if (b === viewerId) hidden.add(a);
  });
  return hidden;
}

// Breadth-first search from the viewer. Blocked accounts are never visited, so nobody is reachable
// through a blocked person either. Returns { [userId]: { degree, via: [firstHopIds...] } } up to maxDegree.
export function computeDegrees(viewerId, edges, hidden, maxDegree = 3) {
  const adj = new Map();
  (edges || []).forEach(([a, b]) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  });
  const out = {};
  const seen = new Set([viewerId]);
  let frontier = [viewerId];
  for (let d = 1; d <= maxDegree; d++) {
    const next = [];
    frontier.forEach((u) => {
      (adj.get(u) || []).forEach((v) => {
        if (seen.has(v) || hidden.has(v)) return;
        seen.add(v);
        out[v] = { degree: d, via: d === 1 ? [] : [u] };
        next.push(v);
      });
    });
    // Count every connection that reaches a person at this degree, for the "via" list.
    frontier.forEach((u) => (adj.get(u) || []).forEach((v) => {
      if (out[v] && out[v].degree === d && d > 1 && !out[v].via.includes(u)) out[v].via.push(u);
    }));
    frontier = next;
  }
  return out;
}

// Can the viewer see this post at all, given who wrote it and how far away they are?
// "private" is never visible to anyone but the author. A broader feed filter never widens a post's own audience.
export function canView(post, degree) {
  if (!post || !degree) return false;
  switch (post.visibility) {
    case "friends": return degree === 1;
    case "fof": return degree <= 2;
    case "public": return true;
    default: return false; // "private", missing or unknown values are all treated as private
  }
}

export function filterFeed({ viewerId, mode = null, users = {}, edges = [], blocks = [], posts = [], recommendations = [], opts = {} }) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const hidden = blockedSet(viewerId, blocks);
  const maxDegree = mode === FEED_MODES.FRIENDS ? 1 : mode === FEED_MODES.FOF ? 2 : 3;
  const degrees = computeDegrees(viewerId, edges, hidden, maxDegree);

  const seenIds = new Set();      // dedupe by post id; a person reachable several ways yields each post once
  const perAuthor = {};
  let third = 0;
  const items = [];

  const push = (post, degree, source) => {
    if (seenIds.has(post.id)) return;
    seenIds.add(post.id);
    items.push({ ...post, degree, source, via: (degrees[post.authorId] || {}).via || [] });
  };

  const byNewest = (a, b) => b.ts - a.ts;
  posts.slice().sort(byNewest).forEach((post) => {
    const info = degrees[post.authorId];
    if (!info || hidden.has(post.authorId)) return;
    if (!canView(post, info.degree)) return;
    if (info.degree === 3) {
      // Third-degree people only appear in Community Discovery, only if they opted in and only for public posts.
      const u = users[post.authorId];
      if (mode !== FEED_MODES.DISCOVERY || !u || !u.discoverable || post.visibility !== "public") return;
      if (third >= o.thirdDegreeLimit) return;
      if ((perAuthor[post.authorId] || 0) >= o.perAuthorLimit) return;
      perAuthor[post.authorId] = (perAuthor[post.authorId] || 0) + 1;
      third++;
    }
    push(post, info.degree, "network");
  });

  // Community recommendations: only in Discovery, only from people who opted in, only public posts,
  // never from blocked accounts, and never something already shown through the network.
  if (mode === FEED_MODES.DISCOVERY) {
    let n = 0;
    recommendations.slice().sort(byNewest).forEach((post) => {
      if (n >= o.recommendationLimit) return;
      const u = users[post.authorId];
      if (!u || !u.discoverable || post.visibility !== "public" || hidden.has(post.authorId) || post.authorId === viewerId) return;
      if (seenIds.has(post.id)) return;
      push(post, null, "recommendation");
      n++;
    });
  }

  return items.sort(byNewest).slice(0, o.limit);
}
