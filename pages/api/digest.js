import { Redis } from "@upstash/redis";
import { resolveUser, todayUTC } from "../../lib/auth";

const redis = Redis.fromEnv();
const MODEL = process.env.DIGEST_MODEL || "claude-haiku-5-5";
const DAILY_LIMIT = 12; // fresh generations per person per day (cached repeats don't count)

const SYSTEM = `You write short digest cards for a strength-training app. The user message is JSON with precomputed training stats; the app already did all the math.
Rules:
- Write at most 4 cards. Each has a short title (max 4 words), a body (max 28 words), and a tone: "up" (improving), "down" (slipping or stalled), "rest" (needs rest or is overdue) or "info".
- Use ONLY numbers that appear in the input. Never invent or recompute numbers.
- Explain what drove a change using the "drivers" given, and say "likely" when stating a cause. You cannot see sleep, food or stress, so do not guess at them.
- No medical advice, no injury claims. Plain, direct, encouraging but honest. No em dashes.
- If there is little data, write one "info" card saying to keep logging.
Reply with ONLY JSON: {"cards":[{"title":"...","body":"...","tone":"up"}]}`;

const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI digest not configured" });

  const stats = req.body && req.body.stats;
  if (!stats || JSON.stringify(stats).length > 12000) return res.status(400).json({ error: "Bad stats" });
  const payload = JSON.stringify(stats);

  try {
    const cacheKey = `digest:${user.slug}:${todayUTC()}:${hash(payload)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json({ cards: cached.cards || cached, cached: true });

    const used = await redis.incr(`digest-count:${user.slug}:${todayUTC()}`);
    if (used > DAILY_LIMIT) return res.status(429).json({ error: "Daily digest limit reached" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, messages: [{ role: "user", content: payload }] }),
    });
    if (!r.ok) return res.status(502).json({ error: "AI request failed", status: r.status });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    const cards = ((parsed && parsed.cards) || []).slice(0, 4).map((c) => ({
      title: String(c.title || "").slice(0, 40),
      body: String(c.body || "").slice(0, 220),
      tone: ["up", "down", "rest", "info"].includes(c.tone) ? c.tone : "info",
    })).filter((c) => c.title && c.body);
    if (!cards.length) return res.status(502).json({ error: "Empty AI response" });
    await redis.set(cacheKey, { cards }, { ex: 3 * 24 * 3600 });
    return res.status(200).json({ cards });
  } catch (err) {
    return res.status(500).json({ error: "Digest error" });
  }
}
