import type { ColorValue, Theme, ThemeToken } from "./types";
import { THEME_TOKENS } from "./types";

const TOKEN_SET = new Set<string>(THEME_TOKENS);

/**
 * Resolve a `ColorValue` against a theme.
 *
 * `@accent`      -> theme.accent
 * `@accent/40`   -> theme.accent at 40% alpha
 * `#ff0055`      -> itself
 */
export function resolveColor(value: ColorValue | undefined, theme: Theme): string {
  if (!value) return "transparent";
  if (value[0] !== "@") return value;

  const [rawToken, alphaPart] = value.slice(1).split("/");
  if (!TOKEN_SET.has(rawToken)) return value;

  const hex = theme[rawToken as ThemeToken];
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

/**
 * Build a full theme from a single seed colour. Powers the "AI colour
 * suggestion" button — a deterministic harmony rather than a model call.
 */
export function themeFromSeed(seed: string): Theme {
  const rgb = hexToRgb(seed) ?? { r: 139, g: 92, b: 246 };
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const accent = hslToHex((h + 40) % 360, Math.min(1, s + 0.1), Math.min(0.7, l + 0.12));
  const secondary = hslToHex((h + 200) % 360, s * 0.9, Math.min(0.65, l + 0.05));
  return {
    primary: seed,
    secondary,
    accent,
    background: hslToHex(h, 0.35, 0.06),
    text: "#ffffff",
    border: withAlpha(accent, 0.45),
    glow: accent,
    shadow: "#000000",
  };
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
