import { NextResponse } from "next/server";
import { PALETTES } from "@/data/palettes";
import { contrastRatio } from "@/lib/theme";
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
