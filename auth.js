// Works out who is calling from the passcode header.
//  - APP_PASSCODE            -> the owner (your own data, stored under the original key)
//  - TESTER_CODES            -> comma-separated "name:code" pairs (or bare codes); each tester gets their own data
// Example:  TESTER_CODES="Sam:river-47,Maya:oak-82,Chris:stone-19"
export const OWNER_KEY = "hooks-workout-data";

export function resolveUser(req) {
  const code = req.headers["x-app-passcode"];
  if (!code || typeof code !== "string") return null;
  if (process.env.APP_PASSCODE && code === process.env.APP_PASSCODE) {
    return { role: "owner", name: "Owner", slug: "owner", key: OWNER_KEY };
  }
  const items = (process.env.TESTER_CODES || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < items.length; i++) {
    const at = items[i].indexOf(":");
    const name = at > 0 ? items[i].slice(0, at).trim() : `Tester ${i + 1}`;
    const secret = at > 0 ? items[i].slice(at + 1).trim() : items[i];
    if (secret && code === secret) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tester-${i + 1}`;
      return { role: "tester", name, slug, key: `${OWNER_KEY}:tester:${slug}` };
    }
  }
  return null;
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);
