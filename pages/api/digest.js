import { Redis } from "@upstash/redis";
import { resolveUser, todayUTC } from "../../lib/auth";

const redis = Redis.fromEnv();
const MODEL = process.env.DIGEST_MODEL || "claude-haiku-5-5";
const DAILY_LIMIT = 12; // fresh generations per person per day (cached repeats don't count)

const SYSTEM = `You write the Lifter's Digest for a strength-training app. The user message is JSON with precomputed training stats; the app already did all the math. The field "unit" is the weight unit (lbs or kg); say weights in that unit.
Write four short sections as plain text:
- last: what they hit in their last workout (use lastWorkout: day name, how long ago, the top sets). Mention any newPRs.
- up: what is improving (use improving, with the percentages) and the likely why from each item's drivers.
- down: what is slipping or flat (use slipping and stalled) and the likely why from drivers. If nothing is, say so briefly.
- due: which workout day is due next (use dueNext), and one practical suggestion that fits the stated goal.
Rules:
- Each section is at most 45 words.
- Use ONLY numbers that appear in the input. Never invent or recompute numbers.
- Say "likely" when stating a cause. You cannot see sleep, food or stress, so do not guess at them.
- No medical advice, no injury claims. Plain, direct, encouraging but honest. Never use em dashes.
- If a section has no data, say so in one short sentence.
Reply with ONLY JSON: {"last":"...","up":"...","down":"...","due":"..."}`;

const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const clean = (v) => String(v || "").replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, 420);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  // Master switch: set DIGEST_AI=off in Vercel and Claude is never called. The app shows the basic digest.
  if (String(process.env.DIGEST_AI || "on").trim().toLowerCase() === "off") return res.status(200).json({ disabled: true });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI digest not configured" });

  const stats = req.body && req.body.stats;
  if (!stats || JSON.stringify(stats).length > 12000) return res.status(400).json({ error: "Bad stats" });
  const payload = JSON.stringify(stats);

  try {
    const cacheKey = `digest2:${user.slug}:${todayUTC()}:${hash(MODEL + payload)}`;
    const cached = await redis.get(cacheKey);
    if (cached && cached.sections) return res.status(200).json({ sections: cached.sections, cached: true });

    const used = await redis.incr(`digest-count:${user.slug}:${todayUTC()}`);
    if (used > DAILY_LIMIT) return res.status(429).json({ error: "Daily digest limit reached" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, system: SYSTEM, messages: [{ role: "user", content: payload }] }),
    });
    if (!r.ok) return res.status(502).json({ error: "AI request failed", status: r.status });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    const sections = parsed ? { last: clean(parsed.last), up: clean(parsed.up), down: clean(parsed.down), due: clean(parsed.due) } : null;
    if (!sections || !sections.last || !sections.up || !sections.down || !sections.due) return res.status(502).json({ error: "Empty AI response" });
    await redis.set(cacheKey, { sections }, { ex: 3 * 24 * 3600 });
    return res.status(200).json({ sections });
  } catch (err) {
    return res.status(500).json({ error: "Digest error" });
  }
}
