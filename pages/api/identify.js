import { Redis } from "@upstash/redis";
import { resolveUser, todayUTC } from "../../lib/auth";

// Reads a photo of a gym machine's nameplate and returns the exercise name and brand for the app to prefill.
// The photo is sent to Claude for this one request and is never stored.
export const config = { api: { bodyParser: { sizeLimit: "3mb" } } };

const redis = Redis.fromEnv();
const MODEL = process.env.IDENTIFY_MODEL || "claude-haiku-5-5";
const DAILY_LIMIT = Number(process.env.IDENTIFY_DAILY_LIMIT || 20); // photos per person per day
const MUSCLES = ["push", "pull", "legs", "arms", "core", "other"];

const SYSTEM = `You read photos of gym machines for a strength-training app. The photo should show the placard or nameplate of one machine.
Return the exercise name printed on the machine and the manufacturer, exactly as shown, nothing guessed.
Rules:
- "name" is the exercise or machine name on the placard (for example "Prone Leg Curl"), in Title Case. Do not include the brand in the name.
- "brand" is the manufacturer on the machine (for example "Precor", "Hammer Strength", "Life Fitness", "Matrix", "Cybex"). Use an empty string if you cannot see one.
- "muscle" is one of: push, pull, legs, arms, core, other. Use the main muscle group the machine trains.
- If you cannot clearly read a machine name, set "found" to false and leave "name" empty. Never invent a name.
Reply with ONLY JSON: {"found":true,"name":"...","brand":"...","muscle":"..."}`;

const title = (s) => String(s || "").replace(/[^\w\s\-\/&'.]/g, "").replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (String(process.env.IDENTIFY_AI || "on").trim().toLowerCase() === "off") return res.status(200).json({ disabled: true });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Camera not configured" });

  const image = req.body && req.body.image;
  const mediaType = req.body && req.body.mediaType;
  if (typeof image !== "string" || image.length < 100 || image.length > 2800000 || !/^image\/(jpeg|png|webp)$/.test(mediaType || "")) {
    return res.status(400).json({ error: "Bad image" });
  }

  try {
    const used = await redis.incr(`identify-count:${user.slug}:${todayUTC()}`);
    if (used > DAILY_LIMIT) return res.status(429).json({ error: "Daily camera limit reached" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: "What machine is this?" },
        ] }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "Camera request failed" });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (!parsed || parsed.found === false || !title(parsed.name)) return res.status(200).json({ found: false });
    const muscle = MUSCLES.includes(parsed.muscle) ? parsed.muscle : "other";
    return res.status(200).json({ found: true, name: title(parsed.name), brand: title(parsed.brand), muscle });
  } catch (err) {
    return res.status(500).json({ error: "Camera error" });
  }
}
