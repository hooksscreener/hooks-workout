// Turns a mode ("dark" | "light" | "system") and one accent colour into the CSS variables the app
// uses. Self-contained on purpose: pages/_document.js inlines this function so the right theme is
// applied before the first paint (no flash of the wrong colours).
// Only the accent is user-chosen. Everything else is a fixed token set per scheme, and --on-accent
// (text on accent-filled things) is picked automatically as black or white, whichever has the higher
// WCAG contrast against the accent.
export function deriveTheme(mode, accent, systemIsLight, gl) {
  var scheme = mode === "light" ? "light" : mode === "system" ? (systemIsLight ? "light" : "dark") : "dark";
  var hex = /^#?[0-9a-fA-F]{6}$/.test(accent || "") ? String(accent).replace("#", "") : "ff6600";
  var lin = function (i) { var c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  var lum = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  var onAccent = (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? "#000000" : "#ffffff"; // contrast vs black, vs white
  var vars;
  if (scheme === "light") {
    vars = {
      "--bg": "#FFFFFF", "--surface": "#FFFFFF", "--surface-2": "#F4F4F5", "--border": "#DCDCE0",
      "--text-primary": "#0A0A0A", "--text-secondary": "#55555A", "--text-tertiary": "#66666C",
      "--gain": "#1E7B34", "--loss": "#C4281C", "--on-loss": "#FFFFFF", "--ma": "#0A0A0A",
    };
  } else {
    vars = {
      "--bg": "#000000", "--surface": "#0D0D0D", "--surface-2": "#1A1A1A", "--border": "#2A2A2A",
      "--text-primary": "#FFFFFF", "--text-secondary": "#A0A0A0", "--text-tertiary": "#8A8A8A",
      "--gain": "#34C759", "--loss": "#FF453A", "--on-loss": "#000000", "--ma": "#FFFFFF",
    };
  }
  // Gain/loss palettes: [dark gain, dark loss, light gain, light loss]
  var gls = {
    ios: ["#34C759", "#FF453A", "#1E7B34", "#C4281C"],
    mint: ["#00D68F", "#FF5C5C", "#007A52", "#D32F2F"],
    emerald: ["#2ECC71", "#FF3B5C", "#17793F", "#C2183D"],
    teal: ["#1DD1A1", "#FF6B81", "#00756A", "#C2255C"],
    lime: ["#7ED957", "#FF4D4D", "#3F7A18", "#B91C1C"],
    bluorange: ["#4DA3FF", "#FFA03A", "#0A66C2", "#A85200"],
  };
  var g = gls[gl] || gls.ios, li = scheme === "light";
  vars["--gain"] = li ? g[2] : g[0];
  vars["--loss"] = li ? g[3] : g[1];
  vars["--on-loss"] = li ? "#FFFFFF" : "#000000";
  vars["--accent"] = "#" + hex.toLowerCase();
  vars["--on-accent"] = onAccent;
  return { scheme: scheme, vars: vars, themeColor: scheme === "light" ? "#FFFFFF" : "#000000" };
}

// Text font and numbers-and-labels font, as CSS variables. Also inlined by pages/_document.js.
export function deriveFonts(textKey, numKey) {
  var sys = '-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif';
  var text = {
    "space-grotesk": '"Space Grotesk",' + sys,
    "ibm-plex-sans": '"IBM Plex Sans",' + sys,
    "barlow": '"Barlow",' + sys,
    "inter": '"Inter",' + sys,
    "sf-pro": sys,
  };
  var mono = 'ui-monospace,Menlo,monospace';
  var num = {
    "jetbrains-mono": '"JetBrains Mono",' + mono,
    "ibm-plex-mono": '"IBM Plex Mono",' + mono,
    "sf-mono": 'ui-monospace,"SF Mono",Menlo,monospace',
    "space-mono": '"Space Mono",' + mono,
  };
  var tf = text[textKey] || text["space-grotesk"];
  var nf = num[numKey] || (numKey === "same" ? tf : num["jetbrains-mono"]);
  return { "--font-text": tf, "--font-num": nf };
}
