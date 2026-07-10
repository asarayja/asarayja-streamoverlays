import { NextResponse } from "next/server";
import { PALETTES } from "@/data/palettes";
import { contrastRatio, hexToRgb, rgbToHsl, wcagLuminance } from "@/lib/theme";
import type { Theme, ThemeToken } from "@/lib/types";

/** Temporary palette QA endpoint — same gates as the in-app ContrastCheck. */

const PAIRS: Array<{ fg: ThemeToken; bg: ThemeToken; target: number }> = [
  { fg: "text", bg: "background", target: 4.5 },
  { fg: "text", bg: "surface", target: 4.5 },
  { fg: "textSecondary", bg: "background", target: 4.5 },
  { fg: "textSecondary", bg: "surface", target: 4.5 },
  { fg: "accent", bg: "background", target: 3 },
  { fg: "border", bg: "background", target: 1.6 },
  { fg: "success", bg: "surface", target: 3 },
  { fg: "warning", bg: "surface", target: 3 },
  { fg: "error", bg: "surface", target: 3 },
];

export function GET() {
  const failures: string[] = [];
  for (const palette of PALETTES) {
    const theme = palette.theme as Theme;

    // Design consistency: dark palettes share one darkness band. Never pure
    // black (crushes on stream), never drifting toward grey — HSL lightness
    // must sit in [0.035, 0.09].
    if (wcagLuminance(theme.background) < 0.5) {
      const rgb = hexToRgb(theme.background);
      if (rgb) {
        const { l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
        if (l < 0.035 || l > 0.09) {
          failures.push(
            `${palette.id}: dark background ${theme.background} lightness ${l.toFixed(3)} outside [0.035, 0.09]`,
          );
        }
      }
    }
    for (const pair of PAIRS) {
      const ratio = contrastRatio(theme[pair.fg], theme[pair.bg]);
      if (ratio < pair.target) {
        failures.push(
          `${palette.id}: ${pair.fg}(${theme[pair.fg]}) on ${pair.bg}(${theme[pair.bg]}) = ${ratio.toFixed(2)} < ${pair.target}`,
        );
      }
    }
  }
  return NextResponse.json({ palettes: PALETTES.length, failures });
}
