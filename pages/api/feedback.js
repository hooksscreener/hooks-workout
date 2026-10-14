import { Redis } from "@upstash/redis";
import { resolveUser, todayUTC } from "../../lib/auth";

const redis = Redis.fromEnv();
const LIST = "hooks-feedback";

export default async function handler(req, res) {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  try {
    if (req.method === "POST") {
      const message = String((req.body && req.body.message) || "").trim().slice(0, 2000);
      if (!message) return res.status(400).json({ error: "Empty message" });
      const count = await redis.incr(`feedback-count:${user.slug}:${todayUTC()}`);
      if (count > 20) return res.status(429).json({ error: "Too many messages today" });
      await redis.lpush(LIST, JSON.stringify({ name: user.name, role: user.role, message, at: new Date().toISOString() }));
      await redis.ltrim(LIST, 0, 499);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "GET") {
      if (user.role !== "owner") return res.status(403).json({ error: "Owner only" });
      const raw = await redis.lrange(LIST, 0, 199);
      const items = raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
      return res.status(200).json({ items });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Storage error", detail: String(err) });
  }
}
