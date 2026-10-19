import { Redis } from "@upstash/redis";
import { resolveUser, todayUTC } from "../../lib/auth";

// Reads a photo of handwritten (or typed) workout notes and returns the sets it can read, for the app's confirm screen.
// The photo is sent to Claude for this one request and is never stored.
export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const redis = Redis.fromEnv();
const MODEL = process.env.NOTES_MODEL || "claude-sonnet-5-5";
const DAILY_LIMIT = Number(process.env.NOTES_DAILY_LIMIT || 10); // photos per person per day

const SYSTEM = `You read photos of workout notes (handwritten or typed) for a strength-training app and turn them into logged sets.
The user message lists the exercise names the person already has in the app ("known") and their usual weight unit.
Return ONLY JSON: {"date":"YYYY-MM-DD" or null,"unit":"lbs" or "kg" or null,"lines":[{"raw":"text as written","exercise":"...","match":"a name from known, or null","weight":number,"reps":number,"sets":number,"warmup":boolean,"sure":boolean}]}
Rules:
- One line per distinct set group. "185 x 8 x 3", "3x8 @185" and "185 for 8, 3 sets" mean weight 185, reps 8, sets 3.
- If the reps differ from set to set (for example "185: 8, 8, 6"), output separate lines with sets 1 each.
- "exercise" is the name as written, expanded if it is an obvious abbreviation. "match" is the entry in "known" that means the same exercise, or null if none clearly does. Never force a weak match.
- "date" only if a date is written on the page (assume the current year when missing); otherwise null. "unit" only if the page states lbs or kg; otherwise null.
- "warmup" is true only if the line is marked as a warm-up (W, warm up).
- Mark "sure" false whenever you are guessing at a digit or a word. Never invent a set that is not on the page. Skip anything that is not a set.
- Never use em dashes. Weights are numbers only (no units).`;

const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const str = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (String(process.env.NOTES_AI || "on").trim().toLowerCase() === "off") return res.status(200).json({ disabled: true });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Notes camera not configured" });

  const { image, mediaType, known, unit } = req.body || {};
  if (typeof image !== "string" || image.length < 100 || image.length > 3600000 || !/^image\/(jpeg|png|webp)$/.test(mediaType || "")) {
    return res.status(400).json({ error: "Bad image" });
  }
  const knownList = Array.isArray(known) ? known.slice(0, 250).map((k) => str(k, 60)).filter(Boolean) : [];

  try {
    const used = await redis.incr(`notes-count:${user.slug}:${todayUTC()}`);
    if (used > DAILY_LIMIT) return res.status(429).json({ error: "Daily notes limit reached" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: JSON.stringify({ known: knownList, usualUnit: unit === "kg" ? "kg" : "lbs", today: todayUTC() }) },
        ] }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "Notes request failed" });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    if (!parsed || !Array.isArray(parsed.lines)) return res.status(502).json({ error: "Empty response" });

    const knownLower = new Map(knownList.map((k) => [k.toLowerCase(), k]));
    const lines = parsed.lines.slice(0, 60).map((l) => {
      const weight = num(l.weight, 0, 1500), reps = num(l.reps, 0, 100), sets = num(l.sets, 1, 20);
      const exercise = str(l.exercise, 60);
      if (!exercise || weight === null || reps === null) return null;
      const match = knownLower.get(str(l.match, 60).toLowerCase()) || null;
      return { raw: str(l.raw, 80), exercise: match || exercise, match, weight, reps, sets: sets || 1, warmup: !!l.warmup, sure: l.sure !== false };
    }).filter(Boolean);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : null;
    const u = parsed.unit === "kg" || parsed.unit === "lbs" ? parsed.unit : null;
    return res.status(200).json({ lines, date, unit: u });
  } catch (err) {
    return res.status(500).json({ error: "Notes error" });
  }
}
