// MOCK DATA ONLY. These are invented placeholder people (all named "NPC ...") and achievements so the feed UI
// can be built and tested before accounts and a real social graph exist. None of them is a real user.
// Replace this file with a real source that returns the same shapes:
//   { viewerId, users, edges, blocks, posts, recommendations }
// Each mock user also carries `stats`, the five profile cards shown on their profile page.
const now = Date.now();
const h = (n) => now - n * 3600 * 1000;

const st = (favoriteExercise, favSub, strongestExercise, strSub, leastFavoriteCategory, leastSub, daysLogged, favoriteDay, dayTxt) => ({
  favoriteExercise: { value: favoriteExercise, sub: favSub },
  strongestExercise: { value: strongestExercise, sub: strSub },
  leastFavoriteCategory: { value: leastFavoriteCategory, sub: leastSub },
  daysLogged: { value: String(daysLogged), sub: "days with a logged set" },
  favoriteDay: { value: favoriteDay, sub: dayTxt },
});

const users = {
  me: { id: "me", name: "You" },
  m_ava: { id: "m_ava", name: "NPC Ava", discoverable: true, isMock: true, stats: st("Bench Press", "96 sessions", "Deadlift", "385 lbs est. max", "Legs", "18% of days", 212, "Monday", "61 of 212 days") },
  m_ben: { id: "m_ben", name: "NPC Ben", discoverable: true, isMock: true, stats: st("Back Squat", "140 sessions", "Back Squat", "455 lbs est. max", "Arms", "9% of days", 388, "Tuesday", "74 of 388 days") },
  m_cy: { id: "m_cy", name: "NPC Cy", discoverable: true, isMock: true, stats: st("Barbell Row", "71 sessions", "Deadlift", "335 lbs est. max", "Push", "22% of days", 156, "Thursday", "34 of 156 days") },
  m_dee: { id: "m_dee", name: "NPC Dee", discoverable: true, isMock: true, stats: st("Overhead Press", "58 sessions", "Back Squat", "275 lbs est. max", "Pull", "20% of days", 131, "Saturday", "29 of 131 days") },
  m_eli: { id: "m_eli", name: "NPC Eli", discoverable: false, isMock: true, stats: st("Deadlift", "44 sessions", "Deadlift", "425 lbs est. max", "Arms", "11% of days", 97, "Friday", "21 of 97 days") },
  m_fay: { id: "m_fay", name: "NPC Fay", discoverable: true, isMock: true, stats: st("Pull-ups", "83 sessions", "Deadlift", "295 lbs est. max", "Legs", "15% of days", 174, "Wednesday", "40 of 174 days") },
  m_gus: { id: "m_gus", name: "NPC Gus", discoverable: true, isMock: true, stats: st("Bench Press", "52 sessions", "Bench Press", "245 lbs est. max", "Legs", "6% of days", 88, "Monday", "24 of 88 days") },
  m_hal: { id: "m_hal", name: "NPC Hal", discoverable: true, isMock: true, stats: st("Curls", "30 sessions", "Deadlift", "315 lbs est. max", "Legs", "5% of days", 64, "Sunday", "16 of 64 days") },
  m_ivy: { id: "m_ivy", name: "NPC Ivy", discoverable: true, isMock: true, stats: st("Back Squat", "120 sessions", "Back Squat", "315 lbs est. max", "Arms", "12% of days", 301, "Sunday", "77 of 301 days") },
  m_joe: { id: "m_joe", name: "NPC Joe", discoverable: true, isMock: true, stats: st("Bench Press", "210 sessions", "Bench Press", "355 lbs est. max", "Legs", "10% of days", 502, "Monday", "118 of 502 days") },
  m_sarah: { id: "m_sarah", name: "NPC Sarah", discoverable: true, isMock: true, stats: st("Deadlift", "165 sessions", "Deadlift", "405 lbs est. max", "Arms", "13% of days", 447, "Saturday", "102 of 447 days") },
  m_max: { id: "m_max", name: "NPC Max", discoverable: true, isMock: true, stats: st("Back Squat", "88 sessions", "Back Squat", "325 lbs est. max", "Pull", "17% of days", 203, "Friday", "47 of 203 days") },
  m_priya: { id: "m_priya", name: "NPC Priya", discoverable: true, isMock: true, stats: st("Pull-ups", "127 sessions", "Deadlift", "245 lbs est. max", "Push", "19% of days", 266, "Tuesday", "63 of 266 days") },
  m_lena: { id: "m_lena", name: "NPC Lena", discoverable: true, isMock: true, stats: st("Deadlift", "73 sessions", "Deadlift", "415 lbs est. max", "Pull", "14% of days", 189, "Thursday", "45 of 189 days") },
  m_omar: { id: "m_omar", name: "NPC Omar", discoverable: true, isMock: true, stats: st("Dips", "109 sessions", "Bench Press", "275 lbs est. max", "Legs", "8% of days", 241, "Wednesday", "58 of 241 days") },
  m_tony: { id: "m_tony", name: "NPC Tony", discoverable: true, isMock: true, stats: st("Push-ups", "145 sessions", "Back Squat", "285 lbs est. max", "Arms", "16% of days", 330, "Monday", "70 of 330 days") },
};

export const mockSocial = {
  viewerId: "me",
  users,
  // me - ava, ben, joe, sarah, max, priya (degree 1); friends of those are degree 2; then degree 3 and 4 further out
  edges: [
    ["me", "m_ava"], ["me", "m_ben"], ["me", "m_joe"], ["me", "m_sarah"], ["me", "m_max"], ["me", "m_priya"],
    ["m_ava", "m_cy"], ["m_ben", "m_cy"], ["m_ben", "m_dee"], ["m_cy", "m_eli"], ["m_dee", "m_fay"], ["m_fay", "m_gus"], ["m_hal", "m_ivy"],
    ["m_sarah", "m_lena"], ["m_max", "m_omar"], ["m_joe", "m_tony"],
  ],
  blocks: [["me", "m_hal"]],
  posts: [
    { id: "p1", authorId: "m_ava", text: "First 225 bench press", ts: h(2), visibility: "friends", achievement: "225" },
    { id: "p2", authorId: "m_ben", text: "12 week consistency streak", ts: h(5), visibility: "public", achievement: "Streak" },
    { id: "p3", authorId: "m_cy", text: "Squat est. max up 6% this month", ts: h(7), visibility: "fof", achievement: "Growth" },
    { id: "p4", authorId: "m_dee", text: "Hit 40k weekly volume", ts: h(9), visibility: "public", achievement: "Volume" },
    { id: "p5", authorId: "m_ava", text: "Private session, not shared", ts: h(10), visibility: "private", achievement: "PR" },
    { id: "p6", authorId: "m_eli", text: "Deadlift 405, hidden by privacy", ts: h(11), visibility: "public", achievement: "405" },
    { id: "p7", authorId: "m_fay", text: "First pull-up set of 10", ts: h(12), visibility: "public", achievement: "PR" },
    { id: "p8", authorId: "m_gus", text: "Four degrees away, too far", ts: h(13), visibility: "public", achievement: "PR" },
    { id: "p9", authorId: "m_hal", text: "Blocked account", ts: h(14), visibility: "public", achievement: "PR" },
    { id: "p10", authorId: "m_cy", text: "Restricted to friends of friends", ts: h(15), visibility: "friends", achievement: "PR" },
    { id: "p11", authorId: "m_joe", text: "Benching 3x body weight", ts: h(1), visibility: "public", achievement: "3x BW" },
    { id: "p12", authorId: "m_sarah", text: "Joined the 1000 lb club: bench, squat and deadlift", ts: h(3), visibility: "public", achievement: "1000" },
    { id: "p13", authorId: "m_max", text: "First 315 squat", ts: h(4), visibility: "public", achievement: "315" },
    { id: "p14", authorId: "m_priya", text: "10 strict pull-ups in one set", ts: h(6), visibility: "public", achievement: "Pull-ups" },
    { id: "p15", authorId: "m_lena", text: "Pulled 405 for the first time", ts: h(8), visibility: "public", achievement: "405" },
    { id: "p16", authorId: "m_omar", text: "20 strict dips in one set", ts: h(10.5), visibility: "public", achievement: "Dips" },
    { id: "p17", authorId: "m_tony", text: "50 push-ups in a row", ts: h(16), visibility: "public", achievement: "Push-ups" },
    { id: "p18", authorId: "m_joe", text: "225 for 8 reps on bench", ts: h(20), visibility: "public", achievement: "225 x8" },
  ],
  // Community picks from people with no connection to the viewer. Flagged as suggestions, never as connections.
  recommendations: [
    { id: "r1", authorId: "m_ivy", text: "100 day logging streak", ts: h(3), visibility: "public", achievement: "Streak" },
  ],
};
