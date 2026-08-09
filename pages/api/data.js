import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "hooks-workout-data";

const DEFAULT_WORKOUTS = [
  { id: "push", name: "Push" },
  { id: "pull", name: "Pull" },
  { id: "arms", name: "Arms" },
  { id: "legsA", name: "Legs A" },
  { id: "legsB", name: "Legs B" },
];

const DEFAULT_EXERCISES = {
  push: ["Bench Press", "Incline Barbell Press", "Decline Press / Dips", "Fly Machine", "Barbell Shoulder Press", "Cable Lateral Raise", "Push-Ups", "Dumbbell Bench Press", "Seated Dumbbell Shoulder Press", "Arnold Press", "Close-Grip Bench Press", "Machine Chest Press", "Front Raise", "Diamond Push-Ups"],
  pull: ["Pull-Ups", "Reverse Fly", "Hex Bar Shrugs", "Close-Grip Lat Pulldown", "Seated Cable Rows (V-Bar)", "T-Bar Rows", "Deadlift", "Barbell Rows", "Single-Arm Dumbbell Row", "Chin-Ups", "Face Pulls", "Straight-Arm Pulldown", "Rack Pulls"],
  arms: ["Preacher Curls (BB)", "Individual Cable Curls", "Hammer Preacher Curls", "Skull Crushers", "OH Tricep Extensions", "Rope Pushdown Dropset", "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Concentration Curl", "EZ-Bar Curl", "Cable Curl", "Overhead Cable Tricep Extension"],
  legsA: ["Squats", "Leg Press", "Leg Curls", "Calf Raises", "Romanian Deadlift", "Lunges", "Bulgarian Split Squat", "Hip Thrust", "Standing Calf Raise"],
  legsB: ["Pendulum Squat", "Seated Leg Press", "Leg Extensions", "Sus Machine", "Hack Squat", "Goblet Squat", "Glute Bridge", "Seated Calf Raise"],
};

const DEFAULT_DATA = { workouts: DEFAULT_WORKOUTS, exercises: DEFAULT_EXERCISES, entries: [] };

export default async function handler(req, res) {
  const passcode = req.headers["x-app-passcode"];
  if (!process.env.APP_PASSCODE || passcode !== process.env.APP_PASSCODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const data = await redis.get(KEY);
      return res.status(200).json(data || DEFAULT_DATA);
    }
    if (req.method === "POST") {
      await redis.set(KEY, req.body);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Storage error", detail: String(err) });
  }
}
