// The five profile cards, computed from the person's own logged sets.
import { makeCatOf, e1rmOf } from "./analysis";

const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NA = { value: "n/a", sub: "log a few sessions first" };

export function ownProfileStats({ entries, workouts, exercises, strictBwNames, W, unit }) {
  if (!entries || entries.length === 0) return { favoriteExercise: NA, strongestExercise: NA, leastFavoriteCategory: NA, daysLogged: { value: "0", sub: "days with a logged set" }, favoriteDay: NA };
  const catOf = makeCatOf(workouts, exercises);
  const dates = new Set(), exDays = {}, best = {}, catDays = {};
  workouts.forEach((w) => { catDays[w.id] = new Set(); });
  entries.forEach((e) => {
    dates.add(e.date);
    (exDays[e.exercise] = exDays[e.exercise] || new Set()).add(e.date);
    const c = catOf(e);
    if (catDays[c]) catDays[c].add(e.date);
    if (!(strictBwNames && strictBwNames.has(e.exercise)) && !e.bw && e.weight > 0) {
      const v = e1rmOf(e);
      if (!best[e.exercise] || v > best[e.exercise]) best[e.exercise] = v;
    }
  });
  const total = dates.size;
  const fav = Object.keys(exDays).sort((a, b) => exDays[b].size - exDays[a].size)[0];
  const strong = Object.keys(best).sort((a, b) => best[b] - best[a])[0];
  const wd = [0, 0, 0, 0, 0, 0, 0];
  dates.forEach((d) => { wd[new Date(d + "T00:00:00").getDay()]++; });
  const topWd = wd.indexOf(Math.max(...wd));
  const catIds = workouts.map((w) => w.id);
  const least = catIds.length > 1 ? [...catIds].sort((a, b) => catDays[a].size - catDays[b].size)[0] : null;
  const leastName = least ? (workouts.find((w) => w.id === least) || {}).name : null;
  return {
    favoriteExercise: fav ? { value: fav, sub: `${exDays[fav].size} session${exDays[fav].size === 1 ? "" : "s"}` } : NA,
    strongestExercise: strong ? { value: strong, sub: `${W(best[strong])} ${unit} est. max` } : NA,
    leastFavoriteCategory: leastName ? { value: leastName, sub: `${Math.round((catDays[least].size / total) * 100)}% of days` } : NA,
    daysLogged: { value: String(total), sub: "days with a logged set" },
    favoriteDay: { value: WD[topWd], sub: `${wd[topWd]} of ${total} days` },
  };
}
