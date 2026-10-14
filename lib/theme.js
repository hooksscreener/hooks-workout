// Turns a mode ("dark" | "light" | "system") and one accent colour into the full set of CSS
// variables the app uses. Self-contained on purpose: pages/_document.js inlines this function so the
// right theme is applied before the first paint (no flash of the wrong colours).
// With the default accent (#ff6600) the dark theme reproduces the original Bloomberg palette.
export function deriveTheme(mode, accent, systemIsLight) {
  var scheme = mode === "light" ? "light" : mode === "system" ? (systemIsLight ? "light" : "dark") : "dark";
  var hex = /^#?[0-9a-fA-F]{6}$/.test(accent || "") ? String(accent).replace("#", "") : "ff6600";
  var r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  var l0 = (mx + mn) / 2, s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
  var hsl = function (hh, ss, ll) { return "hsl(" + Math.round(((hh % 360) + 360) % 360) + "," + Math.round(ss) + "%," + Math.round(ll) + "%)"; };
  // Keep the accent readable with dark button text: not too dark, not washed out.
  var accL = Math.min(62, Math.max(45, l0 * 100));
  var accS = Math.max(55, Math.min(100, s0 * 100));
  var iron = hsl(h, accS, accL);
  var w = h + 17; // text colour sits a little warmer than the accent, like amber next to orange
  var vars;
  if (scheme === "light") {
    vars = {
      "--ink": hsl(h, 35, 96), "--card": "#ffffff", "--border": hsl(h + 10, 30, 82),
      "--chalk": hsl(w, 55, 17), "--mute": hsl(w, 30, 38), "--iron": iron,
      "--surface-2": hsl(h, 35, 94), "--surface-3": hsl(h, 35, 92),
      "--badge-on": hsl(h, 70, 90), "--warn-bg": hsl(h, 80, 92), "--warn-text": hsl(h, 70, 32), "--ma": hsl(w, 55, 17),
    };
  } else {
    vars = {
      "--ink": "#000000", "--card": hsl(h, 30, 4), "--border": hsl(h + 13, 45, 17),
      "--chalk": hsl(w, 100, 50), "--mute": hsl(w, 48, 36), "--iron": iron,
      "--surface-2": hsl(h, 45, 6), "--surface-3": hsl(h, 45, 5),
      "--badge-on": hsl(h, 70, 10), "--warn-bg": hsl(h, 70, 10), "--warn-text": hsl(h, 100, 65), "--ma": "#ffffff",
    };
  }
  return { scheme: scheme, vars: vars, themeColor: scheme === "light" ? "#fbf7f0" : "#000000" };
}
