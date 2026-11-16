import { useEffect, useMemo, useRef, useState } from "react";
import {
  colorAt, growthByCategory, growthStory, makeCatOf, volumeBuckets, sumBuckets, dayRecords, consistencyStats, e1rmOf,
} from "./analysis";

// Drill-down pages behind the Training overview charts: Strength, Volume, Consistency.
// Everything here is read-only. All numbers come from the same entries the main charts use.

const SANS = { fontFamily: "'IBM Plex Sans',-apple-system,sans-serif" };
const snap = (v) => Math.round(v / 4) * 4;
const TABS = [["growth", "Strength"], ["volume", "Volume"], ["days", "Consistency"]];
const WD_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RANGE_NAMES = { "1m": "Last month", "3m": "Last 3 months", "6m": "Last 6 months", ytd: "Year to date", "1y": "Last year", all: "All time" };

function Patterns({ colors, prefix }) {
  return (
    <defs>
      {colors.map((c, i) => (
        <pattern key={i} id={`${prefix}${i}`} width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.35" fill={c} /></pattern>
      ))}
    </defs>
  );
}

export default function Breakdown({ initial, onClose, strengthEntries, workouts, exercises, unit, W, h }) {
  const { fmtDate, fmtDateFull, fmtNum, shiftDate, weekStartISO, todayISO, rangeCutoffISO, RANGE_PRESETS, setWt } = h;
  const [kind, setKind] = useState(initial.kind || "growth");
  const [range, setRange] = useState(initial.range || "all");
  const [cat, setCat] = useState(initial.cat || null);      // selected category id
  const [bucket, setBucket] = useState(null);                // selected volume bucket key
  const [date, setDate] = useState(initial.date || null);    // selected day
  const light = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const today = todayISO();
  const firstDate = useMemo(() => strengthEntries.reduce((m, e) => (e.date < m ? e.date : m), today), [strengthEntries, today]);
  const start = range === "all" ? firstDate : rangeCutoffISO(range);
  const end = today;
  const spanLabel = `${RANGE_NAMES[range]} · ${fmtDate(start)} – ${fmtDate(end)}`;
  const catOf = useMemo(() => makeCatOf(workouts, exercises), [workouts, exercises]);
  const catName = (id) => (workouts.find((w) => w.id === id) || { name: "Other" }).name;
  const catColor = (id) => colorAt(Math.max(0, workouts.findIndex((w) => w.id === id)), light);
  const vol = (v) => `${fmtNum(W(v))} ${unit}`;
  const pctTxt = (p) => `${p >= 0 ? "+" : "-"}${Math.abs(p).toFixed(1)}%`;
  const colorFor = (p) => (p >= 0 ? "var(--gain)" : "var(--loss)");

  const changeKind = (k) => { setKind(k); setBucket(null); };
  const changeRange = (r) => { setRange(r); setBucket(null); };

  // ---------------- Strength ----------------
  const growth = useMemo(() => growthByCategory({ workouts, exercises, entries: strengthEntries, start, end }), [workouts, exercises, strengthEntries, start, end]);
  const selGrowth = growth.find((c) => c.id === cat) || [...growth].filter((c) => c.hasData).sort((a, b) => b.exact - a.exact)[0] || growth[0];

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
    const allColors = Array.from({ length: 12 }, (_, i) => colorAt(i, light));
    return (
      <svg viewBox={`0 0 ${Wd} ${Hh}`} style={{ width: "100%", height: Hh, display: "block" }} role="img" aria-label="Strength growth by category and exercise">
        <Patterns colors={allColors} prefix="gsd" />
        {rows.map(({ c, pos, neg }, ri) => {
          const y = padT + ri * rowH, cy = y + rowH / 2, by = snap(cy - 12), sel = selGrowth && c.id === selGrowth.id;
          const segs = [];
          let cum = 0;
          pos.forEach((i) => { const a = snap(zeroX + cum * unitW); cum += i.contrib; const b = snap(zeroX + cum * unitW); segs.push({ i, x: a, w: b - a }); });
          let cn = 0;
          neg.forEach((i) => { const b = snap(zeroX - cn * unitW); cn += -i.contrib; const a = snap(zeroX - cn * unitW); segs.push({ i, x: a, w: b - a }); });
          const endX = zeroX + snap(cum * unitW);
          const net = c.value;
          return (
            <g key={c.id} onClick={() => setCat(c.id)} style={{ cursor: "pointer" }}>
              <rect x={0} y={y + 2} width={Wd} height={rowH - 4} rx="6" fill={sel ? "var(--surface)" : "transparent"} />
              <text x={labelW} y={cy} fontSize="13" fill="var(--text-primary)" textAnchor="end" dominantBaseline="central" style={{ ...SANS, fontWeight: sel ? 700 : 600 }}>{c.label}</text>
              {segs.map(({ i, x, w }) => w >= 4 && (
                <g key={i.name}>
                  <rect x={x} y={by} width={w} height={24} fill={`url(#gsd${c.items.indexOf(i)})`} />
                  <rect x={x + w - 1} y={by} width={1} height={24} fill="var(--bg)" />
                </g>
              ))}
              {c.hasData && <rect x={zeroX - 1} y={by - 3} width={2} height={30} fill="var(--text-secondary)" opacity="0.7" />}
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
        <GrowthChart />
        <div className="bd-note">Each color is one exercise. The bar is the category average, so each exercise fills its share of it. Tap a category for the breakdown.</div>
      </div>
      {selGrowth && (
        <div className="card flat bd-card">
          <div className="bd-head">
            <span className="bd-h">{selGrowth.label}</span>
            <span className="bd-h" style={{ color: selGrowth.hasData ? colorFor(selGrowth.value) : "var(--text-secondary)" }}>{selGrowth.hasData ? pctTxt(selGrowth.exact) : "n/a"}</span>
          </div>
          <div className="bd-meta">{vol(selGrowth.volume)} volume in this range</div>
          <div className="bd-story">{growthStory(selGrowth)}</div>
          <div className="bd-list">
            {selGrowth.items.map((i, idx) => (
              <div key={i.name} className="bd-row">
                <span className="bd-dot" style={{ background: colorAt(idx, light) }} />
                <div className="bd-main">
                  <div className="bd-name">{i.name}</div>
                  <div className="bd-meta">
                    {i.pct === null ? `${i.sessions} session${i.sessions === 1 ? "" : "s"}, needs 2 to show growth` : `Est. max ${fmtNum(W(e1rmOf(i.first)))} to ${fmtNum(W(e1rmOf(i.last)))} · ${i.sessions} sessions`}
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
  const vcat = catIds.includes(cat) ? cat : null;

  const bucketLabel = (b) => {
    if (vb.monthly) { const [y, m] = b.key.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1] + (vb.buckets.length > 12 ? ` '${y.slice(2)}` : ""); }
    const [, m, d] = b.key.split("-"); return `${+m}/${+d}`;
  };
  const bucketTitle = (b) => (vb.monthly ? bucketLabel(b) : `Week of ${bucketLabel(b)}`);

  const VolumeChart = () => {
    const Wd = 342, Hh = 200, padL = 34, padR = 4, padT = 8, padB = 24;
    const n = vb.buckets.length;
    const max = Math.max(...vb.buckets.map((b) => b.total), 1);
    const plotH = Hh - padT - padB;
    const step = (Wd - padL - padR) / n;
    const bw = Math.max(4, snap(step - (n > 14 ? 3 : 6)));
    const colors = catIds.map((id) => catColor(id));
    const every = n > 20 ? 3 : n > 13 ? 2 : 1;
    return (
      <svg viewBox={`0 0 ${Wd} ${Hh}`} style={{ width: "100%", height: 210, display: "block" }} role="img" aria-label="Training volume by category">
        <Patterns colors={colors} prefix="vsd" />
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const yy = padT + (1 - t) * plotH;
          return <g key={t}><line x1={padL} y1={yy} x2={Wd - padR} y2={yy} stroke="var(--border)" strokeWidth="1" opacity="0.5" /><text x={2} y={yy + 3} fontSize="8" fill="var(--text-primary)">{Math.round(W(max * t) / 1000)}k</text></g>;
        })}
        {vb.buckets.map((b, i) => {
          const x = snap(padL + i * step + 3);
          const dim = bucket && bucket !== b.key;
          let y = snap(padT + plotH);
          const parts = [];
          catIds.forEach((id, ci) => {
            const v = b.byCat[id] || 0;
            if (!v) return;
            const hh = Math.max(4, snap((v / max) * plotH));
            parts.push(<rect key={id} x={x} y={y - hh} width={bw} height={hh} fill={`url(#vsd${ci})`} opacity={dim ? 0.35 : 1} />);
            y -= hh;
          });
          return (
            <g key={b.key} onClick={() => setBucket(bucket === b.key ? null : b.key)} style={{ cursor: "pointer" }}>
              <rect x={x - 2} y={padT} width={bw + 4} height={plotH + padB} fill="transparent" />
              {parts}
              {!b.total && <rect x={x} y={padT + plotH - 2} width={bw} height={2} fill="var(--border)" />}
              {i % every === 0 && <text x={x + bw / 2} y={Hh - 8} fontSize="8" fill="var(--text-primary)" textAnchor="middle" opacity={dim ? 0.5 : 1}>{bucketLabel(b)}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  const catRows = catIds.map((id) => ({ id, v: scope.byCat[id] || 0 })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
  const exRows = vcat ? Object.entries(scope.byCatEx[vcat] || {}).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v) : [];
  const exTotal = exRows.reduce((s, r) => s + r.v, 0);

  const volumePage = (
    <>
      <div className="card flat bd-card">
        <div className="label-sm bd-title">{vb.monthly ? "Monthly" : "Weekly"} training volume</div>
        {vb.buckets.some((b) => b.total > 0) ? <VolumeChart /> : <div className="empty">No sets logged in this range.</div>}
        <div className="bd-legend">
          {catIds.map((id) => <span key={id} className="bd-key"><span className="bd-dot" style={{ background: catColor(id) }} />{catName(id)}</span>)}
        </div>
        <div className="bd-note">{vb.truncated ? "Showing the most recent bars that fit. " : ""}Tap a bar to see just that {vb.monthly ? "month" : "week"}.</div>
      </div>
      <div className="card flat bd-card">
        <div className="bd-head">
          <span className="bd-h">{selBucket ? bucketTitle(selBucket) : "Whole range"}</span>
          <span className="bd-h">{vol(scope.total)}</span>
        </div>
        <div className="bd-meta">Volume is weight × sets × reps. Tap a category to see its exercises.</div>
        <div className="bd-list">
          {catRows.map((r) => (
            <div key={r.id} className={"bd-row bd-tap" + (vcat === r.id ? " on" : "")} role="button" tabIndex={0} onClick={() => setCat(vcat === r.id ? null : r.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCat(vcat === r.id ? null : r.id); }}>
              <span className="bd-dot" style={{ background: catColor(r.id) }} />
              <div className="bd-main">
                <div className="bd-name">{catName(r.id)}</div>
                <div className="bd-bar"><span style={{ width: `${(r.v / (scope.total || 1)) * 100}%`, background: catColor(r.id) }} /></div>
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
            {exRows.map((r, i) => <span key={r.name} style={{ width: `${(r.v / (exTotal || 1)) * 100}%`, background: colorAt(i, light) }} />)}
          </div>
          <div className="bd-list">
            {exRows.map((r, i) => (
              <div key={r.name} className="bd-row">
                <span className="bd-dot" style={{ background: colorAt(i, light) }} />
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
  const cStats = useMemo(() => consistencyStats({ days, start, end, weekStartISO, shiftDate }), [days, start, end, weekStartISO, shiftDate]);
  const heatSvg = useRef(null);
  const gridStart = weekStartISO(start);
  const nWeeks = Math.min(53, Math.max(1, Math.round((new Date(weekStartISO(end) + "T00:00:00") - new Date(gridStart + "T00:00:00")) / 604800000) + 1));
  const firstCol = shiftDate(weekStartISO(end), -(nWeeks - 1) * 7);

  const Heatmap = () => {
    const labelW = 30, avail = 342 - labelW;
    const gap = nWeeks > 26 ? 1 : 3;
    const cell = Math.max(4, Math.min(24, Math.floor(avail / nWeeks) - gap));
    const Wd = nWeeks * (cell + gap) + labelW, Hh = 7 * (cell + gap);
    const onClick = (ev) => {
      const el = heatSvg.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * Wd, y = ((ev.clientY - r.top) / r.height) * (Hh + 2);
      const col = Math.floor(x / (cell + gap)), row = Math.floor(y / (cell + gap));
      if (col < 0 || col >= nWeeks || row < 0 || row > 6) return;
      const d = shiftDate(firstCol, col * 7 + row);
      if (d > end || d < start) return;
      setDate(date === d ? null : d);
    };
    const patt = cell >= 10;
    return (
      <svg ref={heatSvg} viewBox={`0 0 ${Wd} ${Hh + 2}`} style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }} onClick={onClick} role="img" aria-label="Training days">
        <Patterns colors={["var(--gain)"]} prefix="csd" />
        {Array.from({ length: nWeeks }).map((_, wi) => Array.from({ length: 7 }).map((__, di) => {
          const d = shiftDate(firstCol, wi * 7 + di);
          if (d > end || d < start) return null;
          const rec = days[d];
          const n = rec ? rec.exercises.length : 0;
          const x = wi * (cell + gap), y = di * (cell + gap);
          return (
            <g key={d}>
              <rect x={x} y={y} width={cell} height={cell} rx={cell > 10 ? 3 : 1} fill={rec ? (patt ? "url(#csd0)" : "var(--gain)") : "var(--border)"} opacity={rec ? (n >= 4 ? 1 : n >= 2 ? 0.75 : 0.5) : 0.35} />
              {date === d && <rect x={x - 1} y={y - 1} width={cell + 2} height={cell + 2} rx={cell > 10 ? 4 : 2} fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />}
            </g>
          );
        }))}
        {["M", "Tu", "W", "Th", "F", "Sa", "Su"].map((t, di) => <text key={t} x={nWeeks * (cell + gap) + 4} y={di * (cell + gap) + cell / 2 + 4} fontSize="10" fill="var(--text-primary)">{t}</text>)}
      </svg>
    );
  };

  const dayRec = date ? days[date] : null;
  const daysPage = (
    <>
      <div className="card flat bd-card">
        <div className="label-sm bd-title">Training consistency</div>
        <Heatmap />
        <div className="bd-note">A lit square is a day you trained; brighter means more exercises. Tap any day for what you did.</div>
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
                  <div key={x.name} className="bd-row">
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
        <div className="label-sm bd-title">{RANGE_NAMES[range]} at a glance</div>
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
            <div className="bd-meta" style={{ marginBottom: 4 }}>Days each category was trained</div>
            {catIds.filter((id) => cStats.catDays[id]).sort((a, b) => cStats.catDays[b] - cStats.catDays[a]).map((id) => (
              <div key={id} className="bd-row">
                <span className="bd-dot" style={{ background: catColor(id) }} />
                <div className="bd-main"><div className="bd-name">{catName(id)}</div><div className="bd-bar"><span style={{ width: `${(cStats.catDays[id] / cStats.trained) * 100}%`, background: catColor(id) }} /></div></div>
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
        <button type="button" className="xp-back" onClick={onClose} aria-label="Back"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg></button>
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
