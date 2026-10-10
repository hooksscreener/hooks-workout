import { useState, useEffect, useMemo, useRef } from "react";

const LINE_COLORS = ["#ff6600", "#00d4ff", "#ffb000", "#ff3b3b", "#7CFC00", "#c792ea", "#ff6ec7", "#5ee6d0", "#a0d911", "#9a8c98"];

const DEFAULT_WORKOUTS = [
  { id: "push", name: "Push" },
  { id: "pull", name: "Pull" },
  { id: "arms", name: "Arms" },
  { id: "legsA", name: "Legs" },
];
const DEFAULT_EXERCISES = {
  push: ["Bench Press", "Incline Barbell Press", "Decline Press / Dips", "Fly Machine", "Barbell Shoulder Press", "Cable Lateral Raise", "Push-Ups", "Dumbbell Bench Press", "Seated Dumbbell Shoulder Press", "Arnold Press", "Close-Grip Bench Press", "Machine Chest Press", "Front Raise", "Diamond Push-Ups"],
  pull: ["Pull-Ups", "Reverse Fly", "Hex Bar Shrugs", "Close-Grip Lat Pulldown", "Seated Cable Rows (V-Bar)", "T-Bar Rows", "Deadlift", "Barbell Rows", "Single-Arm Dumbbell Row", "Chin-Ups", "Face Pulls", "Straight-Arm Pulldown", "Rack Pulls"],
  arms: ["Preacher Curls (BB)", "Individual Cable Curls", "Hammer Preacher Curls", "Skull Crushers", "OH Tricep Extensions", "Rope Pushdown Dropset", "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Concentration Curl", "EZ-Bar Curl", "Cable Curl", "Overhead Cable Tricep Extension"],
  legsA: ["Squats", "Leg Press", "Leg Curls", "Calf Raises", "Romanian Deadlift", "Lunges", "Bulgarian Split Squat", "Hip Thrust", "Standing Calf Raise", "Pendulum Squat", "Seated Leg Press", "Leg Extensions", "Sus Machine", "Hack Squat", "Goblet Squat", "Glute Bridge", "Seated Calf Raise"],
};
const RANGE_PRESETS = [
  { key: "1m", label: "1M", days: 30 }, { key: "3m", label: "3M", days: 90 }, { key: "6m", label: "6M", days: 182 },
  { key: "ytd", label: "YTD" }, { key: "1y", label: "1Y", days: 365 }, { key: "all", label: "ALL", days: 36500 },
];
const MA_OPTIONS = [
  { key: "30", label: "30D avg", days: 30 }, { key: "90", label: "90D avg", days: 90 },
  { key: "365", label: "1Y avg", days: 365 }, { key: "off", label: "Off", days: 0 },
];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WD = ["S","M","T","W","T","F","S"];
const PASSCODE_KEY = "hooksAppPasscode";

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
// Dates from an earlier year carry a 'yy suffix so "Aug 23" can't be mistaken for this year's.
const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); const yr = +y < new Date().getFullYear() ? ` '${y.slice(2)}` : ""; return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${+d}${yr}`; };
const fmtDateFull = (iso) => { if (iso === todayISO()) return `Today, ${fmtDate(iso)}`; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); };
const shiftDate = (iso, delta) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + delta); return toISO(d); };
const rangeCutoffISO = (key) => {
  if (key === "ytd") return `${new Date().getFullYear()}-01-01`;
  const r = RANGE_PRESETS.find((x) => x.key === key);
  return shiftDate(todayISO(), -(r && r.days ? r.days : 90));
};
// Weeks run Monday to Sunday.
const weekStartISO = (iso) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

function CalendarPopup({ selectedDate, onSelect, onClose }) {
  const initial = new Date(selectedDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const first = new Date(viewYear, viewMonth, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  const changeMonth = (delta) => { let m = viewMonth + delta, y = viewYear; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setViewMonth(m); setViewYear(y); };
  const today = todayISO();

  return (
    <div className="calendar">
      <div className="cal-head">
        <button onClick={() => changeMonth(-1)}>‹</button>
        <div className="month">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <button onClick={() => changeMonth(1)}>›</button>
      </div>
      <div className="cal-grid">
        {WD.map((w, i) => <div key={i} className="cal-wd">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISO(d);
          const cls = "cal-day" + (iso === selectedDate ? " selected" : iso === today ? " today" : "");
          return <button key={i} className={cls} onClick={() => { onSelect(iso); onClose(); }}>{d.getDate()}</button>;
        })}
      </div>
      <button className="cal-today-btn" onClick={() => { onSelect(today); onClose(); }}>Jump to today</button>
    </div>
  );
}

const INK = "var(--ink)";
const CARD_INK = "var(--card)";
// Epley, but reps above 10 count as 10: the formula is only dependable up to about 10 reps, and past
// that it keeps adding ~3% per rep, which reads like a max nobody could actually lift.
const E1RM_REP_CAP = 10;
const estE1RM = (weight, reps) => (reps > 0 ? Math.round(weight * (1 + Math.min(reps, E1RM_REP_CAP) / 30)) : weight);

// The one set that represents a day for an exercise: highest score on the chosen metric, then the
// heavier weight, then more reps (so 225x8 beats 225x6 logged the same day).
const setScore = (e, metric) => (metric === "weight" ? e.weight : estE1RM(e.weight, e.reps));
const pickBest = (cur, e, metric = "e1rm") => {
  if (!cur) return e;
  const a = setScore(e, metric), b = setScore(cur, metric);
  if (a !== b) return a > b ? e : cur;
  if (e.weight !== cur.weight) return e.weight > cur.weight ? e : cur;
  return (e.reps || 0) > (cur.reps || 0) ? e : cur;
};

// Press-and-hold scrubbing for the line charts, the way brokerage apps do it: hold (or drag with a
// mouse) to read any point, let go and the readout disappears. A touch that starts out moving
// mostly vertically is handed back to the page as an ordinary scroll, since the chart itself has
// native touch scrolling switched off so the hold gesture can't be interrupted.
function useHoldScrub(getIndex, onIndex) {
  const mode = useRef(null); // null | "pending" | "scrub" | "scroll"
  const start = useRef({ x: 0, y: 0 });
  const lastY = useRef(0);
  const timer = useRef(null);
  const HOLD_MS = 150, MOVE = 8;
  const apply = (clientX) => { const i = getIndex(clientX); if (i !== null) onIndex(i); };
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const onPointerDown = (e) => {
    if (e.pointerType === "touch") {
      mode.current = "pending";
      start.current = { x: e.clientX, y: e.clientY };
      lastY.current = e.clientY;
      clearTimer();
      timer.current = setTimeout(() => { if (mode.current === "pending") { mode.current = "scrub"; apply(start.current.x); } }, HOLD_MS);
    } else {
      mode.current = "scrub";
      apply(e.clientX);
    }
  };
  const onPointerMove = (e) => {
    if (e.pointerType !== "touch") { if (mode.current === "scrub") apply(e.clientX); return; }
    if (mode.current === "pending") {
      const dx = e.clientX - start.current.x, dy = e.clientY - start.current.y;
      if (Math.abs(dy) > MOVE && Math.abs(dy) > Math.abs(dx)) { mode.current = "scroll"; clearTimer(); }
      else if (Math.abs(dx) > MOVE) { mode.current = "scrub"; clearTimer(); apply(e.clientX); return; }
    }
    if (mode.current === "scroll") { window.scrollBy(0, lastY.current - e.clientY); lastY.current = e.clientY; }
    else if (mode.current === "scrub") apply(e.clientX);
  };
  const end = () => { clearTimer(); if (mode.current === "scrub") onIndex(null); mode.current = null; };
  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onPointerLeave: end };
}
const NO_SELECT = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" };

function SvgChart({ rows, series, mode, metric }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const svgRef = useRef(null);
  const W = 340, H = 210, padL = 34, padR = 14, padT = 10, padB = 24;
  const allVals = [];
  rows.forEach((r) => series.forEach((s) => { if (r[s] !== undefined) allVals.push(r[s]); }));
  const n = rows.length;
  // Points sit where their dates fall, not evenly by session, so a long gap looks like a long gap.
  const day = (r) => new Date(r.date + "T00:00:00").getTime() / 86400000;
  const t0 = n ? day(rows[0]) : 0, t1 = n ? day(rows[n - 1]) : 0, span = t1 - t0;
  const x = (i) => padL + (span === 0 ? (W - padL - padR) / 2 : ((day(rows[i]) - t0) / span) * (W - padL - padR));
  const hasData = allVals.length > 0;
  const min = hasData ? Math.min(...allVals) - 5 : 0, max = hasData ? Math.max(...allVals) + 5 : 1;
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const getIndex = (clientX) => {
    const svg = svgRef.current;
    if (!svg || !n) return null;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0, minDist = Infinity;
    rows.forEach((r, i) => { const d = Math.abs(x(i) - relX); if (d < minDist) { minDist = d; nearest = i; } });
    return nearest;
  };
  const handlers = useHoldScrub(getIndex, setActiveIdx);

  if (!hasData) return <div className="empty">No data</div>;

  const activeRow = activeIdx !== null && rows[activeIdx] ? rows[activeIdx] : null;
  const activeLines = activeRow
    ? series.filter((s) => activeRow[s] !== undefined).map((s) => {
        const colorIdx = series.indexOf(s);
        const detail = mode === "workout" ? (activeRow[`${s}__detail`] || []) : null;
        const suffix = mode === "exercise"
          ? `${activeRow[s]}${metric === "e1rm" ? " e1RM" : " lbs"}${activeRow[`${s}__r`] ? ` · ${activeRow[`${s}__r`]} reps${activeRow[`${s}__s`] > 1 ? ` × ${activeRow[`${s}__s`]}` : ""}` : ""}`
          : `${activeRow[s]}${metric === "e1rm" ? " e1RM" : " lbs"}`;
        return { series: s, color: LINE_COLORS[colorIdx % LINE_COLORS.length], text: `${s}: ${suffix}`, detail };
      })
    : [];

  const boxW = 176, lineH = 12;
  const boxLineCount = activeLines.reduce((n2, l) => n2 + 1 + (l.detail ? l.detail.length : 0), 0);
  const boxH = activeRow ? 20 + boxLineCount * lineH : 0;
  const boxX = activeRow ? Math.min(Math.max(x(activeIdx) - boxW / 2, 2), W - boxW - 2) : 0;
  const boxY = activeRow ? Math.max(padT + 2, 10) : 0;

  // Four evenly spaced date labels along the time axis; the outer two are anchored inward so they
  // can't run into each other or off the edge.
  const ticks = span === 0
    ? [{ pos: 0.5, date: rows[0].date, anchor: "middle" }]
    : [0, 1, 2, 3].map((k) => ({ pos: k / 3, date: toISO(new Date((t0 + (span * k) / 3) * 86400000 + 12 * 3600000)), anchor: k === 0 ? "start" : k === 3 ? "end" : "middle" }));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 230, touchAction: "none", cursor: "crosshair", ...NO_SELECT }}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const yy = padT + t * (H - padT - padB);
        const val = Math.round(max - t * (max - min));
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" /><text x={2} y={yy + 3} fontSize="9" fill="var(--mute)">{val}</text></g>;
      })}
      {series.map((s, si) => {
        const pts = [];
        rows.forEach((r, i) => { if (r[s] !== undefined) pts.push(`${x(i)},${y(r[s])}`); });
        return <polyline key={s} points={pts.join(" ")} fill="none" stroke={LINE_COLORS[si % LINE_COLORS.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {n <= 24 && series.map((s, si) => rows.map((r, i) => r[s] !== undefined && <circle key={`${s}-${i}`} cx={x(i)} cy={y(r[s])} r="2.4" fill={LINE_COLORS[si % LINE_COLORS.length]} />))}
      {ticks.map((tk, i) => <text key={i} x={padL + tk.pos * (W - padL - padR)} y={H - 6} fontSize="9" fill="var(--mute)" textAnchor={tk.anchor}>{fmtDate(tk.date)}</text>)}

      {activeRow && (
        <g>
          <line x1={x(activeIdx)} y1={padT} x2={x(activeIdx)} y2={H - padB} stroke="var(--mute)" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          {activeLines.map((l) => (
            <circle key={l.series} cx={x(activeIdx)} cy={y(activeRow[l.series])} r={5} fill={l.color} stroke={INK} strokeWidth="1.5" />
          ))}
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill={CARD_INK} stroke="var(--border)" />
          <text x={boxX + 8} y={boxY + 14} fontSize="9" fontWeight="700" fill="var(--mute)">{activeRow.label}</text>
          {(() => {
            let lineIdx = 0;
            return activeLines.map((l) => {
              const rowsOut = [];
              rowsOut.push(<text key={`${l.series}-h`} x={boxX + 8} y={boxY + 14 + (++lineIdx) * lineH} fontSize="10" fontWeight="700" fill={l.color}>{l.text}</text>);
              if (l.detail) l.detail.forEach((d, di) => {
                rowsOut.push(<text key={`${l.series}-d${di}`} x={boxX + 14} y={boxY + 14 + (++lineIdx) * lineH} fontSize="9" fontWeight="500" fill="var(--chalk)">{d.exercise}: {d.weight} lbs × {d.reps}{d.sets > 1 ? ` × ${d.sets}` : ""}</text>);
              });
              return rowsOut;
            });
          })()}
        </g>
      )}
    </svg>
  );
}

const roundTo5 = (v) => Math.round(v / 5) * 5;

const REC_LOW = 8, REC_HIGH = 12;
const BEST_REPS_WINDOW_DAYS = 56; // "best reps at this weight" looks back about 8 weeks
const PLATEAU_SETS_NEEDED = 4;    // sets of REC_LOW+ reps at the top weight, across the last 3 sessions

// Estimated strength (weight and reps together) has stayed within 3% across the last 3 sessions.
function plateauFlag(history) {
  const distinctDates = [...new Set(history.map((e) => e.date))].sort().reverse();
  if (distinctDates.length < 3) return false;
  const recent = distinctDates.slice(0, 3).map((d) => {
    const top = history.filter((e) => e.date === d).reduce((best, e) => pickBest(best, e), null);
    return estE1RM(top.weight, top.reps);
  });
  const maxE = Math.max(...recent), minE = Math.min(...recent);
  if (!maxE) return false;
  return (maxE - minE) / maxE <= 0.03;
}

// Works out what to do next time from the logged history (prior sessions only).
//  - Weight goes up when the top set hit 12+ reps, or when strength has been flat for 3 sessions
//    AND at least 4 sets at the top weight had 8+ reps across those sessions (if fewer than 4 sets
//    were logged there, every one of them needs 8+). Otherwise the weight is held.
//  - Held weight gets a rep target built from your BEST reps at that weight in the last ~8 weeks,
//    not just last session, so one off day doesn't lower the bar: from that best up to about +20%.
//  - "reps" mode never raises the weight.
function planNext(hist, mode, todayIso) {
  const ws = hist.filter((e) => e.reps >= 5).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (!ws.length) return null;
  const lastSessionDate = ws[0].date;
  const lastSession = ws.filter((e) => e.date === lastSessionDate).sort((a, b) => b.weight - a.weight || b.reps - a.reps);
  const lastTop = lastSession[0];
  const topW = lastTop.weight;

  const cutoff = shiftDate(todayIso, -BEST_REPS_WINDOW_DAYS);
  const recentAtWeight = ws.filter((e) => e.weight === topW && e.date >= cutoff);
  const bestReps = recentAtWeight.length ? Math.max(...recentAtWeight.map((e) => e.reps)) : lastTop.reps;

  const dates = [...new Set(ws.map((e) => e.date))]; // newest first
  const last3 = dates.slice(0, 3);
  const setsAt = ws.filter((e) => last3.includes(e.date) && e.weight === topW);
  const totalSets = setsAt.reduce((s, e) => s + (e.sets || 1), 0);
  const qualSets = setsAt.filter((e) => e.reps >= REC_LOW).reduce((s, e) => s + (e.sets || 1), 0);
  const enoughRepsAtWeight = totalSets >= PLATEAU_SETS_NEEDED ? qualSets >= PLATEAU_SETS_NEEDED : totalSets > 0 && qualSets === totalSets;

  let streak = 0;
  for (const d of dates) {
    const dayTop = ws.filter((e) => e.date === d).reduce((m, e) => Math.max(m, e.weight), 0);
    if (dayTop === topW) streak++; else break;
  }

  const plateaued = plateauFlag(ws);
  const bumpSize = topW >= 100 ? 10 : 5;
  let nextTopWeight = topW, low, high, note, bumped = false;

  if (mode !== "reps" && lastTop.reps >= REC_HIGH) {
    bumped = true;
    note = `You hit ${lastTop.reps} reps last time (top of the ${REC_LOW}–${REC_HIGH} range). Adding ${bumpSize} lbs; reps reset to ${REC_LOW}–${REC_HIGH}.`;
  } else if (mode !== "reps" && plateaued && enoughRepsAtWeight) {
    bumped = true;
    note = `Strength has been flat for 3 sessions and you've done ${REC_LOW}+ reps on ${totalSets >= PLATEAU_SETS_NEEDED ? `${PLATEAU_SETS_NEEDED}+ sets` : "every set"} at ${topW} lbs. Adding ${bumpSize} lbs; reps reset to ${REC_LOW}–${REC_HIGH}.`;
  }

  if (bumped) {
    nextTopWeight = topW + bumpSize; low = REC_LOW; high = REC_HIGH;
  } else {
    low = bestReps;
    high = Math.max(low + 1, Math.round(low * 1.2));
    if (mode !== "reps") { high = Math.min(high, REC_HIGH); low = Math.min(low, high); }
    const target = low === high ? `${low}` : `${low}–${high}`;
    const lastBit = lastTop.reps < bestReps ? ` (last time ${lastTop.reps})` : "";
    if (mode === "reps") {
      note = `Weight is held on purpose. Your best at ${topW} lbs in the last 8 weeks is ${bestReps} reps${lastBit}. Aim for ${target}.`;
    } else if (plateaued) {
      note = `Strength has been flat for 3 sessions, but you haven't had ${PLATEAU_SETS_NEEDED} sets of ${REC_LOW}+ reps at ${topW} lbs yet, so no weight increase. Your best in the last 8 weeks is ${bestReps} reps${lastBit}. Aim for ${target}.`;
    } else {
      note = `Your best at ${topW} lbs in the last 8 weeks is ${bestReps} reps${lastBit}. Same weight: aim for ${target}.`;
    }
    if (streak >= 6) note += ` Same weight for ${streak} sessions in a row: consider a lighter week or a variation.`;
  }

  // Set-by-set weights follow how you actually spread them last session (3 x 225 stays 225 across
  // the board; a pyramid stays a pyramid). A single logged set falls back to a standard pyramid.
  const expanded = [];
  lastSession.forEach((e) => { for (let i = 0; i < Math.max(1, e.sets || 1); i++) expanded.push(e.weight); });
  const sessionSetsAtTop = lastSession.filter((e) => e.weight === topW).reduce((s, e) => s + (e.sets || 1), 0);
  return {
    lastTop, lastSessionDate, lastSession, nextTopWeight, repLow: low, repHigh: high, note, bumped, bestReps,
    basedOnActualSets: expanded.length >= 2, setWeights: expanded.sort((a, b) => b - a),
    defaultSets: Math.min(8, Math.max(1, sessionSetsAtTop)),
  };
}

// Close-but-not-identical exercise names ("Calf Raise" vs "Calf Raises") are almost always the same
// lift typed twice; names that differ by a number ("Sus Machine 1" / "Sus Machine 2") are not.
const normName = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)).join(" ");
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function findSimilarExercise(name, names) {
  const typed = name.trim();
  if (!typed || names.some((x) => x.toLowerCase() === typed.toLowerCase())) return null;
  const n = normName(typed);
  if (!n) return null;
  for (const x of names) {
    const m = normName(x);
    if (m === n) return x;
    if (n.replace(/[0-9]/g, "") === m.replace(/[0-9]/g, "")) continue;
    if (n.length >= 5 && m.length >= 5 && editDistance(n, m) <= 2) return x;
  }
  return null;
}

// Search that matches any part of a name, any word order: "press" finds Leg Press and Bench Press.
function searchExercises(query, names, limit = 8) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const score = (name) => {
    const l = name.toLowerCase();
    if (!words.every((w) => l.includes(w))) return null;
    if (l.startsWith(words[0])) return 0;
    if (words.every((w) => l.split(/[^a-z0-9]+/).some((t) => t.startsWith(w)))) return 1;
    return 2;
  };
  return names.map((n) => ({ n, s: score(n) })).filter((x) => x.s !== null).sort((a, b) => a.s - b.s || a.n.localeCompare(b.n)).slice(0, limit).map((x) => x.n);
}

// Rest timer defaults: long for heavy compound lifts, shorter for isolation work.
const ACCESSORY_RE = /curl|extension|raise|fly|flye|pushdown|push-down|pressdown|shrug|face pull|calf|kickback|crunch|skull|pullover|pulldown|reverse fly|rope|lateral/i;
const restSecondsFor = (name) => (ACCESSORY_RE.test(name || "") ? 75 : 150);
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.max(0, s) % 60)}`;

const IMPORT_DATA = [
  // Front Squat (legsA)
  { exercise: "Front Squat", workoutId: "legsA", weight: 155, sets: 3, reps: 8, date: "2025-08-04" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 155, sets: 3, reps: 8, date: "2025-09-08" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 165, sets: 3, reps: 8, date: "2025-09-28" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 175, sets: 3, reps: 8, date: "2025-10-09" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 185, sets: 3, reps: 8, date: "2025-10-14" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 195, sets: 3, reps: 8, date: "2025-10-19" },
  { exercise: "Front Squat", workoutId: "legsA", weight: 195, sets: 3, reps: 8, date: "2025-10-27" },
  // Back Squat (legsA)
  { exercise: "Back Squat", workoutId: "legsA", weight: 185, sets: 3, reps: 8, date: "2025-09-08" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 205, sets: 3, reps: 8, date: "2025-09-29" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 205, sets: 3, reps: 8, date: "2025-10-02" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 225, sets: 3, reps: 8, date: "2025-10-14" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 225, sets: 3, reps: 8, date: "2025-10-19" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 230, sets: 3, reps: 8, date: "2025-10-27" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 245, sets: 3, reps: 8, date: "2025-11-13" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 205, sets: 1, reps: 10, date: "2026-01-14" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 205, sets: 1, reps: 10, date: "2026-01-20" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 135, sets: 5, reps: 5, date: "2026-04-10" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 155, sets: 5, reps: 5, date: "2026-04-18" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 175, sets: 5, reps: 5, date: "2026-04-21" },
  { exercise: "Back Squat", workoutId: "legsA", weight: 155, sets: 5, reps: 5, date: "2026-05-15" },
  // Incline Bench (push)
  { exercise: "Incline Bench", workoutId: "push", weight: 155, sets: 3, reps: 8, date: "2025-09-08" },
  { exercise: "Incline Bench", workoutId: "push", weight: 165, sets: 3, reps: 8, date: "2025-09-30" },
  { exercise: "Incline Bench", workoutId: "push", weight: 190, sets: 3, reps: 8, date: "2025-10-02" },
  { exercise: "Incline Bench", workoutId: "push", weight: 200, sets: 3, reps: 8, date: "2025-10-09" },
  { exercise: "Incline Bench", workoutId: "push", weight: 205, sets: 3, reps: 8, date: "2025-10-14" },
  { exercise: "Incline Bench", workoutId: "push", weight: 215, sets: 3, reps: 8, date: "2025-10-24" },
  { exercise: "Incline Bench", workoutId: "push", weight: 225, sets: 1, reps: 2, date: "2026-01-19" },
  // Incline Bench (DB) (push)
  { exercise: "Incline Bench (DB)", workoutId: "push", weight: 65, sets: 3, reps: 8, date: "2025-10-16" },
  { exercise: "Incline Bench (DB)", workoutId: "push", weight: 85, sets: 3, reps: 8, date: "2026-02-02" },
  // Bench Press (push)
  { exercise: "Bench Press", workoutId: "push", weight: 205, sets: 3, reps: 8, date: "2025-09-30" },
  { exercise: "Bench Press", workoutId: "push", weight: 230, sets: 1, reps: 10, date: "2025-10-16" },
  { exercise: "Bench Press", workoutId: "push", weight: 235, sets: 1, reps: 5, date: "2025-10-28" },
  { exercise: "Bench Press", workoutId: "push", weight: 280, sets: 1, reps: 1, date: "2025-11-13" },
  { exercise: "Bench Press", workoutId: "push", weight: 290, sets: 1, reps: 1, date: "2025-12-09" },
  { exercise: "Bench Press", workoutId: "push", weight: 295, sets: 1, reps: 1, date: "2026-02-06" },
  // Lat Pull Downs (pull)
  { exercise: "Lat Pull Downs", workoutId: "pull", weight: 165, sets: 3, reps: 10, date: "2025-09-29" },
  { exercise: "Lat Pull Downs", workoutId: "pull", weight: 165, sets: 3, reps: 10, date: "2025-10-02" },
  // DB Shrugs (pull)
  { exercise: "DB Shrugs", workoutId: "pull", weight: 70, sets: 3, reps: 8, date: "2025-09-29" },
  // Machine Shrugs (pull)
  { exercise: "Machine Shrugs", workoutId: "pull", weight: 140, sets: 3, reps: 8, date: "2025-10-07" },
  { exercise: "Machine Shrugs", workoutId: "pull", weight: 160, sets: 3, reps: 8, date: "2025-11-18" },
  // Skull Crushers (arms)
  { exercise: "Skull Crushers", workoutId: "arms", weight: 70, sets: 3, reps: 8, date: "2025-10-17" },
  { exercise: "Skull Crushers", workoutId: "arms", weight: 80, sets: 3, reps: 8, date: "2025-10-24" },
  // Tricep Pushdowns (arms)
  { exercise: "Tricep Pushdowns", workoutId: "arms", weight: 80, sets: 3, reps: 8, date: "2025-10-17" },
  { exercise: "Tricep Pushdowns", workoutId: "arms", weight: 55, sets: 3, reps: 8, date: "2026-01-24" },
  // Tricep Machine Extensions (arms)
  { exercise: "Tricep Machine Extensions", workoutId: "arms", weight: 70, sets: 1, reps: 12, date: "2026-01-19" },
  // Pec Deck (push)
  { exercise: "Pec Deck", workoutId: "push", weight: 155, sets: 3, reps: 12, date: "2025-10-24" },
  { exercise: "Pec Deck", workoutId: "push", weight: 165, sets: 3, reps: 12, date: "2026-01-11" },
  // Barbell Curl (arms)
  { exercise: "Barbell Curl", workoutId: "arms", weight: 50, sets: 3, reps: 8, date: "2025-11-18" },
  // Hammer Curl (arms)
  { exercise: "Hammer Curl", workoutId: "arms", weight: 32.5, sets: 3, reps: 8, date: "2025-11-18" },
  // Leg Curls (legsA)
  { exercise: "Leg Curls", workoutId: "legsA", weight: 150, sets: 4, reps: 10, date: "2026-01-29" },
  { exercise: "Leg Curls", workoutId: "legsA", weight: 110, sets: 4, reps: 10, date: "2026-04-18" },
  { exercise: "Leg Curls", workoutId: "legsA", weight: 80, sets: 4, reps: 10, date: "2026-07-29" },
  // Dip Machine (push)
  { exercise: "Dip Machine", workoutId: "push", weight: 180, sets: 3, reps: 8, date: "2026-01-24" },
  { exercise: "Dip Machine", workoutId: "push", weight: 175, sets: 3, reps: 8, date: "2026-08-08" },
  // Sus Machine (legs, merged)
  { exercise: "Sus Machine", workoutId: "legsA", weight: 170, sets: 3, reps: 8, date: "2026-02-14" },
  // Dips (Weighted) (push)
  { exercise: "Dips (Weighted)", workoutId: "push", weight: 45, sets: 3, reps: 8, date: "2026-07-14" },
  // Standing Calf Raise (legsA)
  { exercise: "Standing Calf Raise", workoutId: "legsA", weight: 100, sets: 3, reps: 8, date: "2026-07-30" },
];
const IMPORT_SKIPPED = [
  "Zercher Squat — no weight/data logged, nothing to import",
  "OH Press 115 lbs — no date given",
  "Rows 9/29, 10/7, 10/18 (\"long bricks\") — machine plate weight unknown, log manually once you know the lbs",
  "Hammer Curls DB 2/7 — no weight given",
  "Dip Machine 225 lbs — no date given (listed separately from the dated entries)",
  "Leg Extensions 150 lbs — no date given",
];

// Second one-time batch — Incline Bench history from a separate written log. Reps/sets weren't
// recorded for most of these, so per your call: assumed 6 reps x 3 sets for every entry except
// 1/19, which explicitly said "2x".
const INCLINE_IMPORT_DATA = [
  { date: "2025-09-08", workoutId: "push", exercise: "Incline Bench", weight: 155, reps: 6, sets: 3 },
  { date: "2025-09-30", workoutId: "push", exercise: "Incline Bench", weight: 165, reps: 6, sets: 3 },
  { date: "2025-10-02", workoutId: "push", exercise: "Incline Bench", weight: 190, reps: 6, sets: 3 },
  { date: "2025-10-09", workoutId: "push", exercise: "Incline Bench", weight: 200, reps: 6, sets: 3 },
  { date: "2025-10-14", workoutId: "push", exercise: "Incline Bench", weight: 205, reps: 6, sets: 3 },
  { date: "2025-10-16", workoutId: "push", exercise: "Incline Bench (DB)", weight: 65, reps: 6, sets: 3 },
  { date: "2025-10-24", workoutId: "push", exercise: "Incline Bench", weight: 215, reps: 6, sets: 3 },
  { date: "2026-01-19", workoutId: "push", exercise: "Incline Bench", weight: 225, reps: 2, sets: 3 },
  { date: "2026-02-02", workoutId: "push", exercise: "Incline Bench (DB)", weight: 85, reps: 6, sets: 3 },
  { date: "2026-08-08", workoutId: "push", exercise: "Incline Bench", weight: 185, reps: 6, sets: 3 },
];

const NAV_ICON_PROPS = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function IconHome({ color, size }) { return <svg {...NAV_ICON_PROPS} width={size || NAV_ICON_PROPS.width} height={size || NAV_ICON_PROPS.height} stroke={color}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>; }
function IconDumbbell({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color} style={{ transform: "rotate(45deg)" }}><path d="M6 7v10M18 7v10" /><path d="M2 10v4M22 10v4" /><path d="M6 12h12" strokeWidth="3" /></svg>; }
function IconChart({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M7 16l4-5 3 3 5-7" /></svg>; }
function IconBulb({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a6 6 0 00-4 10.5c.7.6 1 1.3 1 2.5h6c0-1.2.3-1.9 1-2.5A6 6 0 0012 2z" /></svg>; }
function IconTarget({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} /></svg>; }
function IconBook({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5v-17z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></svg>; }

function PortfolioChart({ rows, maRows, color, onScrub }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const svgRef = useRef(null);
  const W = 340, H = 170, padL = 4, padR = 4, padT = 10, padB = 4;
  const n = rows.length;
  const vals = rows.map((r) => r.value);
  const maVals = (maRows || []).filter((v) => v !== null && v !== undefined);
  const all = [...vals, ...maVals, 0];
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  const x = (i) => padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : 0);
  const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const getIndex = (clientX) => {
    const svg = svgRef.current;
    if (!svg || n < 2) return null;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    return Math.min(n - 1, Math.max(0, Math.round(((relX - padL) / (W - padL - padR)) * (n - 1))));
  };
  const setActive = (i) => {
    setActiveIndex(i);
    if (onScrub) onScrub(i === null ? null : rows[i]);
  };
  const handlers = useHoldScrub(getIndex, setActive);

  if (n < 2) return <div className="empty">Log more sessions across a few exercises to see this.</div>;

  const pts = rows.map((r, i) => `${x(i)},${y(r.value)}`).join(" ");
  const areaPts = `${x(0)},${H} ${pts} ${x(n - 1)},${H}`;
  const active = activeIndex !== null && rows[activeIndex] ? { x: x(activeIndex), y: y(rows[activeIndex].value) } : null;
  // The moving average is drawn as separate runs so gaps (not enough history yet) stay gaps.
  const maRuns = [];
  if (maRows) {
    let run = [];
    maRows.forEach((v, i) => {
      if (v === null || v === undefined) { if (run.length) maRuns.push(run); run = []; } else run.push(`${x(i)},${y(v)}`);
    });
    if (run.length) maRuns.push(run);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 190, touchAction: "none", cursor: "crosshair", ...NO_SELECT }}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      <defs>
        <pattern id="portfolioDots" patternUnits="userSpaceOnUse" width="3.2" height="3.2">
          <circle cx="1" cy="1" r="0.9" fill={color} />
        </pattern>
        <linearGradient id="portfolioFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="portfolioFadeMask">
          <rect x="0" y="0" width={W} height={H} fill="url(#portfolioFade)" />
        </mask>
        <clipPath id="portfolioAreaClip">
          <polygon points={areaPts} />
        </clipPath>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
        <line key={i} x1={padL} y1={padT + t * (H - padT - padB)} x2={W - padR} y2={padT + t * (H - padT - padB)} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
      ))}
      <g clipPath="url(#portfolioAreaClip)" mask="url(#portfolioFadeMask)">
        <rect x="0" y="0" width={W} height={H} fill="url(#portfolioDots)" />
      </g>
      <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="var(--mute)" strokeWidth="1" strokeDasharray="2,4" opacity="0.7" />
      {maRuns.map((run, i) => (
        <polyline key={i} points={run.join(" ")} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="1,3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {active && (
        <g>
          <line x1={active.x} y1={padT} x2={active.x} y2={H} stroke={color} strokeWidth="1" opacity="0.35" strokeDasharray="3,3" />
          <circle cx={active.x} cy={active.y} r={6} fill={color} stroke="var(--ink)" strokeWidth="2" />
          <circle cx={active.x} cy={active.y} r={10} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

function RadarChart({ data, rangeLabel, onTap }) {
  // data: [{ label, value, hasData }] — value is % growth, can be negative
  const W = 320, H = 260, cx = 160, cy = 130, outerR = 90;
  const n = data.length;
  const vals = data.map((d) => d.value);
  const minVal = Math.min(0, ...vals);
  const maxVal = Math.max(...vals, 5);
  const radius = (v) => ((v - minVal) / (maxVal - minVal || 1)) * outerR;
  const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  const ringLevels = [0.25, 0.5, 0.75, 1];
  const dataPts = data.map((d, i) => pt(i, radius(d.value)));
  const dataPath = dataPts.map((p) => p.join(",")).join(" ");
  const zeroR = radius(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 260, cursor: "pointer" }} onClick={onTap}>
      {ringLevels.map((lvl, ri) => {
        const ringPts = data.map((_, i) => pt(i, outerR * lvl).join(",")).join(" ");
        return <polygon key={ri} points={ringPts} fill="none" stroke="var(--border)" strokeWidth="1" />;
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, outerR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />;
      })}
      {zeroR > 0 && zeroR < outerR && (
        <polygon points={data.map((_, i) => pt(i, zeroR).join(",")).join(" ")} fill="none" stroke="var(--mute)" strokeWidth="1" strokeDasharray="3,3" />
      )}
      <polygon points={dataPath} fill="var(--iron)" fillOpacity="0.2" stroke="var(--iron)" strokeWidth="2" strokeLinejoin="round" />
      {dataPts.map(([x, y], i) => (
        data[i].hasData
          ? <circle key={i} cx={x} cy={y} r="3.5" fill="var(--iron)" />
          : <circle key={i} cx={x} cy={y} r="4" fill="var(--ink)" stroke="var(--mute)" strokeWidth="1.5" strokeDasharray="2,2" />
      ))}
      {data.map((d, i) => {
        const [lx, ly] = pt(i, outerR + 22);
        return <text key={i} x={lx} y={ly} fontSize="10" fontWeight="700" fill="var(--chalk)" textAnchor="middle" dominantBaseline="central">{d.label}</text>;
      })}
    </svg>
  );
}

function VolumeBarChart({ weeks, onTapBar }) {
  const W = 340, H = 190, padL = 34, padR = 8, padT = 10, padB = 22;
  const max = Math.max(...weeks.map((w) => w.volume), 1);
  const n = weeks.length;
  const bw = (W - padL - padR) / n - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }}>
      {[0.25, 0.5, 0.75, 1].map((t, i) => {
        const yy = padT + (1 - t) * (H - padT - padB);
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" opacity="0.5" /><text x={2} y={yy + 3} fontSize="8" fill="var(--mute)">{Math.round((max * t) / 1000)}k</text></g>;
      })}
      {weeks.map((w, i) => {
        const h = (w.volume / max) * (H - padT - padB);
        const x = padL + i * ((W - padL - padR) / n) + 3;
        return <g key={i} onClick={() => onTapBar && onTapBar(w)} style={{ cursor: "pointer" }}>
          <rect x={x - 2} y={padT} width={bw + 4} height={H - padT - padB} fill="transparent" />
          <rect x={x} y={H - padB - h} width={bw} height={h} rx="3" fill={w.isCurrent ? "#1d5f8a" : "var(--iron)"} />
          <text x={x + bw / 2} y={H - 6} fontSize="8" fill="var(--mute)" textAnchor="middle">{w.label}</text>
        </g>;
      })}
    </svg>
  );
}

function ConsistencyHeatmap({ weeks, onTap }) {
  // weeks: [[{date, count, future}, ...7 days Monday to Sunday], ...]
  const cell = 20, gap = 4;
  const W = weeks.length * (cell + gap);
  const H = 7 * (cell + gap);
  const colorFor = (count) => (count === 0 ? "var(--border)" : count === 1 ? "#7a3a10" : count === 2 ? "#b5540f" : "var(--iron)");
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} style={{ width: "100%", height: 220, cursor: "pointer" }} onClick={onTap}>
      {weeks.map((week, wi) => week.map((day, di) => (
        <rect key={`${wi}-${di}`} x={wi * (cell + gap)} y={di * (cell + gap)} width={cell} height={cell} rx="4" fill={day.future ? "none" : colorFor(day.count)} stroke={day.future ? "var(--border)" : "none"} strokeDasharray={day.future ? "2,3" : undefined} />
      )))}
    </svg>
  );
}

// Background: a field of tiny, evenly spaced microdots (the same 16px grid and 1px dots as ever)
// that is PURE BLACK at rest. Every so often a soft, bell-shaped wave crosses the screen on a
// ~45deg diagonal; the dots it passes through emerge from the black, rise a touch, then sink back
// into it. Viewed straight down from above: nothing glows, and nothing is drawn between the dots.
function DotField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // no canvas support: fall back to a plain black background
    const GRID = 16, BASE_RADIUS = 1;
    // Tuned by eye in a real browser. A dot's colour scales from black (wave far away) up to this
    // at the crest: a warm amber that stays tiny and discrete, never neon.
    const CREST = [141, 106, 53];
    const PEAK_RADIUS = 0.45;        // px a dot grows at the crest (1px -> 1.45px)
    const PEAK_SHIFT = 0.7;          // px dots are nudged along the slopes (reads as height)
    let w = 0, h = 0, dpr = 1, wave = null, raf = 0, timer = 0;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Adding ?wave to the address runs a wave every ~9s so you can check it on demand (it also
    // ignores the device's Reduce Motion setting, so you can tell whether that's what's hiding it).
    const preview = /[?&]wave(=|&|$)/.test(window.location.search);
    const canAnimate = preview || !reduced;

    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!wave) return;                                   // at rest: pure black, nothing drawn
      const u = Math.max(0, (now - wave.start) / wave.duration);
      if (u >= 1) { wave = null; return; }                 // wave has passed: back to pure black
      const e = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1;
      const amp = e * e * (3 - 2 * e);
      const t = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
      const crest = wave.from + (wave.to - wave.from) * t;
      const cols = Math.ceil(w / GRID), rows = Math.ceil(h / GRID);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const gx = i * GRID + GRID / 2, gy = j * GRID + GRID / 2;
          const d = (gx * wave.dx + gy * wave.dy - crest) / wave.sigma;
          const ht = amp * Math.exp(-0.5 * d * d);
          if (ht < 0.02) continue;                         // still black: nothing to draw
          const slope = -d * ht;
          const x = gx + wave.dx * slope * PEAK_SHIFT * 1.65;
          const y = gy + wave.dy * slope * PEAK_SHIFT * 1.65;
          ctx.fillStyle = `rgb(${Math.round(CREST[0] * ht)},${Math.round(CREST[1] * ht)},${Math.round(CREST[2] * ht)})`;
          ctx.beginPath();
          ctx.arc(x, y, BASE_RADIUS + PEAK_RADIUS * ht, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      draw(performance.now());
    };

    const startWave = () => {
      if (wave || !canAnimate) return;
      const main = Math.random() < 0.7;
      const theta = ((main ? 45 : 135) + (Math.random() * 24 - 12)) * Math.PI / 180;
      const dx = Math.cos(theta), dy = Math.sin(theta);
      const proj = [[0, 0], [w, 0], [0, h], [w, h]].map(([px, py]) => px * dx + py * dy);
      const sigma = 70 + Math.random() * 50;
      wave = { start: performance.now(), duration: 2800 + Math.random() * 1300, dx, dy, sigma, from: Math.min(...proj) - 2.6 * sigma, to: Math.max(...proj) + 2.6 * sigma };
      raf = requestAnimationFrame(draw);
    };
    const schedule = (first) => {
      // First wave shortly after opening (so you know it works), then every 90-180s, irregularly.
      const delay = preview ? (first ? 2000 : 9000) : first ? 8000 + Math.random() * 6000 : 90000 + Math.random() * 90000;
      timer = setTimeout(() => { if (!document.hidden) startWave(); schedule(false); }, delay);
    };

    resize();
    window.addEventListener("resize", resize);
    if (canAnimate) schedule(true);
    return () => { window.removeEventListener("resize", resize); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={canvasRef} className="dot-field" aria-hidden="true" />;
}

export default function Home() {
  const [passcode, setPasscode] = useState(null);
  const [passInput, setPassInput] = useState("");
  const [authError, setAuthError] = useState(null);

  const [loaded, setLoaded] = useState(false);
  const [workouts, setWorkouts] = useState(DEFAULT_WORKOUTS);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [entries, setEntries] = useState([]);
  const [restDays, setRestDays] = useState([]);
  const [progressionMode, setProgressionMode] = useState("weight"); // "weight" | "reps"
  const [saveError, setSaveError] = useState(null);

  const [activeWorkoutId, setActiveWorkoutId] = useState("push");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [showWorkoutMenu, setShowWorkoutMenu] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");

  const [form, setForm] = useState({ exercise: "", weight: "", sets: "", reps: "", isWarmup: false });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const draftsRef = useRef({});                 // each exercise's weight / sets / reps while you move between lifts
  const [recentExercises, setRecentExercises] = useState([]); // exercises logged this visit, newest first (for the swap button)
  const [dupPrompt, setDupPrompt] = useState(null); // { typed, existing } when a new name looks like an existing one
  const [restTimer, setRestTimer] = useState(null); // { total, endsAt, exercise }
  const [restNow, setRestNow] = useState(Date.now());

  const [chartFocusExercise, setChartFocusExercise] = useState(null);
  const [chartRange, setChartRange] = useState("3m");
  const [chartMetric, setChartMetric] = useState("weight");

  // load saved passcode from this browser
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(PASSCODE_KEY) : null;
    setPasscode(saved || "");
  }, []);

  const loadData = async (code) => {
    try {
      const res = await fetch("/api/data", { headers: { "x-app-passcode": code } });
      if (res.status === 401) {
        setAuthError("Wrong passcode.");
        localStorage.removeItem(PASSCODE_KEY);
        setPasscode("");
        return;
      }
      const data = await res.json();
      let nextWorkouts = data.workouts || DEFAULT_WORKOUTS;
      let nextExercises = data.exercises || DEFAULT_EXERCISES;
      let nextEntries = data.entries || [];
      const nextRestDays = data.restDays || [];
      const nextProgressionMode = data.progressionMode || "weight";

      // One-time migration: merge the old Legs A / Legs B split into a single "Legs" workout.
      const hasLegsB = nextWorkouts.some((w) => w.id === "legsB");
      if (hasLegsB) {
        nextWorkouts = nextWorkouts
          .filter((w) => w.id !== "legsB")
          .map((w) => (w.id === "legsA" ? { ...w, name: "Legs" } : w));
        const mergedList = [...(nextExercises.legsA || []), ...(nextExercises.legsB || [])];
        const deduped = [];
        mergedList.forEach((ex) => { if (!deduped.some((d) => d.toLowerCase() === ex.toLowerCase())) deduped.push(ex); });
        nextExercises = { ...nextExercises, legsA: deduped };
        delete nextExercises.legsB;
        nextEntries = nextEntries.map((e) => (e.workoutId === "legsB" ? { ...e, workoutId: "legsA" } : e));
        if (activeWorkoutId === "legsB") setActiveWorkoutId("legsA");
        // Save the merge immediately so it only ever needs to run once.
        persist({ workouts: nextWorkouts, exercises: nextExercises, entries: nextEntries, restDays: nextRestDays, progressionMode: nextProgressionMode });
      }

      setWorkouts(nextWorkouts);
      setExercises(nextExercises);
      setEntries(nextEntries);
      setRestDays(nextRestDays);
      setProgressionMode(nextProgressionMode);
      setLoaded(true);
      setAuthError(null);
    } catch {
      setAuthError("Couldn't reach the server — check your connection.");
    }
  };

  useEffect(() => { if (passcode) loadData(passcode); }, [passcode]);

  // Quick-log entry point: a Home Screen bookmark or iOS Shortcut pointed at
  // ?quicklog=Exercise+Name jumps straight to the log form with that exercise pre-filled.
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const ql = params.get("quicklog");
    if (ql) {
      const home = findExerciseHome(ql);
      if (home) setActiveWorkoutId(home);
      const known = allExerciseNames.find((n) => n.toLowerCase() === ql.toLowerCase());
      if (known) selectExercise(known); else setForm((f) => ({ ...f, exercise: ql }));
      scrollToSection("home");
    }
  }, [loaded]);

  const submitPasscode = () => {
    if (!passInput.trim()) return;
    localStorage.setItem(PASSCODE_KEY, passInput.trim());
    setPasscode(passInput.trim());
  };

  const persist = async (next) => {
    const payload = {
      ...next,
      restDays: next.restDays !== undefined ? next.restDays : restDays,
      progressionMode: next.progressionMode !== undefined ? next.progressionMode : progressionMode,
    };
    setWorkouts(payload.workouts); setExercises(payload.exercises); setEntries(payload.entries); setRestDays(payload.restDays); setProgressionMode(payload.progressionMode);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json", "x-app-passcode": passcode }, body: JSON.stringify(payload) });
      setSaveError(res.ok ? null : "Couldn't save — try again.");
    } catch { setSaveError("Couldn't save — check your connection."); }
  };

  const setProgressionModeAndSave = (mode) => {
    persist({ workouts, exercises, entries, restDays, progressionMode: mode });
  };

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || workouts[0];
  const activeList = exercises[activeWorkoutId] || [];

  const allExerciseNames = useMemo(() => {
    const set = new Set();
    Object.values(exercises).forEach((list) => list.forEach((e) => set.add(e)));
    entries.forEach((e) => set.add(e.exercise));
    return Array.from(set).sort();
  }, [exercises, entries]);

  // Matches any part of a name, in any word order. With nothing typed yet it offers the lifts you
  // used most recently, which is what you want when you're alternating between two exercises.
  const suggestions = useMemo(() => {
    const q = form.exercise.trim();
    if (!q) return [...recentExercises, ...allExerciseNames.filter((n) => !recentExercises.includes(n))].slice(0, 6);
    if (allExerciseNames.some((n) => n.toLowerCase() === q.toLowerCase())) return [];
    return searchExercises(q, allExerciseNames, 8);
  }, [form.exercise, allExerciseNames, recentExercises]);

  const createWorkout = () => {
    const name = newWorkoutName.trim();
    if (!name) return;
    const id = `w-${Date.now()}`;
    persist({ workouts: [...workouts, { id, name }], exercises: { ...exercises, [id]: [] }, entries });
    setActiveWorkoutId(id); setNewWorkoutName(""); setShowWorkoutMenu(false);
  };

  // Adding a name that looks like one you already have ("Calf Raise" vs "Calf Raises") asks first.
  const addExerciseToList = (name, workoutId = activeWorkoutId, force = false) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const list = exercises[workoutId] || [];
    if (list.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return true;
    if (!force) {
      const similar = findSimilarExercise(trimmed, allExerciseNames);
      if (similar) { setDupPrompt({ typed: trimmed, existing: similar, kind: "add" }); return false; }
    }
    persist({ workouts, exercises: { ...exercises, [workoutId]: [...list, trimmed] }, entries });
    return true;
  };

  // Which workout an exercise "lives in" is decided by where it's already listed, not by
  // whichever tab happens to be open — so logging a Squat always files as Legs regardless
  // of what you were last looking at.
  const findExerciseHome = (name) => {
    const lower = name.toLowerCase();
    for (const w of workouts) {
      if ((exercises[w.id] || []).some((e) => e.toLowerCase() === lower)) return w.id;
    }
    return null;
  };

  const entriesByExercise = useMemo(() => {
    const map = {};
    for (const e of entries) (map[e.exercise] = map[e.exercise] || []).push(e);
    Object.values(map).forEach((l) => l.sort((a, b) => (a.date < b.date ? 1 : -1)));
    return map;
  }, [entries]);

  // Warm-up sets are real reps, but they're not a signal of strength: every recommendation, chart,
  // and "best lift" calculation ignores them so a light warm-up never gets mistaken for a top set.
  const strengthEntries = useMemo(() => entries.filter((e) => !e.isWarmup), [entries]);
  const entriesByExerciseStrength = useMemo(() => {
    const map = {};
    for (const e of strengthEntries) (map[e.exercise] = map[e.exercise] || []).push(e);
    Object.values(map).forEach((l) => l.sort((a, b) => (a.date < b.date ? 1 : -1)));
    return map;
  }, [strengthEntries]);

  const todaysEntries = entries.filter((e) => e.date === selectedDate);

  // ---- Recommendation for one exercise ------------------------------------------------------------
  // Sets you're logging right now never change what's recommended for the rest of today's session;
  // only completed earlier sessions count. Once today becomes "yesterday" it becomes the new basis.
  const buildRecommendation = (name, setCount, mWeight, mReps) => {
    if (!name) return null;
    const fullHist = entriesByExerciseStrength[name];
    const priorHist = fullHist ? fullHist.filter((e) => e.date < todayISO()) : fullHist;
    const hist = priorHist && priorHist.length ? priorHist : fullHist;
    const hasManual = mWeight && mReps;
    if ((!hist || !hist.length) && !hasManual) return { noData: true };

    let nextTopWeight, note, lastTop, lastSessionDate, basedOnActualSets = false, setWeights = null;
    let repLow = REC_LOW, repHigh = REC_HIGH, defaultSets = 3, fromManual = false;
    const plan = hist && hist.length ? planNext(hist, progressionMode, todayISO()) : null;

    if (plan) {
      ({ nextTopWeight, note, lastTop, lastSessionDate, basedOnActualSets, setWeights, repLow, repHigh, defaultSets } = plan);
    } else if (hist && hist.length) {
      // Only heavy low-rep attempts on record: back-calculate a weight for an 8-rep set from the
      // best estimated max instead of prescribing the max itself.
      const bestEntry = hist.reduce((best, e) => (estE1RM(e.weight, e.reps) > estE1RM(best.weight, best.reps) ? e : best), hist[0]);
      const e1rm = estE1RM(bestEntry.weight, bestEntry.reps);
      nextTopWeight = roundTo5(e1rm / (1 + REC_LOW / 30));
      lastTop = bestEntry;
      lastSessionDate = bestEntry.date;
      note = `Only low-rep attempts logged so far (best: ${bestEntry.weight} lbs × ${bestEntry.reps}), so this weight is back-calculated from your estimated max. Treat it as a first guess and adjust by feel.`;
    } else {
      const w = Number(mWeight), r = Number(mReps);
      nextTopWeight = roundTo5(estE1RM(w, r) / (1 + REC_LOW / 30));
      lastTop = { weight: w, reps: r };
      lastSessionDate = null;
      fromManual = true;
      note = `Based on the strongest set you entered (${w} lbs × ${r}). There's no logged history yet, so this is a first estimate.`;
    }

    const pcts = basedOnActualSets && setWeights && setWeights[0] ? setWeights.map((w) => w / setWeights[0]) : [1, 0.9, 0.85, 0.8, 0.75, 0.7];
    const rows = Array.from({ length: setCount }, (_, i) => {
      const pct = pcts[i] !== undefined ? pcts[i] : pcts[pcts.length - 1];
      return { set: i + 1, weight: Math.round((nextTopWeight * pct) / 5) * 5 };
    });
    return { noData: false, lastTop, lastSessionDate, nextTopWeight, note, rows, repLow, repHigh, basedOnActualSets, fromManual, defaultSets };
  };

  const prefillFor = (name) => {
    const rec = buildRecommendation(name, 1, "", "");
    if (!rec || rec.noData) return { weight: "", sets: "", reps: "" };
    return { weight: String(rec.nextTopWeight), sets: String(rec.defaultSets), reps: String(rec.repLow) };
  };

  const [recExercise, setRecExercise] = useState(null);
  const [manualWeight, setManualWeight] = useState("");
  const [manualReps, setManualReps] = useState("");
  const recSetCount = Math.min(8, Math.max(1, Number(form.sets) || 3));
  const recommendation = useMemo(
    () => buildRecommendation(recExercise, recSetCount, manualWeight, manualReps),
    [recExercise, recSetCount, entriesByExerciseStrength, manualWeight, manualReps, progressionMode]
  );

  // Picking an exercise (from the list, the search box or the swap button) stashes whatever is in
  // the weight / sets / reps boxes for the one you're leaving and restores them when you come back,
  // so supersetting two lifts never means retyping. A lift with no stash yet is pre-filled from its
  // recommendation.
  const selectExercise = (name) => {
    const cur = form.exercise.trim();
    if (cur && cur !== name) draftsRef.current[cur] = { weight: form.weight, sets: form.sets, reps: form.reps };
    const draft = draftsRef.current[name] || prefillFor(name);
    setForm({ exercise: name, weight: draft.weight, sets: draft.sets, reps: draft.reps, isWarmup: false });
    setRecExercise(name);
    setManualWeight(""); setManualReps("");
    setShowSuggestions(false);
    setDupPrompt(null);
    setRecentExercises((r) => [name, ...r.filter((n) => n !== name)].slice(0, 8));
  };
  const swapTarget = recentExercises.find((n) => n !== form.exercise.trim()) || null;

  const startRest = (name) => {
    const total = restSecondsFor(name);
    setRestTimer({ total, endsAt: Date.now() + total * 1000, exercise: name, done: false });
  };
  useEffect(() => {
    if (!restTimer) return undefined;
    setRestNow(Date.now());
    const id = setInterval(() => setRestNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [restTimer && restTimer.endsAt]);
  const restRemaining = restTimer ? Math.ceil((restTimer.endsAt - restNow) / 1000) : 0;
  useEffect(() => {
    if (!restTimer) return;
    if (restRemaining <= 0 && !restTimer.done) {
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (err) { /* not supported */ }
      setRestTimer((t) => (t ? { ...t, done: true } : t));
    }
    if (restRemaining <= -45) setRestTimer(null);
  }, [restRemaining]);
  const nudgeRest = (secs) => setRestTimer((t) => (t ? { ...t, endsAt: t.endsAt + secs * 1000, total: Math.max(15, t.total + secs), done: false } : t));

  // ---- Logging -------------------------------------------------------------------------------------
  const submitSet = (nameOverride, skipDupCheck) => {
    const exerciseName = (nameOverride || form.exercise).trim();
    if (!exerciseName || !form.weight) return;
    if (!skipDupCheck) {
      const similar = findSimilarExercise(exerciseName, allExerciseNames);
      if (similar) { setDupPrompt({ typed: exerciseName, existing: similar, kind: "log" }); return; }
    }
    const homeWorkoutId = findExerciseHome(exerciseName) || activeWorkoutId;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workoutId: homeWorkoutId, exercise: exerciseName, weight: Number(form.weight), sets: form.sets ? Number(form.sets) : 1, reps: form.reps ? Number(form.reps) : 0, date: selectedDate, isWarmup: !!form.isWarmup };
    const list = exercises[homeWorkoutId] || [];
    const nextExercises = list.some((e) => e.toLowerCase() === exerciseName.toLowerCase()) ? exercises : { ...exercises, [homeWorkoutId]: [...list, exerciseName] };
    persist({ workouts, exercises: nextExercises, entries: [entry, ...entries] });
    draftsRef.current[exerciseName] = { weight: form.weight, sets: form.sets, reps: form.reps };
    setRecentExercises((r) => [exerciseName, ...r.filter((n) => n !== exerciseName)].slice(0, 8));
    if (!form.isWarmup) startRest(exerciseName);
    setForm((f) => ({ ...f, exercise: exerciseName, isWarmup: false }));
    if (allExerciseNames.some((n) => n.toLowerCase() === exerciseName.toLowerCase()) || nextExercises !== exercises) setRecExercise(exerciseName);
    setShowSuggestions(false);
    setDupPrompt(null);
  };

  const bumpForm = (key, delta) => setForm((f) => {
    const cur = parseFloat(f[key]);
    const next = Math.max(0, Math.round(((isNaN(cur) ? 0 : cur) + delta) * 100) / 100);
    return { ...f, [key]: String(next) };
  });

  const clearForm = () => { setForm({ exercise: "", weight: "", sets: "", reps: "", isWarmup: false }); setRecExercise(null); setManualWeight(""); setManualReps(""); setShowSuggestions(false); setDupPrompt(null); };

  const deleteEntry = (id) => persist({ workouts, exercises, entries: entries.filter((e) => e.id !== id) });
  const toggleWarmup = (id) => persist({ workouts, exercises, entries: entries.map((e) => (e.id === id ? { ...e, isWarmup: !e.isWarmup } : e)) });

  const [editingId, setEditingId] = useState(null);
  const [showTodaysLog, setShowTodaysLog] = useState(false);
  const [editForm, setEditForm] = useState({ weight: "", reps: "", sets: "" });
  const startEdit = (entry) => { setEditingId(entry.id); setEditForm({ weight: String(entry.weight), reps: String(entry.reps), sets: String(entry.sets) }); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (id) => {
    if (!editForm.weight) return;
    persist({
      workouts, exercises,
      entries: entries.map((e) => (e.id === id
        ? { ...e, weight: Number(editForm.weight), reps: editForm.reps ? Number(editForm.reps) : 0, sets: editForm.sets ? Number(editForm.sets) : 1 }
        : e)),
    });
    setEditingId(null);
  };


  // ---- Merge / delete an exercise (Progress section) ----------------------------------------------
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeUndo, setMergeUndo] = useState(null);
  const [historyAll, setHistoryAll] = useState(false);
  const mergeExercise = (from, to) => {
    if (!from || !to || from === to) return;
    const snapshot = { workouts, exercises, entries };
    const toHome = findExerciseHome(to);
    const nextEntries = entries.map((e) => (e.exercise === from ? { ...e, exercise: to, workoutId: toHome || e.workoutId } : e));
    const nextExercises = {};
    Object.keys(exercises).forEach((w) => { nextExercises[w] = exercises[w].filter((n) => n.toLowerCase() !== from.toLowerCase()); });
    if (!toHome) {
      const wid = (entries.find((e) => e.exercise === from) || {}).workoutId || activeWorkoutId;
      nextExercises[wid] = [...(nextExercises[wid] || []), to];
    }
    persist({ workouts, exercises: nextExercises, entries: nextEntries });
    setMergeUndo({ snapshot, from, to });
    setChartFocusExercise(to);
    setMergeOpen(false); setMergeTarget("");
  };
  const undoMerge = () => {
    if (!mergeUndo) return;
    persist(mergeUndo.snapshot);
    setChartFocusExercise(mergeUndo.from);
    setMergeUndo(null);
  };
  const deleteExercise = (name) => {
    const count = (entriesByExercise[name] || []).length;
    if (!confirm(`Delete "${name}" and all ${count} logged set${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    const nextExercises = {};
    Object.keys(exercises).forEach((w) => { nextExercises[w] = exercises[w].filter((n) => n.toLowerCase() !== name.toLowerCase()); });
    persist({ workouts, exercises: nextExercises, entries: entries.filter((e) => e.exercise !== name) });
    setChartFocusExercise(null);
    if (recExercise === name) setRecExercise(null);
  };

  // ---- Overall-section data -------------------------------------------------------------------------
  const [portfolioRange, setPortfolioRange] = useState("3m");
  const [maKey, setMaKey] = useState("30");
  const [scrubPoint, setScrubPoint] = useState(null);

  const radarData = useMemo(() => {
    return workouts.map((w) => {
      const exList = exercises[w.id] || [];
      const perExercise = exList.map((ex) => {
        const hist = entriesByExerciseStrength[ex] || [];
        const byDate = {};
        hist.forEach((e) => { byDate[e.date] = pickBest(byDate[e.date], e); });
        const dates = Object.keys(byDate).sort();
        if (dates.length < 2) return null;
        const first = estE1RM(byDate[dates[0]].weight, byDate[dates[0]].reps);
        const last = estE1RM(byDate[dates[dates.length - 1]].weight, byDate[dates[dates.length - 1]].reps);
        return first ? ((last - first) / first) * 100 : 0;
      }).filter((v) => v !== null);
      const avg = perExercise.length ? Math.round(perExercise.reduce((a, b) => a + b, 0) / perExercise.length) : 0;
      return { label: w.name, value: avg, hasData: perExercise.length > 0 };
    });
  }, [workouts, exercises, entriesByExerciseStrength]);

  // Calendar weeks, Monday to Sunday, warm-ups excluded. The current week is "so far".
  const weeklyVolume = useMemo(() => {
    const numWeeks = 10;
    const thisWeek = weekStartISO(todayISO());
    const weeks = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const start = shiftDate(thisWeek, -i * 7);
      const end = shiftDate(start, 6);
      const vol = strengthEntries.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.weight * (e.sets || 1) * e.reps, 0);
      const [, m, d] = start.split("-");
      weeks.push({ label: `${+m}/${+d}`, volume: vol, start, end, isCurrent: i === 0 });
    }
    return weeks;
  }, [strengthEntries]);

  const heatmapWeeks = useMemo(() => {
    const numWeeks = 10;
    const today = todayISO();
    const thisWeek = weekStartISO(today);
    const countByDate = {};
    strengthEntries.forEach((e) => { countByDate[e.date] = (countByDate[e.date] || 0) + 1; });
    const weeks = [];
    for (let w = numWeeks - 1; w >= 0; w--) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = shiftDate(thisWeek, -w * 7 + d);
        week.push({ date, count: Math.min(countByDate[date] || 0, 3), future: date > today });
      }
      weeks.push(week);
    }
    return weeks;
  }, [strengthEntries]);

  const allTimeRange = useMemo(() => {
    if (!entries.length) return null;
    const dates = entries.map((e) => e.date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [entries]);

  const [radarInfoOpen, setRadarInfoOpen] = useState(false);
  const [volumeTapInfo, setVolumeTapInfo] = useState(null);
  const [heatmapInfoOpen, setHeatmapInfoOpen] = useState(false);

  // Insights: tap to move to the next one. They also advance on their own every 45s, and a tap
  // restarts that clock (the timer resets whenever the index changes).
  const [insightIndex, setInsightIndex] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setInsightIndex((i) => i + 1), 45000);
    return () => clearTimeout(t);
  }, [insightIndex]);

  useEffect(() => {
    if (!loaded || chartFocusExercise || !entries.length) return;
    const latest = entries.reduce((a, b) => (b.date > a.date ? b : a), entries[0]);
    if (latest) setChartFocusExercise(latest.exercise);
  }, [loaded, entries, chartFocusExercise]);

  // Everything lives on one continuously scrolling page; the bottom nav just scrolls to a section.
  const sectionRefs = useRef({});
  const scrollToSection = (key) => { sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const [activeSection, setActiveSection] = useState("portfolio");
  const [dockVisible, setDockVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const keys = Object.keys(sectionRefs.current);
      let closest = null, closestDist = Infinity;
      keys.forEach((k) => {
        const el = sectionRefs.current[k];
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().top - 80);
        if (dist < closestDist) { closestDist = dist; closest = k; }
      });
      if (closest) setActiveSection(closest);
      // The docked Log button shows while the Workout section is on screen.
      const home = sectionRefs.current.home;
      if (home) {
        const r = home.getBoundingClientRect();
        setDockVisible(r.top < window.innerHeight - 220 && r.bottom > 260);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [loaded]);

  // The docked Log button and rest timer sit just above the bottom nav, whatever height it is.
  const navRef = useRef(null);
  const dockRef = useRef(null);
  const [navH, setNavH] = useState(66);
  useEffect(() => {
    const measure = () => { if (navRef.current) setNavH(Math.round(navRef.current.getBoundingClientRect().height)); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [loaded, passcode]);

  // Whichever other workout has gone longest without a session, as a one-tap suggestion. Warm-up
  // sets don't count as training a workout.
  const dueWorkout = useMemo(() => {
    const todayIso = todayISO();
    const daysSinceTrained = (workoutId) => {
      const wEntries = strengthEntries.filter((e) => e.workoutId === workoutId);
      if (!wEntries.length) return Infinity;
      const lastDate = wEntries.reduce((max, e) => (e.date > max ? e.date : max), wEntries[0].date);
      return daysBetween(lastDate, todayIso);
    };
    const candidates = workouts
      .filter((w) => w.id !== activeWorkoutId)
      .map((w) => ({ workout: w, days: daysSinceTrained(w.id) }))
      .filter((c) => c.days >= 3);
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.days - a.days);
    return candidates[0];
  }, [workouts, strengthEntries, activeWorkoutId]);

  const insights = useMemo(() => {
    const list = [];
    const todayIso = todayISO();

    workouts.forEach((w) => {
      const wEntries = strengthEntries.filter((e) => e.workoutId === w.id);
      if (!wEntries.length) return;
      const lastDate = wEntries.reduce((max, e) => (e.date > max ? e.date : max), wEntries[0].date);
      const daysSince = daysBetween(lastDate, todayIso);
      if (daysSince >= 7) list.push({ type: "stale", text: `Haven't trained ${w.name} in ${daysSince} days.` });
    });

    const allSeries = allExerciseNames.map((ex) => {
      const hist = entriesByExerciseStrength[ex] || [];
      const byDate = {};
      hist.forEach((e) => { byDate[e.date] = pickBest(byDate[e.date], e); });
      const dates = Object.keys(byDate).sort();
      const points = dates.map((d) => estE1RM(byDate[d].weight, byDate[d].reps));
      const best = hist.length ? Math.max(...hist.map((e) => estE1RM(e.weight, e.reps))) : 0;
      return { exercise: ex, points, best };
    }).filter((s) => s.points.length >= 3);

    if (allSeries.length) {
      const withChange = allSeries.map((s) => ({ ...s, pct: Math.round(((s.points[s.points.length - 1] - s.points[0]) / s.points[0]) * 100) }));
      const bestMover = withChange.reduce((a, b) => (b.pct > a.pct ? b : a));
      const worstMover = withChange.reduce((a, b) => (b.pct < a.pct ? b : a));
      if (bestMover.pct > 0) list.push({ type: "up", text: `${bestMover.exercise} is up ${bestMover.pct}%, your best mover right now.` });
      if (withChange.length > 1 && worstMover.exercise !== bestMover.exercise) {
        list.push({ type: worstMover.pct < 0 ? "down" : "flat", text: worstMover.pct < 0 ? `${worstMover.exercise} is down ${Math.abs(worstMover.pct)}%, which might be worth extra attention.` : `${worstMover.exercise} is up only ${worstMover.pct}%, your slowest mover.` });
      }
      const strongest = allSeries.reduce((a, b) => (b.best > a.best ? b : a));
      list.push({ type: "strongest", text: `${strongest.exercise} is your strongest lift, est. ${strongest.best} lb 1RM.` });

      // Near a personal record: current e1RM is close to (but hasn't yet matched) the all-time best.
      const nearPR = allSeries
        .map((s) => ({ ...s, latest: s.points[s.points.length - 1] }))
        .filter((s) => s.best > 0 && s.latest < s.best && (s.best - s.latest) / s.best <= 0.05)
        .sort((a, b) => (a.best - a.latest) / a.best - (b.best - b.latest) / b.best)[0];
      if (nearPR) {
        const pctOff = Math.round(((nearPR.best - nearPR.latest) / nearPR.best) * 100);
        list.push({ type: "pr", text: `${nearPR.exercise} is within ${pctOff}% of its all-time best, close to a new personal record.` });
      }
    }

    return list;
  }, [strengthEntries, workouts, allExerciseNames, entriesByExerciseStrength]);

  // Strength Index: a chain-linked, equal-weighted index of every lift's estimated 1RM, starting
  // at 100. Each day's move is the average of that day's actual changes across all lifts you've
  // started tracking (a lift that didn't print that day counts as 0). Changes are measured as
  // log-changes: estimated 1RM bounces around with rep count, and averaging plain percent moves
  // would turn that noise into fake growth. Log-changes cancel exactly, so the index equals the
  // true geometric average of every lift's growth. Because it chains daily
  // changes instead of averaging levels, adding a brand-new lift never causes a jump, and a
  // lift you skip simply holds its last value until it prints again. The chart only ever shows
  // the % change over the selected range, so the starting 100 is never on screen.
  const portfolioSeries = useMemo(() => {
    const perExercise = {};
    strengthEntries.forEach((e) => {
      perExercise[e.exercise] = perExercise[e.exercise] || {};
      perExercise[e.exercise][e.date] = pickBest(perExercise[e.exercise][e.date], e);
    });
    const exNames = Object.keys(perExercise).filter((ex) => Object.keys(perExercise[ex]).length >= 2);
    if (exNames.length === 0) return { rows: [] };

    const price = {}, firstDate = {};
    exNames.forEach((ex) => {
      const dates = Object.keys(perExercise[ex]).sort();
      price[ex] = {};
      dates.forEach((d) => { price[ex][d] = estE1RM(perExercise[ex][d].weight, perExercise[ex][d].reps); });
      firstDate[ex] = dates[0];
    });

    const sparseDatesSet = new Set();
    exNames.forEach((ex) => Object.keys(perExercise[ex]).forEach((d) => sparseDatesSet.add(d)));
    const sparseDates = Array.from(sparseDatesSet).sort();

    // One row per calendar day so days off show as a flat continuation.
    const allDates = [];
    for (let d = sparseDates[0]; d <= todayISO(); d = shiftDate(d, 1)) allDates.push(d);

    const lastPrice = {};
    let index = 100;
    const rows = allDates.map((date, di) => {
      let retSum = 0, active = 0;
      exNames.forEach((ex) => {
        if (firstDate[ex] <= date) active++;
        const p = price[ex][date];
        if (p !== undefined && p > 0) {
          if (lastPrice[ex] > 0) retSum += Math.log(p / lastPrice[ex]);
          lastPrice[ex] = p;
        }
      });
      if (di > 0 && active > 0) index = index * Math.exp(retSum / active);
      return { date, label: fmtDate(date), value: Math.round(index * 100) / 100 };
    });

    return { rows, exerciseCount: exNames.length };
  }, [strengthEntries]);

  // Flags an unusually large single-session swing in the index and, when it can, names a likely
  // driver: an exercise with a thin logged history swings the blended average more than a regular.
  const fluctuationInsight = useMemo(() => {
    const rows = portfolioSeries.rows;
    if (rows.length < 2) return null;
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const delta = Math.round((last.value - prev.value) * 10) / 10;
    if (Math.abs(delta) < 1.5) return null;
    const todaysExercises = strengthEntries.filter((e) => e.date === last.date).map((e) => e.exercise);
    const thin = todaysExercises.find((ex) => (entriesByExerciseStrength[ex] || []).length <= 4);
    const direction = delta > 0 ? "jumped" : "dropped";
    let text = `Overall ${direction} ${Math.abs(delta)} pts on ${last.label}, a bigger single-day move than usual for this index.`;
    if (thin) text += ` ${thin} has a short logged history, so a single result from it carries more weight than one from a lift you train constantly.`;
    return { type: delta > 0 ? "up" : "down", text };
  }, [portfolioSeries, strengthEntries, entriesByExerciseStrength]);

  // The visible window starts from the day BEFORE the range begins (like a prior close), so the
  // change shown is the change across the whole range. The moving average is computed over the full
  // history, so it is already warm when the window starts.
  const portfolioView = useMemo(() => {
    const rows = portfolioSeries.rows;
    if (rows.length < 2) return null;
    const cutoff = rangeCutoffISO(portfolioRange);
    let startIdx = rows.findIndex((r) => r.date >= cutoff);
    if (startIdx === -1) startIdx = rows.length - 2;
    if (startIdx > 0) startIdx -= 1;
    if (rows.length - startIdx < 2) startIdx = rows.length - 2;
    const base = rows[startIdx].value;
    const maDays = (MA_OPTIONS.find((m) => m.key === maKey) || {}).days || 0;
    const maRaw = rows.map((_, i) => {
      if (!maDays || i < maDays - 1) return null;
      let sum = 0;
      for (let k = i - maDays + 1; k <= i; k++) sum += rows[k].value;
      return sum / maDays;
    });
    const pctOf = (v) => Math.round(((v - base) / base) * 10000) / 100;
    const slice = rows.slice(startIdx);
    const display = slice.map((r) => ({ date: r.date, label: r.label, value: pctOf(r.value) }));
    const maDisplay = maRaw.slice(startIdx).map((v) => (v === null ? null : pctOf(v)));
    const last = rows[rows.length - 1];
    const maLast = maRaw[rows.length - 1];
    const pct = pctOf(last.value);
    return {
      display, maDisplay, pct, up: pct >= 0,
      vsAvg: maLast ? Math.round(((last.value - maLast) / maLast) * 1000) / 10 : null,
      maLabel: (MA_OPTIONS.find((m) => m.key === maKey) || {}).label,
    };
  }, [portfolioSeries, portfolioRange, maKey]);

  // ---- Progress section data ------------------------------------------------------------------------
  // One point per day: the best set of that day for the chosen metric (est. 1RM or top weight).
  const chartResult = useMemo(() => {
    if (!chartFocusExercise) return { rows: [], series: [] };
    const cutoff = rangeCutoffISO(chartRange);
    const metric = chartMetric === "e1rm" ? "e1rm" : "weight";
    const inRange = (entriesByExerciseStrength[chartFocusExercise] || []).filter((e) => e.date >= cutoff);
    const byDate = {};
    inRange.forEach((e) => { byDate[e.date] = pickBest(byDate[e.date], e, metric); });
    const rows = Object.keys(byDate).sort().map((date) => {
      const entry = byDate[date];
      return { date, label: fmtDate(date), [chartFocusExercise]: setScore(entry, metric), [`${chartFocusExercise}__r`]: entry.reps, [`${chartFocusExercise}__s`]: entry.sets };
    });
    return { rows, series: [chartFocusExercise] };
  }, [entriesByExerciseStrength, chartRange, chartMetric, chartFocusExercise]);

  const alreadyImported = entries.some((e) => String(e.id).startsWith("import-v1-"));
  const runImport = () => {
    if (alreadyImported) return;
    const nextExercises = JSON.parse(JSON.stringify(exercises));
    const newEntries = IMPORT_DATA.map((d, i) => {
      const list = nextExercises[d.workoutId] || (nextExercises[d.workoutId] = []);
      if (!list.some((e) => e.toLowerCase() === d.exercise.toLowerCase())) list.push(d.exercise);
      return { id: `import-v1-${i}`, workoutId: d.workoutId, exercise: d.exercise, weight: d.weight, sets: d.sets, reps: d.reps, date: d.date };
    });
    persist({ workouts, exercises: nextExercises, entries: [...newEntries, ...entries] });
  };

  const alreadyImportedIncline = entries.some((e) => String(e.id).startsWith("import-incline-"));
  const runInclineImport = () => {
    if (alreadyImportedIncline) return;
    const nextExercises = JSON.parse(JSON.stringify(exercises));
    const newEntries = INCLINE_IMPORT_DATA.map((d, i) => {
      const list = nextExercises[d.workoutId] || (nextExercises[d.workoutId] = []);
      if (!list.some((e) => e.toLowerCase() === d.exercise.toLowerCase())) list.push(d.exercise);
      return { id: `import-incline-${i}`, workoutId: d.workoutId, exercise: d.exercise, weight: d.weight, sets: d.sets, reps: d.reps, date: d.date };
    });
    persist({ workouts, exercises: nextExercises, entries: [...newEntries, ...entries] });
  };

  const triggerDownload = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportJSON = () => {
    const payload = JSON.stringify({ workouts, exercises, entries, exportedAt: new Date().toISOString() }, null, 2);
    triggerDownload(payload, `hooks-workout-backup-${todayISO()}.json`, "application/json");
  };
  const exportCSV = () => {
    const workoutName = (id) => workouts.find((w) => w.id === id)?.name || id;
    const esc = (v) => (typeof v === "string" && v.includes(",")) ? `"${v}"` : v;
    const header = "Date,Workout,Exercise,Weight,Sets,Reps,Est1RM";
    const rows = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)).map((e) =>
      [e.date, esc(workoutName(e.workoutId)), esc(e.exercise), e.weight, e.sets, e.reps, estE1RM(e.weight, e.reps)].join(",")
    );
    triggerDownload([header, ...rows].join("\n"), `hooks-workout-sets-${todayISO()}.csv`, "text/csv");
  };

  if (passcode === null) return null;

  if (!passcode) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="eyebrow"><span className="dot">●</span> Hooks Workout</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, textTransform: "uppercase", marginTop: 6 }}>Enter Passcode</div>
          {authError && <div className="warn" style={{ marginTop: 12 }}>{authError}</div>}
          <input type="password" placeholder="Passcode" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPasscode()} />
          <button className="btn-iron" onClick={submitPasscode}>Unlock</button>
        </div>
      </div>
    );
  }

  const repsText = (low, high) => (low === high ? `${low}` : `${low}–${high}`);
  const focusHistory = chartFocusExercise ? (entriesByExercise[chartFocusExercise] || []) : [];
  const shownHistory = historyAll ? focusHistory : focusHistory.slice(0, 10);
  const mergeCandidates = chartFocusExercise ? allExerciseNames.filter((n) => n !== chartFocusExercise && (entriesByExercise[n] || []).length > 0) : [];
  const allInsights = [...(fluctuationInsight ? [fluctuationInsight] : []), ...insights];
  const maWords = { "30": "30-day", "90": "90-day", "365": "1-year" };

  const renderEditableRow = (e, compact) => (
    editingId === e.id ? (
      <div key={e.id} className={compact ? "hist-item" : "today-item"} style={{ flexWrap: "wrap", gap: 6 }}>
        <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtDate(e.date)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="number" inputMode="decimal" value={editForm.weight} onChange={(ev) => setEditForm({ ...editForm, weight: ev.target.value })} style={{ width: 52, padding: "4px 6px", fontSize: 13 }} />
          <span className="muted" style={{ fontSize: 11 }}>lbs ×</span>
          <input type="number" inputMode="numeric" value={editForm.reps} onChange={(ev) => setEditForm({ ...editForm, reps: ev.target.value })} style={{ width: 40, padding: "4px 6px", fontSize: 13 }} />
          <span className="muted" style={{ fontSize: 11 }}>×</span>
          <input type="number" inputMode="numeric" value={editForm.sets} onChange={(ev) => setEditForm({ ...editForm, sets: ev.target.value })} style={{ width: 40, padding: "4px 6px", fontSize: 13 }} />
          <button className="del-btn" onClick={() => saveEdit(e.id)} style={{ color: "#22c55e", fontWeight: 700 }}>✓</button>
          <button className="del-btn" onClick={cancelEdit}>✕</button>
        </span>
      </div>
    ) : (
      <div key={e.id} className={compact ? "hist-item" : "today-item"} style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
        {compact
          ? <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtDate(e.date)}</span>
          : <span style={{ fontWeight: 600 }}>{e.exercise}{e.isWarmup && <span className="muted" style={{ fontSize: 10, fontWeight: 400 }}> (warm-up)</span>}</span>}
        <span className="num">
          {e.weight}<span className="muted">lbs</span>{e.reps > 0 && <span className="muted">× {e.reps}{e.sets > 1 ? ` × ${e.sets}` : ""}</span>}
          {compact && e.isWarmup && <span className="muted" style={{ fontSize: 10 }}>(warm-up)</span>}
          <button className="del-btn" onClick={() => startEdit(e)} title="Edit">✎</button>
          <button className="del-btn" onClick={() => toggleWarmup(e.id)} title={e.isWarmup ? "Mark as working set" : "Mark as warm-up"} style={{ fontSize: 10, fontWeight: 700, color: e.isWarmup ? "var(--iron)" : "var(--mute)" }}>W</button>
          <button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button>
        </span>
      </div>
    )
  );

  return (
    <>
    <DotField />
    <div className="wrap">
      <button className="import-shortcut-btn" onClick={() => scrollToSection("import")} aria-label="Import & backup"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg></button>

      {saveError && <div className="warn">{saveError}</div>}

      {!loaded ? (
        <div className="empty">Loading your log…</div>
      ) : (
        <>
        {/* ---------------- OVERALL ---------------- */}
        <div ref={(el) => (sectionRefs.current.portfolio = el)} className="overall-screen" style={{ minHeight: `calc(100dvh - ${navH + 36}px)` }}>
          <div className="label-sm" style={{ textAlign: "center", marginBottom: 8 }}>Your Strength Over Time</div>
          <div className="portfolio-change">
            {!portfolioView ? <span className="cap">Not enough data yet</span> : (() => {
              const pct = scrubPoint ? scrubPoint.value : portfolioView.pct;
              const up = pct >= 0;
              const rangeLabel = RANGE_PRESETS.find((r) => r.key === portfolioRange)?.label;
              return (
                <>
                  <span className="index-num" style={{ color: up ? "#22c55e" : "#ef4444" }}>{up ? "+" : "−"}{Math.abs(pct).toFixed(1)}%</span>
                  <span className="index-meta"><span className="cap">{scrubPoint ? scrubPoint.label : rangeLabel}</span></span>
                  <span className="index-tag">Strength Index · {portfolioSeries.exerciseCount} lifts</span>
                </>
              );
            })()}
          </div>

          <div className="chart-box">
            {portfolioView
              ? <PortfolioChart rows={portfolioView.display} maRows={maKey === "off" ? null : portfolioView.maDisplay} color={portfolioView.up ? "#22c55e" : "#ef4444"} onScrub={setScrubPoint} />
              : <div className="empty">Log sessions on a few exercises to see this.</div>}
          </div>
          {portfolioView && maKey !== "off" && (
            <div className="ma-readout">
              <span className="ma-swatch" />
              {portfolioView.vsAvg === null
                ? `${maWords[maKey]} average starts after ${maWords[maKey].replace("-day", " days").replace("1-year", "a year")} of history`
                : `${portfolioView.vsAvg >= 0 ? "▲" : "▼"} ${Math.abs(portfolioView.vsAvg).toFixed(1)}% ${portfolioView.vsAvg >= 0 ? "above" : "below"} its ${maWords[maKey]} average`}
            </div>
          )}

          <div className="pills" style={{ marginBottom: 8 }}>
            {RANGE_PRESETS.map((r) => (
              <button key={r.key} className={"pill" + (r.key === portfolioRange ? " active" : "")} onClick={() => { setPortfolioRange(r.key); setScrubPoint(null); }}>{r.label}</button>
            ))}
          </div>
          <div className="pills pills-sub">
            {MA_OPTIONS.map((m) => (
              <button key={m.key} className={"pill pill-sm" + (m.key === maKey ? " active" : "")} onClick={() => setMaKey(m.key)}>{m.label}</button>
            ))}
          </div>

          {allInsights.length > 0 && (() => {
            const idx = insightIndex % allInsights.length;
            const ins = allInsights[idx];
            const dotColor = ins.type === "up" || ins.type === "strongest" || ins.type === "pr" ? "#22c55e" : ins.type === "down" ? "#ef4444" : "var(--iron)";
            return (
              <div className="insights-block" onClick={() => setInsightIndex((i) => i + 1)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setInsightIndex((i) => i + 1); }}>
                <div className="insights-head">
                  <span className="label-sm" style={{ marginBottom: 0 }}>Insights</span>
                  {allInsights.length > 1 && <span className="insight-count">{idx + 1} / {allInsights.length} · tap for next</span>}
                </div>
                <div className="insight-item" style={{ marginBottom: 0 }}>
                  <span className="dot" style={{ background: dotColor }} />
                  <span>{ins.text}</span>
                </div>
              </div>
            );
          })()}

          <button className="log-set-row" onClick={() => scrollToSection("home")}>
            <span>Log a set</span>
            <span style={{ color: "var(--mute)", fontSize: 20 }}>›</span>
          </button>
        </div>

        {/* ---------------- WORKOUT (search, today's target, log) ---------------- */}
        <div ref={(el) => (sectionRefs.current.home = el)} className="workout-section">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <button className="title-btn" onClick={() => setShowWorkoutMenu((v) => !v)} style={{ marginBottom: 0 }}>
                {activeWorkout?.name}
                <span style={{ color: "var(--mute)", fontSize: 18 }}>▾</span>
              </button>
              {showWorkoutMenu && (
                <div className="dropdown left anchored">
                  {workouts.map((w) => (
                    <button key={w.id} className="item" style={{ color: w.id === activeWorkoutId ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setActiveWorkoutId(w.id); setShowWorkoutMenu(false); }}>{w.name}</button>
                  ))}
                  <div className="new-row">
                    <input value={newWorkoutName} onChange={(e) => setNewWorkoutName(e.target.value)} placeholder="New workout name" style={{ padding: "7px 10px", fontSize: 16, flex: 1 }} />
                    <button className="btn-iron" onClick={createWorkout} style={{ padding: "0 10px" }}>+</button>
                  </div>
                </div>
              )}
            </div>
            {dueWorkout && (
              <button className="due-pill" onClick={() => { setActiveWorkoutId(dueWorkout.workout.id); setShowWorkoutMenu(false); }}>
                Try {dueWorkout.workout.name} · {dueWorkout.days === Infinity ? "never done" : `${dueWorkout.days} days`}
              </button>
            )}
          </div>
          <div className="date-row">
            <button onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>‹</button>
            <button className="date-pill" onClick={() => setCalendarOpen((v) => !v)}>{fmtDateFull(selectedDate)}</button>
            <button onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>›</button>
            {calendarOpen && <CalendarPopup selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setCalendarOpen(false)} />}
          </div>

          <div className="card">
            <div className="ex-input-wrap">
              <input
                className="ex-input"
                placeholder="Search or add an exercise"
                value={form.exercise}
                onChange={(e) => {
                  const val = e.target.value;
                  setShowSuggestions(true);
                  setDupPrompt(null);
                  const exact = allExerciseNames.find((n) => n.toLowerCase() === val.trim().toLowerCase());
                  if (exact && exact !== recExercise) { selectExercise(exact); return; }
                  setForm({ ...form, exercise: val });
                  if (!exact) setRecExercise(null);
                }}
                onFocus={(e) => { setShowSuggestions(true); setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => selectExercise(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            {swapTarget && (
              <button className="swap-btn" onClick={() => selectExercise(swapTarget)} aria-label={`Switch to ${swapTarget}`}>
                <span style={{ fontSize: 15 }}>⇄</span> Switch to {swapTarget}
              </button>
            )}

            {recExercise && (
              <div className="pills" style={{ marginBottom: 12 }}>
                <button className={"pill" + (progressionMode === "weight" ? " active" : "")} onClick={() => setProgressionModeAndSave("weight")}>Increase Weight</button>
                <button className={"pill" + (progressionMode === "reps" ? " active" : "")} onClick={() => setProgressionModeAndSave("reps")}>Increase Reps</button>
              </div>
            )}

            {!recExercise ? (
              <div className="rec-empty">Pick an exercise to see today's target. Type a new name to add it.</div>
            ) : recommendation?.noData ? (
              <div className="rec-card">
                <div className="label-sm">What's your strongest set?</div>
                <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 12 }}>
                  No sets logged for {recExercise} yet. Enter the most weight you've lifted for it and how many reps, and that's enough to build a first recommendation.
                </div>
                <div className="row3" style={{ marginBottom: 0 }}>
                  <input type="number" inputMode="decimal" placeholder="lbs" value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} />
                  <input type="number" inputMode="numeric" placeholder="reps" value={manualReps} onChange={(e) => setManualReps(e.target.value)} />
                </div>
              </div>
            ) : recommendation && (
              <div className="rec-card">
                <div className="rec-top">
                  <div>
                    <div className="label-sm" style={{ marginBottom: 2 }}>Recommended today</div>
                    <div className="rec-main">{recommendation.nextTopWeight}<span className="muted"> lbs × </span>{repsText(recommendation.repLow, recommendation.repHigh)}</div>
                  </div>
                  <div className="rec-last">{recommendation.fromManual ? "Your entry" : `Last ${fmtDate(recommendation.lastSessionDate)}`}<br />{recommendation.lastTop.weight} × {recommendation.lastTop.reps}</div>
                </div>
                <div className="rec-note">{recommendation.note}</div>
                <div className="today-list" style={{ marginTop: 10 }}>
                  {recommendation.rows.map((r) => (
                    <div key={r.set} className="today-item" style={{ padding: "7px 12px" }}>
                      <span style={{ fontWeight: 600 }}>Set {r.set}{r.set === 1 ? " (top)" : ""}</span>
                      <span className="num">{r.weight}<span className="muted">lbs</span><span className="muted">× {repsText(recommendation.repLow, recommendation.repHigh)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dupPrompt && (
              <div className="dup-prompt">
                <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>
                  You already have <b>{dupPrompt.existing}</b>. Is "{dupPrompt.typed}" the same lift?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-iron" style={{ flex: 1, padding: "10px 6px", fontSize: 12 }} onClick={() => {
                    if (dupPrompt.kind === "log") { setRecExercise(dupPrompt.existing); submitSet(dupPrompt.existing, true); }
                    else { selectExercise(dupPrompt.existing); setAddingExercise(false); setNewExerciseName(""); }
                  }}>Use {dupPrompt.existing}</button>
                  <button className="pill" style={{ flex: 1, padding: "10px 6px", fontSize: 12 }} onClick={() => {
                    if (dupPrompt.kind === "log") submitSet(dupPrompt.typed, true);
                    else { addExerciseToList(dupPrompt.typed, activeWorkoutId, true); setAddingExercise(false); setNewExerciseName(""); setDupPrompt(null); }
                  }}>Keep as new</button>
                </div>
              </div>
            )}

            <div className="row3" style={{ marginTop: 14 }}>
              {[["weight", "lbs", "decimal", 5], ["sets", "sets", "numeric", 1], ["reps", "reps", "numeric", 1]].map(([key, ph, mode, step]) => (
                <div key={key} className="stepper-field">
                  <input type="number" inputMode={mode} placeholder={ph} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  <div className="stepper-btns">
                    <button type="button" aria-label={`Increase ${ph}`} onClick={() => bumpForm(key, step)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg></button>
                    <button type="button" aria-label={`Decrease ${ph}`} onClick={() => bumpForm(key, -step)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mute)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isWarmup} onChange={(e) => setForm({ ...form, isWarmup: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--iron)" }} />
              Warm-up set (won't count toward recommendations or your top set)
            </label>
          </div>

          {todaysEntries.length > 0 && (
            <button className="add-ex-link" style={{ display: "block", marginBottom: 12 }} onClick={() => setShowTodaysLog((v) => !v)}>
              {showTodaysLog ? "▾" : "▸"} Logged today ({todaysEntries.length})
            </button>
          )}
          {showTodaysLog && todaysEntries.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="today-list">{todaysEntries.map((e) => renderEditableRow(e, false))}</div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            {!addingExercise ? (
              <button className="add-ex-link" style={{ marginBottom: 0 }} onClick={() => setAddingExercise(true)}>+ Add new exercise</button>
            ) : (
              <div className="add-ex-row" style={{ marginBottom: 0, flex: 1, marginRight: 12 }}>
                <input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="Exercise name" />
                <button className="btn-iron" onClick={() => { if (addExerciseToList(newExerciseName)) { setNewExerciseName(""); setAddingExercise(false); } }}>Add</button>
              </div>
            )}
            <button className="add-ex-link" style={{ marginBottom: 0, flexShrink: 0 }} onClick={clearForm}>Clear All</button>
          </div>
        </div>

        {/* ---------------- PROGRESS ---------------- */}
        <div ref={(el) => (sectionRefs.current.charts = el)} className="section-block">
          <div className="label-sm" style={{ marginBottom: 14 }}>Progress</div>
          {(() => {
            const withData = allExerciseNames.filter((ex) => (entriesByExercise[ex] || []).length > 0).sort((a, b) => a.localeCompare(b));
            const groups = {};
            withData.forEach((ex) => { const L = (ex[0] || "#").toUpperCase(); (groups[L] = groups[L] || []).push(ex); });
            return (
              <select className="scope" value={chartFocusExercise || ""} onChange={(e) => { setChartFocusExercise(e.target.value || null); setMergeOpen(false); setHistoryAll(false); setEditingId(null); }}>
                {!chartFocusExercise && <option value="">Select an exercise…</option>}
                {Object.keys(groups).sort().map((L) => (
                  <optgroup key={L} label={L}>
                    {groups[L].map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                  </optgroup>
                ))}
              </select>
            );
          })()}
          <div className="pills">
            {RANGE_PRESETS.map((r) => <button key={r.key} className={"pill" + (r.key === chartRange ? " active" : "")} onClick={() => setChartRange(r.key)}>{r.label}</button>)}
          </div>
          <div className="pills">
            <button className={"pill" + (chartMetric === "weight" ? " active" : "")} onClick={() => setChartMetric("weight")}>Top Weight</button>
            <button className={"pill" + (chartMetric === "e1rm" ? " active" : "")} onClick={() => setChartMetric("e1rm")}>Est. 1RM</button>
          </div>
          {chartResult.rows.length === 0 ? (
            <div className="empty">No sets logged in this range yet.</div>
          ) : (
            <div className="card">
              <SvgChart rows={chartResult.rows} series={chartResult.series} mode="exercise" metric={chartMetric} />
              <div className="chart-note">
                Best set of each day. Hold and drag for the exact reps, sets and weight.{chartMetric === "e1rm" && " Est. 1RM uses the Epley formula, counting up to 10 reps."}
              </div>
            </div>
          )}

          {chartFocusExercise && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="label-sm" style={{ marginBottom: 0 }}>History · {focusHistory.length} logged</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <button className="add-ex-link" style={{ marginBottom: 0, fontSize: 12 }} onClick={() => setMergeOpen((v) => !v)}>Merge into…</button>
                  <button className="add-ex-link" style={{ marginBottom: 0, fontSize: 12 }} onClick={() => deleteExercise(chartFocusExercise)}>Delete</button>
                </div>
              </div>
              {mergeUndo && (
                <div className="merge-note">
                  Merged {mergeUndo.from} into {mergeUndo.to}. <button className="add-ex-link" style={{ marginBottom: 0, fontSize: 12, color: "var(--iron)" }} onClick={undoMerge}>Undo</button>
                </div>
              )}
              {mergeOpen && (
                <div className="merge-panel">
                  <div style={{ fontSize: 12, color: "var(--mute)", lineHeight: 1.4, marginBottom: 8 }}>
                    Moves every set logged under {chartFocusExercise} into the exercise you pick, then removes {chartFocusExercise}. Only merge true duplicates; different machines are different lifts.
                  </div>
                  <select className="scope" style={{ marginBottom: 8 }} value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                    <option value="">Merge into…</option>
                    {mergeCandidates.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button className="btn-iron save-btn" disabled={!mergeTarget} style={{ opacity: mergeTarget ? 1 : 0.5 }} onClick={() => mergeExercise(chartFocusExercise, mergeTarget)}>
                    Merge {chartFocusExercise} into {mergeTarget || "…"}
                  </button>
                </div>
              )}
              <div className="hist-list">{shownHistory.map((e) => renderEditableRow(e, true))}</div>
              {focusHistory.length > 10 && (
                <button className="add-ex-link" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }} onClick={() => setHistoryAll((v) => !v)}>
                  {historyAll ? "Show less" : `Show all ${focusHistory.length}`}
                </button>
              )}
            </div>
          )}

          <div className="label-sm" style={{ margin: "26px 0 12px" }}>Training overview</div>
          <div className="card">
            <div className="label-sm" style={{ textAlign: "center" }}>Strength growth by category</div>
            <RadarChart data={radarData} onTap={() => setRadarInfoOpen((v) => !v)} />
            {radarInfoOpen && allTimeRange && (
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                {fmtDate(allTimeRange.start)} – {fmtDate(allTimeRange.end)}
              </div>
            )}
            <div className="axis-caption" style={{ marginBottom: 0 }}>Average % change in estimated 1RM per workout, all-time. Tap for the exact span. Hollow points mean not enough data yet.</div>
          </div>
          <div className="card">
            <div className="label-sm" style={{ textAlign: "center" }}>Weekly training volume</div>
            <VolumeBarChart weeks={weeklyVolume} onTapBar={(w) => setVolumeTapInfo(w)} />
            {volumeTapInfo && (
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                Week of {fmtDate(volumeTapInfo.start)} – {fmtDate(volumeTapInfo.end)}{volumeTapInfo.isCurrent ? " (so far)" : ""}
              </div>
            )}
            <div className="axis-caption" style={{ marginBottom: 0 }}>Weight × sets × reps per week, Monday to Sunday, last 10 weeks. This week is blue. Tap a bar for its dates.</div>
          </div>
          <div className="card">
            <div className="label-sm" style={{ textAlign: "center" }}>Training consistency</div>
            <ConsistencyHeatmap weeks={heatmapWeeks} onTap={() => setHeatmapInfoOpen((v) => !v)} />
            {heatmapInfoOpen && heatmapWeeks.length > 0 && (
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                {fmtDate(heatmapWeeks[0][0].date)} – {fmtDate(todayISO())}
              </div>
            )}
            <div className="axis-caption" style={{ marginBottom: 0 }}>Each column is a week (Monday to Sunday). Darker means more sets logged that day. Tap for the span.</div>
          </div>
        </div>

        <div ref={(el) => (sectionRefs.current.import = el)} className="section-block">
        <>
          <div className="label-sm" style={{ marginBottom: 14 }}>Import &amp; Backup</div>
          <div className="card">
            <div className="label-sm">One-time bulk import</div>
            <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 14 }}>
              Loads {IMPORT_DATA.length} sets across {new Set(IMPORT_DATA.map((d) => d.exercise)).size} exercises from your written log, dated Aug 2025 – Aug 2026. New exercise names get added to the right workout automatically.
            </div>
            <button className="btn-iron save-btn" onClick={runImport} disabled={alreadyImported} style={{ opacity: alreadyImported ? 0.5 : 1, cursor: alreadyImported ? "default" : "pointer" }}>
              {alreadyImported ? "Already Imported" : `Import ${IMPORT_DATA.length} Sets`}
            </button>
          </div>
          <div className="card">
            <div className="label-sm">Couldn't import automatically</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {IMPORT_SKIPPED.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--mute)", lineHeight: 1.5 }}>• {s}</div>)}
            </div>
          </div>
          <div className="card">
            <div className="label-sm">Incline Bench history</div>
            <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 14 }}>
              Loads {INCLINE_IMPORT_DATA.length} sets, Sep 2025 – Aug 2026. Reps weren't recorded for most of these — assumed 6 reps × 3 sets throughout, except 1/19 which was noted as 2 reps. Dumbbell sets file separately under "Incline Bench (DB)".
            </div>
            <button className="btn-iron save-btn" onClick={runInclineImport} disabled={alreadyImportedIncline} style={{ opacity: alreadyImportedIncline ? 0.5 : 1, cursor: alreadyImportedIncline ? "default" : "pointer" }}>
              {alreadyImportedIncline ? "Already Imported" : `Import ${INCLINE_IMPORT_DATA.length} Sets`}
            </button>
          </div>
          <div className="card">
            <div className="label-sm">Full backup</div>
            <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 14 }}>
              Downloads everything — workouts, exercises, every logged set — as a JSON file. Keep this somewhere safe (email it to yourself, save it to Drive/iCloud). If your database ever got wiped, this is what you'd restore from.
            </div>
            <button className="btn-iron save-btn" onClick={exportJSON}>Download JSON Backup</button>
          </div>
          <div className="card">
            <div className="label-sm">For spreadsheets / your own charts</div>
            <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 14 }}>
              One row per logged set — date, workout, exercise, weight, sets, reps, and estimated 1RM. Opens straight into Excel, Google Sheets, or Numbers — pivot it, chart it, slice it however you want outside the app.
            </div>
            <button className="btn-iron save-btn" onClick={exportCSV}>Download CSV</button>
          </div>
          <div className="chart-note">
            No auto-email yet — that needs a mail-sending service wired in (Resend is the simplest option, free tier covers this easily). Downloading and attaching it to an email yourself takes 10 seconds; say the word if you want the automatic version built in.
          </div>
        </>
        </div>
        </>
      )}

      {(restTimer || dockVisible) && loaded && (
        <div className="dock" ref={dockRef} style={{ bottom: navH }}>
          {restTimer && (
            <div className={"rest-bar" + (restRemaining <= 0 ? " done" : "")}>
              <div className="rest-fill" style={{ width: `${Math.min(100, Math.max(0, (1 - restRemaining / restTimer.total) * 100))}%` }} />
              <span className="rest-label">{restRemaining <= 0 ? "Rest over, go" : `Rest ${fmtClock(restRemaining)}`}<span className="rest-ex"> · {restTimer.exercise}</span></span>
              <span className="rest-btns">
                <button onClick={() => nudgeRest(-15)}>−15</button>
                <button onClick={() => nudgeRest(15)}>+15</button>
                <button onClick={() => setRestTimer(null)} aria-label="Dismiss timer">✕</button>
              </span>
            </div>
          )}
          {dockVisible && (
            <button className="btn-iron save-btn dock-save" onClick={() => submitSet()} disabled={!form.exercise.trim() || !form.weight} style={{ opacity: form.exercise.trim() && form.weight ? 1 : 0.55 }}>
              {form.exercise.trim() ? `Log set · ${form.exercise.trim()}` : "Log set"}
            </button>
          )}
        </div>
      )}

      <div className="bottom-nav" ref={navRef}>
        <button className={"bottom-nav-item" + (activeSection === "charts" ? " active" : "")} onClick={() => scrollToSection("charts")}>
          <IconChart color={activeSection === "charts" ? "var(--iron)" : "var(--mute)"} /><span>Progress</span>
        </button>
        <button className={"bottom-nav-item bottom-nav-item-main" + (activeSection === "portfolio" ? " active" : "")} onClick={() => scrollToSection("portfolio")}>
          <IconHome color={activeSection === "portfolio" ? "var(--iron)" : "var(--mute)"} size={30} /><span>Overall</span>
        </button>
        <button className={"bottom-nav-item" + (activeSection === "home" ? " active" : "")} onClick={() => scrollToSection("home")}>
          <IconBulb color={activeSection === "home" ? "var(--iron)" : "var(--mute)"} /><span>Workout</span>
        </button>
      </div>
    </div>
    </>
  );
}
