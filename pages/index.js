import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { deriveTheme, deriveFonts } from "../lib/theme";
import { unlockAudio, playClick, playWoodTriple, playBell, vibrate, VIBE } from "../lib/fx";

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
const MACHINE_BRANDS = ["Hammer Strength", "Life Fitness", "Cybex", "Hoist", "Precor", "Technogym", "Matrix", "Nautilus", "Gym80", "Panatta", "Atlantis", "Body-Solid", "Prime", "Rogue", "Arsenal Strength", "Plate Loaded", "Cable", "Smith Machine"];
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

const INK = "var(--bg)";
const CARD_INK = "var(--surface)";
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
function useHoldScrub(getIndex, onIndex, elRef) {
  const mode = useRef(null); // null | "pending" | "scrub" | "scroll"
  const start = useRef({ x: 0, y: 0 });
  const timer = useRef(null);
  const attached = useRef(null);
  const HOLD_MS = 150, MOVE = 8;
  const apply = (clientX) => { const i = getIndex(clientX); if (i !== null) onIndex(i); };
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  // The chart allows vertical panning natively (touch-action: pan-y), so swiping up or down over it
  // scrolls the page like anywhere else. Once a hold has turned into a scrub we cancel the browser's
  // scroll so the finger can drift without the page moving.
  useEffect(() => {
    const el = elRef && elRef.current;
    if (!el || attached.current === el) return undefined;
    attached.current = el;
    const guard = (ev) => { if (mode.current === "scrub" && ev.cancelable) ev.preventDefault(); };
    el.addEventListener("touchmove", guard, { passive: false });
    return undefined;
  });
  const onPointerDown = (e) => {
    if (e.pointerType === "touch") {
      mode.current = "pending";
      start.current = { x: e.clientX, y: e.clientY };
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
      if (Math.abs(dy) > MOVE && Math.abs(dy) > Math.abs(dx)) { mode.current = "scroll"; clearTimer(); return; }
      if (Math.abs(dx) > MOVE) { mode.current = "scrub"; clearTimer(); apply(e.clientX); return; }
    }
    if (mode.current === "scrub") apply(e.clientX);
  };
  const end = () => { clearTimer(); if (mode.current === "scrub") onIndex(null); mode.current = null; };
  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onPointerLeave: end };
}
const NO_SELECT = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" };

// Best set of each day as an estimated 1RM, as a % change from the first point, one row per calendar
// day (days off carry the last value forward). Used by the exercise page and the carousel cards.
function buildExSeries(list, fromISO, toISOd) {
  const byDay = {};
  list.forEach((e) => { if (!e.isWarmup) byDay[e.date] = pickBest(byDay[e.date], e); });
  const dates = Object.keys(byDay).sort().filter((d) => d >= fromISO && d <= toISOd);
  if (dates.length < 2) return null;
  const val = (d) => estE1RM(byDay[d].weight, byDay[d].reps);
  const base = val(dates[0]);
  const rows = [];
  let cur = base;
  for (let d = dates[0]; d <= toISOd; d = shiftDate(d, 1)) {
    if (byDay[d]) cur = val(d);
    rows.push({ date: d, label: fmtDate(d), value: Math.round(((cur - base) / base) * 10000) / 100 });
  }
  const first = byDay[dates[0]], latest = byDay[dates[dates.length - 1]];
  return { rows, pct: rows[rows.length - 1].value, sessions: dates.length, first, latest, e1rmNow: val(dates[dates.length - 1]), e1rmBest: Math.max(...dates.map(val)), dates };
}

// A plain-English read on one exercise, built only from the logged numbers.
function exSummary(name, series, list, ytd, W = (v) => v) {
  if (!series) return `Not enough sessions of ${name} in this range yet. Log it a couple more times and a trend shows up here.`;
  const per = ytd ? "this year" : "in this range";
  const parts = [`${series.sessions} sessions ${per}.`];
  parts.push(`Best set went from ${W(series.first.weight)} x ${series.first.reps} to ${W(series.latest.weight)} x ${series.latest.reps}, ${series.pct >= 0 ? "up" : "down"} ${Math.abs(series.pct)}% in estimated 1RM.`);
  if (series.e1rmNow >= series.e1rmBest) parts.push("The latest session is your best in this range.");
  else parts.push(`Your best estimated 1RM in this range was ${W(series.e1rmBest)}, so you are ${Math.round(((series.e1rmBest - series.e1rmNow) / series.e1rmBest) * 100)}% under it.`);
  if (plateauFlag(list.filter((e) => !e.isWarmup))) parts.push("It has held steady for the last 3 sessions.");
  return parts.join(" ");
}


const KG_PER_LB = 0.45359237;
const r1 = (n) => Math.round(n * 10) / 10;
const estE5RM = (weight, reps) => Math.round(estE1RM(weight, reps) / (1 + 5 / 30));
const fmtNum = (n) => Math.round(n).toLocaleString("en-US");
const defaultTicker = (name) => {
  // Consonants only, up to 5, spread across the words (Bench Press -> BNCPR).
  const words = String(name).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const cons = words.map((w) => w.replace(/[AEIOU]/g, "") || w);
  const n = cons.length, quota = n === 1 ? 5 : n === 2 ? 3 : n === 3 ? 2 : 1;
  let out = cons.map((c, i) => c.slice(0, i === 0 ? quota : n === 2 ? 2 : Math.min(quota, 2)));
  let res = out.join("");
  if (res.length < 5) { // top up from what was left over, in order
    const rest = cons.map((c, i) => c.slice(out[i].length)).join("");
    res += rest.slice(0, 5 - res.length);
  }
  return res.slice(0, 5);
};
// Stats for one exercise. Working sets only. rangeFrom/rangeTo bound the "this range" numbers.
function exStats(list, fromISO, toISOd) {
  const work = list.filter((e) => !e.isWarmup);
  if (!work.length) return null;
  const vol = (arr) => arr.reduce((a, e) => a + e.weight * Math.max(e.reps, 0) * (e.sets || 1), 0);
  const inR = work.filter((e) => e.date >= fromISO && e.date <= toISOd);
  const best = work.reduce((b, e) => (!b || estE1RM(e.weight, e.reps) > estE1RM(b.weight, b.reps) ? e : b), null);
  const pr = work.reduce((b, e) => (!b || e.weight > b.weight ? e : b), null);
  const reps = inR.reduce((a, e) => a + Math.max(e.reps, 0) * (e.sets || 1), 0);
  const sets = inR.reduce((a, e) => a + (e.sets || 1), 0);
  const dates = [...new Set(inR.map((e) => e.date))];
  const last = work.reduce((b, e) => (!b || e.date > b.date ? e : b), null);
  const allDates = [...new Set(work.map((e) => e.date))].sort();
  return {
    e1rm: estE1RM(best.weight, best.reps), e5rm: estE5RM(best.weight, best.reps),
    volume: vol(inR), sessions: dates.length, sets, reps,
    prWeight: pr.weight, prDate: pr.date,
    avgPerRep: reps > 0 ? Math.round(vol(inR) / reps) : 0,
    lastDate: last.date, lastSet: last,
    allVolume: vol(work), firstDate: allDates[0], allSessions: allDates.length,
  };
}

// iPhone-style row: drag right to reveal Edit, drag left to reveal Delete; a long drag runs the action.
function SwipeRow({ onEdit, onDelete, children }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const st = useRef(null);
  const REVEAL = 88, FULL = 150;
  const down = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.clientX < 20) { st.current = null; return; } // leave the screen edge to the iOS back gesture
    st.current = { x: e.clientX, y: e.clientY, mode: null, base: dx };
  };
  const move = (e) => {
    const s0 = st.current;
    if (!s0) return;
    const ddx = e.clientX - s0.x, ddy = e.clientY - s0.y;
    if (!s0.mode) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { s0.mode = "swipe"; setDragging(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      else if (Math.abs(ddy) > 8) { s0.mode = "scroll"; return; }
      else return;
    }
    if (s0.mode === "swipe") setDx(Math.max(-220, Math.min(220, s0.base + ddx)));
  };
  const up = () => {
    const s0 = st.current;
    st.current = null;
    if (!s0 || s0.mode !== "swipe") return;
    setDragging(false);
    if (dx >= FULL) { setDx(0); onEdit(); }
    else if (dx <= -FULL) { setDx(0); onDelete(); }
    else if (dx > 44) setDx(REVEAL);
    else if (dx < -44) setDx(-REVEAL);
    else setDx(0);
  };
  const cancel = () => { st.current = null; setDragging(false); setDx(0); };
  return (
    <div className="swipe-wrap">
      <div className="swipe-actions">
        <button type="button" className="sw-edit" onClick={() => { setDx(0); onEdit(); }} tabIndex={dx > 0 ? 0 : -1}>Edit</button>
        <button type="button" className="sw-del" onClick={() => { setDx(0); onDelete(); }} tabIndex={dx < 0 ? 0 : -1}>Delete</button>
      </div>
      <div className={"swipe-body" + (dragging ? " dragging" : "")} style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
        onClickCapture={(e) => { if (dx !== 0) { e.stopPropagation(); e.preventDefault(); setDx(0); } }}>
        {children}
      </div>
    </div>
  );
}


// ---- Dot-matrix numbers and title. A 5 x 7 bitmap font drawn as real dots on a canvas. ----
const APP_TITLE = "CAPITALGAINS";
const DOT_FONT = {
  "0": ["01110","10001","10011","10101","11001","10001","01110"], "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"], "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"], "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["00110","01000","10000","11110","10001","10001","01110"], "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"], "9": ["01110","10001","10001","01111","00001","00010","01100"],
  "+": ["00000","00100","00100","11111","00100","00100","00000"], "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00","00","00","00","00","11","11"], "%": ["11001","11010","00010","00100","01000","01011","10011"], " ": ["000","000","000","000","000","000","000"],
  "A": ["01110","10001","10001","11111","10001","10001","10001"], "B": ["11110","10001","10001","11110","10001","10001","11110"],
  "C": ["01110","10001","10000","10000","10000","10001","01110"], "D": ["11110","10001","10001","10001","10001","10001","11110"],
  "E": ["11111","10000","10000","11110","10000","10000","11111"], "F": ["11111","10000","10000","11110","10000","10000","10000"],
  "G": ["01110","10001","10000","10111","10001","10001","01111"], "H": ["10001","10001","10001","11111","10001","10001","10001"],
  "I": ["01110","00100","00100","00100","00100","00100","01110"], "J": ["00111","00010","00010","00010","00010","10010","01100"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"], "L": ["10000","10000","10000","10000","10000","10000","11111"],
  "M": ["10001","11011","10101","10101","10001","10001","10001"], "N": ["10001","11001","10101","10011","10001","10001","10001"],
  "O": ["01110","10001","10001","10001","10001","10001","01110"], "P": ["11110","10001","10001","11110","10000","10000","10000"],
  "Q": ["01110","10001","10001","10001","10101","10010","01101"], "R": ["11110","10001","10001","11110","10100","10010","10001"],
  "S": ["01111","10000","10000","01110","00001","00001","11110"], "T": ["11111","00100","00100","00100","00100","00100","00100"],
  "U": ["10001","10001","10001","10001","10001","10001","01110"], "V": ["10001","10001","10001","10001","10001","01010","00100"],
  "W": ["10001","10001","10001","10101","10101","10101","01010"], "X": ["10001","10001","01010","00100","01010","10001","10001"],
  "Y": ["10001","10001","01010","00100","00100","00100","00100"], "Z": ["11111","00001","00010","00100","01000","10000","11111"],
};
const dotGlyph = (ch) => DOT_FONT[ch === "−" ? "-" : ch] || DOT_FONT[" "];
const dotCols = (text) => { let c = 0; String(text).split("").forEach((ch, i) => { c += dotGlyph(ch)[0].length + (i ? 1 : 0); }); return c; };
const cssColor = (c) => {
  const m = /^var\((--[a-z-]+)\)$/.exec(c || "");
  return m && typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || "#fff" : c;
};
// Lights the dots left to right when `intro` is set (the one-time start-up animation).
function DotNum({ text, color, pitch = 6, intro = false, label }) {
  const ref = useRef(null);
  const prog = useRef(intro ? 0 : 1);
  const [, force] = useState(0);
  const cols = dotCols(text);
  const draw = () => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1, W = cols * pitch, H = 7 * pitch;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const col = cssColor(color);
    let cx = 0;
    String(text).split("").forEach((ch, i) => {
      if (i) cx += 1;
      const g = dotGlyph(ch);
      g.forEach((row, ry) => row.split("").forEach((b, rx) => {
        const colIdx = cx + rx, on = b === "1";
        const lit = on && colIdx / cols <= prog.current;
        ctx.globalAlpha = lit ? 1 : on ? 0.1 : 0.06;
        ctx.fillStyle = lit ? col : "#888";
        ctx.beginPath(); ctx.arc(colIdx * pitch + pitch / 2, ry * pitch + pitch / 2, pitch * (lit ? 0.42 : 0.28), 0, Math.PI * 2); ctx.fill();
      }));
      cx += g[0].length;
    });
    ctx.globalAlpha = 1;
  };
  useEffect(() => {
    if (!intro) return undefined;
    let raf = 0; const t0 = performance.now() + 300;
    const step = (now) => { prog.current = Math.min(1, Math.max(0, (now - t0) / 380)); draw(); if (prog.current < 1) raf = requestAnimationFrame(step); else force((x) => x + 1); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(draw);
  return <canvas ref={ref} className="dotnum" role="img" aria-label={label || String(text)} style={{ width: cols * pitch, height: 7 * pitch }} />;
}

// The app title, pulled down from the top of Overall. Anchored to the bottom, so a small pull shows the
// bottom of the letters and a full pull shows all of them.
function DotTitle({ text, height, dragging, progress = 1 }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const shown = useRef(0);
  const draw = () => {
    const cv = ref.current, wr = wrapRef.current;
    if (!cv || !wr) return;
    const cols = dotCols(text), avail = Math.max(120, wr.clientWidth);
    const pitch = Math.min(5.6, avail / cols);
    const dpr = window.devicePixelRatio || 1, W = Math.round(cols * pitch), H = Math.round(7 * pitch);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssColor("var(--text-primary)");
    const p = shown.current;
    let cx = 0;
    text.split("").forEach((ch, i) => {
      if (i) cx += 1;
      const g = dotGlyph(ch);
      g.forEach((row, ry) => row.split("").forEach((b, rx) => {
        if (b !== "1") return;
        const gx = cx + rx, hsh = (((gx * 73856093) ^ (ry * 19349663)) >>> 0) % 1000 / 1000;
        if (hsh >= p) return;
        ctx.beginPath(); ctx.arc(gx * pitch + pitch / 2, ry * pitch + pitch / 2, pitch * 0.46, 0, Math.PI * 2); ctx.fill();
      }));
      cx += g[0].length;
    });
  };
  // Dots light up in a scattered order as the pull deepens; on release they fade back out quickly.
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const target = Math.max(0, Math.min(1, progress));
      if (dragging || target > shown.current) shown.current = target;
      else shown.current += (target - shown.current) * 0.3;
      if (Math.abs(shown.current - target) < 0.01) shown.current = target;
      draw();
      if (shown.current !== target) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, dragging]);
  return (
    <div ref={wrapRef} className={"title-reveal" + (dragging ? " dragging" : "")} style={{ height }} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}

// One-time start-up effect: characters of everything under `root` appear one by one, like text being typed
// on an old terminal. Uses the CSS Custom Highlight API, so no markup is touched and nothing moves.
let introPlayed = false;
function typeIn(root, { delay = 280, duration = 620 } = {}) {
  if (typeof window === "undefined" || !root || !window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
  const nodes = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest("svg,canvas,.carousel,script,style,[data-notype]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  while (w.nextNode()) nodes.push(w.currentNode);
  const lens = nodes.map((n) => n.nodeValue.length), total = lens.reduce((a, b) => a + b, 0);
  if (!total) return;
  const start = performance.now() + delay;
  const frame = (now) => {
    const p = Math.min(1, Math.max(0, (now - start) / duration)), count = Math.floor(p * total);
    if (p >= 1) { CSS.highlights.delete("typein"); return; }
    const ranges = []; let cum = 0;
    nodes.forEach((n, i) => {
      const len = Math.min(lens[i], n.nodeValue.length), from = Math.max(0, count - cum);
      if (from < len) { try { const r = new Range(); r.setStart(n, from); r.setEnd(n, len); ranges.push(r); } catch (e) { /* node changed */ } }
      cum += lens[i];
    });
    CSS.highlights.set("typein", new Highlight(...ranges));
    requestAnimationFrame(frame);
  };
  const first = []; nodes.forEach((n) => { try { const r = new Range(); r.setStart(n, 0); r.setEnd(n, n.nodeValue.length); first.push(r); } catch (e) { /* ignore */ } });
  CSS.highlights.set("typein", new Highlight(...first));
  requestAnimationFrame(frame);
}

// A static (i) in the lower left corner of a card. Tap it to show or hide the description beside it.
function InfoFoot({ title, info }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="info-foot">
      <button type="button" className="info-dot" aria-label={`About ${title}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>i</button>
      {open && <div className="axis-caption info-body">{info}</div>}
    </div>
  );
}

function CardHead({ title, children }) {
  return (
    <div className="card-head">
      <div className="card-head-row">
        <div className="label-sm" style={{ textAlign: "center", marginBottom: 0 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function SvgChart({ rows, series, mode, metric, unit = "lbs" }) {
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
  const handlers = useHoldScrub(getIndex, setActiveIdx, svgRef);

  if (!hasData) return <div className="empty">No data</div>;

  const activeRow = activeIdx !== null && rows[activeIdx] ? rows[activeIdx] : null;
  const activeLines = activeRow
    ? series.filter((s) => activeRow[s] !== undefined).map((s) => {
        const colorIdx = series.indexOf(s);
        const detail = mode === "workout" ? (activeRow[`${s}__detail`] || []) : null;
        const suffix = mode === "exercise"
          ? `${activeRow[s]}${metric === "e1rm" ? " e1RM" : ` ${unit}`}${activeRow[`${s}__r`] ? ` · ${activeRow[`${s}__r`]} reps${activeRow[`${s}__s`] > 1 ? ` × ${activeRow[`${s}__s`]}` : ""}` : ""}`
          : `${activeRow[s]}${metric === "e1rm" ? " e1RM" : ` ${unit}`}`;
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
      style={{ width: "100%", height: 230, touchAction: "pan-y", cursor: "crosshair", ...NO_SELECT }}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      <rect data-bg="1" x="0" y="0" width={W} height={H} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const yy = padT + t * (H - padT - padB);
        const val = Math.round(max - t * (max - min));
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" /><text x={2} y={yy + 3} fontSize="9" fill="var(--text-secondary)">{val}</text></g>;
      })}
      {series.map((s, si) => {
        const pts = [];
        rows.forEach((r, i) => { if (r[s] !== undefined) pts.push(`${x(i)},${y(r[s])}`); });
        return <polyline key={s} points={pts.join(" ")} fill="none" stroke={LINE_COLORS[si % LINE_COLORS.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {n <= 24 && series.map((s, si) => rows.map((r, i) => r[s] !== undefined && <circle key={`${s}-${i}`} cx={x(i)} cy={y(r[s])} r="2.4" fill={LINE_COLORS[si % LINE_COLORS.length]} />))}
      {ticks.map((tk, i) => <text key={i} x={padL + tk.pos * (W - padL - padR)} y={H - 6} fontSize="9" fill="var(--text-secondary)" textAnchor={tk.anchor}>{fmtDate(tk.date)}</text>)}

      {activeRow && (
        <g>
          <line x1={x(activeIdx)} y1={padT} x2={x(activeIdx)} y2={H - padB} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          {activeLines.map((l) => (
            <circle key={l.series} cx={x(activeIdx)} cy={y(activeRow[l.series])} r={5} fill={l.color} stroke={INK} strokeWidth="1.5" />
          ))}
          <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill={CARD_INK} stroke="var(--border)" />
          <text x={boxX + 8} y={boxY + 14} fontSize="9" fontWeight="700" fill="var(--text-secondary)">{activeRow.label}</text>
          {(() => {
            let lineIdx = 0;
            return activeLines.map((l) => {
              const rowsOut = [];
              rowsOut.push(<text key={`${l.series}-h`} x={boxX + 8} y={boxY + 14 + (++lineIdx) * lineH} fontSize="10" fontWeight="700" fill={l.color}>{l.text}</text>);
              if (l.detail) l.detail.forEach((d, di) => {
                rowsOut.push(<text key={`${l.series}-d${di}`} x={boxX + 14} y={boxY + 14 + (++lineIdx) * lineH} fontSize="9" fontWeight="500" fill="var(--text-primary)">{d.exercise}: {d.weight} lbs × {d.reps}{d.sets > 1 ? ` × ${d.sets}` : ""}</text>);
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

// ---- Accent colors for the honeycomb picker (centre = the default Bloomberg orange) -------------------
const HONEY_COLORS = [
  "#ff6600",
  "#ffb000", "#f5d90a", "#7ed957", "#1ecbe1", "#5b8cff", "#b26bff",
  "#ff4d4d", "#ff8a5c", "#ffd24d", "#c4e86b", "#38d9a9", "#66d9e8", "#4dabf7", "#8aa0ff", "#da77f2", "#f783ac", "#ff9aa2", "#ff6ec7",
];
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const DEFAULT_SETTINGS = { mode: "dark", accent: "#ff6600", sound: true, vibe: true, ai: true, goal: "strength", fontText: "space-grotesk", fontNum: "jetbrains-mono", glass: false, gl: "ios", unit: "lbs", dotNums: true };
const TEXT_FONTS = [["space-grotesk", "Space Grotesk"], ["ibm-plex-sans", "IBM Plex Sans"], ["barlow", "Barlow"], ["inter", "Inter"], ["sf-pro", "SF Pro (system)"]];
const NUM_FONTS = [["jetbrains-mono", "JetBrains Mono"], ["ibm-plex-mono", "IBM Plex Mono"], ["sf-mono", "SF Mono (system)"], ["space-mono", "Space Mono"], ["same", "Same as text font"]];
const GOALS = [
  { key: "strength", label: "Build strength" },
  { key: "muscle", label: "Build muscle" },
  { key: "back", label: "Get back on track" },
  { key: "general", label: "General fitness" },
];

// ---- Digest: the numbers behind the cards -------------------------------------------------------------
// Compares the last 30 days with the 30 before. The app does the math; the AI (or the plain fallback
// below) only words it, so the cards can't invent figures.
const DIGEST_WINDOW = 30;
const hashStr = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

function computeDigestStats({ strengthEntries, dayStats, todayIso, workouts, exercises, due, goal, unit = "lbs" }) {
  const cw = (w) => (unit === "kg" ? r1(w * KG_PER_LB) : w);
  const curStart = shiftDate(todayIso, -(DIGEST_WINDOW - 1));
  const prevStart = shiftDate(todayIso, -(2 * DIGEST_WINDOW - 1));
  const prevEnd = shiftDate(curStart, -1);
  const byEx = {};
  strengthEntries.forEach((e) => { if (e.date >= prevStart) (byEx[e.exercise] = byEx[e.exercise] || []).push(e); });
  const sess = (arr) => new Set(arr.map((e) => e.date)).size;
  const setsOf = (arr) => arr.reduce((t, e) => t + Math.max(1, e.sets || 1), 0);
  const topW = (arr) => Math.max(...arr.map((e) => e.weight));
  const best = (arr) => arr.reduce((b, e) => (!b || estE1RM(e.weight, e.reps) > estE1RM(b.weight, b.reps) ? e : b), null);
  const perWeek = (n) => Math.round((n / (DIGEST_WINDOW / 7)) * 10) / 10;
  const lifts = [], stalled = [];
  Object.entries(byEx).forEach(([name, list]) => {
    const cur = list.filter((e) => e.date >= curStart), prev = list.filter((e) => e.date <= prevEnd);
    if (sess(list) >= 3 && plateauFlag(list)) stalled.push(name);
    if (!cur.length || !prev.length) return;
    const bc = best(cur), bp = best(prev);
    const ec = estE1RM(bc.weight, bc.reps), ep = estE1RM(bp.weight, bp.reps);
    const wc = topW(cur), wp = topW(prev);
    const drivers = [];
    if (wc !== wp) drivers.push(`top weight ${wc > wp ? "up" : "down"} from ${cw(wp)} to ${cw(wc)} ${unit}`);
    const prevAtW = prev.filter((e) => e.weight === wc);
    if (prevAtW.length) {
      const rc = Math.max(...cur.filter((e) => e.weight === wc).map((e) => e.reps)), rp = Math.max(...prevAtW.map((e) => e.reps));
      if (rc !== rp) drivers.push(`best reps at ${cw(wc)} ${unit} ${rc > rp ? "up" : "down"} from ${rp} to ${rc}`);
    }
    if (sess(cur) !== sess(prev)) drivers.push(`${sess(cur)} sessions vs ${sess(prev)} in the prior 30 days`);
    if (setsOf(cur) !== setsOf(prev)) drivers.push(`about ${perWeek(setsOf(cur))} sets a week vs ${perWeek(setsOf(prev))}`);
    lifts.push({ name, changePct: Math.round(((ec - ep) / ep) * 1000) / 10, bestNow: `${cw(bc.weight)} x ${bc.reps}`, bestBefore: `${cw(bp.weight)} x ${bp.reps}`, e1rmNow: cw(ec), e1rmBefore: cw(ep), drivers });
  });
  const improving = lifts.filter((l) => l.changePct >= 2).sort((a, b) => b.changePct - a.changePct).slice(0, 3);
  const slipping = lifts.filter((l) => l.changePct <= -2).sort((a, b) => a.changePct - b.changePct).slice(0, 3);
  const flagged = new Set([...improving, ...slipping].map((l) => l.name));
  const overdue = dayStats.filter((d) => d.days >= 4 && d.days !== Infinity).sort((a, b) => b.days - a.days).slice(0, 2).map((d) => ({ day: d.workout.name, daysSinceFullSession: d.days }));
  const curSessions = sess(strengthEntries.filter((e) => e.date >= curStart)), prevSessions = sess(strengthEntries.filter((e) => e.date >= prevStart && e.date <= prevEnd));
  // Last workout: the most recent date anything was logged, with the best set of each exercise.
  let lastWorkout = null;
  if (strengthEntries.length) {
    const lastDate = strengthEntries.reduce((m, e) => (e.date > m ? e.date : m), "");
    const dayEntries = strengthEntries.filter((e) => e.date === lastDate);
    const exSet = new Set(dayEntries.map((e) => e.exercise.toLowerCase()));
    let dayName = null, bestN = 0;
    (workouts || []).forEach((w) => {
      const n = ((exercises || {})[w.id] || []).filter((x) => exSet.has(x.toLowerCase())).length;
      if (n > bestN) { bestN = n; dayName = w.name; }
    });
    const per = {};
    dayEntries.forEach((e) => {
      const p = (per[e.exercise] = per[e.exercise] || { sets: 0, top: null });
      p.sets += Math.max(1, e.sets || 1);
      if (!p.top || estE1RM(e.weight, e.reps) > estE1RM(p.top.weight, p.top.reps)) p.top = e;
    });
    const topSets = Object.entries(per)
      .map(([exercise, p]) => ({ exercise, topSet: `${cw(p.top.weight)} x ${p.top.reps}`, sets: p.sets, score: estE1RM(p.top.weight, p.top.reps) }))
      .sort((a, b) => b.score - a.score).slice(0, 6).map((t) => ({ exercise: t.exercise, topSet: t.topSet, sets: t.sets }));
    lastWorkout = { date: lastDate, daysAgo: daysBetween(lastDate, todayIso), day: dayName, topSets };
  }
  // New PRs: best estimated 1RM in the current window beats everything logged before it.
  const newPRs = [];
  const allBy = {};
  strengthEntries.forEach((e) => { (allBy[e.exercise] = allBy[e.exercise] || []).push(e); });
  Object.entries(allBy).forEach(([name, list]) => {
    const cur = list.filter((e) => e.date >= curStart), old = list.filter((e) => e.date < curStart);
    if (!cur.length || !old.length) return;
    const bc = best(cur), bo = best(old);
    const ec = estE1RM(bc.weight, bc.reps), eo = estE1RM(bo.weight, bo.reps);
    if (ec > eo) newPRs.push({ exercise: name, now: `${cw(bc.weight)} x ${bc.reps}`, before: `${cw(bo.weight)} x ${bo.reps}`, date: bc.date, gainPct: Math.round(((ec - eo) / eo) * 1000) / 10 });
  });
  newPRs.sort((a, b) => b.gainPct - a.gainPct);
  const dueNext = due ? { day: due.day, daysSinceFullSession: Number.isFinite(due.days) ? due.days : null } : null;
  return { windowDays: DIGEST_WINDOW, unit, goal: goal || "", lastWorkout, newPRs: newPRs.slice(0, 3), dueNext, improving, slipping, stalled: stalled.filter((n) => !flagged.has(n)).slice(0, 3), overdue, trainingDaysNow: curSessions, trainingDaysBefore: prevSessions, liftsCompared: lifts.length };
}

// Plain-English digest built straight from the stats. Used when AI is off, unavailable or fails.
function digestBasic(stats) {
  const out = {
    last: "Log a few sessions and your last workout shows up here.",
    up: "Nothing to compare yet. The digest looks at the last 30 days against the 30 before.",
    down: "Nothing slipping or flat yet.",
    due: "Pick a day on the Workout tab to get started.",
  };
  if (!stats) return out;
  const lw = stats.lastWorkout;
  if (lw) {
    const when = lw.daysAgo === 0 ? "today" : lw.daysAgo === 1 ? "yesterday" : `${lw.daysAgo} days ago`;
    out.last = `${lw.day ? lw.day + ", " : ""}${when}: ` + lw.topSets.slice(0, 4).map((t) => `${t.exercise} ${t.topSet}`).join(", ") + "." + (stats.newPRs.length ? ` New PR: ${stats.newPRs[0].exercise} ${stats.newPRs[0].now}.` : "");
  }
  if (stats.improving.length) {
    const l = stats.improving[0];
    out.up = stats.improving.map((x) => `${x.name} +${x.changePct}%`).join(", ") + "." + (l.drivers.length ? ` Likely why: ${l.drivers[0]}.` : "");
  } else out.up = "No clear gains over the last 30 days yet.";
  if (stats.slipping.length) {
    const l = stats.slipping[0];
    out.down = stats.slipping.map((x) => `${x.name} -${Math.abs(x.changePct)}%`).join(", ") + "." + (l.drivers.length ? ` Likely why: ${l.drivers[0]}.` : "") + (stats.stalled.length ? ` Flat: ${stats.stalled.join(", ")}.` : "");
  } else if (stats.stalled.length) out.down = `Flat for 3 sessions: ${stats.stalled.join(", ")}.`;
  if (stats.dueNext) out.due = `${stats.dueNext.day} is due` + (stats.dueNext.daysSinceFullSession !== null ? `, ${stats.dueNext.daysSinceFullSession} days since a full session.` : ".");
  return out;
}

const NAV_ICON_PROPS = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function IconHome({ color, size }) { return <svg {...NAV_ICON_PROPS} width={size || NAV_ICON_PROPS.width} height={size || NAV_ICON_PROPS.height} stroke={color}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>; }
function IconDumbbell({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color} style={{ transform: "rotate(45deg)" }}><path d="M6 7v10M18 7v10" /><path d="M2 10v4M22 10v4" /><path d="M6 12h12" strokeWidth="3" /></svg>; }
function IconChart({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M7 16l4-5 3 3 5-7" /></svg>; }
function IconBulb({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a6 6 0 00-4 10.5c.7.6 1 1.3 1 2.5h6c0-1.2.3-1.9 1-2.5A6 6 0 0012 2z" /></svg>; }
function ClearX({ onClick, label }) {
  return (
    <button type="button" className="clear-x" aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6" /></svg>
    </button>
  );
}

function IconGear({ size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>; }
function IconTarget({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} /></svg>; }
function IconBook({ color }) { return <svg {...NAV_ICON_PROPS} stroke={color}><path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5v-17z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></svg>; }

// A honeycomb of hexagonal color swatches: the centre one is the default, two rings around it.
function HoneyPicker({ value, onPick }) {
  const SIZE = 19, SQ3 = Math.sqrt(3);
  const spots = [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1]];
  const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 30); return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  return (
    <svg viewBox="-86 -78 172 156" style={{ width: "100%", maxWidth: 206, display: "block", margin: "16px auto 24px" }} role="radiogroup" aria-label="Accent color">
      {spots.map(([q, r], i) => {
        const cx = SIZE * SQ3 * (q + r / 2), cy = SIZE * 1.5 * r;
        const color = HONEY_COLORS[i];
        const on = (value || "").toLowerCase() === color;
        return (
          <polygon key={color} points={hexPts(cx, cy, SIZE * 0.97)} fill={color} stroke={on ? "var(--text-primary)" : "var(--bg)"} strokeWidth={on ? 3 : 1.5} strokeLinejoin="round"
            role="radio" aria-checked={on} aria-label={color} style={{ cursor: "pointer" }} onClick={() => onPick(color)} />
        );
      })}
    </svg>
  );
}

function PortfolioChart({ rows, maRows, color, onScrub, intro = false }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const introRef = useRef(intro);
  const revealRef = useRef(intro ? 0 : 1);
  const svgRef = useRef(null);
  // Measure the real box so the line runs edge to edge with nothing letterboxed.
  const [box, setBox] = useState({ w: 340, h: 170 });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setBox((b) => (Math.abs(b.w - r.width) > 0.5 || Math.abs(b.h - r.height) > 0.5 ? { w: r.width, h: r.height } : b)); };
    measure();
    window.addEventListener("resize", measure);
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    return () => { window.removeEventListener("resize", measure); if (ro) ro.disconnect(); };
  }, [rows.length]);
  const W = box.w, H = box.h, padL = 0, padR = 0, padT = 12, padB = 2;
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
  const handlers = useHoldScrub(getIndex, setActive, svgRef);

  // The shaded area is a field of real dots on a canvas, so the ones around your finger can swell
  // while you hold: about 3 dots to each side and 6 below the line.
  const baseRef = useRef(null), hotRef = useRef(null);
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return undefined;
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => mo.disconnect();
  }, []);
  useEffect(() => {
    if (!introRef.current) return undefined;
    let raf = 0; const t0 = performance.now() + 230;
    const step = (now) => { revealRef.current = Math.min(1, Math.max(0, (now - t0) / 420)); setThemeTick((t) => t + 1); if (revealRef.current < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const DOT_GAP = 3.2;
  const resolveColor = (c) => {
    const m = /^var\((--[a-z-]+)\)$/.exec(c || "");
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || "#34C759" : c;
  };
  const lineYAt = (px) => {
    const f = Math.min(n - 1, Math.max(0, (px - padL) / ((W - padL - padR) / (n - 1))));
    const i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), fr = f - i0;
    return y(rows[i0].value) * (1 - fr) + y(rows[i1].value) * fr;
  };
  const fadeAt = (gy) => { const f = gy / H; return f <= 0.7 ? 1 - 0.65 * (f / 0.7) : 0.35 * Math.max(0, 1 - (f - 0.7) / 0.3); };
  const setupCanvas = (cv) => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(W * dpr)), h = Math.max(1, Math.round(H * dpr));
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    return ctx;
  };
  useEffect(() => {
    const cv = baseRef.current;
    if (!cv || n < 2) return;
    const ctx = setupCanvas(cv);
    ctx.fillStyle = resolveColor(color);
    for (let gx = 1.6; gx < W; gx += DOT_GAP) {
      const ly = lineYAt(gx);
      for (let gy = 1.6; gy < H; gy += DOT_GAP) {
        if (gy < ly) continue;
        if (gy > revealRef.current * H) break; // start-up: the dots come in from the top, row by row
        const a = fadeAt(gy);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  });
  useEffect(() => {
    const cv = hotRef.current;
    if (!cv || n < 2) return;
    const ctx = setupCanvas(cv);
    if (activeIndex === null || !rows[activeIndex]) return;
    const ax = x(activeIndex), ay = y(rows[activeIndex].value);
    const rx = 3.5 * DOT_GAP, ry = 6.5 * DOT_GAP;
    ctx.fillStyle = resolveColor(color);
    const startX = Math.floor((ax - rx) / DOT_GAP) * DOT_GAP + 1.6;
    for (let gx = startX; gx < ax + rx; gx += DOT_GAP) {
      if (gx < 0 || gx > W) continue;
      const ly = lineYAt(gx);
      for (let gy = Math.floor(ay / DOT_GAP) * DOT_GAP + 1.6; gy < ay + ry; gy += DOT_GAP) {
        if (gy < ly || gy > H) continue;
        const dx = (gx - ax) / rx, dy = (gy - ay) / ry, d2 = dx * dx + dy * dy;
        if (d2 >= 1) continue;
        const k = (1 - d2) * (1 - d2);
        ctx.globalAlpha = Math.min(1, fadeAt(gy) + 0.55 * k);
        ctx.beginPath(); ctx.arc(gx, gy, 0.9 + 1.5 * k, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  });

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
    <>
    <canvas ref={baseRef} className="pf-dots" aria-hidden="true" />
    <canvas ref={hotRef} className="pf-dots" aria-hidden="true" />
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="pf-chart"
      style={{ width: "100%", touchAction: "pan-y", cursor: "crosshair", ...NO_SELECT }}
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
      <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="2,4" opacity="0.7" />
      {maRuns.map((run, i) => (
        <polyline key={i} points={run.join(" ")} fill="none" stroke="var(--ma)" strokeWidth="1.5" strokeDasharray="1,3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      ))}
      <polyline points={pts} pathLength="1" className={introRef.current ? "pf-line pf-line-intro" : "pf-line"} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {active && (
        <g>
          <line x1={active.x} y1={padT} x2={active.x} y2={H} stroke={color} strokeWidth="1" opacity="0.35" strokeDasharray="3,3" />
          <circle cx={active.x} cy={active.y} r={6} fill={color} stroke="var(--bg)" strokeWidth="2" />
          <circle cx={active.x} cy={active.y} r={10} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
        </g>
      )}
    </svg>
    </>
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
        <polygon points={data.map((_, i) => pt(i, zeroR).join(",")).join(" ")} fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3,3" />
      )}
      <polygon points={dataPath} fill="var(--text-primary)" fillOpacity="0.2" stroke="var(--text-primary)" strokeWidth="2" strokeLinejoin="round" />
      {dataPts.map(([x, y], i) => (
        data[i].hasData
          ? <circle key={i} cx={x} cy={y} r="3.5" fill="var(--text-primary)" />
          : <circle key={i} cx={x} cy={y} r="4" fill="var(--bg)" stroke="var(--text-secondary)" strokeWidth="1.5" strokeDasharray="2,2" />
      ))}
      {data.map((d, i) => {
        const [lx, ly] = pt(i, outerR + 22);
        return <text key={i} x={lx} y={ly} fontSize="10" fontWeight="700" fill="var(--text-primary)" textAnchor="middle" dominantBaseline="central">{d.label}</text>;
      })}
    </svg>
  );
}

function VolumeBarChart({ weeks, onTapBar, dots }) {
  const W = 340, H = 190, padL = 34, padR = 8, padT = 10, padB = 22;
  const max = Math.max(...weeks.map((w) => w.volume), 1);
  const n = weeks.length;
  const bw = (W - padL - padR) / n - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }}>
      {[0.25, 0.5, 0.75, 1].map((t, i) => {
        const yy = padT + (1 - t) * (H - padT - padB);
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth="1" opacity="0.5" /><text x={2} y={yy + 3} fontSize="8" fill="var(--text-secondary)">{Math.round((max * t) / 1000)}k</text></g>;
      })}
      {weeks.map((w, i) => {
        const h = (w.volume / max) * (H - padT - padB);
        const x = padL + i * ((W - padL - padR) / n) + 3;
        return <g key={i} onClick={() => onTapBar && onTapBar(w)} style={{ cursor: "pointer" }}>
          <rect x={x - 2} y={padT} width={bw + 4} height={H - padT - padB} fill="transparent" />
          {dots
            ? (() => { const pt = 6.4, nc = Math.max(1, Math.floor(bw / pt)), nr = Math.floor(h / pt), x0 = x + (bw - nc * pt) / 2 + pt / 2; const out = []; for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) out.push(<circle key={r + "-" + c} cx={x0 + c * pt} cy={H - padB - pt / 2 - r * pt} r="2.4" fill="var(--accent)" fillOpacity={w.isCurrent ? 1 : 0.45} />); if (!nr) out.push(<circle key="z" cx={x + bw / 2} cy={H - padB - 2} r="1.8" fill="var(--border)" />); return out; })()
            : <rect x={x} y={H - padB - h} width={bw} height={h} rx="3" fill="var(--accent)" fillOpacity={w.isCurrent ? 1 : 0.45} />}
          <text x={x + bw / 2} y={H - 6} fontSize="8" fill="var(--text-secondary)" textAnchor="middle">{w.label}</text>
        </g>;
      })}
    </svg>
  );
}

function ConsistencyHeatmap({ weeks, onTap, dots }) {
  // weeks: [[{date, count, future}, ...7 days Monday to Sunday], ...]
  const cell = 20, gap = 4;
  const W = weeks.length * (cell + gap);
  const H = 7 * (cell + gap);
  const colorFor = () => "var(--accent)";
  const opFor = (count) => (count === 0 ? 0 : count === 1 ? 0.3 : count === 2 ? 0.6 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} style={{ width: "100%", height: 220, cursor: "pointer" }} onClick={onTap}>
      {dots ? weeks.map((week, wi) => week.map((day, di) => {
        const cxx = wi * (cell + gap) + cell / 2, cyy = di * (cell + gap) + cell / 2;
        if (day.future) return <circle key={`${wi}-${di}`} cx={cxx} cy={cyy} r="2.2" fill="none" stroke="var(--border)" strokeWidth="1" />;
        if (day.count === 0) return <circle key={`${wi}-${di}`} cx={cxx} cy={cyy} r="2.4" fill="var(--border)" />;
        return <circle key={`${wi}-${di}`} cx={cxx} cy={cyy} r={day.count === 1 ? 5 : day.count === 2 ? 7.5 : 9.5} fill="var(--accent)" fillOpacity={opFor(day.count)} />;
      })) : weeks.map((week, wi) => week.map((day, di) => (
        <rect key={`${wi}-${di}`} x={wi * (cell + gap)} y={di * (cell + gap)} width={cell} height={cell} rx="4" fill={day.future ? "none" : day.count === 0 ? "var(--border)" : colorFor(day.count)} fillOpacity={day.future || day.count === 0 ? 1 : opFor(day.count)} stroke={day.future ? "var(--border)" : "none"} strokeDasharray={day.future ? "2,3" : undefined} />
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
    // Tuned by eye in a real browser. A dot's color scales from black (wave far away) up to this
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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState("");
  const [me, setMe] = useState(null);                       // { role: "owner" | "tester", name }
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackList, setFeedbackList] = useState(null);
  const [workouts, setWorkouts] = useState(DEFAULT_WORKOUTS);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [entries, setEntries] = useState([]);
  const [restDays, setRestDays] = useState([]);
  const [progressionMode, setProgressionMode] = useState("weight"); // "weight" | "reps"
  const unit = settings.unit === "kg" ? "kg" : "lbs";
  const W = (lbs) => (unit === "kg" ? r1(lbs * KG_PER_LB) : r1(lbs)); // pounds in, display number out
  const Wrec = (lbs) => (unit === "kg" ? Math.round((lbs * KG_PER_LB) / 2.5) * 2.5 : lbs); // suggested weights land on plates
  const toLbs = (v) => (unit === "kg" ? Math.round((Number(v) / KG_PER_LB) * 1000) / 1000 : Number(v));
  const cvText = (str) => (unit === "kg" ? String(str).replace(/(\d+(?:\.\d+)?)\s*lbs?\b/g, (m, n) => `${Math.round(Number(n) * KG_PER_LB * 2) / 2} kg`) : str);
  const [tickers, setTickers] = useState({});
  const [restTimes, setRestTimes] = useState({});
  const [saveError, setSaveError] = useState(null);

  const [activeWorkoutId, setActiveWorkoutId] = useState("push");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);


  const [form, setForm] = useState({ exercise: "", weight: "", sets: "", reps: "", isWarmup: false });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseBrand, setNewExerciseBrand] = useState("");
  const [newExerciseTicker, setNewExerciseTicker] = useState("");
  const [newExerciseDays, setNewExerciseDays] = useState([]); // workout ids the new exercise belongs to
  const [progQuery, setProgQuery] = useState("");   // the Progress search box (independent of the log search)
  const [progOpen, setProgOpen] = useState(false);
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
        persist({ workouts: nextWorkouts, exercises: nextExercises, entries: nextEntries, restDays: nextRestDays, progressionMode: nextProgressionMode, tickers: data.tickers || {}, restTimes: data.restTimes || {} });
      }

      setWorkouts(nextWorkouts);
      setExercises(nextExercises);
      setEntries(nextEntries);
      setRestDays(nextRestDays);
      setTickers(data.tickers || {});
      setRestTimes(data.restTimes || {});
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

  // ---- Look & feel: dark / light / system and one accent color, remembered on this device ----------
  useEffect(() => {
    try { const raw = localStorage.getItem("hooksSettings"); if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch (e) { /* ignore */ }
  }, []);
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
    const apply = () => {
      const t = deriveTheme(settings.mode, settings.accent, mq ? mq.matches : false, settings.gl);
      const root = document.documentElement;
      root.setAttribute("data-theme", t.scheme);
      Object.keys(t.vars).forEach((k) => root.style.setProperty(k, t.vars[k]));
      const fv = deriveFonts(settings.fontText, settings.fontNum);
      Object.keys(fv).forEach((k) => root.style.setProperty(k, fv[k]));
      if (settings.glass) root.setAttribute("data-nav", "glass"); else root.removeAttribute("data-nav");
      if (settings.dotNums !== false) root.setAttribute("data-dotnums", "on"); else root.removeAttribute("data-dotnums");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t.themeColor);
    };
    apply();
    if (settings.mode === "system" && mq && mq.addEventListener) { mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply); }
    return undefined;
  }, [settings.mode, settings.accent, settings.fontText, settings.fontNum, settings.glass, settings.gl, settings.dotNums]);
  const updateSettings = (patch) => setSettings((cur) => {
    const next = { ...cur, ...patch };
    try { localStorage.setItem("hooksSettings", JSON.stringify(next)); } catch (e) { /* ignore */ }
    return next;
  });
  // Browsers only allow sound after a tap, so wake the audio engine on the first touch.
  useEffect(() => {
    const wake = () => { unlockAudio(); window.removeEventListener("pointerdown", wake); };
    window.addEventListener("pointerdown", wake);
    return () => window.removeEventListener("pointerdown", wake);
  }, []);
  const fx = (kind) => {
    if (kind === "click") { if (settings.sound) playClick(); if (settings.vibe) vibrate(VIBE.click); }
    else if (kind === "warning") { if (settings.sound) playWoodTriple(); if (settings.vibe) vibrate(VIBE.warning); }
    else if (kind === "done") { if (settings.sound) playBell(); if (settings.vibe) vibrate(VIBE.done); }
  };
  const authHeaders = () => ({ "x-app-passcode": passcode });
  useEffect(() => {
    if (!passcode) return;
    fetch("/api/me", { headers: { "x-app-passcode": passcode } }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setMe(d); }).catch(() => {});
  }, [passcode]);
  const sendFeedback = async () => {
    const message = feedbackText.trim();
    if (!message) return;
    setFeedbackStatus("Sending…");
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ message }) });
      if (res.ok) { setFeedbackText(""); setFeedbackStatus("Sent. Thank you."); } else setFeedbackStatus(res.status === 429 ? "That's enough for today." : "Couldn't send, try again.");
    } catch (e) { setFeedbackStatus("Couldn't send, check your connection."); }
  };
  const loadFeedback = async () => {
    try {
      const res = await fetch("/api/feedback", { headers: authHeaders() });
      if (res.ok) setFeedbackList((await res.json()).items || []);
    } catch (e) { /* ignore */ }
  };
  const signOut = () => { try { localStorage.removeItem(PASSCODE_KEY); } catch (e) { /* ignore */ } window.location.reload(); };

  const persist = async (next) => {
    const payload = {
      ...next,
      restDays: next.restDays !== undefined ? next.restDays : restDays,
      progressionMode: next.progressionMode !== undefined ? next.progressionMode : progressionMode,
      tickers: next.tickers !== undefined ? next.tickers : tickers,
      restTimes: next.restTimes !== undefined ? next.restTimes : restTimes,
    };
    setTickers(payload.tickers || {});
    setRestTimes(payload.restTimes || {});
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

  // Auto tickers, made unique: a repeat gets a number on the end (BNCPR, BNCP2).
  const autoTickers = useMemo(() => {
    const used = new Set(Object.values(tickers || {})), map = {};
    allExerciseNames.forEach((nm) => {
      if (tickers && tickers[nm]) return;
      let t = defaultTicker(nm), k = 2;
      while (used.has(t)) { t = defaultTicker(nm).slice(0, 4) + k; k += 1; }
      used.add(t); map[nm] = t;
    });
    return map;
  }, [allExerciseNames, tickers]);
  const tickerOf = (name) => (tickers && tickers[name]) || autoTickers[name] || defaultTicker(name);

  // Matches any part of a name, in any word order. With nothing typed yet it offers the lifts you
  // used most recently, which is what you want when you're alternating between two exercises.
  const suggestions = useMemo(() => {
    const q = form.exercise.trim();
    if (!q) return [...recentExercises, ...allExerciseNames.filter((n) => !recentExercises.includes(n))].slice(0, 6);
    if (allExerciseNames.some((n) => n.toLowerCase() === q.toLowerCase())) return [];
    return searchExercises(q, allExerciseNames, 8);
  }, [form.exercise, allExerciseNames, recentExercises]);

  // Adding a name that looks like one you already have ("Calf Raise" vs "Calf Raises") asks first.
  // An exercise can belong to several days; each day it's ticked for lists it.
  const composeExerciseName = (name, brand) => [brand.trim(), name.trim()].filter(Boolean).join(" ");
  const addExerciseToList = (name, dayIds, force = false, brand = "") => {
    const trimmed = composeExerciseName(name, brand);
    if (!trimmed || !dayIds.length) return false;
    if (!force) {
      const similar = findSimilarExercise(trimmed, allExerciseNames);
      if (similar) { setDupPrompt({ typed: trimmed, existing: similar, kind: "add", days: dayIds }); return false; }
    }
    const nextEx = { ...exercises };
    dayIds.forEach((id) => {
      const list = nextEx[id] || [];
      if (!list.some((e) => e.toLowerCase() === trimmed.toLowerCase())) nextEx[id] = [...list, trimmed];
    });
    const tk = newExerciseTicker.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    persist({ workouts, exercises: nextEx, entries, tickers: tk ? { ...tickers, [trimmed]: tk } : tickers });
    setActiveWorkoutId(dayIds[0]);
    selectExercise(trimmed);
    return true;
  };
  const resetAddForm = () => { setAddingExercise(false); setNewExerciseName(""); setNewExerciseBrand(""); setNewExerciseTicker(""); setNewExerciseDays([]); };

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
    return { weight: String(Wrec(rec.nextTopWeight)), sets: String(rec.defaultSets), reps: String(rec.repLow) };
  };

  const [recExercise, setRecExercise] = useState(null);
  const [manualWeight, setManualWeight] = useState("");
  const [manualReps, setManualReps] = useState("");
  // The plan always lays out at least 4 working sets; the Sets box only says how many you log per entry.
  const recSetCount = Math.min(8, Math.max(4, Number(form.sets) || 4));
  const recommendation = useMemo(
    () => buildRecommendation(recExercise, recSetCount, manualWeight ? String(toLbs(manualWeight)) : "", manualReps),
    [recExercise, recSetCount, entriesByExerciseStrength, manualWeight, manualReps, progressionMode, unit]
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
    // The log search drives the Progress chart (one way: browsing Progress never changes the log).
    if ((entriesByExercise[name] || []).length) { setProgCleared(false); setChartFocusExercise(name); setHistoryAll(false); setEditingId(null); setMergeOpen(false); }
    const home = findExerciseHome(name);
    if (home) setActiveWorkoutId(home);
  };
  const swapTarget = recentExercises.find((n) => n !== form.exercise.trim()) || null;

  const startRest = (name) => {
    const total = (restTimes && restTimes[name]) || restSecondsFor(name);
    setRestTimer({ total, endsAt: Date.now() + total * 1000, exercise: name, done: false, warned: false });
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
    // Ten seconds out: three slow wood-block knocks (and three slow pulses where the phone allows).
    if (restRemaining <= 10 && restRemaining > 0 && !restTimer.warned && restTimer.total > 10) {
      fx("warning");
      setRestTimer((t) => (t ? { ...t, warned: true } : t));
    }
    if (restRemaining <= 0 && !restTimer.done) {
      fx("done");
      setRestTimer((t) => (t ? { ...t, done: true } : t));
    }
    if (restRemaining <= -45) setRestTimer(null);
  }, [restRemaining]);
  const changeUnit = (u) => {
    if (u === unit) return;
    const lbsNow = form.weight !== "" && !isNaN(Number(form.weight)) ? toLbs(form.weight) : null;
    draftsRef.current = {};
    setManualWeight(""); setEditingId(null);
    updateSettings({ unit: u });
    if (lbsNow !== null) setForm((f) => ({ ...f, weight: String(u === "kg" ? r1(lbsNow * KG_PER_LB) : r1(lbsNow)) }));
  };
  const nudgeRest = (secs) => {
    if (!restTimer) return;
    const total = Math.max(15, restTimer.total + secs);
    setRestTimer((t) => (t ? { ...t, endsAt: t.endsAt + secs * 1000, total, done: false, warned: false } : t));
    // Remember it: the next rest for this exercise starts at the length you settled on.
    persist({ workouts, exercises, entries, restTimes: { ...restTimes, [restTimer.exercise]: total } });
  };

  // ---- Logging -------------------------------------------------------------------------------------
  const submitSet = (nameOverride, skipDupCheck) => {
    const exerciseName = (nameOverride || form.exercise).trim();
    if (!exerciseName || !form.weight) return;
    if (!skipDupCheck && !allExerciseNames.some((n) => n.toLowerCase() === exerciseName.toLowerCase()) && !findSimilarExercise(exerciseName, allExerciseNames)) {
      // A brand-new lift needs its day(s) first, so open the add form with the name filled in.
      setAddingExercise(true); setNewExerciseName(exerciseName); setNewExerciseDays([]);
      return;
    }
    if (!skipDupCheck) {
      const similar = findSimilarExercise(exerciseName, allExerciseNames);
      if (similar) { setDupPrompt({ typed: exerciseName, existing: similar, kind: "log" }); return; }
    }
    const homeWorkoutId = findExerciseHome(exerciseName) || activeWorkoutId;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workoutId: homeWorkoutId, exercise: exerciseName, weight: toLbs(form.weight), sets: form.sets ? Number(form.sets) : 1, reps: form.reps ? Number(form.reps) : 0, date: selectedDate, isWarmup: !!form.isWarmup };
    const list = exercises[homeWorkoutId] || [];
    const nextExercises = list.some((e) => e.toLowerCase() === exerciseName.toLowerCase()) ? exercises : { ...exercises, [homeWorkoutId]: [...list, exerciseName] };
    persist({ workouts, exercises: nextExercises, entries: [entry, ...entries] });
    draftsRef.current[exerciseName] = { weight: form.weight, sets: form.sets, reps: form.reps };
    setRecentExercises((r) => [exerciseName, ...r.filter((n) => n !== exerciseName)].slice(0, 8));
    fx("click");
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

  const deleteEntry = (id) => {
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) return;
    const entry = entries[index];
    persist({ workouts, exercises, entries: entries.filter((e) => e.id !== id) });
    setUndoDel({ entry, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoDel(null), 6000);
  };
  const undoDelete = () => {
    if (!undoDel) return;
    const next = entries.slice();
    next.splice(Math.min(undoDel.index, next.length), 0, undoDel.entry);
    persist({ workouts, exercises, entries: next });
    setUndoDel(null);
  };
  const toggleWarmup = (id) => persist({ workouts, exercises, entries: entries.map((e) => (e.id === id ? { ...e, isWarmup: !e.isWarmup } : e)) });

  const [editingId, setEditingId] = useState(null);
  const [showTodaysLog, setShowTodaysLog] = useState(false);
  const [editForm, setEditForm] = useState({ weight: "", reps: "", sets: "" });
  const startEdit = (entry) => { setEditingId(entry.id); setEditForm({ weight: String(W(entry.weight)), reps: String(entry.reps), sets: String(entry.sets) }); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (id) => {
    if (!editForm.weight) return;
    persist({
      workouts, exercises,
      entries: entries.map((e) => (e.id === id
        ? { ...e, weight: toLbs(editForm.weight), reps: editForm.reps ? Number(editForm.reps) : 0, sets: editForm.sets ? Number(editForm.sets) : 1 }
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

  const [digestOpen, setDigestOpen] = useState(false);
  // Vibration only exists on Android-style browsers; hide its switch anywhere it can't work (iOS, desktop).
  const [canVibrate, setCanVibrate] = useState(false);
  useEffect(() => {
    try {
      const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setCanVibrate(typeof navigator.vibrate === "function" && !ios);
    } catch (e) { /* ignore */ }
  }, []);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [progCleared, setProgCleared] = useState(false);
  useEffect(() => {
    if (!loaded || entries.length) return;
    try { if (!localStorage.getItem("hooksWelcomeDone")) setWelcomeOpen(true); } catch (e) { /* ignore */ }
  }, [loaded, entries.length]);
  const closeWelcome = (goLog) => {
    setWelcomeOpen(false);
    try { localStorage.setItem("hooksWelcomeDone", "1"); } catch (e) { /* ignore */ }
    if (goLog) setTimeout(() => sectionRefs.current.home && sectionRefs.current.home.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  useEffect(() => {
    if (!loaded || chartFocusExercise || progCleared || !entries.length) return;
    const latest = entries.reduce((a, b) => (b.date > a.date ? b : a), entries[0]);
    if (latest) setChartFocusExercise(latest.exercise);
  }, [loaded, entries, chartFocusExercise, progCleared]);

  // Everything lives on one continuously scrolling page; the bottom nav just scrolls to a section.
  const sectionRefs = useRef({});
  const scrollToSection = (key) => { sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const [activeSection, setActiveSection] = useState("portfolio");
  const [dockVisible, setDockVisible] = useState(false);
  const dpRef = useRef(0);
  const saveBtnRef = useRef(null);
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
        // The Log button fades and slides in as the Workout area comes up, and back out as it leaves.
        const enter = Math.min(1, Math.max(0, (window.innerHeight - 120 - r.top) / 260));
        const leave = Math.min(1, Math.max(0, (r.bottom - 180) / 200));
        const p = Math.min(enter, leave);
        dpRef.current = p;
        if (saveBtnRef.current) { saveBtnRef.current.style.setProperty("--dp", String(p)); saveBtnRef.current.style.pointerEvents = p > 0.5 ? "auto" : "none"; }
        setDockVisible(p > 0.01);
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

  // A day only counts as trained on a date when at least 3 different exercises from it were logged
  // that day (so calves tacked onto every session don't reset the Legs clock). An exercise counts
  // toward every day it's listed under. If a day has never had a 3-exercise session, its last date
  // with anything logged is used so it doesn't go blank.
  const DAY_MIN_EXERCISES = 3;
  const dayStats = useMemo(() => {
    const todayIso = todayISO();
    const wkStart = weekStartISO(todayIso);
    return workouts.map((w) => {
      const names = new Set((exercises[w.id] || []).map((n) => n.toLowerCase()));
      const belongs = (e) => e.workoutId === w.id || names.has(e.exercise.toLowerCase());
      const byDate = {};
      let weekSets = 0, lastAny = null;
      strengthEntries.forEach((e) => {
        if (!belongs(e)) return;
        (byDate[e.date] = byDate[e.date] || new Set()).add(e.exercise);
        if (!lastAny || e.date > lastAny) lastAny = e.date;
        if (e.date >= wkStart) weekSets += Math.max(1, e.sets || 1);
      });
      let lastFull = null;
      Object.keys(byDate).forEach((d) => { if (byDate[d].size >= DAY_MIN_EXERCISES && (!lastFull || d > lastFull)) lastFull = d; });
      const last = lastFull || lastAny;
      return { workout: w, days: last ? daysBetween(last, todayIso) : Infinity, weekSets };
    });
  }, [workouts, exercises, strengthEntries]);

  const dueWorkout = useMemo(() => {
    const c = dayStats.filter((d) => d.days >= 3);
    if (!c.length) return null;
    return c.slice().sort((a, b) => b.days - a.days)[0];
  }, [dayStats]);

  // What you usually log first on a given day, and which lift tends to follow which, both read from
  // the order sets were logged in (entries are stored newest first).
  const sessionOrders = useMemo(() => {
    const byDate = {};
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.isWarmup) continue;
      const seq = (byDate[e.date] = byDate[e.date] || []);
      if (seq[seq.length - 1] !== e.exercise) seq.push(e.exercise);
    }
    return Object.values(byDate);
  }, [entries]);
  // Next-exercise suggestions only learn from the last 14 days, so a changed routine takes over quickly.
  const NEXT_WINDOW_DAYS = 14;
  const recentOrders = useMemo(() => {
    const cutoff = shiftDate(todayISO(), -(NEXT_WINDOW_DAYS - 1));
    const byDate = {};
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.isWarmup || e.date < cutoff) continue;
      const seq = (byDate[e.date] = byDate[e.date] || []);
      if (seq[seq.length - 1] !== e.exercise) seq.push(e.exercise);
    }
    return Object.values(byDate);
  }, [entries]);
  const nextMap = useMemo(() => {
    const m = {};
    recentOrders.forEach((seq) => { for (let i = 0; i < seq.length - 1; i++) { const a = seq[i], b = seq[i + 1]; if (a === b) continue; ((m[a] = m[a] || {})[b] = (m[a][b] || 0) + 1); } });
    return m;
  }, [recentOrders]);
  const nextTarget = useMemo(() => {
    if (!recExercise || !nextMap[recExercise]) return null;
    const doneToday = new Set(todaysEntries.map((e) => e.exercise));
    // Only suggest lifts that share a workout day with this one (Bench can lead to Incline, not Squat).
    const lc = (n) => n.toLowerCase();
    const sameDay = new Set();
    workouts.forEach((w) => {
      const names = (exercises[w.id] || []).map(lc);
      if (names.includes(lc(recExercise))) names.forEach((n) => sameDay.add(n));
    });
    const opts = Object.entries(nextMap[recExercise]).filter(([n, c]) => c >= 1 && !doneToday.has(n) && sameDay.has(lc(n))).sort((a, b) => b[1] - a[1]);
    return opts.length ? opts[0][0] : null;
  }, [recExercise, nextMap, todaysEntries, workouts, exercises]);
  const startDay = (workoutId) => {
    const names = new Set((exercises[workoutId] || []).map((n) => n.toLowerCase()));
    const counts = {};
    sessionOrders.forEach((seq) => { const first = seq.find((n) => names.has(n.toLowerCase())); if (first) counts[first] = (counts[first] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const pick = top ? top[0] : (exercises[workoutId] || [])[0];
    setActiveWorkoutId(workoutId);
    if (pick) selectExercise(pick);
  };

  // ---- Lifter's Digest: stats computed here, worded by Claude when AI is on, plain text otherwise ----
  const digestStats = useMemo(() => (loaded && strengthEntries.length ? computeDigestStats({ strengthEntries, dayStats, todayIso: todayISO(), workouts, exercises, due: dueWorkout ? { day: dueWorkout.workout.name, days: dueWorkout.days } : null, goal: (GOALS.find((g) => g.key === settings.goal) || GOALS[0]).label, unit }) : null), [loaded, strengthEntries, dayStats, workouts, exercises, dueWorkout, settings.goal, unit]);
  const digestSig = useMemo(() => (digestStats ? hashStr(JSON.stringify(digestStats)) : ""), [digestStats]);
  const [aiDigest, setAiDigest] = useState(null);
  useEffect(() => {
    setAiDigest(null);
    if (!digestStats || !passcode || !settings.ai) return undefined;
    let cancelled = false;
    const key = `hooksDigest2:${todayISO()}:${digestSig}`;
    try { const c = localStorage.getItem(key); if (c) { setAiDigest(JSON.parse(c)); return undefined; } } catch (e) { /* ignore */ }
    fetch("/api/digest", { method: "POST", headers: { "Content-Type": "application/json", "x-app-passcode": passcode }, body: JSON.stringify({ stats: digestStats }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (cancelled || !d || !d.sections || typeof d.sections.last !== "string") return; setAiDigest(d.sections); try { localStorage.setItem(key, JSON.stringify(d.sections)); } catch (e) { /* ignore */ } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [digestSig, passcode, settings.ai]);
  const basicDigest = useMemo(() => digestBasic(digestStats), [digestStats]);
  const digest = { ...basicDigest, ...(aiDigest || {}) };

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
      list.push({ type: "strongest", text: `${strongest.exercise} is your strongest lift, est. ${W(strongest.best)} ${unit} 1RM.` });

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
      return { date, label: fmtDate(date), [chartFocusExercise]: W(setScore(entry, metric)), [`${chartFocusExercise}__r`]: entry.reps, [`${chartFocusExercise}__s`]: entry.sets };
    });
    return { rows, series: [chartFocusExercise] };
  }, [entriesByExerciseStrength, chartRange, chartMetric, chartFocusExercise, unit]);

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

  // ---- Exercise page (opened from a history date or a carousel card) ----------------------------------
  const [xpage, setXpage] = useState(null);        // { exercise, date, ytd }
  const [xEdit, setXEdit] = useState(false);
  const [xScrub, setXScrub] = useState(null);
  const [undoDel, setUndoDel] = useState(null);     // { entry, index }
  const undoTimer = useRef(null);
  const openExercise = (exercise, date, ytd) => { setXpage({ exercise, date, ytd: !!ytd }); setXEdit(false); setXScrub(null); setEditingId(null); };
  const closeExercise = () => { setXpage(null); setXEdit(false); setXScrub(null); setEditingId(null); };
  useEffect(() => {
    if (!xpage) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [!!xpage]);
  const xData = useMemo(() => {
    if (!xpage) return null;
    const list = entriesByExercise[xpage.exercise] || [];
    const today = todayISO();
    const from = xpage.ytd ? `${today.slice(0, 4)}-01-01` : "0000-01-01";
    const to = xpage.ytd ? today : xpage.date;
    const series = buildExSeries(list, from, to);
    const dayEntries = list.filter((e) => e.date === xpage.date);
    return { list, series, dayEntries, summary: exSummary(xpage.exercise, series, list.filter((e) => e.date >= from && e.date <= to), xpage.ytd, W) };
  }, [xpage, entriesByExercise, unit]);
  const xStats = useMemo(() => {
    if (!xpage) return null;
    const list = entriesByExercise[xpage.exercise] || [];
    const today = todayISO();
    return exStats(list, xpage.ytd ? `${today.slice(0, 4)}-01-01` : "0000-01-01", xpage.ytd ? today : xpage.date);
  }, [xpage, entriesByExercise]);

  // ---- Carousel: pull down at the top of Overall to see each lift's year-to-date change ----
  const [carouselOpen, setCarouselOpen] = useState(false);
  const carouselItems = useMemo(() => {
    const today = todayISO(), from = `${today.slice(0, 4)}-01-01`;
    const items = [];
    Object.entries(entriesByExerciseStrength).forEach(([name, list]) => {
      const ser = buildExSeries(list, from, today);
      if (ser) items.push({ name, pct: ser.pct, e1rm: ser.e1rmNow, last: list[0].date });
    });
    items.sort((a, b) => (a.last < b.last ? 1 : -1));
    return items.slice(0, 12);
  }, [entriesByExerciseStrength]);
  const allLiftsYtd = useMemo(() => {
    const rows = portfolioSeries.rows;
    if (rows.length < 2) return null;
    const from = `${todayISO().slice(0, 4)}-01-01`;
    let i = rows.findIndex((r) => r.date >= from);
    if (i === -1) return null;
    if (i > 0) i -= 1;
    if (rows.length - i < 2) return null;
    return Math.round(((rows[rows.length - 1].value - rows[i].value) / rows[i].value) * 1000) / 10;
  }, [portfolioSeries]);
  const pull = useRef(null);
  const pullY0 = useRef(0);
  const onPullStart = (e) => { pullY0.current = e.touches[0].clientY; pull.current = window.scrollY <= 0 ? e.touches[0].clientY : null; };
  const TITLE_MAX = 64;
  const [titlePull, setTitlePull] = useState(0);
  const [titleDrag, setTitleDrag] = useState(false);
  const onPullMove = (e) => {
    const y = e.touches[0].clientY;
    // A short upward swipe anywhere near the top puts the cards away again.
    if (carouselOpen && window.scrollY <= 1 && y - pullY0.current < -14) { setCarouselOpen(false); pull.current = null; setTitlePull(0); return; }
    if (pull.current === null || window.scrollY > 0) return;
    const dy = y - pull.current;
    if (dy > 56) setCarouselOpen(true);
    // Keep pulling past the cards and the app title shows, bottom first.
    const t = Math.min(TITLE_MAX, Math.max(0, (dy - 110) * 0.9));
    setTitleDrag(true);
    setTitlePull((cur) => (Math.abs(cur - t) > 1 ? t : cur));
  };
  const onPullEnd = () => { setTitleDrag(false); setTitlePull(0); };

  // One-time start-up: the line draws in, the dots fall in from the top, and the text types itself out.
  const [introOn, setIntroOn] = useState(() => !introPlayed && !(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  const introStarted = useRef(false);
  const introReady = !!(loaded && portfolioView);
  useIsoLayoutEffect(() => {
    if (!introOn || !introReady || introStarted.current) return undefined;
    introStarted.current = true;
    introPlayed = true;
    typeIn(sectionRefs.current.portfolio);
    const t = setTimeout(() => setIntroOn(false), 1500);
    return () => clearTimeout(t);
  }, [introOn, introReady]);

  if (passcode === null) return null;

  if (!passcode) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="eyebrow"><span className="dot">●</span> Hooks Workout</div>
          <div style={{ fontSize: "var(--fs-title)", fontWeight: 600, marginTop: 8 }}>Enter Passcode</div>
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
  const maWords = { "30": "30-day", "90": "90-day", "365": "1-year" };

  const renderEditableRow = (e, compact) => (
    editingId === e.id ? (
      <div key={e.id} className={compact ? "hist-item" : "today-item"} style={{ flexWrap: "wrap", gap: 4 }}>
        <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{fmtDate(e.date)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="number" inputMode="decimal" value={editForm.weight} onChange={(ev) => setEditForm({ ...editForm, weight: ev.target.value })} style={{ width: 52, padding: "4px 4px", fontSize: "var(--fs-label)" }} />
          <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{unit} ×</span>
          <input type="number" inputMode="numeric" value={editForm.reps} onChange={(ev) => setEditForm({ ...editForm, reps: ev.target.value })} style={{ width: 40, padding: "4px 4px", fontSize: "var(--fs-label)" }} />
          <span className="muted" style={{ fontSize: "var(--fs-label)" }}>×</span>
          <input type="number" inputMode="numeric" value={editForm.sets} onChange={(ev) => setEditForm({ ...editForm, sets: ev.target.value })} style={{ width: 40, padding: "4px 4px", fontSize: "var(--fs-label)" }} />
          <button className="del-btn" onClick={() => saveEdit(e.id)} style={{ color: "var(--gain)", fontWeight: 600 }}>✓</button>
          <button className="del-btn" onClick={cancelEdit}>✕</button>
        </span>
      </div>
    ) : compact ? (
      <SwipeRow key={e.id} onEdit={() => startEdit(e)} onDelete={() => deleteEntry(e.id)}>
        <div className="hist-item hist-simple" style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
          <button type="button" className="hist-date" onClick={() => openExercise(e.exercise, e.date, false)} aria-label={`Open ${e.exercise} through ${fmtDate(e.date)}`}>{fmtDate(e.date)}</button>
          <span className="hist-nums">{W(e.weight)} {unit} · {e.reps > 0 ? e.reps : 0} reps · {e.sets || 1} {(e.sets || 1) === 1 ? "set" : "sets"}{e.isWarmup && <span className="muted"> · warm-up</span>}</span>
        </div>
      </SwipeRow>
    ) : (
      <div key={e.id} className={compact ? "hist-item" : "today-item"} style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
        {compact
          ? <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{fmtDate(e.date)}</span>
          : <span style={{ fontWeight: 600 }}>{e.exercise}{e.isWarmup && <span className="muted" style={{ fontSize: "var(--fs-label)", fontWeight: 400 }}> (warm-up)</span>}</span>}
        <span className="num">
          {W(e.weight)}<span className="muted">{unit}</span>{e.reps > 0 && <span className="muted">× {e.reps}{e.sets > 1 ? ` × ${e.sets}` : ""}</span>}
          {compact && e.isWarmup && <span className="muted" style={{ fontSize: "var(--fs-label)" }}>(warm-up)</span>}
          <button className="del-btn" onClick={() => startEdit(e)} title="Edit" aria-label="Edit set">✎</button>
          <button className="del-btn" onClick={() => toggleWarmup(e.id)} title={e.isWarmup ? "Mark as working set" : "Mark as warm-up"} style={{ fontSize: "var(--fs-label)", fontWeight: 600, color: e.isWarmup ? "var(--text-primary)" : "var(--text-secondary)" }}>W</button>
          <button className="del-btn del-x" onClick={() => deleteEntry(e.id)} aria-label="Delete set">✕</button>
        </span>
      </div>
    )
  );

  return (
    <>
    <DotField />
    <div className="wrap">
      <div className="status-fade" aria-hidden="true" />
      <div className="top-bar"><button className="gear-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings"><IconGear size={22} /></button></div>

      {saveError && <div className="warn">{saveError}</div>}

      {!loaded ? (
        <div className="empty">Loading your log…</div>
      ) : (
        <>
        {/* ---------------- OVERALL ---------------- */}
        <div ref={(el) => (sectionRefs.current.portfolio = el)} className="overall-screen" onTouchStart={onPullStart} onTouchMove={onPullMove} onTouchEnd={onPullEnd} onTouchCancel={onPullEnd}>
          <DotTitle text={APP_TITLE} height={titlePull} dragging={titleDrag} progress={titlePull / TITLE_MAX} />
          <button type="button" className={"pull-cue" + (carouselOpen ? " open" : "")} onClick={() => setCarouselOpen((v) => !v)} aria-label={carouselOpen ? "Hide exercises" : "Show exercises"}>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7 6 7-6" /></svg>
          </button>
          <div className={"carousel" + (carouselOpen ? " open" : "")} aria-hidden={!carouselOpen}
            onTouchStart={() => { pull.current = null; }}>
            <div className="carousel-row">
              <button type="button" className="carousel-card all" tabIndex={carouselOpen ? 0 : -1} onClick={() => setCarouselOpen(false)}>
                <span className="cc-name">All lifts</span>
                <span className="cc-val">Index</span>
                <span className="cc-pct" style={{ color: allLiftsYtd === null ? "var(--text-tertiary)" : allLiftsYtd >= 0 ? "var(--gain)" : "var(--loss)" }}>{allLiftsYtd === null ? "n/a" : `${allLiftsYtd >= 0 ? "▲" : "▼"} ${Math.abs(allLiftsYtd).toFixed(1)}%`}</span>
              </button>
              {carouselItems.map((it) => (
                <button key={it.name} type="button" className="carousel-card" tabIndex={carouselOpen ? 0 : -1} onClick={() => openExercise(it.name, it.last, true)}>
                  <span className="cc-name">{tickerOf(it.name)}</span>
                  <span className="cc-val">{W(it.e1rm)} e1RM</span>
                  <span className="cc-pct" style={{ color: it.pct >= 0 ? "var(--gain)" : "var(--loss)" }}>{it.pct >= 0 ? "▲" : "▼"} {Math.abs(it.pct).toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </div>
          <div className="label-sm" style={{ textAlign: "center", marginBottom: 8 }}>Your Strength Over Time</div>
          <div className="portfolio-change">
            {!portfolioView ? <span className="cap">Not enough data yet</span> : (() => {
              const pct = scrubPoint ? scrubPoint.value : portfolioView.pct;
              const up = pct >= 0;
              const rangeLabel = RANGE_PRESETS.find((r) => r.key === portfolioRange)?.label;
              return (
                <>
                  {settings.dotNums !== false
                    ? <DotNum text={`${up ? "+" : "-"}${Math.abs(pct).toFixed(1)}%`} color={up ? "var(--gain)" : "var(--loss)"} intro={introOn} />
                    : <span className="index-num" style={{ color: up ? "var(--gain)" : "var(--loss)" }}>{up ? "+" : "−"}{Math.abs(pct).toFixed(1)}%</span>}
                  <span className="index-meta"><span className="cap">{scrubPoint ? scrubPoint.label : rangeLabel}</span></span>
                  <span className="index-tag">Strength Index · {portfolioSeries.exerciseCount} lifts</span>
                </>
              );
            })()}
            <span className="unit-pill" role="group" aria-label="Weight unit">
              <button type="button" className={unit === "lbs" ? "on" : ""} aria-pressed={unit === "lbs"} onClick={() => changeUnit("lbs")}>lbs</button>
              <span className="unit-sep" aria-hidden="true">/</span>
              <button type="button" className={unit === "kg" ? "on" : ""} aria-pressed={unit === "kg"} onClick={() => changeUnit("kg")}>kg</button>
            </span>
          </div>

          <div className="chart-box">
            {portfolioView
              ? <PortfolioChart rows={portfolioView.display} maRows={maKey === "off" ? null : portfolioView.maDisplay} color={portfolioView.up ? "var(--gain)" : "var(--loss)"} onScrub={setScrubPoint} intro={introOn} />
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

          <div className="pills range-tabs" style={{ marginBottom: 0 }}>
            {RANGE_PRESETS.map((r) => (
              <button key={r.key} className={"pill" + (r.key === portfolioRange ? " active" : "")} onClick={() => { setPortfolioRange(r.key); setScrubPoint(null); }}><span className="tab-l">{r.label}</span></button>
            ))}
          </div>
          <div className="pills pills-sub">
            {MA_OPTIONS.map((m) => (
              <button key={m.key} className={"pill pill-sm" + (m.key === maKey ? " active" : "")} onClick={() => setMaKey(m.key)}><span className="tab-l">{m.label}</span></button>
            ))}
          </div>

          <button className="log-set-row" onClick={() => scrollToSection("home")}>
            <span>Log a set</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-title)" }}>›</span>
          </button>

          <div className="digest-card2" onClick={() => setDigestOpen((o) => !o)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDigestOpen((o) => !o); }}>
            <div className="insights-head">
              <span className="label-sm" style={{ marginBottom: 0 }}>Lifter's Digest{aiDigest ? <span className="ai-tag">AI</span> : null}</span>
              <span className="insight-count">{digestOpen ? "tap to collapse" : "tap for full"}</span>
            </div>
            {[["last", "Last workout", "var(--text-secondary)"], ["up", "Improving", "var(--gain)"], ["down", "Slipping or flat", "var(--loss)"], ["due", "Due soon", "var(--text-secondary)"]].map(([k, label, col]) => (
              <div key={k} className="dg-sec">
                <div className="dg-label" style={{ color: col }}>{label}</div>
                <div className={"dg-text" + (digestOpen ? " open" : "")}>{digest[k]}</div>
              </div>
            ))}
            <div className="week-tiles dg-tiles">
              {dayStats.map((d) => (
                <button key={d.workout.id} className={"week-tile" + (dueWorkout && dueWorkout.workout.id === d.workout.id ? " due" : "")} onClick={(ev) => { ev.stopPropagation(); scrollToSection("home"); startDay(d.workout.id); }}>
                  <span className="wt-name">{d.workout.name}</span>
                  <span className="wt-ago">{d.days === Infinity ? "never" : d.days === 0 ? "today" : `${d.days}d ago`}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ---------------- WORKOUT (search, today's target, log) ---------------- */}
        <div ref={(el) => (sectionRefs.current.home = el)} className="workout-section">
          {dueWorkout && (
            <div className="due-wrap">
              <button className="due-pill" onClick={() => startDay(dueWorkout.workout.id)}>
                Try {dueWorkout.workout.name} · {dueWorkout.days === Infinity ? "never done" : `${dueWorkout.days} days`} · tap to start
              </button>
            </div>
          )}
          <div className="date-row">
            <button onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>‹</button>
            <button className="date-pill" onClick={() => setCalendarOpen((v) => !v)}>{fmtDateFull(selectedDate)}</button>
            <button onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>›</button>
            {calendarOpen && <CalendarPopup selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setCalendarOpen(false)} />}
          </div>

          <div className="card card-tabbed flat">
            {nextTarget && nextTarget !== swapTarget && (
              <button className="next-tab" onClick={() => selectExercise(nextTarget)} aria-label={`Next exercise ${nextTarget}`}>
                <span className="next-tab-text">Next: {nextTarget}</span><span aria-hidden="true">›</span>
              </button>
            )}
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
              {form.exercise.trim() && <ClearX label="Clear exercise" onClick={clearForm} />}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => selectExercise(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            {swapTarget && (
              <div className="nav-row">
                <button className="swap-btn" onClick={() => selectExercise(swapTarget)} aria-label={`Switch to ${swapTarget}`}>
                  <span className="swap-icon">⇄</span><span className="swap-text">Switch to {swapTarget}</span>
                </button>
              </div>
            )}

            {recExercise && (() => {
              const st = exStats(entriesByExerciseStrength[recExercise] || [], "0000-01-01", "9999-12-31");
              if (!st) return null;
              return (
                <div className="st-grid st-mini">
                  <div className="st-cell"><div className="st-label">e5RM</div><div className="st-val">{W(st.e5rm)}</div></div>
                  <div className="st-cell"><div className="st-label">e1RM</div><div className="st-val">{W(st.e1rm)}</div></div>
                  <div className="st-cell"><div className="st-label">Last set</div><div className="st-val">{W(st.lastSet.weight)} × {st.lastSet.reps > 0 ? st.lastSet.reps : 0}</div></div>
                </div>
              );
            })()}

            {recExercise && (
              <div className="pills" style={{ marginBottom: 12 }}>
                <button className={"pill" + (progressionMode === "weight" ? " active" : "")} onClick={() => setProgressionModeAndSave("weight")}>Increase Weight</button>
                <button className={"pill" + (progressionMode === "reps" ? " active" : "")} onClick={() => setProgressionModeAndSave("reps")}>Increase Reps</button>
              </div>
            )}

            {!recExercise ? (
              <div className="rec-empty">Pick an exercise to see today's target, or tap + Add new exercise.</div>
            ) : recommendation?.noData ? (
              <div className="rec-card">
                <div className="label-sm">What's your strongest set?</div>
                <div style={{ fontSize: "var(--fs-label)", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 12 }}>
                  No sets logged for {recExercise} yet. Enter the most weight you've lifted for it and how many reps, and that's enough to build a first recommendation.
                </div>
                <div className="row3" style={{ marginBottom: 0 }}>
                  <input type="number" inputMode="decimal" placeholder={unit} value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} />
                  <input type="number" inputMode="numeric" placeholder="reps" value={manualReps} onChange={(e) => setManualReps(e.target.value)} />
                </div>
              </div>
            ) : recommendation && (
              <div className="rec-card">
                <div className="rec-top">
                  <div>
                    <div className="label-sm" style={{ marginBottom: 0 }}>Recommended today</div>
                    <div className="rec-main">{Wrec(recommendation.nextTopWeight)}<span className="muted"> {unit} × </span>{repsText(recommendation.repLow, recommendation.repHigh)}</div>
                  </div>
                  <div className="rec-last">{recommendation.fromManual ? "Your entry" : `Last ${fmtDate(recommendation.lastSessionDate)}`}<br />{W(recommendation.lastTop.weight)} × {recommendation.lastTop.reps}</div>
                </div>
                <div className="rec-note">{cvText(recommendation.note)}</div>
                <div className="today-list" style={{ marginTop: 8 }}>
                  {recommendation.rows.map((r) => (
                    <div key={r.set} className="today-item" style={{ padding: "8px 12px" }}>
                      <span style={{ fontWeight: 600 }}>Set {r.set}{r.set === 1 ? " (top)" : ""}</span>
                      <span className="num">{Wrec(r.weight)}<span className="muted">{unit}</span><span className="muted">× {repsText(recommendation.repLow, recommendation.repHigh)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dupPrompt && (
              <div className="dup-prompt">
                <div style={{ fontSize: "var(--fs-label)", lineHeight: 1.4, marginBottom: 8 }}>
                  You already have <b>{dupPrompt.existing}</b>. Is "{dupPrompt.typed}" the same lift?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-iron" style={{ flex: 1, padding: "8px 4px", fontSize: "var(--fs-label)" }} onClick={() => {
                    if (dupPrompt.kind === "log") { setRecExercise(dupPrompt.existing); submitSet(dupPrompt.existing, true); }
                    else { selectExercise(dupPrompt.existing); resetAddForm(); }
                  }}>Use {dupPrompt.existing}</button>
                  <button className="pill" style={{ flex: 1, padding: "8px 4px", fontSize: "var(--fs-label)" }} onClick={() => {
                    if (dupPrompt.kind === "log") submitSet(dupPrompt.typed, true);
                    else { addExerciseToList(dupPrompt.typed, dupPrompt.days || [activeWorkoutId], true); resetAddForm(); setDupPrompt(null); }
                  }}>Keep as new</button>
                </div>
              </div>
            )}

            <div className="stepper-list" style={{ marginTop: 12 }}>
              {[["weight", `Weight (${unit})`, unit, "decimal", unit === "kg" ? 2.5 : 5], ["reps", "Reps", "reps", "numeric", 1], ["sets", "Sets", "sets", "numeric", 1]].map(([key, label, ph, mode, step]) => (
                <div key={key} className="stepper-field">
                  <div className="label-sm stepper-label">{label}</div>
                  <div className="stepper-row">
                    <button type="button" className="step-btn" aria-label={`Decrease ${label}`} onClick={() => bumpForm(key, -step)}>−</button>
                    <input type="number" inputMode={mode} placeholder={ph} aria-label={label} value={form[key]} onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }} onMouseUp={(e) => e.preventDefault()} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    <button type="button" className="step-btn" aria-label={`Increase ${label}`} onClick={() => bumpForm(key, step)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="warm-row">
              <button type="button" className={"chip" + (form.isWarmup ? " active" : "")} aria-pressed={!!form.isWarmup} onClick={() => setForm({ ...form, isWarmup: !form.isWarmup })}>Warm-up</button>
            </div>
            <InfoFoot title="warm-up sets" info="Warm-up sets don't count toward recommendations or your top set" />
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
              <button className="add-ex-link" style={{ marginBottom: 0 }} onClick={resetAddForm}>Cancel new exercise</button>
            )}
            <button className="add-ex-link" style={{ marginBottom: 0, flexShrink: 0 }} onClick={clearForm}>Clear All</button>
          </div>
          {addingExercise && (
            <div className="card add-card">
              <div className="label-sm">New exercise</div>
              <input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="Exercise name" style={{ marginBottom: 8 }} />
              <input value={newExerciseTicker} onChange={(e) => setNewExerciseTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder={`Ticker (optional, ${defaultTicker(newExerciseName) || "e.g. BENCH"})`} maxLength={5} autoCapitalize="characters" style={{ marginBottom: 8, fontFamily: "var(--font-num)", letterSpacing: ".06em" }} />
              <input value={newExerciseBrand} onChange={(e) => setNewExerciseBrand(e.target.value)} list="machine-brands" placeholder="Machine / brand (optional)" style={{ marginBottom: 12 }} />
              <datalist id="machine-brands">{MACHINE_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
              <div className="label-sm" style={{ marginBottom: 4 }}>Which day(s)? Tick any that apply</div>
              <div className="day-checks">
                {workouts.map((w) => (
                  <label key={w.id} className={"day-check" + (newExerciseDays.includes(w.id) ? " on" : "")}>
                    <input type="checkbox" checked={newExerciseDays.includes(w.id)} onChange={() => setNewExerciseDays((d) => (d.includes(w.id) ? d.filter((x) => x !== w.id) : [...d, w.id]))} />
                    {w.name}
                  </label>
                ))}
              </div>
              <button className="btn-iron save-btn" disabled={!newExerciseName.trim() || !newExerciseDays.length} style={{ opacity: newExerciseName.trim() && newExerciseDays.length ? 1 : 0.5, marginTop: 12 }}
                onClick={() => { if (addExerciseToList(newExerciseName, newExerciseDays, false, newExerciseBrand)) resetAddForm(); }}>
                Add exercise
              </button>
            </div>
          )}
        </div>

        {/* ---------------- PROGRESS ---------------- */}
        <div ref={(el) => (sectionRefs.current.charts = el)} className="section-block">
          <div className="label-sm" style={{ marginBottom: 12 }}>Progress</div>
          {(() => {
            const withData = allExerciseNames.filter((ex) => (entriesByExercise[ex] || []).length > 0);
            const lastDate = (ex) => (entriesByExercise[ex][0] || {}).date || "";
            const q = progQuery.trim();
            const matches = q ? searchExercises(q, withData, 8) : withData.slice().sort((a, b) => (lastDate(a) < lastDate(b) ? 1 : -1)).slice(0, 8);
            const pickProg = (ex) => { setProgCleared(false); setChartFocusExercise(ex); setProgOpen(false); setProgQuery(""); setMergeOpen(false); setHistoryAll(false); setEditingId(null); };
            return (
              <div className="ex-input-wrap" style={{ marginBottom: 12 }}>
                <input
                  className="ex-input"
                  placeholder="Search an exercise"
                  value={progOpen ? progQuery : (chartFocusExercise || "")}
                  onChange={(e) => setProgQuery(e.target.value)}
                  onFocus={(e) => { setProgOpen(true); setProgQuery(""); e.target.select && e.target.select(); }}
                  onBlur={() => setTimeout(() => setProgOpen(false), 150)}
                />
                {(chartFocusExercise || progQuery) && <ClearX label="Clear exercise" onClick={() => { setProgCleared(true); setChartFocusExercise(null); setProgQuery(""); setMergeOpen(false); setHistoryAll(false); setEditingId(null); }} />}
                {progOpen && matches.length > 0 && (
                  <div className="suggestions">
                    {matches.map((s2) => <button key={s2} onMouseDown={(ev) => ev.preventDefault()} onClick={() => pickProg(s2)}>{s2}</button>)}
                  </div>
                )}
              </div>
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
            <div className="empty">{chartFocusExercise ? "No sets logged in this range yet." : "Pick an exercise to see its progress."}</div>
          ) : (
            <div className="card">
              <SvgChart rows={chartResult.rows} series={chartResult.series} mode="exercise" metric={chartMetric} unit={unit} />
              <div className="chart-note">
                Best set of each day. Hold and drag for the exact reps, sets and weight.{chartMetric === "e1rm" && " Est. 1RM uses the Epley formula, counting up to 10 reps."}
              </div>
            </div>
          )}

          {chartFocusExercise && (
            <div className="card flat">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="label-sm" style={{ marginBottom: 0 }}>History · {focusHistory.length} logged</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="add-ex-link" style={{ marginBottom: 0, fontSize: "var(--fs-label)" }} onClick={() => setMergeOpen((v) => !v)}>Merge into…</button>
                  <button className="add-ex-link" style={{ marginBottom: 0, fontSize: "var(--fs-label)" }} onClick={() => deleteExercise(chartFocusExercise)}>Delete</button>
                </div>
              </div>
              {mergeUndo && (
                <div className="merge-note">
                  Merged {mergeUndo.from} into {mergeUndo.to}. <button className="add-ex-link" style={{ marginBottom: 0, fontSize: "var(--fs-label)", color: "var(--text-primary)" }} onClick={undoMerge}>Undo</button>
                </div>
              )}
              {mergeOpen && (
                <div className="merge-panel">
                  <div style={{ fontSize: "var(--fs-label)", color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 8 }}>
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
                <button className="add-ex-link" style={{ marginTop: 8, marginBottom: 0, fontSize: "var(--fs-label)" }} onClick={() => setHistoryAll((v) => !v)}>
                  {historyAll ? "Show less" : `Show all ${focusHistory.length}`}
                </button>
              )}
            </div>
          )}

          <div className="label-sm" style={{ margin: "24px 0 12px" }}>Training overview</div>
          <div className="card">
            <CardHead title="Strength growth by category" />
            <RadarChart data={radarData} onTap={() => setRadarInfoOpen((v) => !v)} />
            {radarInfoOpen && allTimeRange && (
              <div style={{ textAlign: "center", fontSize: "var(--fs-label)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {fmtDate(allTimeRange.start)} – {fmtDate(allTimeRange.end)}
              </div>
            )}
            <InfoFoot title="Strength growth by category" info="Average % change in estimated 1RM per workout, all-time. Tap the chart for the exact span. Hollow points mean not enough data yet." />
          </div>
          <div className="card">
            <CardHead title="Weekly training volume" />
            <VolumeBarChart weeks={weeklyVolume} onTapBar={() => {}} dots={settings.dotNums !== false} />
            <InfoFoot title="Weekly training volume" info="Weight × sets × reps per week, Monday to Sunday, last 10 weeks. This week is highlighted." />
          </div>
          <div className="card">
            <CardHead title="Training consistency" />
            <ConsistencyHeatmap weeks={heatmapWeeks} onTap={() => setHeatmapInfoOpen((v) => !v)} dots={settings.dotNums !== false} />
            {heatmapInfoOpen && heatmapWeeks.length > 0 && (
              <div style={{ textAlign: "center", fontSize: "var(--fs-label)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {fmtDate(heatmapWeeks[0][0].date)} – {fmtDate(todayISO())}
              </div>
            )}
            <InfoFoot title="Training consistency" info="Each column is a week (Monday to Sunday). Bigger, brighter dots mean more sets logged that day. Tap the chart for the span." />
          </div>
        </div>

        <div ref={(el) => (sectionRefs.current.import = el)} className="section-block">
        <>
          <div className="label-sm" style={{ marginBottom: 12 }}>Import &amp; Backup</div>
          <div className="card">
            <div className="label-sm">One-time bulk import</div>
            <div style={{ fontSize: "var(--fs-label)", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 12 }}>
              Loads {IMPORT_DATA.length} sets across {new Set(IMPORT_DATA.map((d) => d.exercise)).size} exercises from your written log, dated Aug 2025 – Aug 2026. New exercise names get added to the right workout automatically.
            </div>
            <button className="btn-iron save-btn" onClick={runImport} disabled={alreadyImported} style={{ opacity: alreadyImported ? 0.5 : 1, cursor: alreadyImported ? "default" : "pointer" }}>
              {alreadyImported ? "Already Imported" : `Import ${IMPORT_DATA.length} Sets`}
            </button>
          </div>
          <div className="card">
            <div className="label-sm">Couldn't import automatically</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {IMPORT_SKIPPED.map((s, i) => <div key={i} style={{ fontSize: "var(--fs-label)", color: "var(--text-secondary)", lineHeight: 1.5 }}>• {s}</div>)}
            </div>
          </div>
          <div className="card">
            <div className="label-sm">Incline Bench history</div>
            <div style={{ fontSize: "var(--fs-label)", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 12 }}>
              Loads {INCLINE_IMPORT_DATA.length} sets, Sep 2025 – Aug 2026. Reps weren't recorded for most of these — assumed 6 reps × 3 sets throughout, except 1/19 which was noted as 2 reps. Dumbbell sets file separately under "Incline Bench (DB)".
            </div>
            <button className="btn-iron save-btn" onClick={runInclineImport} disabled={alreadyImportedIncline} style={{ opacity: alreadyImportedIncline ? 0.5 : 1, cursor: alreadyImportedIncline ? "default" : "pointer" }}>
              {alreadyImportedIncline ? "Already Imported" : `Import ${INCLINE_IMPORT_DATA.length} Sets`}
            </button>
          </div>
          <div className="card">
            <div className="label-sm">Full backup</div>
            <div style={{ fontSize: "var(--fs-label)", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 12 }}>
              Downloads everything — workouts, exercises, every logged set — as a JSON file. Keep this somewhere safe (email it to yourself, save it to Drive/iCloud). If your database ever got wiped, this is what you'd restore from.
            </div>
            <button className="btn-iron save-btn" onClick={exportJSON}>Download JSON Backup</button>
          </div>
          <div className="card">
            <div className="label-sm">For spreadsheets / your own charts</div>
            <div style={{ fontSize: "var(--fs-label)", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 12 }}>
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

      {undoDel && (
        <div className="undo-toast" role="status">
          <span>Set deleted</span>
          <button type="button" onClick={undoDelete}>Undo</button>
        </div>
      )}

      {xpage && xData && (
        <div className="xpage" role="dialog" aria-label={xpage.exercise}>
          <div className="xp-top">
            <button type="button" className="xp-back" onClick={closeExercise} aria-label="Back"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg></button>
            <div className="xp-title">{xpage.exercise}</div>
          </div>
          <div className="xp-scroll">
            <div className="label-sm" style={{ textAlign: "center", marginBottom: 8 }}>{xpage.ytd ? "Year to date" : `Through ${fmtDateFull(xpage.date)}`}</div>
            <div className="portfolio-change">
              {!xData.series ? <span className="cap">Not enough data yet</span> : (() => {
                const pct = xScrub ? xScrub.value : xData.series.pct;
                const up = pct >= 0;
                return (
                  <>
                    {settings.dotNums !== false
                      ? <DotNum text={`${up ? "+" : "-"}${Math.abs(pct).toFixed(1)}%`} color={up ? "var(--gain)" : "var(--loss)"} />
                      : <span className="index-num" style={{ color: up ? "var(--gain)" : "var(--loss)" }}>{up ? "+" : "−"}{Math.abs(pct).toFixed(1)}%</span>}
                    <span className="index-meta"><span className="cap">{xScrub ? xScrub.label : xpage.ytd ? "YTD" : "Since first log"}</span></span>
                    <span className="index-tag">Estimated 1RM · {xData.series.sessions} sessions</span>
                  </>
                );
              })()}
            </div>
            <div className="chart-box xp-chart">
              {xData.series
                ? <PortfolioChart rows={xData.series.rows} maRows={null} color={xData.series.pct >= 0 ? "var(--gain)" : "var(--loss)"} onScrub={setXScrub} />
                : <div className="empty">Log this exercise on a few different days to see a graph.</div>}
            </div>
            <div className="digest-card2" style={{ cursor: "default" }}>
              <div className="insights-head"><span className="label-sm" style={{ marginBottom: 0 }}>Summary</span></div>
              <div className="dg-text open">{xData.summary}</div>
            </div>

            {xStats && (() => {
              const pct = xData.series ? xData.series.pct : null;
              const ago = (d) => { const n = Math.round((new Date(todayISO() + "T00:00:00") - new Date(d + "T00:00:00")) / 86400000); return n <= 0 ? "Today" : n === 1 ? "Yesterday" : `${n}d ago`; };
              const cell = (label, value, color) => (<div className="st-cell" key={label}><div className="st-label">{label}</div><div className="st-val" style={color ? { color } : null}>{value}</div></div>);
              return (
                <div className="stats-block">
                  <div className="st-grid">
                    {cell("e1RM", W(xStats.e1rm))}
                    {cell("e5RM", W(xStats.e5rm))}
                    {cell(xpage.ytd ? "YTD" : "Change", pct === null ? "n/a" : `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`, pct === null ? null : pct >= 0 ? "var(--gain)" : "var(--loss)")}
                    {cell(`Volume (${unit})`, fmtNum(W(xStats.volume)))}
                    {cell("Sessions", xStats.sessions)}
                    {cell("Sets / Reps", `${xStats.sets} / ${fmtNum(xStats.reps)}`)}
                    {cell("PR", `${W(xStats.prWeight)}`)}
                    {cell("Avg wt / rep", xStats.avgPerRep ? W(xStats.avgPerRep) : "n/a")}
                    {cell("Last session", ago(xStats.lastDate))}
                  </div>
                  <div className="st-head">All time</div>
                  <div className="st-grid">
                    {cell(`Volume (${unit})`, fmtNum(W(xStats.allVolume)))}
                    {cell("Sessions", xStats.allSessions)}
                    {cell("First logged", fmtDate(xStats.firstDate))}
                  </div>
                </div>
              );
            })()}

            <div className="card card-tabbed flat" style={{ marginTop: 24 }}>
              <button type="button" className="next-tab" onClick={() => setXEdit((v) => !v)}>
                <span className="next-tab-text">{xEdit ? "Done" : "Edit"}</span>{!xEdit && <span aria-hidden="true">›</span>}
              </button>
              <div className="label-sm">Sets on {fmtDateFull(xpage.date)}</div>
              {xData.dayEntries.length === 0 ? <div className="empty" style={{ padding: "8px 0" }}>Nothing logged on this day.</div> : (
                <div className="today-list">
                  {xData.dayEntries.map((e) => (xEdit || editingId === e.id
                    ? renderEditableRow(e, false)
                    : (
                      <div key={e.id} className="today-item" style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
                        <span className="hist-nums">{W(e.weight)} {unit} · {e.reps > 0 ? e.reps : 0} reps · {e.sets || 1} {(e.sets || 1) === 1 ? "set" : "sets"}{e.isWarmup && <span className="muted"> · warm-up</span>}</span>
                      </div>
                    )))}
                </div>
              )}
            </div>

            <div className="card flat">
              <div className="label-sm">All sessions · {xData.list.length}</div>
              <div className="hist-list">
                {xData.list.map((e) => (editingId === e.id ? renderEditableRow(e, true) : (
                  <SwipeRow key={e.id} onEdit={() => startEdit(e)} onDelete={() => deleteEntry(e.id)}>
                    <div className="hist-item hist-simple" style={{ opacity: e.isWarmup ? 0.6 : 1 }}>
                      <button type="button" className={"hist-date" + (e.date === xpage.date ? " on" : "")} onClick={() => { setXpage({ ...xpage, date: e.date, ytd: false }); setXScrub(null); }}>{fmtDate(e.date)}</button>
                      <span className="hist-nums">{W(e.weight)} {unit} · {e.reps > 0 ? e.reps : 0} reps · {e.sets || 1} {(e.sets || 1) === 1 ? "set" : "sets"}{e.isWarmup && <span className="muted"> · warm-up</span>}</span>
                    </div>
                  </SwipeRow>
                )))}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSettingsOpen(false)} />
          <div className="sheet sheet-settings" role="dialog" aria-label="Settings">
            <div className="sheet-grip" />
            <div className="sheet-head">
              <span className="sheet-title">Settings</span>
              <button className="close-btn" onClick={() => setSettingsOpen(false)} aria-label="Close settings">✕</button>
            </div>

            <div className="label-sm">Appearance</div>
            <div className="pills">
              {[["dark", "Dark"], ["light", "Light"], ["system", "Match phone"]].map(([k, label]) => (
                <button key={k} className={"pill" + (settings.mode === k ? " active" : "")} onClick={() => updateSettings({ mode: k })}>{label}</button>
              ))}
            </div>

            <div className="label-sm" style={{ marginTop: 4, marginBottom: 0 }}>Accent color</div>
            <HoneyPicker value={settings.accent} onPick={(c) => { updateSettings({ accent: c }); setHexDraft(""); }} />
            <div className="hex-row">
              <input value={hexDraft} onChange={(e) => setHexDraft(e.target.value)} placeholder="#ff6600" maxLength={7} aria-label="Hex color" />
              <button className="pill" style={{ flex: "0 0 auto", padding: "8px 12px" }} onClick={() => { if (/^#?[0-9a-fA-F]{6}$/.test(hexDraft.trim())) { updateSettings({ accent: "#" + hexDraft.trim().replace("#", "").toLowerCase() }); setHexDraft(""); } }}>Use</button>
              <button className="pill" style={{ flex: "0 0 auto", padding: "8px 12px" }} onClick={() => { updateSettings({ accent: "#ff6600" }); setHexDraft(""); }}>Reset</button>
            </div>

            <div className="label-sm" style={{ marginTop: 16 }}>Fonts</div>
            <div className="select-wrap" style={{ marginBottom: 8 }}>
              <select className="scope" value={settings.fontText} onChange={(e) => updateSettings({ fontText: e.target.value })} aria-label="Text font">
                {TEXT_FONTS.map(([k, n]) => <option key={k} value={k}>Text: {n}</option>)}
              </select>
            </div>
            <div className="select-wrap">
              <select className="scope" value={settings.fontNum} onChange={(e) => updateSettings({ fontNum: e.target.value })} aria-label="Numbers and labels font">
                {NUM_FONTS.map(([k, n]) => <option key={k} value={k}>Numbers and labels: {n}</option>)}
              </select>
            </div>

            <div className="label-sm" style={{ marginTop: 16 }}>Tab bar</div>
            <div className="pills">
              {[[false, "Solid"], [true, "Glass"]].map(([k, label]) => (
                <button key={label} className={"pill" + (!!settings.glass === k ? " active" : "")} onClick={() => updateSettings({ glass: k })}>{label}</button>
              ))}
            </div>

            <label className="toggle-row" style={{ marginTop: 8 }}><span>Dot-matrix numbers</span><input type="checkbox" role="switch" className="ios-switch" checked={settings.dotNums !== false} onChange={(e) => updateSettings({ dotNums: e.target.checked })} /></label>

            <div className="label-sm" style={{ marginTop: 16 }}>Gains and losses</div>
            <div className="gl-grid">
              {[["ios", "iOS", "#34C759", "#FF453A"], ["mint", "Mint", "#00D68F", "#FF5C5C"], ["emerald", "Emerald", "#2ECC71", "#FF3B5C"], ["teal", "Teal", "#1DD1A1", "#FF6B81"], ["lime", "Lime", "#7ED957", "#FF4D4D"], ["bluorange", "Blue / orange", "#4DA3FF", "#FFA03A"]].map(([k, label, g, l]) => (
                <button key={k} type="button" className={"gl-opt" + ((settings.gl || "ios") === k ? " on" : "")} onClick={() => updateSettings({ gl: k })} aria-pressed={(settings.gl || "ios") === k}>
                  <span className="gl-dots"><i style={{ background: g }} /><i style={{ background: l }} /></span>{label}
                </button>
              ))}
            </div>

            <div className="label-sm" style={{ marginTop: 16 }}>Lifter's Digest</div>
            <label className="toggle-row"><span>AI digest (more detail and the likely why)</span><input type="checkbox" role="switch" className="ios-switch" checked={settings.ai} onChange={(e) => updateSettings({ ai: e.target.checked })} /></label>
            <div className="select-wrap">
              <select className="scope" value={settings.goal} onChange={(e) => updateSettings({ goal: e.target.value })} aria-label="Training goal">
                {GOALS.map((g) => <option key={g.key} value={g.key}>Goal: {g.label}</option>)}
              </select>
            </div>

            <div className="label-sm" style={{ marginTop: 16 }}>Sounds &amp; vibration</div>
            <label className="toggle-row"><span>Sounds (log a set, rest timer)</span><input type="checkbox" role="switch" className="ios-switch" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} /></label>
            {canVibrate && <label className="toggle-row"><span>Vibration</span><input type="checkbox" role="switch" className="ios-switch" checked={settings.vibe} onChange={(e) => updateSettings({ vibe: e.target.checked })} /></label>}

            <div className="label-sm" style={{ marginTop: 16 }}>Tell us what you think</div>
            <textarea className="feedback-box" rows={3} value={feedbackText} onChange={(e) => { setFeedbackText(e.target.value); setFeedbackStatus(""); }} placeholder="What's confusing, missing or great?" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <button className="btn-iron" style={{ padding: "8px 16px", fontSize: "var(--fs-label)" }} onClick={sendFeedback} disabled={!feedbackText.trim()}>Send feedback</button>
              <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{feedbackStatus}</span>
            </div>
            {me && me.role === "owner" && (
              <div style={{ marginTop: 12 }}>
                <button className="add-ex-link" style={{ marginBottom: 8 }} onClick={loadFeedback}>View feedback from testers</button>
                {feedbackList && (feedbackList.length === 0 ? <div className="muted" style={{ fontSize: "var(--fs-label)" }}>Nothing yet.</div> : (
                  <div className="today-list">
                    {feedbackList.map((f, i) => (
                      <div key={i} className="hist-item" style={{ display: "block" }}>
                        <div className="muted" style={{ fontSize: "var(--fs-label)" }}>{f.name} · {new Date(f.at).toLocaleString()}</div>
                        <div style={{ fontSize: "var(--fs-label)", marginTop: 0 }}>{f.message}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="label-sm" style={{ marginTop: 16 }}>Data</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="pill" style={{ flex: "1 1 auto", padding: "8px 12px" }} onClick={() => { setSettingsOpen(false); setTimeout(() => scrollToSection("import"), 50); }}>Import &amp; backup</button>
              <button className="pill" style={{ flex: "1 1 auto", padding: "8px 12px" }} onClick={signOut}>Sign out{me ? ` (${me.name})` : ""}</button>
            </div>
          </div>
        </>
      )}

      {welcomeOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => closeWelcome(false)} />
          <div className="sheet" role="dialog" aria-label="Welcome">
            <div className="sheet-head">
              <span className="sheet-title">Welcome</span>
            </div>
            <div className="welcome-step"><b>1.</b> Search an exercise, enter weight and reps, and log a set. A rest timer starts on its own.</div>
            <div className="welcome-step"><b>2.</b> Overall tracks your Strength Index like a portfolio. After a couple of weeks it fills in.</div>
            <div className="welcome-step"><b>3.</b> Lifter's Digest tells you what you hit last, what is improving or slipping, and which day is due.</div>
            <div className="welcome-step muted">Tip: add this to your Home Screen from the Share menu so it opens like an app. The gear up top has themes, sounds and the AI digest switch.</div>
            <button className="btn-iron save-btn" style={{ marginTop: 12 }} onClick={() => closeWelcome(true)}>Log my first set</button>
          </div>
        </>
      )}

      {(restTimer || dockVisible) && loaded && (
        <div className="dock" ref={dockRef}>
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
            <button ref={(el) => { saveBtnRef.current = el; if (el) { el.style.setProperty("--dp", String(dpRef.current)); el.style.pointerEvents = dpRef.current > 0.5 ? "auto" : "none"; } }} className="btn-iron save-btn dock-save" onClick={() => submitSet()} disabled={!form.exercise.trim() || !form.weight} style={{ "--en": form.exercise.trim() && form.weight ? 1 : 0.55 }}>
              {form.exercise.trim() ? `Log set · ${form.exercise.trim()}` : "Log set"}
            </button>
          )}
        </div>
      )}

      <div className="bottom-nav" ref={navRef} style={{ "--i": activeSection === "charts" ? 2 : activeSection === "home" ? 1 : 0 }}>
        <span className="nav-lens" aria-hidden="true" />

        <button className={"bottom-nav-item bottom-nav-item-main" + (activeSection === "portfolio" ? " active" : "")} onClick={() => scrollToSection("portfolio")}>
          <IconHome color="currentColor" size={24} /><span>Overall</span>
        </button>
        <button className={"bottom-nav-item" + (activeSection === "home" ? " active" : "")} onClick={() => scrollToSection("home")}>
          <IconBulb color="currentColor" /><span>Workout</span>
        </button>
        <button className={"bottom-nav-item" + (activeSection === "charts" ? " active" : "")} onClick={() => scrollToSection("charts")}>
          <IconChart color="currentColor" /><span>Progress</span>
        </button>
      </div>
    </div>
    </>
  );
}
