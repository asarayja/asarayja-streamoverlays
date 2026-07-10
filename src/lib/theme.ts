import type { ColorValue, CoreTheme, Theme, ThemeToken } from "./types";
import { THEME_TOKENS } from "./types";

const TOKEN_SET = new Set<string>(THEME_TOKENS);

/**
 * Resolve a `ColorValue` against a theme.
 *
 * `@accent`        -> theme.accent
 * `@accent/40`     -> theme.accent at 40% alpha
 * `@accent+20`     -> theme.accent lightened 20%
 * `@accent-20/50`  -> theme.accent darkened 20%, at 50% alpha
 * `#ff0055`        -> itself
 *
 * The lighten/darken modifiers are what give templates "lighter variant /
 * darker variant / hover tone" of any token without minting new tokens.
 */
export function resolveColor(value: ColorValue | undefined, theme: Theme): string {
  if (!value) return "transparent";
  if (value[0] !== "@") return value;

  const match = /^@([a-zA-Z]+)([+-]\d+)?(?:\/(\d+))?$/.exec(value);
  if (!match) return value;
  const [, rawToken, shiftPart, alphaPart] = match;
  if (!TOKEN_SET.has(rawToken)) return value;

  let hex = theme[rawToken as ThemeToken];
  if (shiftPart) {
    const shift = Number(shiftPart) / 100;
    hex = shift >= 0 ? lighten(hex, shift) : darken(hex, -shift);
  }
  if (alphaPart === undefined) return hex;

  const alpha = Number(alphaPart);
  if (!Number.isFinite(alpha)) return hex;
  return withAlpha(hex, alpha / 100);
}

/** Add an alpha channel to a `#rgb` / `#rrggbb` colour. Non-hex passes through. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Perceived luminance, 0 (black) .. 1 (white). Used to pick readable text. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export function readableOn(background: string): string {
  return luminance(background) > 0.55 ? "#0b0b12" : "#ffffff";
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.r * (1 - amount), rgb.g * (1 - amount), rgb.b * (1 - amount));
}

/** Blend two hex colours; `amount` 0 = a, 1 = b. */
export function mix(a: string, b: string, amount: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

/* ------------------------------ WCAG contrast ----------------------------- */

/** WCAG 2.x relative luminance (proper sRGB linearisation, not the quick one). */
export function wcagLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** WCAG contrast ratio, 1..21. AA text needs 4.5, large text / UI needs 3. */
export function contrastRatio(a: string, b: string): number {
  const la = wcagLuminance(a);
  const lb = wcagLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudge `fg` until it reaches `target` contrast against `bg`, keeping its hue
 * and saturation and only moving lightness — deterministic, so "fix contrast"
 * always produces the same answer. Falls back to white/black if the hue can't
 * reach the target at any lightness.
 */
export function ensureContrast(fg: string, bg: string, target = 4.5): string {
  if (contrastRatio(fg, bg) >= target) return fg;
  const rgb = hexToRgb(fg);
  if (!rgb) return fg;
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // Push away from the background's side of the lightness axis.
  const towardLight = wcagLuminance(bg) < 0.5;
  const start = towardLight ? 0.05 : 0.95;
  const end = towardLight ? 0.98 : 0.02;
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const l = start + ((end - start) * i) / steps;
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
}

/* --------------------------- colour-vision check -------------------------- */

export type CvdType = "protanopia" | "deuteranopia";

// Machado et al. (2009) full-severity simulation matrices, applied in linear RGB.
const CVD_MATRICES: Record<CvdType, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
};

export function simulateCvd(hex: string, type: CvdType): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const delin = (c: number) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(1, v)) * 255;
  };
  const [r, g, b] = [lin(rgb.r), lin(rgb.g), lin(rgb.b)];
  const m = CVD_MATRICES[type];
  return rgbToHex(
    delin(m[0] * r + m[1] * g + m[2] * b),
    delin(m[3] * r + m[4] * g + m[5] * b),
    delin(m[6] * r + m[7] * g + m[8] * b),
  );
}

/** Rough perceptual distance in RGB space, 0..441. Under ~60 reads as "same". */
export function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return 441;
  return Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b);
}

/* ------------------------------ token derivation -------------------------- */

const hueOf = (hex: string) => {
  const rgb = hexToRgb(hex) ?? { r: 128, g: 128, b: 128 };
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
};

/**
 * Fill in every derivable token from the authored core. This is both the
 * palette-authoring shortcut and the migration path for themes saved before
 * the token set grew.
 */
export function completeTheme(partial: CoreTheme & Partial<Theme>): Theme {
  const bg = partial.background;
  const lightMode = wcagLuminance(bg) > 0.5;
  const step = (c: string, amount: number) => (lightMode ? darken(c, amount) : lighten(c, amount));

  const surface = partial.surface ?? step(bg, 0.07);
  const accentHsl = hueOf(partial.accent);
  // Status colours inherit the palette's saturation so they sit in the family
  // instead of screaming stock-bootstrap green/red.
  const statusSat = Math.max(0.35, Math.min(0.75, accentHsl.s));
  const statusLight = lightMode ? 0.34 : 0.62;

  return {
    background: bg,
    backgroundSecondary: partial.backgroundSecondary ?? step(bg, 0.035),
    surface,
    surfaceSecondary: partial.surfaceSecondary ?? step(surface, 0.06),
    primary: partial.primary,
    secondary: partial.secondary,
    accent: partial.accent,
    accentSecondary:
      partial.accentSecondary ??
      hslToHex((accentHsl.h + 30) % 360, accentHsl.s * 0.9, Math.min(0.75, accentHsl.l + 0.05)),
    text: partial.text,
    textSecondary: partial.textSecondary ?? mix(partial.text, bg, 0.35),
    border: partial.border,
    glow: partial.glow,
    shadow: partial.shadow,
    success: partial.success ?? hslToHex(150, statusSat, statusLight),
    warning: partial.warning ?? hslToHex(42, statusSat, statusLight),
    error: partial.error ?? hslToHex(355, statusSat, statusLight),
  };
}

/**
 * Linked-token cascade: editing one core colour recomputes the tones derived
 * from it, so nobody hand-picks ten colours. Editing a derived token directly
 * (surface, glow, …) never cascades — an explicit choice is final.
 */
export function cascade(theme: Theme, token: ThemeToken, value: string): Partial<Theme> {
  const next: Partial<Theme> = { [token]: value };
  const lightMode = wcagLuminance(token === "background" ? value : theme.background) > 0.5;
  const step = (c: string, amount: number) => (lightMode ? darken(c, amount) : lighten(c, amount));

  switch (token) {
    case "background": {
      const surface = step(value, 0.07);
      next.backgroundSecondary = step(value, 0.035);
      next.surface = surface;
      next.surfaceSecondary = step(surface, 0.06);
      next.shadow = lightMode ? darken(value, 0.65) : "#000000";
      next.textSecondary = mix(theme.text, value, 0.35);
      break;
    }
    case "text":
      next.textSecondary = mix(value, theme.background, 0.35);
      break;
    case "accent": {
      const { h, s, l } = hueOf(value);
      next.accentSecondary = hslToHex((h + 30) % 360, s * 0.9, Math.min(0.75, l + 0.05));
      next.glow = lighten(value, 0.15);
      next.border = mix(value, theme.background, 0.35);
      break;
    }
    case "primary":
      // Primary is the hero fill; its glow variant follows it.
      next.glow = lighten(value, 0.2);
      break;
    default:
      break;
  }
  return next;
}

/* ------------------------------ harmony schemes ---------------------------- */

/**
 * Colour-wheel construction rules. Secondary/accent hues are placed by the
 * scheme, never picked freely — "AI velger aldri tilfeldige farger".
 */
export const HARMONY_SCHEMES = [
  "analogous",
  "complementary",
  "splitComplementary",
  "triadic",
  "tetradic",
  "monochrome",
] as const;

export type HarmonyScheme = (typeof HARMONY_SCHEMES)[number];

export const SCHEME_LABELS: Record<HarmonyScheme, string> = {
  analogous: "Analogous",
  complementary: "Complementary",
  splitComplementary: "Split complementary",
  triadic: "Triadic",
  tetradic: "Tetradic",
  monochrome: "Monochrome",
};

/**
 * Build a full sixteen-token theme from one seed colour and a harmony scheme,
 * then force the text and accent tokens through the contrast gate so the
 * generator can never emit an unreadable palette.
 */
export function themeFromSeed(seed: string, scheme: HarmonyScheme = "analogous"): Theme {
  const { h, s, l } = hueOf(seed);
  const sat = Math.max(0.25, Math.min(0.9, s));
  const at = (hue: number, satMul = 1, light = Math.min(0.68, l + 0.1)) =>
    hslToHex(((hue % 360) + 360) % 360, Math.min(1, sat * satMul), light);

  let secondary: string;
  let accent: string;
  let accentSecondary: string | undefined;

  switch (scheme) {
    case "analogous":
      secondary = at(h - 30, 0.9);
      accent = at(h + 30, 1.05);
      break;
    case "complementary":
      secondary = at(h + 180, 0.7, 0.55);
      accent = at(h + 180, 1);
      break;
    case "splitComplementary":
      secondary = at(h + 150, 0.9);
      accent = at(h + 210, 1);
      break;
    case "triadic":
      secondary = at(h + 120, 0.85);
      accent = at(h + 240, 1);
      break;
    case "tetradic":
      secondary = at(h + 90, 0.85);
      accent = at(h + 180, 1);
      accentSecondary = at(h + 270, 0.9);
      break;
    case "monochrome":
      secondary = hslToHex(h, sat * 0.45, Math.min(0.7, l + 0.18));
      accent = hslToHex(h, Math.min(1, sat * 1.1), Math.min(0.8, l + 0.28));
      break;
  }

  const background = hslToHex(h, Math.min(0.5, sat * 0.6), 0.06);
  const accentSafe = ensureContrast(accent, background, 3);

  const theme = completeTheme({
    primary: seed,
    secondary,
    accent: accentSafe,
    background,
    text: "#ffffff",
    border: mix(accentSafe, background, 0.4),
    glow: lighten(accentSafe, 0.12),
    shadow: "#000000",
    ...(accentSecondary ? { accentSecondary } : {}),
  });

  theme.text = ensureContrast(theme.text, theme.surface, 4.5);
  theme.textSecondary = ensureContrast(theme.textSecondary, theme.background, 4.5);
  return theme;
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = (
    [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const
  )[seg];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
