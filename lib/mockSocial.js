// MOCK DATA ONLY. These are invented placeholder people and achievements so the feed UI can be built and
// tested before accounts and a real social graph exist. None of them is a real user, and the app labels
// them "Sample" on screen. Replace this file with a real source that returns the same shapes:
//   { viewerId, users, edges, blocks, posts, recommendations }
const now = Date.now();
const h = (n) => now - n * 3600 * 1000;

const users = {
  me: { id: "me", name: "You" },
  m_ava: { id: "m_ava", name: "Sample Ava", discoverable: true, isMock: true },
  m_ben: { id: "m_ben", name: "Sample Ben", discoverable: true, isMock: true },
  m_cy: { id: "m_cy", name: "Sample Cy", discoverable: true, isMock: true },
  m_dee: { id: "m_dee", name: "Sample Dee", discoverable: true, isMock: true },
  m_eli: { id: "m_eli", name: "Sample Eli", discoverable: false, isMock: true },
  m_fay: { id: "m_fay", name: "Sample Fay", discoverable: true, isMock: true },
  m_gus: { id: "m_gus", name: "Sample Gus", discoverable: true, isMock: true },
  m_hal: { id: "m_hal", name: "Sample Hal", discoverable: true, isMock: true },
  m_ivy: { id: "m_ivy", name: "Sample Ivy", discoverable: true, isMock: true },
};

export const mockSocial = {
  viewerId: "me",
  users,
  // me - ava, ben (degree 1); ava - cy, ben - cy, ben - dee (degree 2); cy - eli, dee - fay, fay - gus (degree 3 and 4)
  edges: [["me", "m_ava"], ["me", "m_ben"], ["m_ava", "m_cy"], ["m_ben", "m_cy"], ["m_ben", "m_dee"], ["m_cy", "m_eli"], ["m_dee", "m_fay"], ["m_fay", "m_gus"], ["m_hal", "m_ivy"]],
  blocks: [["me", "m_hal"]],
  posts: [
    { id: "p1", authorId: "m_ava", text: "New bench PR, 185 x 5", ts: h(2), visibility: "friends", achievement: "PR" },
    { id: "p2", authorId: "m_ben", text: "12 week consistency streak", ts: h(5), visibility: "public", achievement: "Streak" },
    { id: "p3", authorId: "m_cy", text: "Squat e1RM up 6% this month", ts: h(7), visibility: "fof", achievement: "Growth" },
    { id: "p4", authorId: "m_dee", text: "Hit 40k weekly volume", ts: h(9), visibility: "public", achievement: "Volume" },
    { id: "p5", authorId: "m_ava", text: "Private session, not shared", ts: h(10), visibility: "private", achievement: "PR" },
    { id: "p6", authorId: "m_eli", text: "Deadlift 405, hidden by privacy", ts: h(11), visibility: "public", achievement: "PR" },
    { id: "p7", authorId: "m_fay", text: "First pull-up set of 10", ts: h(12), visibility: "public", achievement: "PR" },
    { id: "p8", authorId: "m_gus", text: "Four degrees away, too far", ts: h(13), visibility: "public", achievement: "PR" },
    { id: "p9", authorId: "m_hal", text: "Blocked account", ts: h(14), visibility: "public", achievement: "PR" },
    { id: "p10", authorId: "m_cy", text: "Restricted to friends of friends", ts: h(15), visibility: "friends", achievement: "PR" },
  ],
  // Community picks from people with no connection to the viewer. Flagged as suggestions, never as connections.
  recommendations: [
    { id: "r1", authorId: "m_ivy", text: "100 day logging streak", ts: h(3), visibility: "public", achievement: "Streak" },
  ],
};
