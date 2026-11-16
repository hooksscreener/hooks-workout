// Pure data functions behind the Training overview drill-down pages. No React, no browser APIs.
// An entry is { id, workoutId, exercise, weight, sets, reps, date, ... }. Bodyweight lifts arrive already
// converted to body weight plus added (or minus assist) and flagged bw:true, so weight x reps math works.

export const CAT_COLORS_DARK = ["#00d4ff", "#c792ea", "#ffd60a", "#ff6ec7", "#5ee6d0", "#8ab4ff", "#e0c3fc", "#b8b8ff", "#d4e157", "#4dd0e1", "#f48fb1", "#9a8c98"];
export const CAT_COLORS_LIGHT = ["#0077a8", "#7b3fb5", "#8a6f00", "#c2257f", "#0f8f7d", "#2f5fb3", "#6d4a9c", "#4b4bb3", "#6f7a00", "#00838f", "#ad1457", "#6b5d66"];
export const colorAt = (i, light) => (light ? CAT_COLORS_LIGHT : CAT_COLORS_DARK)[i % CAT_COLORS_DARK.length];

const BW_REP_CAP = 30, REP_CAP = 10;
export const e1rmOf = (e) => (e.reps > 0 ? Math.round(e.weight * (1 + Math.min(e.reps, e.bw ? BW_REP_CAP : REP_CAP) / 30)) : e.weight);
export const volOf = (e) => e.weight * (e.sets || 1) * (e.reps > 0 ? e.reps : 0);

const inRange = (d, start, end) => d >= start && d <= end;

// Best set of each day (highest estimated 1RM), oldest first.
export function bestPerDay(list) {
  const by = {};
  list.forEach((e) => { if (!by[e.date] || e1rmOf(e) > e1rmOf(by[e.date])) by[e.date] = e; });
  return Object.keys(by).sort().map((d) => by[d]);
}

// Strength growth per workout category and, inside it, per exercise, for a date range.
// A category's number is the average of its exercises' % change in estimated 1RM (first to last session
// in the range, needs 2+ sessions). Each exercise therefore contributes pct / n points to that average,
// and the contributions add up to the category's number.
export function growthByCategory({ workouts, exercises, entries, start, end }) {
  const byEx = {};
  entries.forEach((e) => { if (inRange(e.date, start, end)) (byEx[e.exercise] = byEx[e.exercise] || []).push(e); });
  return workouts.map((w, wi) => {
    const names = [...new Set(exercises[w.id] || [])];
    const items = names.map((name) => {
      const list = byEx[name] || [];
      const days = bestPerDay(list);
      const volume = list.reduce((s, e) => s + volOf(e), 0);
      const sets = list.reduce((s, e) => s + (e.sets || 1), 0);
      const reps = list.reduce((s, e) => s + (e.sets || 1) * (e.reps > 0 ? e.reps : 0), 0);
      let pct = null, first = null, last = null;
      if (days.length >= 2) {
        first = days[0]; last = days[days.length - 1];
        const a = e1rmOf(first), b = e1rmOf(last);
        pct = a ? ((b - a) / a) * 100 : 0;
      }
      return { name, pct, first, last, sessions: days.length, volume, sets, reps };
    });
    const withData = items.filter((i) => i.pct !== null);
    const n = withData.length;
    withData.forEach((i) => { i.contrib = i.pct / n; });
    const avg = n ? withData.reduce((s, i) => s + i.pct, 0) / n : 0;
    const posSum = withData.reduce((s, i) => s + Math.max(0, i.contrib), 0);
    items.forEach((i) => { i.share = i.pct !== null && i.pct > 0 && posSum > 0 ? i.contrib / posSum : 0; });
    items.sort((a, b) => (b.pct === null ? -Infinity : b.pct) - (a.pct === null ? -Infinity : a.pct));
    return {
      id: w.id, label: w.name, index: wi, value: Math.round(avg), exact: avg, hasData: n > 0, n,
      volume: items.reduce((s, i) => s + i.volume, 0), items,
    };
  });
}

// Plain-language answer to "is the growth one exercise or many?"
export function growthStory(cat) {
  const pos = cat.items.filter((i) => i.pct !== null && i.pct > 0).sort((a, b) => b.share - a.share);
  if (!cat.hasData) return "Not enough sessions in this range yet. An exercise needs two or more days logged.";
  if (!pos.length) return "No exercise in this category has grown in this range.";
  const top = pos[0];
  const pctTxt = Math.round(top.share * 100);
  if (pos.length === 1) return `All of the growth comes from ${top.name}.`;
  if (top.share >= 0.5) return `${top.name} drives ${pctTxt}% of the growth. The other ${pos.length - 1} that grew ${pos.length - 1 === 1 ? "adds" : "add"} the rest.`;
  return `Growth is spread out: ${pos.length} exercises grew and the biggest, ${top.name}, is ${pctTxt}% of it.`;
}

// Which workout (category) an entry belongs to.
export function makeCatOf(workouts, exercises) {
  const ids = new Set(workouts.map((w) => w.id));
  const home = {};
  workouts.forEach((w) => (exercises[w.id] || []).forEach((n) => { if (!home[n]) home[n] = w.id; }));
  return (e) => (ids.has(e.workoutId) ? e.workoutId : home[e.exercise] || "other");
}

// Volume split into weekly (short ranges) or monthly (long ranges) buckets, each broken down by category and exercise.
export function volumeBuckets({ entries, catOf, start, end, weekStartISO, shiftDate }) {
  const spanDays = Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1;
  const monthly = spanDays > 100;
  const keyOf = (d) => (monthly ? d.slice(0, 7) : weekStartISO(d));
  const map = {};
  entries.forEach((e) => {
    if (!inRange(e.date, start, end)) return;
    const k = keyOf(e.date);
    const b = map[k] || (map[k] = { key: k, total: 0, byCat: {}, byEx: {}, byCatEx: {} });
    const v = volOf(e), c = catOf(e);
    b.total += v;
    b.byCat[c] = (b.byCat[c] || 0) + v;
    b.byEx[e.exercise] = (b.byEx[e.exercise] || 0) + v;
    (b.byCatEx[c] = b.byCatEx[c] || {})[e.exercise] = ((b.byCatEx[c] || {})[e.exercise] || 0) + v;
  });
  // Fill empty buckets so gaps in training show as gaps.
  const keys = [];
  if (monthly) {
    let y = +start.slice(0, 4), m = +start.slice(5, 7);
    const ey = +end.slice(0, 4), em = +end.slice(5, 7);
    while (y < ey || (y === ey && m <= em)) { keys.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
  } else {
    let w = weekStartISO(start);
    const last = weekStartISO(end);
    while (w <= last) { keys.push(w); w = shiftDate(w, 7); }
  }
  const MAX = monthly ? 24 : 26;
  const used = keys.slice(-MAX);
  return {
    monthly, truncated: keys.length > MAX,
    buckets: used.map((k) => map[k] || { key: k, total: 0, byCat: {}, byEx: {}, byCatEx: {} }),
  };
}

export function sumBuckets(buckets) {
  const out = { total: 0, byCat: {}, byEx: {}, byCatEx: {} };
  buckets.forEach((b) => {
    out.total += b.total;
    Object.entries(b.byCat).forEach(([c, v]) => { out.byCat[c] = (out.byCat[c] || 0) + v; });
    Object.entries(b.byEx).forEach(([x, v]) => { out.byEx[x] = (out.byEx[x] || 0) + v; });
    Object.entries(b.byCatEx).forEach(([c, m]) => { Object.entries(m).forEach(([x, v]) => { (out.byCatEx[c] = out.byCatEx[c] || {})[x] = (out.byCatEx[c][x] || 0) + v; }); });
  });
  return out;
}

// One record per trained day: categories hit, exercises (sets, reps, volume, best set) and total volume.
export function dayRecords({ entries, catOf, start, end }) {
  const days = {};
  entries.forEach((e) => {
    if (!inRange(e.date, start, end)) return;
    const d = days[e.date] || (days[e.date] = { date: e.date, cats: new Set(), exMap: {}, volume: 0, sets: 0 });
    d.cats.add(catOf(e));
    const x = d.exMap[e.exercise] || (d.exMap[e.exercise] = { name: e.exercise, cat: catOf(e), sets: 0, reps: 0, volume: 0, best: null });
    const s = e.sets || 1;
    x.sets += s; x.reps += s * (e.reps > 0 ? e.reps : 0); x.volume += volOf(e);
    if (!x.best || e1rmOf(e) > e1rmOf(x.best)) x.best = e;
    d.volume += volOf(e); d.sets += s;
  });
  Object.values(days).forEach((d) => { d.exercises = Object.values(d.exMap).sort((a, b) => b.volume - a.volume); delete d.exMap; });
  return days;
}

// Stats for the consistency page.
export function consistencyStats({ days, start, end, weekStartISO, shiftDate, catOf, entries }) {
  const dates = Object.keys(days).sort();
  const spanDays = Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1;
  const weeks = Math.max(1, spanDays / 7);
  const wd = [0, 0, 0, 0, 0, 0, 0]; // Monday first
  dates.forEach((d) => { wd[(new Date(d + "T00:00:00").getDay() + 6) % 7]++; });
  const bestWd = wd.indexOf(Math.max(...wd));
  let longest = 0, run = 0, prev = null;
  dates.forEach((d) => { run = prev && shiftDate(prev, 1) === d ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
  const catDays = {};
  dates.forEach((d) => days[d].cats.forEach((c) => { catDays[c] = (catDays[c] || 0) + 1; }));
  return {
    trained: dates.length, perWeek: dates.length / weeks, longest, bestWeekday: dates.length ? bestWd : null,
    bestWeekdayCount: dates.length ? wd[bestWd] : 0, catDays,
    volume: dates.reduce((s, d) => s + days[d].volume, 0), sets: dates.reduce((s, d) => s + days[d].sets, 0),
  };
}
