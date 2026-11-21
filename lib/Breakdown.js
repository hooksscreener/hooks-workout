import { useEffect, useMemo, useRef, useState } from "react";
import {
  growthByCategory, makeCatOf, volumeBuckets, sumBuckets, dayRecords, consistencyStats, e1rmOf,
} from "./analysis";

// Drill-down pages behind the Training overview charts: Strength, Volume, Consistency.
// Everything here is read-only. All numbers come from the same entries the main charts use.

const SANS = { fontFamily: "'IBM Plex Sans',-apple-system,sans-serif" };
const snap = (v) => Math.round(v / 4) * 4;
const TABS = [["growth", "Strength"], ["volume", "Volume"], ["days", "Consistency"]];
const WD_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RANGE_NAMES = { "1m": "Last month", "3m": "Last 3 months", "6m": "Last 6 months", ytd: "Year to date", "1y": "Last year", all: "All time" };

// Apple's system colors: [dark mode, light mode]. Green, red and orange are left out on purpose: in this app they
// mean gain, loss and the main action. Categories take the first colors in ORDER, exercises take the rest, so a
// category color is never reused for an exercise.
const APPLE = {
  blue: ["#0A84FF", "#007AFF"], yellow: ["#FFD60A", "#FFCC00"], purple: ["#BF5AF2", "#AF52DE"], mint: ["#63E6E2", "#00C7BE"],
  brown: ["#AC8E68", "#A2845E"], cyan: ["#64D2FF", "#32ADE6"], indigo: ["#5E5CE6", "#5856D6"], teal: ["#40C8E0", "#30B0C7"],
  pink: ["#FF375F", "#FF2D55"], gray: ["#8E8E93", "#8E8E93"], gain: ["#30D158", "#0B6B22"],
  lime: ["#C6E03C", "#6F8F00"], lavender: ["#D7BDFF", "#8E6BD0"], // two extra shades so seven exercises can each have their own color
};
const ORDER = ["blue", "yellow", "purple", "mint", "cyan", "brown"];                       // categories
const EX_ORDER = ["pink", "cyan", "brown", "indigo", "teal", "lime", "lavender"];          // exercises, by rank
const TOP_N = EX_ORDER.length;
const hexId = (c) => c.replace("#", "");

function Patterns({ light, fine }) {
  const r = fine ? 0.8 : 1.35, t = fine ? 3 : 4;
  return (
    <defs>
      {Object.values(APPLE).map((pair) => {
        const c = pair[light ? 1 : 0];
        return <pattern key={c + t} id={`pt${t}${hexId(c)}`} width={t} height={t} patternUnits="userSpaceOnUse"><circle cx={t / 2} cy={t / 2} r={r} fill={c} /></pattern>;
      })}
    </defs>
  );
}

export default function Breakdown({ initial, onClose, onOpenExercise, strengthEntries, workouts, exercises, unit, W, h }) {
  const { fmtDate, fmtDateFull, fmtNum, shiftDate, weekStartISO, todayISO, rangeCutoffISO, RANGE_PRESETS, setWt } = h;
  const [kind, setKind] = useState(initial.kind || "growth");
  const [range, setRange] = useState(initial.range || "all");
  const [cat, setCat] = useState(initial.cat || null);      // selected category id
  const [vsel, setVsel] = useState(null);                 // category picked on the Volume tab (filters the chart)
  const [bucket, setBucket] = useState(null);                // selected volume bucket key
  const [date, setDate] = useState(initial.date || null);    // selected day
  const light = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";

  // The page behind must not scroll while this is open. A class on <html> (not saved/restored inline styles)
  // can't get stuck on if the exercise page opens and closes on top of this one.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    document.documentElement.classList.add("bd-open");
    const onKey = (e) => { if (e.key === "Escape" && document.querySelectorAll(".xpage").length < 2) closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.classList.remove("bd-open"); window.removeEventListener("keydown", onKey); };
  }, []);

  const today = todayISO();
  const firstDate = useMemo(() => strengthEntries.reduce((m, e) => (e.date < m ? e.date : m), today), [strengthEntries, today]);
  const start = range === "all" ? firstDate : rangeCutoffISO(range);
  const end = today;
  const spanLabel = RANGE_NAMES[range];
  const catOf = useMemo(() => makeCatOf(workouts, exercises), [workouts, exercises]);
  const catName = (id) => (workouts.find((w) => w.id === id) || { name: "Other" }).name;
  const hexOf = (name) => APPLE[name][light ? 1 : 0];
  const gray = hexOf("gray");
  const gain = light ? "#0B6B22" : "#30D158";
  const catColor = (id) => { const i = workouts.findIndex((w) => w.id === id); return i < 0 ? gray : hexOf(ORDER[i % ORDER.length]); };
  // Exercises are colored by rank inside whatever list they appear in (top 7), the rest are grey.
  const rankColor = (rank) => (rank >= 0 && rank < TOP_N ? hexOf(EX_ORDER[rank]) : gray);

  const vol = (v) => `${fmtNum(W(v))} ${unit}`;
  const pctTxt = (p) => `${p >= 0 ? "+" : "-"}${Math.abs(p).toFixed(1)}%`;
  const colorFor = (p) => (p >= 0 ? "var(--gain)" : "var(--loss)");

  const changeKind = (k) => { setKind(k); setBucket(null); };
  const changeRange = (r) => { setRange(r); setBucket(null); };

  // ---------------- Strength ----------------
  const growth = useMemo(() => growthByCategory({ workouts, exercises, entries: strengthEntries, start, end }), [workouts, exercises, strengthEntries, start, end]);
  const selGrowth = growth.find((c) => c.id === cat) || [...growth].filter((c) => c.hasData).sort((a, b) => b.exact - a.exact)[0] || growth[0];

  const growthColor = (c, item) => rankColor(c.items.filter((i) => i.pct !== null && i.pct > 0).indexOf(item));
  const GrowthChart = () => {
    const Wd = 342, labelW = 48, valW = 50, gap = 8, rowH = 44, padT = 4;
    const Hh = growth.length * rowH + padT * 2;
    const rows = growth.map((c) => {
      const items = c.items.filter((i) => i.pct !== null);
      return { c, pos: items.filter((i) => i.contrib > 0), neg: items.filter((i) => i.contrib < 0) };
    });
    const maxPos = Math.max(5, ...rows.map((r) => r.pos.reduce((s, i) => s + i.contrib, 0)));
    const maxNeg = Math.max(0, ...rows.map((r) => -r.neg.reduce((s, i) => s + i.contrib, 0)));
    const barX = labelW + gap, barW = Wd - barX - valW - gap;
    const unitW = barW / (maxPos + maxNeg || 1);
    const zeroX = snap(barX + maxNeg * unitW);
    return (
      <svg viewBox={`0 0 ${Wd} ${Hh}`} style={{ width: "100%", height: Hh, display: "block" }} role="img" aria-label="Strength growth by category and exercise">
        <Patterns light={light} />
        {rows.map(({ c, pos, neg }, ri) => {
          const y = padT + ri * rowH, cy = y + rowH / 2, by = snap(cy - 12), sel = selGrowth && c.id === selGrowth.id;
          // Colored exercises keep their own segment; every grey one is merged into a single grey segment.
          const merge = (list) => {
            const out = list.filter((i) => growthColor(c, i) !== gray).map((i) => ({ name: i.name, contrib: i.contrib, color: growthColor(c, i) }));
            const rest = list.filter((i) => growthColor(c, i) === gray);
            if (rest.length) out.push({ name: "__other", contrib: rest.reduce((t, i) => t + i.contrib, 0), color: gray });
            return out;
          };
          const segs = [];
          let cum = 0;
          merge(pos).forEach((i) => { const a = snap(zeroX + cum * unitW); cum += i.contrib; const b = snap(zeroX + cum * unitW); segs.push({ i, x: a, w: b - a }); });
          let cn = 0;
          merge(neg).forEach((i) => { const b = snap(zeroX - cn * unitW); cn += -i.contrib; const a = snap(zeroX - cn * unitW); segs.push({ i, x: a, w: b - a }); });
          const endX = zeroX + snap(cum * unitW);
          const net = c.value;
          return (
            <g key={c.id} onClick={() => setCat(c.id)} style={{ cursor: "pointer" }}>
              <rect x={0} y={y + 2} width={Wd} height={rowH - 4} rx="6" fill={sel ? "var(--surface)" : "transparent"} />
              <text x={labelW} y={cy} fontSize="13" fill="var(--text-primary)" textAnchor="end" dominantBaseline="central" style={{ ...SANS, fontWeight: sel ? 700 : 600 }}>{c.label}</text>
              <g key={`${range}-${c.id}`} className="bd-grow" style={{ transformOrigin: `${zeroX}px 0px`, animationDelay: `${ri * 40}ms` }}>
              {segs.map(({ i, x, w }) => w >= 4 && (
                <g key={i.name}>
                  <rect x={x} y={by} width={w} height={24} fill={`url(#pt4${hexId(i.color)})`} />
                </g>
              ))}
              </g>
              {c.hasData && maxNeg > 0 && <rect x={zeroX - 1} y={by - 3} width={2} height={30} fill="var(--text-secondary)" opacity="0.7" />}
              <text x={Math.max(endX, zeroX) + 8} y={cy} fontSize="14" fill={c.hasData ? colorFor(net) : "var(--text-secondary)"} dominantBaseline="central" style={{ ...SANS, fontWeight: 700 }}>{c.hasData ? `${net >= 0 ? "+" : ""}${net}%` : "n/a"}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const growthPage = (
    <>
      <div className="card flat bd-card">
        <div className="label-sm bd-title">Strength growth by category</div>
        {GrowthChart()}
      </div>
      {selGrowth && (
        <div className="card flat bd-card">
          <div className="bd-head">
            <span className="bd-h">{selGrowth.label}</span>
            <span className="bd-h" style={{ color: selGrowth.hasData ? colorFor(selGrowth.value) : "var(--text-secondary)" }}>{selGrowth.hasData ? pctTxt(selGrowth.exact) : "n/a"}</span>
          </div>
          <div className="bd-meta">{vol(selGrowth.volume)} volume in this range</div>
          <div className="bd-list">
            {selGrowth.items.map((i) => (
              <div key={i.name} className="bd-row bd-tap" role="button" tabIndex={0} aria-label={`Open ${i.name}`} onClick={() => onOpenExercise(i.name, range)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenExercise(i.name, range); }}>
                <span className="bd-dot" style={{ background: growthColor(selGrowth, i) }} />
                <div className="bd-main">
                  <div className="bd-name">{i.name}</div>
                  <div className="bd-meta">
                    {i.pct === null ? `${i.sessions} session${i.sessions === 1 ? "" : "s"}, needs 2 to show growth` : `Est. max ${fmtNum(W(e1rmOf(i.first)))} to ${fmtNum(W(e1rmOf(i.last)))} ${unit} · ${i.sessions} sessions`}
                    {i.volume > 0 ? ` · ${vol(i.volume)}` : ""}
                  </div>
                </div>
                <div className="bd-right">
                  <div className="bd-num" style={{ color: i.pct === null ? "var(--text-secondary)" : colorFor(i.pct) }}>{i.pct === null ? "n/a" : pctTxt(i.pct)}</div>
                  {i.share > 0 && <div className="bd-meta">{Math.round(i.share * 100)}% of growth</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ---------------- Volume ----------------
  const vb = useMemo(() => volumeBuckets({ entries: strengthEntries, catOf, start, end, weekStartISO, shiftDate }), [strengthEntries, catOf, start, end, weekStartISO, shiftDate]);
  const catIds = useMemo(() => {
    const ids = workouts.map((w) => w.id);
    if (strengthEntries.some((e) => catOf(e) === "other")) ids.push("other");
    return ids;
  }, [workouts, strengthEntries, catOf]);
  const selBucket = bucket ? vb.buckets.find((b) => b.key === bucket) : null;
  const scope = useMemo(() => (selBucket ? sumBuckets([selBucket]) : sumBuckets(vb.buckets)), [selBucket, vb]);

  const bucketLabel = (b) => {
    if (vb.monthly) { const [y, m] = b.key.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1] + (vb.buckets.length > 12 ? ` '${y.slice(2)}` : ""); }
    const [, m, d] = b.key.split("-"); return `${+m}/${+d}`;
  };
  const bucketTitle = (b) => (vb.monthly ? bucketLabel(b) : `Week of ${bucketLabel(b)}`);

  const VolumeChart = () => {
    const Wd = 342, Hh = 200, padL = 34, padR = 4, padT = 8, padB = 24;
    const n = vb.buckets.length;
    const valOf = (b) => (vFilter ? b.byCat[vFilter] || 0 : b.total);
    const max = Math.max(...vb.buckets.map(valOf), 1);
    const plotH = Hh - padT - padB;
    // Bars sit on an even 4px-multiple pitch with at least a 4px gap, centered in the plot, so none ever touch.
    const plotW = Wd - padL - padR;
    const step = Math.max(8, Math.floor(plotW / n / 4) * 4);
    const gapPx = step >= 20 ? 8 : 4;
    const bw = Math.max(4, step - gapPx);
    const x0 = snap(padL + (plotW - n * step) / 2 + gapPx / 2);
    const every = Math.max(1, Math.ceil((vb.monthly ? 40 : 34) / step));
    return (
      <svg viewBox={`0 0 ${Wd} ${Hh}`} style={{ width: "100%", height: 210, display: "block" }} role="img" aria-label="Training volume by category">
        <Patterns light={light} />
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const yy = padT + (1 - t) * plotH;
          return <g key={t}><line x1={padL} y1={yy} x2={Wd - padR} y2={yy} stroke="var(--border)" strokeWidth="1" opacity="0.5" /><text x={2} y={yy + 3} fontSize="8" fill="var(--text-primary)">{Math.round(W(max * t) / 1000)}k</text></g>;
        })}
        {vb.buckets.map((b, i) => {
          const x = x0 + i * step;
          const dim = bucket && bucket !== b.key;
          let y = snap(padT + plotH);
          const parts = [];
          catIds.forEach((id) => {
            if (vFilter && id !== vFilter) return;
            const v = b.byCat[id] || 0;
            if (!v) return;
            const hh = Math.max(4, snap((v / max) * plotH));
            parts.push(<rect key={id} x={x} y={y - hh} width={bw} height={hh} fill={`url(#pt4${hexId(catColor(id))})`} opacity={dim ? 0.35 : 1} />);
            y -= hh;
          });
          return (
            <g key={b.key} onClick={(ev) => { ev.stopPropagation(); setBucket(bucket === b.key ? null : b.key); }} style={{ cursor: "pointer" }}>
              <rect x={x - 2} y={padT} width={bw + 4} height={plotH + padB} fill="transparent" />
              <g key={`${range}-${kind}`} className="bd-growy" style={{ transformOrigin: `0px ${snap(padT + plotH)}px`, animationDelay: `${i * 18}ms` }}>{parts}</g>
              {!valOf(b) && <rect x={x} y={padT + plotH - 2} width={bw} height={2} fill="var(--border)" />}
              {!vb.monthly && (n - 1 - i) % every === 0 && <text x={x + bw / 2} y={Hh - 8} fontSize="8" fill="var(--text-primary)" textAnchor="middle" opacity={dim ? 0.5 : 1}>{bucketLabel(b)}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  const catRows = catIds.map((id) => ({ id, v: scope.byCat[id] || 0 })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
  const vFilter = vsel && catIds.includes(vsel) ? vsel : null;
  const vcat = vFilter || (catRows[0] ? catRows[0].id : null);
  const exRows = vcat ? Object.entries(scope.byCatEx[vcat] || {}).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v) : [];
  const exTotal = exRows.reduce((s, r) => s + r.v, 0);

  const volumePage = (
    <>
      <div className="card flat bd-card">
        <div className="label-sm bd-title">{vFilter ? `${catName(vFilter)} ` : ""}{vb.monthly ? "monthly" : "weekly"} training volume</div>
        {vb.buckets.some((b) => b.total > 0) ? VolumeChart() : <div className="empty">No sets logged in this range.</div>}
        <div className="bd-legend">
          <button type="button" className={"bd-key bd-chip" + (!vFilter ? " on" : "")} onClick={() => setVsel(null)}>All</button>
          {catIds.map((id) => <button type="button" key={id} className={"bd-key bd-chip" + (vFilter === id ? " on" : "")} onClick={() => setVsel(id)}><span className="bd-dot" style={{ background: catColor(id) }} />{catName(id)}</button>)}
        </div>
      </div>
      <div className="card flat bd-card">
        <div className="bd-head">
          <span className="bd-h">{selBucket ? bucketTitle(selBucket) : "Whole range"}</span>
          <span className="bd-h">{vol(scope.total)}</span>
        </div>
        <div className="bd-list">
          {catRows.map((r) => (
            <div key={r.id} className={"bd-row bd-tap" + (vcat === r.id ? " on" : "")} role="button" tabIndex={0} onClick={() => setVsel(r.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setVsel(r.id); }}>
              <span className="bd-dot" style={{ background: catColor(r.id) }} />
              <div className="bd-main">
                <div className="bd-name">{catName(r.id)}</div>
                <div className="bd-bar"><span style={{ width: `${(r.v / (scope.total || 1)) * 100}%`, "--c": catColor(r.id) }} /></div>
              </div>
              <div className="bd-right">
                <div className="bd-num">{vol(r.v)}</div>
                <div className="bd-meta">{Math.round((r.v / (scope.total || 1)) * 100)}% of volume</div>
              </div>
            </div>
          ))}
          {!catRows.length && <div className="empty">Nothing logged here.</div>}
        </div>
      </div>
      {vcat && exRows.length > 0 && (
        <div className="card flat bd-card">
          <div className="bd-head"><span className="bd-h">{catName(vcat)} exercises</span><span className="bd-h">{vol(exTotal)}</span></div>
          <div className="bd-stack" aria-hidden="true">
            {[...exRows.slice(0, TOP_N).map((r, ri) => ({ k: r.name, v: r.v, c: rankColor(ri) })), exRows.length > TOP_N ? { k: "other", v: exRows.slice(TOP_N).reduce((t, r) => t + r.v, 0), c: gray } : null].filter(Boolean).map((r) => <span key={r.k} style={{ width: `${(r.v / (exTotal || 1)) * 100}%`, "--c": r.c }} />)}
          </div>
          <div className="bd-list">
            {exRows.map((r, ri) => (
              <div key={r.name} className="bd-row bd-tap" role="button" tabIndex={0} aria-label={`Open ${r.name}`} onClick={() => onOpenExercise(r.name, range)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenExercise(r.name, range); }}>
                <span className="bd-dot" style={{ background: rankColor(ri) }} />
                <div className="bd-main"><div className="bd-name">{r.name}</div></div>
                <div className="bd-right">
                  <div className="bd-num">{vol(r.v)}</div>
                  <div className="bd-meta">{Math.round((r.v / (exTotal || 1)) * 100)}% of {catName(vcat)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ---------------- Consistency ----------------
  const days = useMemo(() => dayRecords({ entries: strengthEntries, catOf, start, end }), [strengthEntries, catOf, start, end]);
  const statStart = start < firstDate ? firstDate : start; // per-week rate starts at your first log, not before it
  const cStats = useMemo(() => consistencyStats({ days, start: statStart, end, weekStartISO, shiftDate }), [days, statStart, end, weekStartISO, shiftDate]);
  const gridStart = weekStartISO(start);
  const nWeeks = Math.min(53, Math.max(1, Math.round((new Date(weekStartISO(end) + "T00:00:00") - new Date(gridStart + "T00:00:00")) / 604800000) + 1));
  const firstCol = shiftDate(weekStartISO(end), -(nWeeks - 1) * 7);

  // Squares are drawn at real pixel sizes on a 4px grid so the dot fill lines up like the main chart. Short ranges
  // fit the screen; long ones keep full-size squares and scroll sideways, starting at today.
  const heatBox = useRef(null), heatScroll = useRef(null);
  const [boxW, setBoxW] = useState(342);
  useEffect(() => {
    const el = heatBox.current; if (!el) return undefined;
    const measure = () => setBoxW(el.clientWidth || 342);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [kind]);
  const gapPx = 4, labelW = 30;
  const avail = boxW - labelW;
  const fitCell = [28, 24, 20, 16, 12].find((c) => nWeeks * (c + gapPx) <= avail);
  const cellPx = fitCell || 24, pitch = cellPx + gapPx, scrolls = !fitCell;
  useEffect(() => { const el = heatScroll.current; if (el) el.scrollLeft = el.scrollWidth; }, [kind, range, boxW, scrolls]);

  const HC_N = 8; // dots per side in each square, the same count the main chart uses
  const dotR = Math.max(0.6, (cellPx / HC_N) * (light ? 0.34 : 0.28));
  const Heatmap = () => {
    const Wd = nWeeks * pitch, Hh = 7 * pitch;
    const onClick = (ev) => {
      const r = ev.currentTarget.getBoundingClientRect();
      const col = Math.floor((ev.clientX - r.left) / pitch), row = Math.floor((ev.clientY - r.top) / pitch);
      if (col < 0 || col >= nWeeks || row < 0 || row > 6) return;
      const d = shiftDate(firstCol, col * 7 + row);
      if (d > end || d < start) return;
      setDate(date === d ? null : d);
    };
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div ref={heatScroll} className="bd-heat" style={{ flex: 1, minWidth: 0, overflowX: scrolls ? "auto" : "hidden" }}>
          <svg width={Wd} height={Hh} viewBox={`0 0 ${Wd} ${Hh}`} style={{ display: "block", cursor: "pointer" }} onClick={onClick} role="img" aria-label="Training days">
            <defs>
              <g id="bdHcOn">{Array.from({ length: HC_N * HC_N }).map((_, q) => <circle key={q} cx={((q % HC_N) + 0.5) * (cellPx / HC_N)} cy={(Math.floor(q / HC_N) + 0.5) * (cellPx / HC_N)} r={dotR} fill={gain} />)}</g>
              <g id="bdHcOff">{Array.from({ length: HC_N * HC_N }).map((_, q) => <circle key={q} cx={((q % HC_N) + 0.5) * (cellPx / HC_N)} cy={(Math.floor(q / HC_N) + 0.5) * (cellPx / HC_N)} r={dotR * 0.75} fill="var(--border)" />)}</g>
            </defs>
            <g key={`${range}-${kind}`} className="bd-fade">
              {Array.from({ length: nWeeks }).map((_, wi) => Array.from({ length: 7 }).map((__, di) => {
                const d = shiftDate(firstCol, wi * 7 + di);
                if (d > end || d < start) return null;
                const rec = days[d];
                const n = rec ? rec.exercises.length : 0;
                const x = wi * pitch, y = di * pitch;
                return (
                  <g key={d}>
                    <use href={rec ? "#bdHcOn" : "#bdHcOff"} x={x} y={y} opacity={rec ? (n >= 4 ? 1 : n >= 2 ? 0.75 : 0.5) : 0.6} />
                    {date === d && <rect x={x - 1} y={y - 1} width={cellPx + 2} height={cellPx + 2} fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />}
                  </g>
                );
              }))}
            </g>
          </svg>
        </div>
        <div style={{ flex: "none", width: labelW - 6 }} aria-hidden="true">
          {["M", "Tu", "W", "Th", "F", "Sa", "Su"].map((t) => <div key={t} style={{ height: pitch, lineHeight: `${cellPx}px`, fontSize: 11, color: "var(--text-primary)" }}>{t}</div>)}
        </div>
      </div>
    );
  };

  const dayRec = date ? days[date] : null;
  const daysPage = (
    <>
      <div className="card flat bd-card">
        <div className="label-sm bd-title">Training consistency</div>
        <div ref={heatBox}>{Heatmap()}</div>
      </div>
      {date && (
        <div className="card flat bd-card">
          <div className="bd-head"><span className="bd-h">{fmtDateFull(date)}</span><span className="bd-h">{dayRec ? vol(dayRec.volume) : ""}</span></div>
          {dayRec ? (
            <>
              <div className="bd-legend">
                {[...dayRec.cats].map((id) => <span key={id} className="bd-key"><span className="bd-dot" style={{ background: catColor(id) }} />{catName(id)}</span>)}
                <span className="bd-meta">{dayRec.exercises.length} exercise{dayRec.exercises.length === 1 ? "" : "s"} · {dayRec.sets} set{dayRec.sets === 1 ? "" : "s"}</span>
              </div>
              <div className="bd-list">
                {dayRec.exercises.map((x) => (
                  <div key={x.name} className="bd-row bd-tap" role="button" tabIndex={0} aria-label={`Open ${x.name}`} onClick={() => onOpenExercise(x.name, range)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenExercise(x.name, range); }}>
                    <span className="bd-dot" style={{ background: catColor(x.cat) }} />
                    <div className="bd-main">
                      <div className="bd-name">{x.name}</div>
                      <div className="bd-meta">{x.sets} set{x.sets === 1 ? "" : "s"} · {x.reps} reps · best {setWt(x.best, W, unit)} × {x.best.reps > 0 ? x.best.reps : 0}</div>
                    </div>
                    <div className="bd-right"><div className="bd-num">{vol(x.volume)}</div></div>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="bd-story">Rest day. Nothing logged.</div>}
        </div>
      )}
      <div className="card flat bd-card">
        <div className="st-grid">
          <div className="st-cell"><div className="st-label">Days trained</div><div className="st-val">{cStats.trained}</div></div>
          <div className="st-cell"><div className="st-label">Per week</div><div className="st-val">{cStats.perWeek.toFixed(1)}</div></div>
          <div className="st-cell"><div className="st-label">Best streak</div><div className="st-val">{cStats.longest} d</div></div>
          <div className="st-cell"><div className="st-label">Top weekday</div><div className="st-val">{cStats.bestWeekday === null ? "n/a" : WD_NAMES[cStats.bestWeekday].slice(0, 3)}</div></div>
          <div className="st-cell"><div className="st-label">Sets</div><div className="st-val">{fmtNum(cStats.sets)}</div></div>
          <div className="st-cell"><div className="st-label">Volume ({unit})</div><div className="st-val">{fmtNum(W(cStats.volume))}</div></div>
        </div>
        {cStats.trained > 0 && (
          <div className="bd-list" style={{ marginTop: 16 }}>
            {catIds.filter((id) => cStats.catDays[id]).sort((a, b) => cStats.catDays[b] - cStats.catDays[a]).map((id) => (
              <div key={id} className="bd-row">
                <span className="bd-dot" style={{ background: catColor(id) }} />
                <div className="bd-main"><div className="bd-name">{catName(id)}</div><div className="bd-bar"><span style={{ width: `${(cStats.catDays[id] / cStats.trained) * 100}%`, "--c": catColor(id) }} /></div></div>
                <div className="bd-right"><div className="bd-num">{cStats.catDays[id]}</div><div className="bd-meta">{Math.round((cStats.catDays[id] / cStats.trained) * 100)}% of days</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="xpage" role="dialog" aria-label="Training overview">
      <div className="xp-top">
        <button type="button" className="xp-back" onClick={(e) => { const el = e.currentTarget.closest(".xpage"); if (!el || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { onClose(); return; } if (el.classList.contains("leaving")) return; el.classList.add("leaving"); setTimeout(onClose, 300); }} aria-label="Back"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg></button>
        <div className="xp-title">Training overview</div>
      </div>
      <div className="xp-scroll">
        <div className="pills bd-tabs" role="group" aria-label="Breakdown">
          {TABS.map(([k, t]) => <button key={k} type="button" className={"pill" + (kind === k ? " active" : "")} onClick={() => changeKind(k)}>{t}</button>)}
        </div>
        <div className="label-sm" style={{ textAlign: "center", marginBottom: 8 }}>{spanLabel}</div>
        <div className="pills range-tabs" style={{ marginBottom: 12 }} role="group" aria-label="Date range">
          {RANGE_PRESETS.map((r) => (
            <button key={r.key} type="button" className={"pill" + (r.key === range ? " active" : "")} onClick={() => changeRange(r.key)}><span className="tab-l">{r.label}</span></button>
          ))}
        </div>
        {kind === "growth" ? growthPage : kind === "volume" ? volumePage : daysPage}
      </div>
    </div>
  );
}
