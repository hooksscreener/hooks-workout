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
  { key: "1w", label: "1W", days: 7 }, { key: "1m", label: "1M", days: 30 }, { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 182 }, { key: "8m", label: "8M", days: 243 }, { key: "10m", label: "10M", days: 304 },
  { key: "1y", label: "1Y", days: 365 }, { key: "all", label: "ALL", days: 36500 },
];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WD = ["S","M","T","W","T","F","S"];
const PASSCODE_KEY = "hooksAppPasscode";

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${+d}`; };
const fmtDateFull = (iso) => { if (iso === todayISO()) return `Today, ${fmtDate(iso)}`; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); };
const shiftDate = (iso, delta) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + delta); return toISO(d); };

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
const estE1RM = (weight, reps) => (reps > 0 ? Math.round(weight * (1 + reps / 30)) : weight);

function SvgChart({ rows, series, mode, metric }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const svgRef = useRef(null);
  const draggingRef = useRef(false);
  const W = 340, H = 210, padL = 34, padR = 8, padT = 10, padB = 24;
  const allVals = [];
  rows.forEach((r) => series.forEach((s) => { if (r[s] !== undefined) allVals.push(r[s]); }));
  if (!allVals.length) return <div className="empty">No data</div>;
  const min = Math.min(...allVals) - 5, max = Math.max(...allVals) + 5;
  const n = rows.length;
  const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const xTickEvery = Math.max(1, Math.ceil(n / 5));

  const posToIndex = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0, minDist = Infinity;
    rows.forEach((r, i) => { const d = Math.abs(x(i) - relX); if (d < minDist) { minDist = d; nearest = i; } });
    return nearest;
  };
  const scrubTo = (clientX) => { const idx = posToIndex(clientX); if (idx !== null) setActiveIdx(idx); };
  const startScrub = (e) => { draggingRef.current = true; scrubTo(e.clientX); };
  const moveScrub = (e) => { if (draggingRef.current) scrubTo(e.clientX); };
  const endScrub = () => { draggingRef.current = false; };

  const activeRow = activeIdx !== null ? rows[activeIdx] : null;
  const activeLines = activeRow
    ? series.filter((s) => activeRow[s] !== undefined).map((s, si) => {
        const colorIdx = series.indexOf(s);
        const detail = mode === "workout" ? (activeRow[`${s}__detail`] || []) : null;
        const suffix = mode === "exercise"
          ? `${activeRow[s]}${metric === "e1rm" ? " e1RM" : " lbs"}${activeRow[`${s}__r`] ? ` · ${activeRow[`${s}__r`]} reps${activeRow[`${s}__s`] > 1 ? ` × ${activeRow[`${s}__s`]}` : ""}` : ""}`
          : `${activeRow[s]}${metric === "e1rm" ? " e1RM" : " lbs"}`;
        return { series: s, color: LINE_COLORS[colorIdx % LINE_COLORS.length], text: `${s}: ${suffix}`, detail };
      })
    : [];

  const boxW = 170, lineH = 12;
  const boxLineCount = activeLines.reduce((n2, l) => n2 + 1 + (l.detail ? l.detail.length : 0), 0);
  const boxH = activeRow ? 20 + boxLineCount * lineH : 0;
  let boxX = activeRow ? Math.min(Math.max(x(activeIdx) - boxW / 2, 2), W - boxW - 2) : 0;
  let boxY = activeRow ? Math.max(padT + 2, 10) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 230, touchAction: "none", cursor: "crosshair" }}
      onPointerDown={startScrub}
      onPointerMove={moveScrub}
      onPointerUp={endScrub}
      onPointerLeave={endScrub}
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
      {rows.map((r, i) => (i % xTickEvery === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="var(--mute)" textAnchor="middle">{r.label}</text>)}

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

const PCT_TABLE = [
  { pct: 1.00, reps: 1 }, { pct: 0.95, reps: 2 }, { pct: 0.93, reps: 3 }, { pct: 0.90, reps: 4 },
  { pct: 0.87, reps: 5 }, { pct: 0.85, reps: 6 }, { pct: 0.80, reps: 8 }, { pct: 0.77, reps: 9 }, { pct: 0.75, reps: 10 },
];
function repsForPct(pct) {
  if (pct >= 1) return 1;
  if (pct <= 0.75) return 10;
  for (let i = 0; i < PCT_TABLE.length - 1; i++) {
    const a = PCT_TABLE[i], b = PCT_TABLE[i + 1];
    if (pct <= a.pct && pct >= b.pct) {
      const t = (a.pct - pct) / (a.pct - b.pct);
      return Math.round(a.reps + t * (b.reps - a.reps));
    }
  }
  return 8;
}
const roundTo5 = (v) => Math.round(v / 5) * 5;

function plateauFlag(history) {
  const distinctDates = [...new Set(history.map((e) => e.date))];
  if (distinctDates.length < 3) return false;
  // Percent-based on estimated 1RM (weight + reps together), not a literal same-plates check —
  // catches the case where the weight never moved but reps have been quietly sliding too.
  const recentE1rms = distinctDates.slice(0, 3).map((d) => {
    const top = history.filter((e) => e.date === d).reduce((best, e) => (e.weight > best.weight ? e : best));
    return estE1RM(top.weight, top.reps);
  });
  const maxE = Math.max(...recentE1rms), minE = Math.min(...recentE1rms);
  if (!maxE) return false;
  return (maxE - minE) / maxE <= 0.03;
}

// Prefer the last ~60 days of working-set data when there's enough of it, so a hot streak (or a
// slump) isn't dragged down by months-old numbers. Falls back to full history when recent data is sparse.
function pickWorkingBasis(hist) {
  const workingSetHist = hist.filter((e) => e.reps >= 5).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (workingSetHist.length === 0) return { pool: [], recencyLimited: false };
  const cutoff = shiftDate(todayISO(), -60);
  const recent = workingSetHist.filter((e) => e.date >= cutoff);
  if (recent.length >= 2) return { pool: recent, recencyLimited: true };
  return { pool: workingSetHist, recencyLimited: false };
}

const REC_LOW = 8, REC_HIGH = 12;
function quickRecommend(hist, mode = "weight") {
  if (!hist || !hist.length) return null;
  const { pool } = pickWorkingBasis(hist);
  if (pool.length > 0) {
    const lastSessionDate = pool[0].date;
    const lastSession = pool.filter((e) => e.date === lastSessionDate).sort((a, b) => b.weight - a.weight);
    const lastTop = lastSession[0];
    if (mode === "reps") {
      // Hold the weight steady on purpose — the goal is climbing reps over time, not adding weight.
      const recWeight = lastTop.weight;
      const recReps = lastTop.reps + 1;
      return { lastWeight: lastTop.weight, lastReps: lastTop.reps, recWeight, recReps, onlyMax: false, mode };
    }
    const plateaued = plateauFlag(pool);
    const shouldBump = lastTop.reps >= REC_HIGH || plateaued;
    const recWeight = shouldBump ? lastTop.weight + (lastTop.weight >= 100 ? 10 : 5) : lastTop.weight;
    const recReps = shouldBump ? REC_LOW : Math.min(REC_HIGH, lastTop.reps + 1);
    return { lastWeight: lastTop.weight, lastReps: lastTop.reps, recWeight, recReps, onlyMax: false, mode };
  }
  const bestEntry = hist.reduce((best, e) => (estE1RM(e.weight, e.reps) > estE1RM(best.weight, best.reps) ? e : best), hist[0]);
  const e1rm = estE1RM(bestEntry.weight, bestEntry.reps);
  const recWeight = roundTo5(e1rm / (1 + REC_LOW / 30));
  return { lastWeight: bestEntry.weight, lastReps: bestEntry.reps, recWeight, recReps: REC_LOW, onlyMax: true, mode };
}


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

function Sparkline({ points, color }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.e1rm);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 72, h = 26;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.e1rm - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}><polyline points={coords} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TickerItem({ series, onClick }) {
  const first = series.points[0].e1rm, last = series.points[series.points.length - 1].e1rm;
  const pctChange = first ? Math.round(((last - first) / first) * 100) : 0;
  const up = last >= first;
  const color = up ? "#22c55e" : "#ef4444";
  const latest = series.points[series.points.length - 1];
  return (
    <div className="ticker-item" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="ticker-name">{series.exercise}</div>
      <div className="ticker-value">{latest.weight}<span className="ticker-unit">× {latest.reps}</span></div>
      <Sparkline points={series.points} color={color} />
      <div className="ticker-change" style={{ color }}>{up ? "▲" : "▼"} {Math.abs(pctChange)}%</div>
    </div>
  );
}

const NAV_ICON_PROPS = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function IconHome({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>; }
function IconDumbbell({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color} style={{ transform: "rotate(45deg)" }}><path d="M6 7v10M18 7v10" /><path d="M2 10v4M22 10v4" /><path d="M6 12h12" strokeWidth="3" /></svg>; }
function IconChart({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M7 16l4-5 3 3 5-7" /></svg>; }
function IconBulb({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a6 6 0 00-4 10.5c.7.6 1 1.3 1 2.5h6c0-1.2.3-1.9 1-2.5A6 6 0 0012 2z" /></svg>; }
function IconTarget({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} /></svg>; }
function IconBook({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5v-17z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></svg>; }

function PortfolioChart({ rows, color, onScrub }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [primed, setPrimed] = useState(false);
  const svgRef = useRef(null);
  const draggingRef = useRef(false);
  const holdTimerRef = useRef(null);
  const downPosRef = useRef(null);
  const W = 340, H = 170, padL = 4, padR = 4, padT = 10, padB = 4;
  if (rows.length < 2) return <div className="empty">Log more sessions across a few exercises to see this.</div>;
  const vals = rows.map((r) => r.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const n = rows.length;
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const posToIndex = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0, minDist = Infinity;
    rows.forEach((r, i) => { const d = Math.abs(x(i) - relX); if (d < minDist) { minDist = d; nearest = i; } });
    return nearest;
  };
  const scrubTo = (clientX) => {
    const idx = posToIndex(clientX);
    if (idx === null) return;
    setActiveIndex(idx);
    if (onScrub) onScrub(rows[idx]);
  };
  const clearHoldTimer = () => { if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; } };

  // Mouse (trackpad/laptop) has no native-scroll conflict — scrub immediately, same as before.
  // Touch shares this element with the swipeable carousel, so a quick swipe must be left alone
  // for the page-change gesture; only a brief hold-still arms scrubbing.
  const startScrub = (e) => {
    if (e.pointerType !== "touch") {
      draggingRef.current = true;
      setPrimed(true);
      scrubTo(e.clientX);
      return;
    }
    downPosRef.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      draggingRef.current = true;
      setPrimed(true);
      scrubTo(e.clientX);
    }, 220);
  };
  const moveScrub = (e) => {
    if (draggingRef.current) { scrubTo(e.clientX); return; }
    if (e.pointerType === "touch" && downPosRef.current) {
      const dx = Math.abs(e.clientX - downPosRef.current.x), dy = Math.abs(e.clientY - downPosRef.current.y);
      if (dx > 8 || dy > 8) clearHoldTimer(); // real movement before the hold completes = a swipe, let it pass through
    }
  };
  const endScrub = () => { clearHoldTimer(); draggingRef.current = false; downPosRef.current = null; setPrimed(false); };

  const pts = rows.map((r, i) => `${x(i)},${y(r.value)}`).join(" ");
  const areaPts = `${x(0)},${H} ${pts} ${x(n - 1)},${H}`;
  const active = activeIndex !== null ? { x: x(activeIndex), y: y(rows[activeIndex].value) } : null;
  const avgValue = vals.reduce((a, b) => a + b, 0) / vals.length;
  const avgY = y(avgValue);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 190, touchAction: primed ? "none" : "auto", cursor: "crosshair" }}
      onPointerDown={startScrub}
      onPointerMove={moveScrub}
      onPointerUp={endScrub}
      onPointerLeave={endScrub}
    >
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      <defs>
        <pattern id="portfolioDots" patternUnits="userSpaceOnUse" width="5" height="5">
          <circle cx="1" cy="1" r="0.8" fill={color} />
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
      <line x1={padL} y1={avgY} x2={W - padR} y2={avgY} stroke="var(--mute)" strokeWidth="1.25" strokeDasharray="4,3" opacity="0.55" />
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
  // weeks: [[{date, count}, ...7 days], ...]
  const cell = 20, gap = 4;
  const W = weeks.length * (cell + gap);
  const H = 7 * (cell + gap);
  const colorFor = (count) => (count === 0 ? "var(--border)" : count === 1 ? "#7a3a10" : count === 2 ? "#b5540f" : "var(--iron)");
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} style={{ width: "100%", height: 220, cursor: "pointer" }} onClick={onTap}>
      {weeks.map((week, wi) => week.map((day, di) => (
        <rect key={`${wi}-${di}`} x={wi * (cell + gap)} y={di * (cell + gap)} width={cell} height={cell} rx="4" fill={colorFor(day.count)} />
      )))}
    </svg>
  );
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
  const [view, setView] = useState("portfolio");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [showWorkoutMenu, setShowWorkoutMenu] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");

  const [form, setForm] = useState({ exercise: "", weight: "", sets: "", reps: "", isWarmup: false });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [expandedExercise, setExpandedExercise] = useState(null);

  const [chartScope, setChartScope] = useState("ALL");
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
      setForm((f) => ({ ...f, exercise: ql }));
      setView("home");
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

  const toggleRestDay = (date) => {
    const next = restDays.includes(date) ? restDays.filter((d) => d !== date) : [...restDays, date];
    persist({ workouts, exercises, entries, restDays: next });
  };

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || workouts[0];
  const activeList = exercises[activeWorkoutId] || [];

  const allExerciseNames = useMemo(() => {
    const set = new Set();
    Object.values(exercises).forEach((list) => list.forEach((e) => set.add(e)));
    entries.forEach((e) => set.add(e.exercise));
    return Array.from(set).sort();
  }, [exercises, entries]);

  const suggestions = useMemo(() => {
    const q = form.exercise.trim().toLowerCase();
    if (!q) return [];
    const starts = allExerciseNames.filter((e) => e.toLowerCase().startsWith(q));
    const contains = allExerciseNames.filter((e) => !e.toLowerCase().startsWith(q) && e.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 6);
  }, [form.exercise, allExerciseNames]);

  const createWorkout = () => {
    const name = newWorkoutName.trim();
    if (!name) return;
    const id = `w-${Date.now()}`;
    persist({ workouts: [...workouts, { id, name }], exercises: { ...exercises, [id]: [] }, entries });
    setActiveWorkoutId(id); setNewWorkoutName(""); setShowWorkoutMenu(false);
  };

  const addExerciseToList = (name, workoutId = activeWorkoutId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const list = exercises[workoutId] || [];
    if (list.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return;
    persist({ workouts, exercises: { ...exercises, [workoutId]: [...list, trimmed] }, entries });
  };

  const removeExerciseFromList = (name, workoutId) => {
    const ok = confirm(`Remove "${name}" from this workout's list? Your logged history for it stays intact — it just won't show up here or in autocomplete anymore.`);
    if (!ok) return;
    const list = exercises[workoutId] || [];
    persist({ workouts, exercises: { ...exercises, [workoutId]: list.filter((e) => e.toLowerCase() !== name.toLowerCase()) }, entries });
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

  const submitSet = () => {
    const exerciseName = form.exercise.trim();
    if (!exerciseName || !form.weight) return;
    const homeWorkoutId = findExerciseHome(exerciseName) || activeWorkoutId;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workoutId: homeWorkoutId, exercise: exerciseName, weight: Number(form.weight), sets: form.sets ? Number(form.sets) : 1, reps: form.reps ? Number(form.reps) : 0, date: selectedDate, isWarmup: !!form.isWarmup };
    const list = exercises[homeWorkoutId] || [];
    const nextExercises = list.some((e) => e.toLowerCase() === exerciseName.toLowerCase()) ? exercises : { ...exercises, [homeWorkoutId]: [...list, exerciseName] };
    persist({ workouts, exercises: nextExercises, entries: [entry, ...entries] });
    setForm((f) => ({ ...f, isWarmup: false }));
    setShowSuggestions(false);
  };

  const clearForm = () => { setForm({ exercise: "", weight: "", sets: "", reps: "", isWarmup: false }); setShowSuggestions(false); };

  const deleteEntry = (id) => persist({ workouts, exercises, entries: entries.filter((e) => e.id !== id) });
  const toggleWarmup = (id) => persist({ workouts, exercises, entries: entries.map((e) => (e.id === id ? { ...e, isWarmup: !e.isWarmup } : e)) });

  const [editingId, setEditingId] = useState(null);
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

  const entriesByExercise = useMemo(() => {
    const map = {};
    for (const e of entries) (map[e.exercise] = map[e.exercise] || []).push(e);
    Object.values(map).forEach((l) => l.sort((a, b) => (a.date < b.date ? 1 : -1)));
    return map;
  }, [entries]);

  // Warm-up sets are real reps, but they're not a signal of strength — every recommendation,
  // chart, and "best lift" calculation should ignore them so a light warm-up entry never gets
  // mistaken for a real top set or a plateau.
  const strengthEntries = useMemo(() => entries.filter((e) => !e.isWarmup), [entries]);
  const entriesByExerciseStrength = useMemo(() => {
    const map = {};
    for (const e of strengthEntries) (map[e.exercise] = map[e.exercise] || []).push(e);
    Object.values(map).forEach((l) => l.sort((a, b) => (a.date < b.date ? 1 : -1)));
    return map;
  }, [strengthEntries]);

  // Today's log shows everything logged today, regardless of which workout tab is open —
  // matches the fact that which workout a set belongs to no longer depends on the active tab.
  const todaysEntries = entries.filter((e) => e.date === selectedDate);

  const [tickerScope, setTickerScope] = useState("ALL");
  const [tickerMenuOpen, setTickerMenuOpen] = useState(false);
  const tickerSeries = useMemo(() => {
    const scopeExercises = tickerScope === "ALL" ? allExerciseNames : (exercises[tickerScope] || []);
    const list = scopeExercises.map((ex) => {
      const hist = entriesByExerciseStrength[ex] || [];
      const byDate = {};
      hist.forEach((e) => { const cur = byDate[e.date]; if (!cur || e.weight > cur.weight) byDate[e.date] = e; });
      const dates = Object.keys(byDate).sort();
      const points = dates.map((d) => ({ date: d, e1rm: estE1RM(byDate[d].weight, byDate[d].reps), weight: byDate[d].weight, reps: byDate[d].reps }));
      return { exercise: ex, points };
    }).filter((s) => s.points.length >= 3);
    list.sort((a, b) => b.points.length - a.points.length);
    return list.slice(0, 12);
  }, [tickerScope, exercises, allExerciseNames, entriesByExerciseStrength]);

  const [portfolioRange, setPortfolioRange] = useState("3m");
  const [scrubPoint, setScrubPoint] = useState(null);

  const radarData = useMemo(() => {
    return workouts.map((w) => {
      const exList = exercises[w.id] || [];
      const perExercise = exList.map((ex) => {
        const hist = (entriesByExerciseStrength[ex] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
        const byDate = {};
        hist.forEach((e) => { const cur = byDate[e.date]; if (!cur || e.weight > cur.weight) byDate[e.date] = e; });
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

  const weeklyVolume = useMemo(() => {
    const numWeeks = 8;
    const weeks = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const end = shiftDate(todayISO(), -i * 7);
      const start = shiftDate(end, -6);
      const vol = entries.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.weight * e.sets * e.reps, 0);
      weeks.push({ label: `W${numWeeks - i}`, volume: vol, start, end, isCurrent: i === 0 });
    }
    return weeks;
  }, [entries]);

  const heatmapWeeks = useMemo(() => {
    const numWeeks = 10;
    const countByDate = {};
    entries.forEach((e) => { countByDate[e.date] = (countByDate[e.date] || 0) + 1; });
    const weeks = [];
    for (let w = numWeeks - 1; w >= 0; w--) {
      const week = [];
      for (let d = 6; d >= 0; d--) {
        const date = shiftDate(todayISO(), -(w * 7 + d));
        week.push({ date, count: Math.min(countByDate[date] || 0, 3) });
      }
      weeks.push(week);
    }
    return weeks;
  }, [entries]);

  const allTimeRange = useMemo(() => {
    if (!entries.length) return null;
    const dates = entries.map((e) => e.date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [entries]);

  const [radarInfoOpen, setRadarInfoOpen] = useState(false);
  const [volumeTapInfo, setVolumeTapInfo] = useState(null);
  const [heatmapInfoOpen, setHeatmapInfoOpen] = useState(false);

  const [carouselPage, setCarouselPage] = useState(0);
  const carouselRef = useRef(null);
  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setCarouselPage(page);
  };

  const insights = useMemo(() => {
    const list = [];
    const todayIso = todayISO();
    const restSet = new Set(restDays);

    workouts.forEach((w) => {
      const wEntries = entries.filter((e) => e.workoutId === w.id);
      if (!wEntries.length) return;
      const lastDate = wEntries.reduce((max, e) => (e.date > max ? e.date : max), wEntries[0].date);
      const rawDays = Math.round((new Date(todayIso) - new Date(lastDate)) / 86400000);
      // Rest days you've explicitly marked don't count against you here.
      let restDaysInRange = 0;
      for (let i = 1; i <= rawDays; i++) {
        if (restSet.has(shiftDate(todayIso, -i))) restDaysInRange++;
      }
      const daysSince = rawDays - restDaysInRange;
      if (daysSince >= 7) list.push({ type: "stale", text: `Haven't trained ${w.name} in ${daysSince} days${restDaysInRange ? ` (${restDaysInRange} of those were rest days)` : ""}.` });
    });

    const allSeries = allExerciseNames.map((ex) => {
      const hist = entriesByExerciseStrength[ex] || [];
      const byDate = {};
      hist.forEach((e) => { const cur = byDate[e.date]; if (!cur || e.weight > cur.weight) byDate[e.date] = e; });
      const dates = Object.keys(byDate).sort();
      const points = dates.map((d) => estE1RM(byDate[d].weight, byDate[d].reps));
      const best = hist.length ? Math.max(...hist.map((e) => estE1RM(e.weight, e.reps))) : 0;
      return { exercise: ex, points, best };
    }).filter((s) => s.points.length >= 3);

    if (allSeries.length) {
      const withChange = allSeries.map((s) => ({ ...s, pct: Math.round(((s.points[s.points.length - 1] - s.points[0]) / s.points[0]) * 100) }));
      const bestMover = withChange.reduce((a, b) => (b.pct > a.pct ? b : a));
      const worstMover = withChange.reduce((a, b) => (b.pct < a.pct ? b : a));
      if (bestMover.pct > 0) list.push({ type: "up", text: `${bestMover.exercise} is up ${bestMover.pct}% — your best mover right now.` });
      if (withChange.length > 1 && worstMover.exercise !== bestMover.exercise) {
        list.push({ type: worstMover.pct < 0 ? "down" : "flat", text: worstMover.pct < 0 ? `${worstMover.exercise} is down ${Math.abs(worstMover.pct)}% — might be worth extra attention.` : `${worstMover.exercise} is up only ${worstMover.pct}% — your slowest mover.` });
      }
      const strongest = allSeries.reduce((a, b) => (b.best > a.best ? b : a));
      list.push({ type: "strongest", text: `${strongest.exercise} is your strongest lift — est. ${strongest.best} lb 1RM.` });
    }

    return list;
  }, [entries, workouts, allExerciseNames, entriesByExerciseStrength, restDays]);

  const portfolioSeries = useMemo(() => {
    const perExercise = {};
    strengthEntries.forEach((e) => {
      perExercise[e.exercise] = perExercise[e.exercise] || {};
      const cur = perExercise[e.exercise][e.date];
      if (!cur || e.weight > cur.weight) perExercise[e.exercise][e.date] = e;
    });
    const exNames = Object.keys(perExercise).filter((ex) => Object.keys(perExercise[ex]).length >= 2);
    if (exNames.length === 0) return { rows: [] };

    const baseline = {};
    exNames.forEach((ex) => {
      const dates = Object.keys(perExercise[ex]).sort();
      const firstEntry = perExercise[ex][dates[0]];
      baseline[ex] = estE1RM(firstEntry.weight, firstEntry.reps);
    });

    const sparseDatesSet = new Set();
    exNames.forEach((ex) => Object.keys(perExercise[ex]).forEach((d) => sparseDatesSet.add(d)));
    const sparseDates = Array.from(sparseDatesSet).sort();

    // One row per calendar day, not just days you logged something — a rest day (or a lift you
    // haven't touched in a while) carries its value forward flat, same as a stock that didn't
    // trade still holds its last price. The line only moves on an actual new result.
    const allDates = [];
    for (let d = sparseDates[0]; d <= todayISO(); d = shiftDate(d, 1)) allDates.push(d);

    const lastKnown = {};
    const rows = allDates.map((date) => {
      let sum = 0, count = 0;
      exNames.forEach((ex) => {
        const entry = perExercise[ex][date];
        if (entry) lastKnown[ex] = estE1RM(entry.weight, entry.reps);
        if (lastKnown[ex] !== undefined) { sum += (lastKnown[ex] / baseline[ex]) * 100; count++; }
      });
      return { date, label: fmtDate(date), value: count ? Math.round((sum / count) * 10) / 10 : null };
    }).filter((r) => r.value !== null);

    return { rows, exerciseCount: exNames.length };
  }, [strengthEntries]);

  const portfolioCutoff = useMemo(() => shiftDate(todayISO(), -RANGE_PRESETS.find((r) => r.key === portfolioRange).days), [portfolioRange]);

  // Flags an unusually large single-session swing in the Overall index, and — when it can —
  // names a likely driver: an exercise with a thin logged history swings the blended average
  // more than one of your regulars would, since it has less of its own trend to anchor against.
  const fluctuationInsight = useMemo(() => {
    const rows = portfolioSeries.rows;
    if (rows.length < 2) return null;
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const delta = Math.round((last.value - prev.value) * 10) / 10;
    if (Math.abs(delta) < 5) return null;
    const todaysExercises = strengthEntries.filter((e) => e.date === last.date).map((e) => e.exercise);
    const thin = todaysExercises.find((ex) => (entriesByExerciseStrength[ex] || []).length <= 4);
    const direction = delta > 0 ? "jumped" : "dropped";
    let text = `Overall ${direction} ${Math.abs(delta)} pts on ${last.label} — a bigger single-session swing than usual.`;
    if (thin) text += ` ${thin} has a short logged history, which can swing the blended average more than a lift you train constantly.`;
    return { type: delta > 0 ? "up" : "down", text };
  }, [portfolioSeries, strengthEntries, entriesByExerciseStrength]);

  const portfolioFiltered = useMemo(() => {
    const rows = portfolioSeries.rows.filter((r) => r.date >= portfolioCutoff);
    return rows.length ? rows : portfolioSeries.rows.slice(-2);
  }, [portfolioSeries, portfolioCutoff]);
  const portfolioChange = useMemo(() => {
    if (portfolioFiltered.length < 2) return null;
    const first = portfolioFiltered[0].value, last = portfolioFiltered[portfolioFiltered.length - 1].value;
    const pct = Math.round(((last - first) / first) * 1000) / 10;
    return { pct, up: last >= first, last };
  }, [portfolioFiltered]);
  // Rebase to "% change from the start of the selected range" — the only honest way to plot a
  // single number when it's a composite across differently-scaled exercises.
  const portfolioDisplayRows = useMemo(() => {
    if (portfolioFiltered.length < 2) return [];
    const first = portfolioFiltered[0].value;
    return portfolioFiltered.map((r) => ({ date: r.date, label: r.label, value: Math.round(((r.value - first) / first) * 1000) / 10 }));
  }, [portfolioFiltered]);

  const tickerTrackRef = useRef(null);
  const tickerPausedRef = useRef(false);
  const tickerResumeTimeout = useRef(null);
  const tickerDraggingRef = useRef(false);
  const tickerDragStartX = useRef(0);
  const tickerDragStartScroll = useRef(0);
  const tickerLastInteraction = useRef(0);
  useEffect(() => {
    let rafId;
    const step = () => {
      const el = tickerTrackRef.current;
      // Safety net: never stay paused more than 4s, even if a pointerup/touchend event got dropped
      // (happens occasionally on iOS Safari) — self-heals instead of freezing permanently.
      if (tickerPausedRef.current && Date.now() - tickerLastInteraction.current > 4000) {
        tickerPausedRef.current = false;
      }
      if (el && !tickerPausedRef.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.98;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [tickerSeries.length]);
  const pauseTicker = () => {
    tickerPausedRef.current = true;
    tickerLastInteraction.current = Date.now();
    if (tickerResumeTimeout.current) clearTimeout(tickerResumeTimeout.current);
  };
  const scheduleTickerResume = () => {
    tickerLastInteraction.current = Date.now();
    tickerResumeTimeout.current = setTimeout(() => { tickerPausedRef.current = false; }, 2000);
  };
  const tickerPointerDown = (e) => {
    pauseTicker();
    if (e.pointerType === "mouse") {
      tickerDraggingRef.current = true;
      tickerDragStartX.current = e.clientX;
      tickerDragStartScroll.current = tickerTrackRef.current ? tickerTrackRef.current.scrollLeft : 0;
    }
  };
  const tickerPointerMove = (e) => {
    if (!tickerDraggingRef.current || e.pointerType !== "mouse" || !tickerTrackRef.current) return;
    tickerLastInteraction.current = Date.now();
    tickerTrackRef.current.scrollLeft = tickerDragStartScroll.current - (e.clientX - tickerDragStartX.current);
  };
  const tickerPointerUp = () => { tickerDraggingRef.current = false; scheduleTickerResume(); };

  const rangeCutoff = useMemo(() => shiftDate(todayISO(), -RANGE_PRESETS.find((r) => r.key === chartRange).days), [chartRange]);

  const chartResult = useMemo(() => {
    const inRange = strengthEntries.filter((e) => e.date >= rangeCutoff);
    const metricVal = (entry) => (chartMetric === "e1rm" ? estE1RM(entry.weight, entry.reps) : entry.weight);

    if (chartFocusExercise) {
      const scoped = inRange.filter((e) => e.exercise === chartFocusExercise);
      const byDate = {};
      scoped.forEach((e) => { const cur = byDate[e.date]; if (!cur || e.weight > cur.weight) byDate[e.date] = e; });
      const dates = Object.keys(byDate).sort();
      const rows = dates.map((date) => {
        const entry = byDate[date];
        return { date, label: fmtDate(date), [chartFocusExercise]: metricVal(entry), [`${chartFocusExercise}__r`]: entry.reps, [`${chartFocusExercise}__s`]: entry.sets };
      });
      return { rows, series: [chartFocusExercise] };
    }

    if (chartScope === "ALL") {
      // best (heaviest) entry per exercise per date per workout
      const byWD = {};
      inRange.forEach((e) => {
        byWD[e.workoutId] = byWD[e.workoutId] || {};
        byWD[e.workoutId][e.date] = byWD[e.workoutId][e.date] || {};
        const cur = byWD[e.workoutId][e.date][e.exercise];
        if (!cur || e.weight > cur.weight) byWD[e.workoutId][e.date][e.exercise] = e;
      });
      const allDates = new Set(); Object.values(byWD).forEach((bd) => Object.keys(bd).forEach((d) => allDates.add(d)));
      const sorted = Array.from(allDates).sort();
      const rows = sorted.map((date) => {
        const row = { date, label: fmtDate(date) };
        workouts.forEach((w) => {
          const dd = byWD[w.id]?.[date];
          if (dd) {
            const entryList = Object.values(dd);
            const vals = entryList.map(metricVal);
            row[w.name] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
            row[`${w.name}__detail`] = entryList.map((e) => ({ exercise: e.exercise, weight: e.weight, reps: e.reps, sets: e.sets }));
          }
        });
        return row;
      });
      const series = workouts.filter((w) => rows.some((r) => r[w.name] !== undefined)).map((w) => w.name);
      return { rows, series };
    } else {
      const scoped = inRange.filter((e) => e.workoutId === chartScope);
      const byExDate = {};
      scoped.forEach((e) => { byExDate[e.exercise] = byExDate[e.exercise] || {}; const cur = byExDate[e.exercise][e.date]; if (!cur || e.weight > cur.weight) byExDate[e.exercise][e.date] = e; });
      const allDates = new Set(); Object.values(byExDate).forEach((bd) => Object.keys(bd).forEach((d) => allDates.add(d)));
      const sorted = Array.from(allDates).sort();
      const rows = sorted.map((date) => {
        const row = { date, label: fmtDate(date) };
        Object.keys(byExDate).forEach((ex) => {
          const entry = byExDate[ex][date];
          if (entry) { row[ex] = metricVal(entry); row[`${ex}__r`] = entry.reps; row[`${ex}__s`] = entry.sets; }
        });
        return row;
      });
      return { rows, series: Object.keys(byExDate) };
    }
  }, [strengthEntries, chartScope, rangeCutoff, chartMetric, workouts, chartFocusExercise]);

  const [recExercise, setRecExercise] = useState(null);
  const [recSearch, setRecSearch] = useState("");
  const [recSuggestOpen, setRecSuggestOpen] = useState(false);
  const recSuggestions = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    if (!q) return allExerciseNames.slice(0, 8);
    const starts = allExerciseNames.filter((e) => e.toLowerCase().startsWith(q));
    const contains = allExerciseNames.filter((e) => !e.toLowerCase().startsWith(q) && e.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 8);
  }, [recSearch, allExerciseNames]);
  const [recSets, setRecSets] = useState(3);
  const [manualWeight, setManualWeight] = useState("");
  const [manualReps, setManualReps] = useState("");

  const recommendation = useMemo(() => {
    if (!recExercise) return null;
    const hist = entriesByExerciseStrength[recExercise];
    const hasManual = manualWeight && manualReps;

    if ((!hist || !hist.length) && !hasManual) return { noData: true };

    const repLow = REC_LOW, repHigh = REC_HIGH;

    let nextTopWeight, note, lastTop, lastSessionDate, lastSession, basedOnActualSets;

    if (hist && hist.length) {
      const { pool: workingSetHist, recencyLimited } = pickWorkingBasis(hist);

      if (workingSetHist.length > 0) {
        lastSessionDate = workingSetHist[0].date;
        lastSession = workingSetHist.filter((e) => e.date === lastSessionDate).sort((a, b) => b.weight - a.weight);
        lastTop = lastSession[0];
        nextTopWeight = lastTop.weight;
        const recencyNote = recencyLimited ? " (based on your last ~2 months)" : "";

        if (progressionMode === "reps") {
          note = `Holding weight steady on purpose — aim to beat ${lastTop.reps} reps this time${recencyNote}. Switch back to weight-focused mode whenever you want the app to bump weight automatically.`;
        } else {
          const plateaued = plateauFlag(workingSetHist);
          if (lastTop.reps >= repHigh || plateaued) {
            const bump = lastTop.weight >= 100 ? 10 : 5;
            nextTopWeight = lastTop.weight + bump;
            note = plateaued && lastTop.reps < repHigh
              ? `Same top weight 3 sessions running${recencyNote} — bumping ${bump} lbs to break the plateau.`
              : `You hit ${lastTop.reps} reps last time (top of the 8–12 range)${recencyNote} — adding ${bump} lbs.`;
          } else if (lastTop.reps < repLow) {
            note = `Last working top set was ${lastTop.reps} reps, under the 8 rep floor${recencyNote} — same weight, focus on hitting 8+.`;
          } else {
            note = `Last working top set: ${lastTop.weight} lbs × ${lastTop.reps}${recencyNote}. Same weight — aim to add a rep or two before the next bump.`;
          }
        }
        basedOnActualSets = lastSession.length >= 2;
      } else {
        // Only heavy low-rep attempts on record for this exercise — estimate an 8-12 rep starting
        // weight from the best tested max instead of prescribing the max weight itself.
        const bestEntry = hist.reduce((best, e) => (estE1RM(e.weight, e.reps) > estE1RM(best.weight, best.reps) ? e : best), hist[0]);
        const e1rm = estE1RM(bestEntry.weight, bestEntry.reps);
        nextTopWeight = roundTo5(e1rm / (1 + repLow / 30));
        lastTop = bestEntry;
        lastSessionDate = bestEntry.date;
        lastSession = [bestEntry];
        note = `Only low-rep attempts logged for this exercise (best: ${bestEntry.weight} lbs × ${bestEntry.reps}) — no 8–12 rep working set on record yet. This starting weight is back-calculated from your estimated max, so treat it as a first guess and adjust by feel.`;
        basedOnActualSets = false;
      }
    } else {
      // No logged history at all — build a first recommendation straight from a reported strongest set.
      const w = Number(manualWeight), r = Number(manualReps);
      const e1rm = estE1RM(w, r);
      nextTopWeight = roundTo5(e1rm / (1 + repLow / 30));
      lastTop = { weight: w, reps: r };
      lastSessionDate = null;
      lastSession = [lastTop];
      note = `Based on the strongest set you entered (${w} lbs × ${r}) — no logged history yet, so this is a first estimate. Log a real session anytime and this'll switch to using your actual numbers.`;
      basedOnActualSets = false;
    }

    let pcts;
    if (basedOnActualSets) {
      pcts = lastSession.map((e) => e.weight / lastTop.weight);
    } else {
      pcts = [1, 0.9, 0.85, 0.8, 0.75, 0.7];
    }

    const rows = Array.from({ length: recSets }, (_, i) => {
      const pct = pcts[i] !== undefined ? pcts[i] : pcts[pcts.length - 1];
      const raw = nextTopWeight * pct;
      const w = Math.round(raw / 5) * 5;
      return { set: i + 1, weight: w };
    });

    return { noData: false, lastTop, lastSessionDate, nextTopWeight, note, rows, repLow, repHigh, basedOnActualSets, fromManual: !hist || !hist.length };
  }, [recExercise, recSets, entriesByExerciseStrength, manualWeight, manualReps, progressionMode]);

  const [goalExercise, setGoalExercise] = useState(null);
  const [goalWeight, setGoalWeight] = useState("");
  const [goalCurrentMax, setGoalCurrentMax] = useState("");
  const [goalWeeks, setGoalWeeks] = useState(5);
  const [goalDaysPerWeek, setGoalDaysPerWeek] = useState(2);
  const [goalMaxTouched, setGoalMaxTouched] = useState(false);

  useEffect(() => {
    if (!goalExercise) return;
    const hist = entriesByExerciseStrength[goalExercise];
    if (hist && hist.length && !goalMaxTouched) {
      const best = hist.reduce((m, e) => Math.max(m, estE1RM(e.weight, e.reps)), 0);
      setGoalCurrentMax(String(roundTo5(best)));
    }
  }, [goalExercise, entriesByExerciseStrength, goalMaxTouched]);

  const goalProgram = useMemo(() => {
    if (!goalExercise || !goalWeight || !goalCurrentMax || !goalWeeks) return null;
    const cur = Number(goalCurrentMax), goal = Number(goalWeight), weeks = Number(goalWeeks);
    if (!cur || !goal || !weeks) return null;
    if (goal <= cur) return { error: "Goal weight should be higher than your current max." };
    const rows = [];
    for (let w = 1; w <= weeks; w++) {
      const t = w / weeks;
      const heavyWeight = roundTo5(cur + (goal - cur) * t);
      // Reps taper by week progression (assuming your real strength is rising in step with the
      // program), not by weight-vs-goal — that comparison breaks the moment the prescribed
      // weight is above your current max, which happens almost every week by design.
      const weekFrac = weeks > 1 ? (w - 1) / (weeks - 1) : 1;
      const heavyReps = Math.max(1, Math.round(6 - 5 * weekFrac));
      const heavySets = heavyReps <= 2 ? 1 : 3;
      const week = { week: w, heavy: { weight: heavyWeight, reps: heavyReps, sets: heavySets } };
      if (goalDaysPerWeek === 2) {
        const lightWeight = roundTo5(cur + (goal - cur) * t * 0.8);
        const lightSets = w === weeks ? 1 : 3;
        week.light = { weight: lightWeight, reps: 5, sets: lightSets };
      }
      rows.push(week);
    }
    return { rows };
  }, [goalExercise, goalWeight, goalCurrentMax, goalWeeks, goalDaysPerWeek]);

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

  return (
    <div className="wrap">
      {view === "home" ? (
        <header>
          <div>
            <button className="title-btn" onClick={() => setShowWorkoutMenu((v) => !v)}>
              {activeWorkout?.name}
              <span style={{ color: "var(--mute)", fontSize: 18 }}>▾</span>
            </button>
          </div>

          {showWorkoutMenu && (
            <div className="dropdown left">
              {workouts.map((w) => (
                <button key={w.id} className="item" style={{ color: w.id === activeWorkoutId ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setActiveWorkoutId(w.id); setShowWorkoutMenu(false); }}>{w.name}</button>
              ))}
              <div className="new-row">
                <input value={newWorkoutName} onChange={(e) => setNewWorkoutName(e.target.value)} placeholder="New workout name" style={{ padding: "7px 10px", fontSize: 16, flex: 1 }} />
                <button className="btn-iron" onClick={createWorkout} style={{ padding: "0 10px" }}>+</button>
              </div>
            </div>
          )}
        </header>
      ) : null}

      {saveError && <div className="warn">{saveError}</div>}

      {!loaded ? (
        <div className="empty">Loading your log…</div>
      ) : view === "portfolio" ? (
        <>
          <div className="chart-carousel" ref={carouselRef} onScroll={onCarouselScroll}>
            <div className="chart-carousel-page">
              <div className="portfolio-change">
                {scrubPoint ? (
                  <>
                    <span style={{ color: scrubPoint.value >= 0 ? "#22c55e" : "#ef4444" }}>
                      {scrubPoint.value > 0 ? "+" : ""}{scrubPoint.value}%
                    </span>
                    <span className="cap">{scrubPoint.label}</span>
                  </>
                ) : portfolioChange ? (
                  <span style={{ color: portfolioChange.up ? "#22c55e" : "#ef4444" }}>
                    {portfolioChange.up ? "▲" : "▼"} {Math.abs(portfolioChange.pct)}%
                  </span>
                ) : <span className="cap">Not enough data yet</span>}
                {!scrubPoint && <span className="cap">{portfolioSeries.exerciseCount ? `across ${portfolioSeries.exerciseCount} exercises` : ""}</span>}
              </div>

              <div className="chart-box">
                <PortfolioChart rows={portfolioDisplayRows} color={portfolioChange?.up === false ? "#ef4444" : "#22c55e"} onScrub={setScrubPoint} />
              </div>
              <div className="axis-caption">Drag along the line to see any date — % change in overall estimated strength vs. the start of this range</div>

              <div className="pills">
                {RANGE_PRESETS.map((r) => (
                  <button key={r.key} className={"pill" + (r.key === portfolioRange ? " active" : "")} onClick={() => { setPortfolioRange(r.key); setScrubPoint(null); }}>{r.label}</button>
                ))}
              </div>
            </div>

            <div className="chart-carousel-page">
              <div className="label-sm" style={{ textAlign: "center", marginBottom: 6 }}>Strength growth by category</div>
              <RadarChart data={radarData} onTap={() => setRadarInfoOpen((v) => !v)} />
              {radarInfoOpen && allTimeRange && (
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                  {fmtDate(allTimeRange.start)} – {fmtDate(allTimeRange.end)}
                </div>
              )}
              <div className="axis-caption">Average % change in estimated 1RM across each workout's exercises, all-time — tap the chart for the exact span, hollow points mean not enough data yet</div>
            </div>

            <div className="chart-carousel-page">
              <div style={{ background: "#1d5f8a", color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center", padding: "10px 0", borderRadius: 4, marginBottom: 10 }}>This Week</div>
              <VolumeBarChart weeks={weeklyVolume} onTapBar={(w) => setVolumeTapInfo(w)} />
              {volumeTapInfo && (
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                  {volumeTapInfo.label}: {fmtDate(volumeTapInfo.start)} – {fmtDate(volumeTapInfo.end)}
                </div>
              )}
              <div className="axis-caption">Total weight × sets × reps logged each week, last 8 weeks — tap a bar for its exact dates</div>
            </div>

            <div className="chart-carousel-page">
              <div className="label-sm" style={{ textAlign: "center", marginBottom: 6 }}>Training consistency</div>
              <ConsistencyHeatmap weeks={heatmapWeeks} onTap={() => setHeatmapInfoOpen((v) => !v)} />
              {heatmapInfoOpen && heatmapWeeks.length > 0 && (
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--iron)", marginBottom: 4 }}>
                  {fmtDate(heatmapWeeks[0][0].date)} – {fmtDate(heatmapWeeks[heatmapWeeks.length - 1][6].date)}
                </div>
              )}
              <div className="axis-caption">Darker = more sets logged that day, last 10 weeks — tap the grid for the exact span</div>
            </div>
          </div>

          <div className="carousel-dots">
            {[0, 1, 2, 3].map((i) => <div key={i} className={"carousel-dot" + (carouselPage === i ? " active" : "")} />)}
          </div>

          <div className="ticker-wrap" style={{ marginTop: 22 }}>
            <button className="ticker-scope-btn" onClick={() => setTickerMenuOpen((v) => !v)}>
              {tickerScope === "ALL" ? "All Exercises" : workouts.find((w) => w.id === tickerScope)?.name} ▾
            </button>
            {tickerMenuOpen && (
              <div className="dropdown left" style={{ top: 34 }}>
                <button className="item" style={{ color: tickerScope === "ALL" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setTickerScope("ALL"); setTickerMenuOpen(false); }}>All Exercises</button>
                {workouts.map((w) => (
                  <button key={w.id} className="item" style={{ color: tickerScope === w.id ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setTickerScope(w.id); setTickerMenuOpen(false); }}>{w.name}</button>
                ))}
              </div>
            )}
            {tickerSeries.length === 0 ? (
              <div className="ticker-empty">Log 3+ sessions of an exercise to see it here.</div>
            ) : (
              <div
                className="ticker-track-outer"
                ref={tickerTrackRef}
                style={{ cursor: "grab" }}
                onPointerDown={tickerPointerDown}
                onPointerMove={tickerPointerMove}
                onPointerUp={tickerPointerUp}
                onPointerLeave={tickerPointerUp}
                onTouchStart={pauseTicker}
                onTouchEnd={scheduleTickerResume}
              >
                <div className="ticker-track">
                  {[...tickerSeries, ...tickerSeries].map((s, i) => (
                    <TickerItem key={i} series={s} onClick={() => { setChartFocusExercise(s.exercise); setView("charts"); }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {tickerScope !== "ALL" && (
            <div style={{ marginTop: 18 }}>
              <div className="label-sm" style={{ marginBottom: 10 }}>{workouts.find((w) => w.id === tickerScope)?.name} — today's targets</div>
              {(exercises[tickerScope] || []).map((ex) => {
                const rec = quickRecommend(entriesByExerciseStrength[ex], progressionMode);
                return (
                  <div key={ex} className="day-list-item">
                    <div className="day-list-name">{ex}</div>
                    {rec ? (
                      <div className="day-list-rec">
                        <div className="rec-weight">{rec.recWeight} <span style={{ fontSize: 12, color: "var(--mute)", fontWeight: 400 }}>lbs</span></div>
                        <div className="rec-reps">aim for {rec.recReps}+ reps</div>
                        <div className="rec-last">last: {rec.lastWeight} × {rec.lastReps}</div>
                      </div>
                    ) : (
                      <div className="rec-reps" style={{ color: "var(--mute)" }}>no sets logged yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(insights.length > 0 || fluctuationInsight) && (
            <div style={{ marginTop: 18 }}>
              <div className="label-sm" style={{ marginBottom: 10 }}>Insights</div>
              {[...(fluctuationInsight ? [fluctuationInsight] : []), ...insights].map((ins, i) => {
                const dotColor = ins.type === "up" || ins.type === "strongest" ? "#22c55e" : ins.type === "down" ? "#ef4444" : "var(--iron)";
                return (
                  <div key={i} className="insight-item">
                    <span className="dot" style={{ background: dotColor }} />
                    <span>{ins.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button className="log-set-row" onClick={() => setView("home")}>
            <span>Log a set</span>
            <span style={{ color: "var(--mute)", fontSize: 20 }}>›</span>
          </button>
        </>
      ) : view === "home" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          <div className="date-row">
            <button onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>‹</button>
            <button className="date-pill" onClick={() => setCalendarOpen((v) => !v)}>{fmtDateFull(selectedDate)}</button>
            <button onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>›</button>
            {calendarOpen && <CalendarPopup selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setCalendarOpen(false)} />}
          </div>

          <button className={"rest-day-btn" + (restDays.includes(selectedDate) ? " active" : "")} onClick={() => toggleRestDay(selectedDate)}>
            {restDays.includes(selectedDate) ? "✓ Rest day" : "Rest day?"}
          </button>

          <div className="card">
            <div className="label-sm">Sets × Reps</div>
            <div className="ex-input-wrap">
              <input className="ex-input" placeholder="Exercise" value={form.exercise} onChange={(e) => { setForm({ ...form, exercise: e.target.value }); setShowSuggestions(true); }} onFocus={(e) => { setShowSuggestions(true); setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => <button key={s} onClick={() => { setForm({ ...form, exercise: s }); setShowSuggestions(false); }}>{s}</button>)}
                </div>
              )}
            </div>
            <div className="row3">
              <input type="number" inputMode="decimal" placeholder="lbs" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <input type="number" inputMode="numeric" placeholder="sets" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
              <input type="number" inputMode="numeric" placeholder="reps" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, color: "var(--mute)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isWarmup} onChange={(e) => setForm({ ...form, isWarmup: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--iron)" }} />
              Warm-up set (won't count toward recommendations or your top set)
            </label>
            <button className="btn-iron save-btn" onClick={submitSet}>Save Set</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            {!addingExercise ? (
              <button className="add-ex-link" style={{ marginBottom: 0 }} onClick={() => setAddingExercise(true)}>+ Add new exercise</button>
            ) : (
              <div className="add-ex-row" style={{ marginBottom: 0, flex: 1, marginRight: 12 }}>
                <input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="Exercise name" />
                <button className="btn-iron" onClick={() => { addExerciseToList(newExerciseName); setNewExerciseName(""); setAddingExercise(false); }}>Add</button>
              </div>
            )}
            <button className="add-ex-link" style={{ marginBottom: 0, flexShrink: 0 }} onClick={clearForm}>Clear All</button>
          </div>

          {todaysEntries.length > 0 && (
            <div>
              <div className="label-sm">Logged — {fmtDateFull(selectedDate)}</div>
              <div className="today-list">
                {todaysEntries.map((e) => (
                  editingId === e.id ? (
                    <div key={e.id} className="today-item" style={{ flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>{e.exercise}</span>
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
                    <div key={e.id} className="today-item" style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
                      <span style={{ fontWeight: 600 }}>{e.exercise}{e.isWarmup && <span className="muted" style={{ fontSize: 10, fontWeight: 400 }}> (warm-up)</span>}</span>
                      <span className="num">{e.weight}<span className="muted">lbs</span>{e.reps > 0 && <span className="muted">× {e.reps}{e.sets > 1 ? ` × ${e.sets}` : ""}</span>}<button className="del-btn" onClick={() => startEdit(e)} title="Edit">✎</button><button className="del-btn" onClick={() => toggleWarmup(e.id)} title={e.isWarmup ? "Mark as working set" : "Mark as warm-up"} style={{ fontSize: 10, fontWeight: 700, color: e.isWarmup ? "var(--iron)" : "var(--mute)" }}>W</button><button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button></span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      ) : view === "exercises" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          {activeList.map((ex) => {
            const history = entriesByExercise[ex] || [];
            const strengthHistory = history.filter((e) => !e.isWarmup);
            const best = strengthHistory.reduce((m, e) => Math.max(m, e.weight), 0);
            const isOpen = expandedExercise === ex;
            const plateaued = plateauFlag(strengthHistory);
            return (
              <div key={ex} className="ex-card">
                <div className="ex-head" style={{ cursor: "pointer" }} onClick={() => setExpandedExercise(isOpen ? null : ex)}>
                  <div className="badge" style={{ background: best ? "var(--badge-on)" : "var(--surface-3)", border: `2px solid ${best ? "var(--iron)" : "var(--border)"}`, color: best ? "var(--iron)" : "var(--mute)" }}>{best || "—"}</div>
                  <div style={{ flex: 1 }}>
                    <div className="ex-name">{ex}</div>
                    <div className="ex-meta">{history.length ? `${history.length} logged · last ${fmtDate(history[0].date)}` : "no sets logged yet"}</div>
                    {plateaued && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--iron)", marginTop: 3 }}>⚠ Same top weight 3 sessions running — consider adding weight</div>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeExerciseFromList(ex, activeWorkoutId); }}
                    style={{ background: "none", border: "none", color: "var(--mute)", padding: 4, flexShrink: 0 }}
                    aria-label={`Remove ${ex}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /></svg>
                  </button>
                  <span style={{ color: "var(--mute)", transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
                </div>
                {isOpen && history.length > 0 && (
                  <div className="ex-hist">
                    {history.slice(0, 8).map((e) => (
                      editingId === e.id ? (
                        <div key={e.id} className="hist-item" style={{ flexWrap: "wrap", gap: 4 }}>
                          <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtDate(e.date)}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="number" inputMode="decimal" value={editForm.weight} onChange={(ev) => setEditForm({ ...editForm, weight: ev.target.value })} style={{ width: 48, padding: "3px 5px", fontSize: 12 }} />
                            <span className="muted" style={{ fontSize: 10 }}>×</span>
                            <input type="number" inputMode="numeric" value={editForm.reps} onChange={(ev) => setEditForm({ ...editForm, reps: ev.target.value })} style={{ width: 36, padding: "3px 5px", fontSize: 12 }} />
                            <span className="muted" style={{ fontSize: 10 }}>×</span>
                            <input type="number" inputMode="numeric" value={editForm.sets} onChange={(ev) => setEditForm({ ...editForm, sets: ev.target.value })} style={{ width: 36, padding: "3px 5px", fontSize: 12 }} />
                            <button className="del-btn" onClick={() => saveEdit(e.id)} style={{ color: "#22c55e", fontWeight: 700 }}>✓</button>
                            <button className="del-btn" onClick={cancelEdit}>✕</button>
                          </span>
                        </div>
                      ) : (
                        <div key={e.id} className="hist-item">
                          <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtDate(e.date)}</span>
                          <span className="num" style={{ opacity: e.isWarmup ? 0.55 : 1 }}>
                            {e.weight} <span className="muted">lbs ×</span> {e.reps}{e.sets > 1 && <span className="muted"> × {e.sets} sets</span>}
                            {e.isWarmup && <span className="muted" style={{ fontSize: 10 }}> (warm-up)</span>}
                          </span>
                          <button className="del-btn" onClick={() => startEdit(e)} title="Edit">✎</button>
                          <button className="del-btn" onClick={() => toggleWarmup(e.id)} title={e.isWarmup ? "Mark as working set" : "Mark as warm-up"} style={{ fontSize: 10, fontWeight: 700, color: e.isWarmup ? "var(--iron)" : "var(--mute)" }}>W</button>
                          <button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : view === "charts" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          {chartFocusExercise ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{chartFocusExercise}</span>
              <button onClick={() => setChartFocusExercise(null)} style={{ background: "none", border: "none", color: "var(--mute)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ View by workout</button>
            </div>
          ) : (
            <select className="scope" value={chartScope} onChange={(e) => { setChartScope(e.target.value); setChartFocusExercise(null); }}>
              <option value="ALL">All Workouts</option>
              {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
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
              <SvgChart rows={chartResult.rows} series={chartResult.series} mode={chartFocusExercise || chartScope !== "ALL" ? "exercise" : "workout"} metric={chartMetric} />
              <div className="legend">
                {chartResult.series.map((s, i) => <div key={s} className="legend-item"><span className="legend-dot" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />{s}</div>)}
              </div>
              <div className="chart-note">
                {chartFocusExercise ? "This exercise's heaviest set logged each day. " : chartScope === "ALL" ? "Each line is a workout day's average top set across its exercises. " : "Each line is an exercise's heaviest set logged that day. "}
                Tap a point for the exact reps, sets, and weight. {chartMetric === "e1rm" && "Est. 1RM uses the Epley formula from your top set's weight and reps."}
              </div>
            </div>
          )}
        </>
      ) : view === "recommend" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          <div className="ex-input-wrap">
            <input
              className="ex-input"
              placeholder="Search an exercise…"
              value={recExercise ? recExercise : recSearch}
              onChange={(e) => { setRecSearch(e.target.value); setRecExercise(null); setManualWeight(""); setManualReps(""); setRecSuggestOpen(true); }}
              onFocus={(e) => { setRecSuggestOpen(true); setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
              onBlur={() => setTimeout(() => setRecSuggestOpen(false), 150)}
            />
            {recSuggestOpen && recSuggestions.length > 0 && (
              <div className="suggestions">
                {recSuggestions.map((name) => (
                  <button key={name} onClick={() => { setRecExercise(name); setRecSearch(""); setManualWeight(""); setManualReps(""); setRecSuggestOpen(false); }}>{name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="pills" style={{ marginBottom: recExercise ? 12 : 16 }}>
            <button className={"pill" + (progressionMode === "weight" ? " active" : "")} onClick={() => setProgressionModeAndSave("weight")}>Increase Weight</button>
            <button className={"pill" + (progressionMode === "reps" ? " active" : "")} onClick={() => setProgressionModeAndSave("reps")}>Increase Reps</button>
          </div>
          <div className="axis-caption" style={{ marginTop: -6, marginBottom: 14 }}>
            {progressionMode === "weight"
              ? "Same weight until you hit 12 reps, then weight goes up and reps reset to 8."
              : "Weight stays put — this only tracks how many reps you can add over time. Switch back to Increase Weight whenever you're ready."}
          </div>

          {recExercise && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mute)" }}>Sets today</span>
              <button className="pill" onClick={() => setRecSets((n) => Math.max(1, n - 1))}>−</button>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, minWidth: 18, textAlign: "center" }}>{recSets}</span>
              <button className="pill" onClick={() => setRecSets((n) => Math.min(8, n + 1))}>+</button>
            </div>
          )}

          {!recExercise ? (
            <div className="empty">Pick an exercise to see a suggested weight for today.</div>
          ) : recommendation?.noData ? (
            <div className="card">
              <div className="label-sm">What's your strongest set?</div>
              <div style={{ fontSize: 13, color: "var(--chalk)", lineHeight: 1.5, marginBottom: 14 }}>
                No sets logged for {recExercise} yet. Enter the most weight you've lifted for it and how many reps — that's enough to build a first recommendation.
              </div>
              <div className="row3" style={{ marginBottom: 0 }}>
                <input type="number" inputMode="decimal" placeholder="lbs" value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} />
                <input type="number" inputMode="numeric" placeholder="reps" value={manualReps} onChange={(e) => setManualReps(e.target.value)} />
              </div>
            </div>
          ) : recommendation && (
            <div className="card">
              <div className="label-sm">
                {recommendation.fromManual ? "Strongest set" : `Last logged ${fmtDate(recommendation.lastSessionDate)}`} · {recommendation.lastTop.weight} lbs × {recommendation.lastTop.reps}
              </div>
              <div style={{ fontSize: 13, color: "var(--chalk)", marginBottom: 14, lineHeight: 1.5 }}>{recommendation.note}</div>
              <div className="today-list">
                {recommendation.rows.map((r) => (
                  <div key={r.set} className="today-item">
                    <span style={{ fontWeight: 600 }}>Set {r.set}{r.set === 1 ? " (top)" : ""}</span>
                    <span className="num">{r.weight}<span className="muted">lbs</span><span className="muted">× {recommendation.repLow}–{recommendation.repHigh}</span></span>
                  </div>
                ))}
              </div>
              <div className="chart-note" style={{ marginTop: 14 }}>
                {recommendation.basedOnActualSets
                  ? "Backoff weights are modeled on your own logged set-by-set drop-off last session."
                  : "Backoff weights use a standard pyramid (90% / 85% / 80%…) — a solid estimate from a single logged set."}
                {" "}Double progression: same weight until you hit {recommendation.repHigh} reps on the top set, then the weight goes up and reps reset to {recommendation.repLow}. This is a starting point — listen to how the weight actually feels that day.
              </div>
            </div>
          )}
        </>
      ) : view === "goal" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          <select className="scope" value={goalExercise || ""} onChange={(e) => { setGoalExercise(e.target.value || null); setGoalMaxTouched(false); }}>
            <option value="">Select an exercise…</option>
            {allExerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>

          {goalExercise && (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="label-sm">Current max (est.)</div>
                <input type="number" inputMode="decimal" value={goalCurrentMax} onChange={(e) => { setGoalCurrentMax(e.target.value); setGoalMaxTouched(true); }} style={{ width: "100%", padding: "10px 12px", fontSize: 16, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }} />

                <div className="label-sm">Goal weight</div>
                <input type="number" inputMode="decimal" placeholder="e.g. 315" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 16, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }} />

                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div className="label-sm">Weeks</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button className="pill" onClick={() => setGoalWeeks((n) => Math.max(2, n - 1))}>−</button>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, minWidth: 16, textAlign: "center" }}>{goalWeeks}</span>
                      <button className="pill" onClick={() => setGoalWeeks((n) => Math.min(12, n + 1))}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label-sm">Days/week</div>
                    <div className="pills" style={{ marginBottom: 0 }}>
                      <button className={"pill" + (goalDaysPerWeek === 1 ? " active" : "")} onClick={() => setGoalDaysPerWeek(1)}>1</button>
                      <button className={"pill" + (goalDaysPerWeek === 2 ? " active" : "")} onClick={() => setGoalDaysPerWeek(2)}>2</button>
                    </div>
                  </div>
                </div>
              </div>

              {goalProgram?.error ? (
                <div className="empty">{goalProgram.error}</div>
              ) : goalProgram && (
                <div className="card">
                  {goalProgram.rows.map((wk) => (
                    <div key={wk.week} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: wk.week < goalProgram.rows.length ? "1px solid var(--border)" : "none" }}>
                      <div className="label-sm" style={{ marginBottom: 6 }}>Week {wk.week}</div>
                      <div className="today-item" style={{ marginBottom: wk.light ? 6 : 0 }}>
                        <span style={{ fontWeight: 600 }}>{wk.light ? "Heavy" : "Working"}</span>
                        <span className="num">{wk.heavy.weight}<span className="muted">lbs ×</span> {wk.heavy.reps}<span className="muted">× {wk.heavy.sets} sets</span></span>
                      </div>
                      {wk.light && (
                        <div className="today-item">
                          <span style={{ fontWeight: 600 }}>Light</span>
                          <span className="num">{wk.light.weight}<span className="muted">lbs ×</span> {wk.light.reps}<span className="muted">× {wk.light.sets} sets</span></span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="chart-note">
                    Linear step from your current estimated max to {goalWeight} lbs by week {goalWeeks}, with reps tapering down as the weight climbs — same shape as a standard peaking block. Re-check this against how you're actually recovering; it's a starting plan, not a guarantee.
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : view === "import" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
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
      ) : null}



      <div className="bottom-nav">
        <button className={"bottom-nav-item" + (view === "portfolio" ? " active" : "")} onClick={() => setView("portfolio")}>
          <IconHome color={view === "portfolio" ? "var(--iron)" : "var(--mute)"} /><span>Overall</span>
        </button>
        <button className={"bottom-nav-item" + (view === "exercises" ? " active" : "")} onClick={() => setView("exercises")}>
          <IconDumbbell color={view === "exercises" ? "var(--iron)" : "var(--mute)"} /><span>Exercises</span>
        </button>
        <button className={"bottom-nav-item" + (view === "charts" ? " active" : "")} onClick={() => setView("charts")}>
          <IconChart color={view === "charts" ? "var(--iron)" : "var(--mute)"} /><span>Progress</span>
        </button>
        <button className={"bottom-nav-item" + (view === "recommend" ? " active" : "")} onClick={() => setView("recommend")}>
          <IconBulb color={view === "recommend" ? "var(--iron)" : "var(--mute)"} /><span>Recommend</span>
        </button>
        <button className={"bottom-nav-item" + (view === "goal" ? " active" : "")} onClick={() => setView("goal")}>
          <IconTarget color={view === "goal" ? "var(--iron)" : "var(--mute)"} /><span>Goal</span>
        </button>
        <button className={"bottom-nav-item" + (view === "import" ? " active" : "")} onClick={() => setView("import")}>
          <IconBook color={view === "import" ? "var(--iron)" : "var(--mute)"} /><span>Import</span>
        </button>
      </div>
    </div>
  );
}
