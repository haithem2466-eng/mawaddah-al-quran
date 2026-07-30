// ==========================================================================
// settings.js — theme switching + reader preferences, persisted to
// IndexedDB via db.js and applied as CSS custom properties on <html>.
// This is the module app.js and pages/settings.js both depend on.
// ==========================================================================

import { getSetting, setSetting } from "./db.js";

export const THEMES = ["light", "dark", "sepia", "amoled", "custom"];

export const THEME_LABELS_AR = {
  light: "فاتح",
  dark: "داكن",
  sepia: "بني هادئ",
  amoled: "أسود",
  custom: "مخصص",
};

export const CUSTOM_THEME_DEFAULT_COLOR = "#FAFAFA";

export const FONT_OPTIONS = [
  {
    id: "amiri-quran",
    label: "المصحف",
    family: '"Amiri Quran", "Scheherazade New", serif',
  },
  {
    id: "scheherazade",
    label: "كلاسيكي",
    family: '"Scheherazade New", "Amiri Quran", serif',
  },
  {
    id: "amiri",
    label: "مبسط",
    family: '"Amiri", "Scheherazade New", serif',
  },
];
const READER_DEFAULTS = {
  fontFamily: FONT_OPTIONS[0].id,
  fontSize: 34, // px, matches --reader-font-size: 2.1rem default
  lineHeight: 2.6,
  letterSpacing: 0,
  readingWidth: 46, // rem, matches --reader-max-width: 46rem default
  readingMode: "paged", // "paged" (تقليب الصفحات) | "scroll" (تمرير متصل)
};

export const READING_MODES = ["paged", "scroll"];

export const READING_MODE_LABELS_AR = {
  paged: "تقليب الصفحات",
  scroll: "تمرير متصل",
};

let readerCache = null;

// ---- Colour math for the custom theme ----
// The person picks a single background colour; everything else (raised
// surfaces, borders, body text) is derived from it so the result stays
// readable no matter which colour they choose.

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

// Relative luminance per WCAG, used only to decide light-vs-dark text/UI.
function relativeLuminance({ r, g, b }) {
  const chan = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function withLightness(hex, l) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(1, l)) }));
}

// Given a single background colour the user picked, derive a full, legible
// palette for it: raised surfaces, borders, and body/muted text.
export function deriveCustomThemeVars(bgHex) {
  const bgRgb = hexToRgb(bgHex);
  const hsl = rgbToHsl(bgRgb);
  const isDark = relativeLuminance(bgRgb) < 0.45;

  const surface = isDark ? withLightness(bgHex, hsl.l + 0.05) : withLightness(bgHex, Math.min(1, hsl.l + (1 - hsl.l) * 0.7));
  const surface2 = isDark ? withLightness(bgHex, hsl.l + 0.09) : withLightness(bgHex, Math.max(0, hsl.l - 0.04));
  const border = isDark ? withLightness(bgHex, hsl.l + 0.14) : withLightness(bgHex, Math.max(0, hsl.l - 0.1));

  const text = isDark ? "#F4F4F5" : "#18181B";
  const textMuted = rgbToHex({
    r: (hexToRgb(text).r + bgRgb.r * 2) / 3,
    g: (hexToRgb(text).g + bgRgb.g * 2) / 3,
    b: (hexToRgb(text).b + bgRgb.b * 2) / 3,
  });

  return { bg: bgHex, surface, surface2, border, text, textMuted, shadowColor: isDark ? "0 0% 0%" : "220 15% 20%" };
}

function applyCustomThemeCssVars(bgHex) {
  const vars = deriveCustomThemeVars(bgHex);
  const root = document.documentElement.style;
  root.setProperty("--bg", vars.bg);
  root.setProperty("--surface", vars.surface);
  root.setProperty("--surface-2", vars.surface2);
  root.setProperty("--border", vars.border);
  root.setProperty("--text", vars.text);
  root.setProperty("--text-muted", vars.textMuted);
  root.setProperty("--shadow-color", vars.shadowColor);
}

function clearCustomThemeCssVars() {
  const root = document.documentElement.style;
  ["--bg", "--surface", "--surface-2", "--border", "--text", "--text-muted", "--shadow-color"].forEach((prop) =>
    root.removeProperty(prop)
  );
}

// ---- Theme ----

export async function getCustomThemeColor() {
  return getSetting("customThemeColor", CUSTOM_THEME_DEFAULT_COLOR);
}

export async function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : "light";
  document.documentElement.setAttribute("data-theme", t === "light" ? "" : t);
  if (t === "light") document.documentElement.removeAttribute("data-theme");

  if (t === "custom") {
    applyCustomThemeCssVars(await getCustomThemeColor());
  } else {
    clearCustomThemeCssVars();
  }

  await setSetting("theme", t);
  return t;
}

// Called when the person picks a new colour from the custom swatch. Applies
// it immediately and remembers it, switching the active theme to "custom".
export async function applyCustomThemeColor(hex) {
  await setSetting("customThemeColor", hex);
  document.documentElement.setAttribute("data-theme", "custom");
  applyCustomThemeCssVars(hex);
  await setSetting("theme", "custom");
  return hex;
}

async function loadTheme() {
  return getSetting("theme", "light");
}

// ---- Reader preferences ----

function fontFamilyFor(id) {
  const found = FONT_OPTIONS.find((f) => f.id === id);
  return found ? found.family : FONT_OPTIONS[0].family;
}

function applyReaderCssVars(reader) {
  const root = document.documentElement;
  root.style.setProperty("--reader-font-family", fontFamilyFor(reader.fontFamily));
  root.style.setProperty("--reader-font-size", `${reader.fontSize}px`);
  root.style.setProperty("--reader-line-height", String(reader.lineHeight));
  root.style.setProperty("--reader-letter-spacing", `${reader.letterSpacing}px`);
  root.style.setProperty("--reader-max-width", `${reader.readingWidth}rem`);
}

export async function loadReaderSettings() {
  if (readerCache) return readerCache;
  const saved = await getSetting("reader", null);
  readerCache = { ...READER_DEFAULTS, ...(saved || {}) };
  applyReaderCssVars(readerCache);
  return readerCache;
}

export async function applyReaderSettings(partial) {
  readerCache = { ...(readerCache || READER_DEFAULTS), ...partial };
  applyReaderCssVars(readerCache);
  await setSetting("reader", readerCache);
  return readerCache;
}

// ---- Boot-time init, called once from app.js ----

export async function initSettings() {
  const theme = await loadTheme();
  await applyTheme(theme);
  await loadReaderSettings();
}
