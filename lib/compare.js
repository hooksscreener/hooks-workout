// "That's about N of these" comparisons for weight moved.
// Facts live in this table, never in AI output. Numbers are rounded, typical adult values in pounds.
// verified:true means the number was checked or supplied by J. verified:false is still unchecked: polar bear, Smart car, hippo, Civic.
export const ITEMS = [
  { s: "bowling ball", p: "bowling balls", lb: 15, verified: true },
  { s: "keg of beer", p: "kegs of beer", lb: 160, verified: true },
  { s: "washing machine", p: "washing machines", lb: 160, verified: true },
  { s: "refrigerator", p: "refrigerators", lb: 150, verified: true },
  { s: "silverback gorilla", p: "silverback gorillas", lb: 350, verified: true },
  { s: "sumo wrestler", p: "sumo wrestlers", lb: 350, verified: true },
  { s: "adult lion", p: "adult lions", lb: 420, verified: true, quip: "Not the cub." },
  { s: "grizzly bear", p: "grizzly bears", lb: 600, verified: true },
  { s: "upright piano", p: "upright pianos", lb: 450, verified: true },
  { s: "horse", p: "horses", lb: 1100, verified: true },
  { s: "polar bear", p: "polar bears", lb: 1000, verified: false },
  { s: "Smart car", p: "Smart cars", lb: 2000, verified: false },
  { s: "great white shark", p: "great white sharks", lb: 2400, verified: true },
  { s: "giraffe", p: "giraffes", lb: 2800, verified: true },
  { s: "adult hippo", p: "adult hippos", lb: 3000, verified: false, quip: "An adult one, not the baby." },
  { s: "Honda Civic", p: "Honda Civics", lb: 3000, verified: false },
  { s: "Ford F-150", p: "Ford F-150s", lb: 4800, verified: true, quip: "Whether you parked any of them, we are not sure." },
  { s: "African elephant", p: "African elephants", lb: 13000, verified: true },
  { s: "school bus", p: "school buses", lb: 24000, verified: true },
  { s: "Statue of Liberty", p: "Statues of Liberty", lb: 440000, verified: true },
];
const CUB_LB = 40; // rough lion cub; only used for the "lion plus a cub" remainder

const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };

// lbs: weight in pounds. seed: any string, keeps the pick steady for the same number on the same screen.
// Returns { text: "about 7 Ford F-150s", quip } or null when the number is too small to compare.
export function compareWeight(lbs, seed = "") {
  const w = Number(lbs);
  if (!(w >= 15)) return null;
  let pool = ITEMS.filter((it) => w / it.lb >= 1 && w / it.lb <= 8);
  if (!pool.length) pool = ITEMS.filter((it) => w / it.lb >= 0.9 && w / it.lb <= 15);
  if (!pool.length) return null;
  const it = pool[hash(seed + ":" + Math.round(w / 100)) % pool.length];
  const n = w / it.lb;
  if (it.s === "adult lion" && n >= 1 && n < 2) {
    const rem = w - it.lb;
    if (rem >= 25 && rem <= 70) return { text: "about one adult lion plus a cub", quip: null };
  }
  let text;
  if (n < 1.25) text = `about one ${it.s}`;
  else if (n < 1.75) text = `about one and a half ${it.p}`;
  else if (n < 2.25) text = `about 2 ${it.p}`;
  else text = `about ${Math.round(n)} ${it.p}`;
  return { text, quip: it.quip || null };
}
