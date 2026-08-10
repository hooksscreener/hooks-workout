import { useState, useEffect, useMemo, useRef } from "react";

const LINE_COLORS = ["#ff6600", "#00d4ff", "#ffb000", "#ff3b3b", "#7CFC00", "#c792ea", "#ff6ec7", "#5ee6d0", "#a0d911", "#9a8c98"];

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
  const [active, setActive] = useState(null);
  const W = 340, H = 210, padL = 34, padR = 8, padT = 10, padB = 24;
  const allVals = [];
  rows.forEach((r) => series.forEach((s) => { if (r[s] !== undefined) allVals.push(r[s]); }));
  if (!allVals.length) return <div className="empty">No data</div>;
  const min = Math.min(...allVals) - 5, max = Math.max(...allVals) + 5;
  const n = rows.length;
  const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const xTickEvery = Math.max(1, Math.ceil(n / 5));

  const showPoint = (i, s, si) => {
    const r = rows[i];
    const color = LINE_COLORS[si % LINE_COLORS.length];
    if (mode === "exercise") {
      setActive({ x: x(i), y: y(r[s]), title: r.label, color, lines: [`${s}`, `${r[s]}${metric === "e1rm" ? " est. 1RM" : " lbs"}${r[`${s}__r`] ? ` · ${r[`${s}__r`]} reps${r[`${s}__s`] > 1 ? ` × ${r[`${s}__s`]} sets` : ""}` : ""}`] });
    } else {
      const detail = r[`${s}__detail`] || [];
      setActive({ x: x(i), y: y(r[s]), title: `${r.label} — ${s}`, color, lines: detail.map((d) => `${d.exercise}: ${d.weight} lbs × ${d.reps}${d.sets > 1 ? ` × ${d.sets}` : ""}`) });
    }
  };

  const boxW = 160, lineH = 12;
  const boxH = active ? 20 + active.lines.length * lineH : 0;
  let boxX = active ? Math.min(Math.max(active.x - boxW / 2, 2), W - boxW - 2) : 0;
  let boxY = active ? (active.y - boxH - 10 < 0 ? active.y + 12 : active.y - boxH - 10) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 230 }} onClick={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect" && e.target.dataset.bg) setActive(null); }}>
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const yy = padT + t * (H - padT - padB);
        const val = Math.round(max - t * (max - min));
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" /><text x={2} y={yy + 3} fontSize="9" fill="var(--mute)">{val}</text></g>;
      })}
      {series.map((s, si) => {
        const pts = [];
        const dots = [];
        rows.forEach((r, i) => {
          if (r[s] !== undefined) {
            pts.push(`${x(i)},${y(r[s])}`);
            dots.push(<circle key={i} cx={x(i)} cy={y(r[s])} r={5} fill={LINE_COLORS[si % LINE_COLORS.length]} stroke={INK} strokeWidth="1.5" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); showPoint(i, s, si); }} onMouseEnter={() => showPoint(i, s, si)} />);
          }
        });
        return <g key={s}><polyline points={pts.join(" ")} fill="none" stroke={LINE_COLORS[si % LINE_COLORS.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{dots}</g>;
      })}
      {rows.map((r, i) => (i % xTickEvery === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="var(--mute)" textAnchor="middle">{r.label}</text>)}

      {active && (
        <g>
          <circle cx={active.x} cy={active.y} r={7} fill={active.color || "var(--iron)"} stroke="var(--ink)" strokeWidth="2.5" />
          <circle cx={active.x} cy={active.y} r={11} fill="none" stroke={active.color || "var(--iron)"} strokeWidth="1.5" opacity="0.5" />
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill={CARD_INK} stroke="var(--border)" />
          <text x={boxX + 8} y={boxY + 14} fontSize="9" fontWeight="700" fill="var(--mute)">{active.title}</text>
          {active.lines.map((l, i) => <text key={i} x={boxX + 8} y={boxY + 14 + (i + 1) * lineH} fontSize="10" fontWeight="600" fill="var(--chalk)">{l}</text>)}
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
  const tops = distinctDates.slice(0, 3).map((d) => Math.max(...history.filter((e) => e.date === d).map((e) => e.weight)));
  return tops.every((t) => t === tops[0]);
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
function quickRecommend(hist) {
  if (!hist || !hist.length) return null;
  const { pool } = pickWorkingBasis(hist);
  if (pool.length > 0) {
    const lastSessionDate = pool[0].date;
    const lastSession = pool.filter((e) => e.date === lastSessionDate).sort((a, b) => b.weight - a.weight);
    const lastTop = lastSession[0];
    const plateaued = plateauFlag(pool);
    const shouldBump = lastTop.reps >= REC_HIGH || plateaued;
    const recWeight = shouldBump ? lastTop.weight + (lastTop.weight >= 100 ? 10 : 5) : lastTop.weight;
    const recReps = shouldBump ? REC_LOW : Math.min(REC_HIGH, lastTop.reps + 1);
    return { lastWeight: lastTop.weight, lastReps: lastTop.reps, recWeight, recReps, onlyMax: false };
  }
  const bestEntry = hist.reduce((best, e) => (estE1RM(e.weight, e.reps) > estE1RM(best.weight, best.reps) ? e : best), hist[0]);
  const e1rm = estE1RM(bestEntry.weight, bestEntry.reps);
  const recWeight = roundTo5(e1rm / (1 + REC_LOW / 30));
  return { lastWeight: bestEntry.weight, lastReps: bestEntry.reps, recWeight, recReps: REC_LOW, onlyMax: true };
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
  // Sus Machine (legsB)
  { exercise: "Sus Machine", workoutId: "legsB", weight: 170, sets: 3, reps: 8, date: "2026-02-14" },
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

function TickerItem({ series }) {
  const first = series.points[0].e1rm, last = series.points[series.points.length - 1].e1rm;
  const pctChange = first ? Math.round(((last - first) / first) * 100) : 0;
  const up = last >= first;
  const color = up ? "#22c55e" : "#ef4444";
  const latest = series.points[series.points.length - 1];
  return (
    <div className="ticker-item">
      <div className="ticker-name">{series.exercise}</div>
      <div className="ticker-value">{latest.weight}<span className="ticker-unit">× {latest.reps}</span></div>
      <Sparkline points={series.points} color={color} />
      <div className="ticker-change" style={{ color }}>{up ? "▲" : "▼"} {Math.abs(pctChange)}%</div>
    </div>
  );
}

function PortfolioChart({ rows, color }) {
  const [active, setActive] = useState(null);
  const W = 340, H = 170, padL = 4, padR = 4, padT = 10, padB = 4;
  if (rows.length < 2) return <div className="empty">Log more sessions across a few exercises to see this.</div>;
  const vals = rows.map((r) => r.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const n = rows.length;
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const showPoint = (i) => setActive({ x: x(i), y: y(rows[i].value), title: rows[i].label, value: rows[i].value });
  const pts = rows.map((r, i) => `${x(i)},${y(r.value)}`).join(" ");
  const areaPts = `${x(0)},${H} ${pts} ${x(n - 1)},${H}`;

  const boxW = 90, boxH = 34;
  let boxX = active ? Math.min(Math.max(active.x - boxW / 2, 2), W - boxW - 2) : 0;
  let boxY = active ? Math.max(active.y - boxH - 10, 2) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 190 }} onClick={(e) => { if (e.target.tagName === "svg" || e.target.dataset.bg) setActive(null); }}>
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      <polygon points={areaPts} fill={color} opacity="0.08" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {rows.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r.value)} r={10} fill="transparent" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); showPoint(i); }} onMouseEnter={() => showPoint(i)} />
      ))}
      {active && (
        <g>
          <circle cx={active.x} cy={active.y} r={6} fill={color} stroke="var(--ink)" strokeWidth="2" />
          <circle cx={active.x} cy={active.y} r={10} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill="var(--card)" stroke="var(--border)" />
          <text x={boxX + 8} y={boxY + 14} fontSize="9" fontWeight="700" fill="var(--mute)">{active.title}</text>
          <text x={boxX + 8} y={boxY + 27} fontSize="12" fontWeight="700" fill="var(--chalk)">{active.value > 0 ? "+" : ""}{active.value}%</text>
        </g>
      )}
    </svg>
  );
}

export default function Home() {
  useEffect(() => {
    const applyTheme = () => {
      const hour = new Date().getHours();
      const isDay = hour >= 7 && hour < 19;
      document.documentElement.dataset.theme = isDay ? "light" : "dark";
    };
    applyTheme();
    const interval = setInterval(applyTheme, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [passcode, setPasscode] = useState(null);
  const [passInput, setPassInput] = useState("");
  const [authError, setAuthError] = useState(null);

  const [loaded, setLoaded] = useState(false);
  const [workouts, setWorkouts] = useState(DEFAULT_WORKOUTS);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [entries, setEntries] = useState([]);
  const [saveError, setSaveError] = useState(null);

  const [activeWorkoutId, setActiveWorkoutId] = useState("push");
  const [view, setView] = useState("portfolio");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [showWorkoutMenu, setShowWorkoutMenu] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const [form, setForm] = useState({ exercise: "", weight: "", sets: "", reps: "" });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [expandedExercise, setExpandedExercise] = useState(null);

  const [chartScope, setChartScope] = useState("ALL");
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
      setWorkouts(data.workouts || DEFAULT_WORKOUTS);
      setExercises(data.exercises || DEFAULT_EXERCISES);
      setEntries(data.entries || []);
      setLoaded(true);
      setAuthError(null);
    } catch {
      setAuthError("Couldn't reach the server — check your connection.");
    }
  };

  useEffect(() => { if (passcode) loadData(passcode); }, [passcode]);

  const submitPasscode = () => {
    if (!passInput.trim()) return;
    localStorage.setItem(PASSCODE_KEY, passInput.trim());
    setPasscode(passInput.trim());
  };

  const persist = async (next) => {
    setWorkouts(next.workouts); setExercises(next.exercises); setEntries(next.entries);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json", "x-app-passcode": passcode }, body: JSON.stringify(next) });
      setSaveError(res.ok ? null : "Couldn't save — try again.");
    } catch { setSaveError("Couldn't save — check your connection."); }
  };

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || workouts[0];
  const activeList = exercises[activeWorkoutId] || [];

  const suggestions = useMemo(() => {
    const q = form.exercise.trim().toLowerCase();
    if (!q) return [];
    const starts = activeList.filter((e) => e.toLowerCase().startsWith(q));
    const contains = activeList.filter((e) => !e.toLowerCase().startsWith(q) && e.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 6);
  }, [form.exercise, activeList]);

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

  const submitSet = () => {
    const exerciseName = form.exercise.trim();
    if (!exerciseName || !form.weight) return;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workoutId: activeWorkoutId, exercise: exerciseName, weight: Number(form.weight), sets: form.sets ? Number(form.sets) : 1, reps: form.reps ? Number(form.reps) : 0, date: selectedDate };
    const list = exercises[activeWorkoutId] || [];
    const nextExercises = list.some((e) => e.toLowerCase() === exerciseName.toLowerCase()) ? exercises : { ...exercises, [activeWorkoutId]: [...list, exerciseName] };
    persist({ workouts, exercises: nextExercises, entries: [entry, ...entries] });
    setShowSuggestions(false);
  };

  const clearForm = () => { setForm({ exercise: "", weight: "", sets: "", reps: "" }); setShowSuggestions(false); };

  const deleteEntry = (id) => persist({ workouts, exercises, entries: entries.filter((e) => e.id !== id) });

  const entriesByExercise = useMemo(() => {
    const map = {};
    for (const e of entries) (map[e.exercise] = map[e.exercise] || []).push(e);
    Object.values(map).forEach((l) => l.sort((a, b) => (a.date < b.date ? 1 : -1)));
    return map;
  }, [entries]);

  const todaysEntries = entries.filter((e) => e.date === selectedDate && e.workoutId === activeWorkoutId);

  const allExerciseNames = useMemo(() => {
    const set = new Set();
    Object.values(exercises).forEach((list) => list.forEach((e) => set.add(e)));
    entries.forEach((e) => set.add(e.exercise));
    return Array.from(set).sort();
  }, [exercises, entries]);

  const [tickerScope, setTickerScope] = useState("ALL");
  const [tickerMenuOpen, setTickerMenuOpen] = useState(false);
  const tickerSeries = useMemo(() => {
    const scopeExercises = tickerScope === "ALL" ? allExerciseNames : (exercises[tickerScope] || []);
    const list = scopeExercises.map((ex) => {
      const hist = entriesByExercise[ex] || [];
      const byDate = {};
      hist.forEach((e) => { const cur = byDate[e.date]; if (!cur || e.weight > cur.weight) byDate[e.date] = e; });
      const dates = Object.keys(byDate).sort();
      const points = dates.map((d) => ({ date: d, e1rm: estE1RM(byDate[d].weight, byDate[d].reps), weight: byDate[d].weight, reps: byDate[d].reps }));
      return { exercise: ex, points };
    }).filter((s) => s.points.length >= 3);
    list.sort((a, b) => b.points.length - a.points.length);
    return list.slice(0, 12);
  }, [tickerScope, exercises, allExerciseNames, entriesByExercise]);

  const [portfolioRange, setPortfolioRange] = useState("3m");
  const portfolioSeries = useMemo(() => {
    const perExercise = {};
    entries.forEach((e) => {
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

    const allDatesSet = new Set();
    exNames.forEach((ex) => Object.keys(perExercise[ex]).forEach((d) => allDatesSet.add(d)));
    const allDates = Array.from(allDatesSet).sort();

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
  }, [entries]);

  const portfolioCutoff = useMemo(() => shiftDate(todayISO(), -RANGE_PRESETS.find((r) => r.key === portfolioRange).days), [portfolioRange]);
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
  useEffect(() => {
    let rafId;
    const step = () => {
      const el = tickerTrackRef.current;
      if (el && !tickerPausedRef.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.9;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [tickerSeries.length]);
  const pauseTicker = () => { tickerPausedRef.current = true; if (tickerResumeTimeout.current) clearTimeout(tickerResumeTimeout.current); };
  const scheduleTickerResume = () => { tickerResumeTimeout.current = setTimeout(() => { tickerPausedRef.current = false; }, 2500); };
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
    tickerTrackRef.current.scrollLeft = tickerDragStartScroll.current - (e.clientX - tickerDragStartX.current);
  };
  const tickerPointerUp = () => { tickerDraggingRef.current = false; scheduleTickerResume(); };

  const rangeCutoff = useMemo(() => shiftDate(todayISO(), -RANGE_PRESETS.find((r) => r.key === chartRange).days), [chartRange]);

  const chartResult = useMemo(() => {
    const inRange = entries.filter((e) => e.date >= rangeCutoff);
    const metricVal = (entry) => (chartMetric === "e1rm" ? estE1RM(entry.weight, entry.reps) : entry.weight);

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
  }, [entries, chartScope, rangeCutoff, chartMetric, workouts]);

  const [recExercise, setRecExercise] = useState(null);
  const [recSets, setRecSets] = useState(3);

  const recommendation = useMemo(() => {
    if (!recExercise) return null;
    const hist = entriesByExercise[recExercise];
    if (!hist || !hist.length) return { noData: true };

    const repLow = REC_LOW, repHigh = REC_HIGH;
    const { pool: workingSetHist, recencyLimited } = pickWorkingBasis(hist);

    let nextTopWeight, note, lastTop, lastSessionDate, lastSession, basedOnActualSets;

    if (workingSetHist.length > 0) {
      lastSessionDate = workingSetHist[0].date;
      lastSession = workingSetHist.filter((e) => e.date === lastSessionDate).sort((a, b) => b.weight - a.weight);
      lastTop = lastSession[0];
      const plateaued = plateauFlag(workingSetHist);
      nextTopWeight = lastTop.weight;
      const recencyNote = recencyLimited ? " (based on your last ~2 months)" : "";

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

    return { noData: false, lastTop, lastSessionDate, nextTopWeight, note, rows, repLow, repHigh, basedOnActualSets };
  }, [recExercise, recSets, entriesByExercise]);

  const [goalExercise, setGoalExercise] = useState(null);
  const [goalWeight, setGoalWeight] = useState("");
  const [goalCurrentMax, setGoalCurrentMax] = useState("");
  const [goalWeeks, setGoalWeeks] = useState(5);
  const [goalDaysPerWeek, setGoalDaysPerWeek] = useState(2);
  const [goalMaxTouched, setGoalMaxTouched] = useState(false);

  useEffect(() => {
    if (!goalExercise) return;
    const hist = entriesByExercise[goalExercise];
    if (hist && hist.length && !goalMaxTouched) {
      const best = hist.reduce((m, e) => Math.max(m, estE1RM(e.weight, e.reps)), 0);
      setGoalCurrentMax(String(roundTo5(best)));
    }
  }, [goalExercise, entriesByExercise, goalMaxTouched]);

  const goalProgram = useMemo(() => {
    if (!goalExercise || !goalWeight || !goalCurrentMax || !goalWeeks) return null;
    const cur = Number(goalCurrentMax), goal = Number(goalWeight), weeks = Number(goalWeeks);
    if (!cur || !goal || !weeks) return null;
    if (goal <= cur) return { error: "Goal weight should be higher than your current max." };
    const rows = [];
    for (let w = 1; w <= weeks; w++) {
      const t = w / weeks;
      const heavyWeight = roundTo5(cur + (goal - cur) * t);
      const heavyPct = heavyWeight / goal;
      const heavyReps = repsForPct(heavyPct);
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
      <header>
        <div>
          <div className="eyebrow"><span className="dot">●</span> Hooks Workout</div>
          <button className="title-btn" onClick={() => { setShowWorkoutMenu((v) => !v); setShowMenu(false); }}>
            {view === "portfolio" ? "Overall" : view === "home" ? activeWorkout?.name : view === "exercises" ? "Exercises" : view === "charts" ? "Progress" : view === "recommend" ? "Recommend" : view === "goal" ? "Goal Program" : view === "import" ? "Import" : "Export"}
            {view === "home" && <span style={{ color: "var(--mute)", fontSize: 18 }}>▾</span>}
          </button>
        </div>
        <button className="icon-btn" onClick={() => { setShowMenu((v) => !v); setShowWorkoutMenu(false); }}>☰</button>

        {showWorkoutMenu && view === "home" && (
          <div className="dropdown left">
            {workouts.map((w) => (
              <button key={w.id} className="item" style={{ color: w.id === activeWorkoutId ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setActiveWorkoutId(w.id); setShowWorkoutMenu(false); }}>{w.name}</button>
            ))}
            <div className="new-row">
              <input value={newWorkoutName} onChange={(e) => setNewWorkoutName(e.target.value)} placeholder="New workout name" style={{ padding: "7px 10px", fontSize: 12, flex: 1 }} />
              <button className="btn-iron" onClick={createWorkout} style={{ padding: "0 10px" }}>+</button>
            </div>
          </div>
        )}
        {showMenu && (
          <div className="dropdown right">
            <button className="item" style={{ color: view === "portfolio" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("portfolio"); setShowMenu(false); }}>Overall</button>
            <button className="item" style={{ color: view === "home" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("home"); setShowMenu(false); }}>Log a set</button>
            <button className="item" style={{ color: view === "exercises" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("exercises"); setShowMenu(false); }}>All exercises</button>
            <button className="item" style={{ color: view === "charts" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("charts"); setShowMenu(false); }}>Progress charts</button>
            <button className="item" style={{ color: view === "recommend" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("recommend"); setShowMenu(false); }}>Recommended weight</button>
            <button className="item" style={{ color: view === "goal" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("goal"); setShowMenu(false); }}>Goal program</button>
            <button className="item" style={{ color: view === "import" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("import"); setShowMenu(false); }}>Import history</button>
            <button className="item" style={{ color: view === "export" ? "var(--iron)" : "var(--chalk)" }} onClick={() => { setView("export"); setShowMenu(false); }}>Export / backup</button>
          </div>
        )}
      </header>

      {saveError && <div className="warn">{saveError}</div>}

      {!loaded ? (
        <div className="empty">Loading your log…</div>
      ) : view === "portfolio" ? (
        <>
          <div className="ticker-wrap">
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
                  {[...tickerSeries, ...tickerSeries].map((s, i) => <TickerItem key={i} series={s} />)}
                </div>
              </div>
            )}
          </div>

          {tickerScope === "ALL" ? (
            <>
              <div className="portfolio-change">
                {portfolioChange ? (
                  <span style={{ color: portfolioChange.up ? "#22c55e" : "#ef4444" }}>
                    {portfolioChange.up ? "▲" : "▼"} {Math.abs(portfolioChange.pct)}%
                  </span>
                ) : <span className="cap">Not enough data yet</span>}
                <span className="cap">{portfolioSeries.exerciseCount ? `across ${portfolioSeries.exerciseCount} exercises` : ""}</span>
              </div>

              <div className="chart-box">
                <PortfolioChart rows={portfolioDisplayRows} color={portfolioChange?.up === false ? "#ef4444" : "#22c55e"} />
              </div>
              <div className="axis-caption">% change in overall estimated strength vs. the start of this range</div>

              <div className="pills">
                {RANGE_PRESETS.map((r) => (
                  <button key={r.key} className={"pill" + (r.key === portfolioRange ? " active" : "")} onClick={() => setPortfolioRange(r.key)}>{r.label}</button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 18 }}>
              <div className="label-sm" style={{ marginBottom: 10 }}>{workouts.find((w) => w.id === tickerScope)?.name} — today's targets</div>
              {(exercises[tickerScope] || []).map((ex) => {
                const rec = quickRecommend(entriesByExercise[ex]);
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

          <div className="card">
            <div className="label-sm">Sets × Reps</div>
            <div className="ex-input-wrap">
              <input className="ex-input" placeholder="Exercise" value={form.exercise} onChange={(e) => { setForm({ ...form, exercise: e.target.value }); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
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
                  <div key={e.id} className="today-item">
                    <span style={{ fontWeight: 600 }}>{e.exercise}</span>
                    <span className="num">{e.weight}<span className="muted">lbs</span>{e.reps > 0 && <span className="muted">× {e.reps}{e.sets > 1 ? ` × ${e.sets}` : ""}</span>}<button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button></span>
                  </div>
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
            const best = history.reduce((m, e) => Math.max(m, e.weight), 0);
            const isOpen = expandedExercise === ex;
            const plateaued = plateauFlag(history);
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
                      <div key={e.id} className="hist-item">
                        <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtDate(e.date)}</span>
                        <span className="num">{e.weight} <span className="muted">lbs ×</span> {e.reps}{e.sets > 1 && <span className="muted"> × {e.sets} sets</span>}</span>
                        <button className="del-btn" onClick={() => deleteEntry(e.id)}>✕</button>
                      </div>
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
          <select className="scope" value={chartScope} onChange={(e) => setChartScope(e.target.value)}>
            <option value="ALL">All Workouts</option>
            {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
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
              <SvgChart rows={chartResult.rows} series={chartResult.series} mode={chartScope === "ALL" ? "workout" : "exercise"} metric={chartMetric} />
              <div className="legend">
                {chartResult.series.map((s, i) => <div key={s} className="legend-item"><span className="legend-dot" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />{s}</div>)}
              </div>
              <div className="chart-note">
                {chartScope === "ALL" ? "Each line is a workout day's average top set across its exercises. " : "Each line is an exercise's heaviest set logged that day. "}
                Tap a point for the exact reps, sets, and weight. {chartMetric === "e1rm" && "Est. 1RM uses the Epley formula from your top set's weight and reps."}
              </div>
            </div>
          )}
        </>
      ) : view === "recommend" ? (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
          <select className="scope" value={recExercise || ""} onChange={(e) => setRecExercise(e.target.value || null)}>
            <option value="">Select an exercise…</option>
            {allExerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>

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
            <div className="empty">No sets logged for {recExercise} yet — log a session first.</div>
          ) : recommendation && (
            <div className="card">
              <div className="label-sm">
                Last logged {fmtDate(recommendation.lastSessionDate)} · {recommendation.lastTop.weight} lbs × {recommendation.lastTop.reps}
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
                  : "Backoff weights use a standard pyramid (90% / 85% / 80%…) since you logged this as one combined entry last time — log each set separately for a more personalized backoff curve."}
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
                <input type="number" inputMode="decimal" value={goalCurrentMax} onChange={(e) => { setGoalCurrentMax(e.target.value); setGoalMaxTouched(true); }} style={{ width: "100%", padding: "10px 12px", fontSize: 15, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }} />

                <div className="label-sm">Goal weight</div>
                <input type="number" inputMode="decimal" placeholder="e.g. 315" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 15, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }} />

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
        </>
      ) : (
        <>
          <button className="back-btn" onClick={() => setView("portfolio")}>← Back</button>
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
      )}
    </div>
  );
}
