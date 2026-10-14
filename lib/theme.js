// Turns a mode ("dark" | "light" | "system") and one accent colour into the CSS variables the app
// uses. Self-contained on purpose: pages/_document.js inlines this function so the right theme is
// applied before the first paint (no flash of the wrong colours).
// Only the accent is user-chosen. Everything else is a fixed token set per scheme, and --on-accent
// (text on accent-filled things) is picked automatically as black or white, whichever has the higher
// WCAG contrast against the accent.
export function deriveTheme(mode, accent, systemIsLight) {
  var scheme = mode === "light" ? "light" : mode === "system" ? (systemIsLight ? "light" : "dark") : "dark";
  var hex = /^#?[0-9a-fA-F]{6}$/.test(accent || "") ? String(accent).replace("#", "") : "ff6600";
  var lin = function (i) { var c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  var lum = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  var onAccent = (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? "#000000" : "#ffffff"; // contrast vs black, vs white
  var vars;
  if (scheme === "light") {
    vars = {
      "--bg": "#F7F4EE", "--surface": "#FFFFFF", "--surface-2": "#F0ECE4", "--border": "#D6CFC2",
      "--text-primary": "#1A1612", "--text-secondary": "#574F44", "--text-tertiary": "#675F52",
      "--gain": "#1E7B34", "--loss": "#C4281C", "--ma": "#1A1612",
    };
  } else {
    vars = {
      "--bg": "#0A0806", "--surface": "#14100C", "--surface-2": "#1C1712", "--border": "#2E2519",
      "--text-primary": "#F5F1EA", "--text-secondary": "#A89F91", "--text-tertiary": "#8A8275",
      "--gain": "#34C759", "--loss": "#FF453A", "--ma": "#FFFFFF",
    };
  }
  vars["--accent"] = "#" + hex.toLowerCase();
  vars["--on-accent"] = onAccent;
  return { scheme: scheme, vars: vars, themeColor: scheme === "light" ? "#F7F4EE" : "#0A0806" };
}
