export const dynamic = "force-static";

import { NextResponse } from "next/server";
import { PALETTES } from "@/data/palettes";
import { TEMPLATES } from "@/data/templates";
import { contrastRatio, hexToRgb, rgbToHsl, wcagLuminance } from "@/lib/theme";
import type { Layer, Theme, ThemeToken } from "@/lib/types";

/** Temporary palette QA endpoint — same gates as the in-app ContrastCheck. */

const PAIRS: Array<{ fg: ThemeToken; bg: ThemeToken; target: number }> = [
  { fg: "text", bg: "background", target: 4.5 },
  { fg: "text", bg: "surface", target: 4.5 },
  { fg: "textSecondary", bg: "background", target: 4.5 },
  { fg: "textSecondary", bg: "surface", target: 4.5 },
  { fg: "accent", bg: "background", target: 3 },
  { fg: "accent", bg: "surface", target: 3 },
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
  failures.push(...familyCoherenceFailures());
  return NextResponse.json({ palettes: PALETTES.length, templates: TEMPLATES.length, failures });
}

/**
 * A pack is only a design family if its full-screen scenes share their ground.
 * Every scene of a family must open with an identical backdrop layer — same
 * fill, same gradient token, same angle — or one palette produces burgundy
 * screens and violet screens that plainly don't belong together.
 */
function familyCoherenceFailures(): string[] {
  const out: string[] = [];
  const groups = new Map<string, Map<string, string[]>>();

  for (const template of TEMPLATES) {
    // One variant per design is enough; the layers are palette-independent.
    if (template.paletteId !== PALETTES.find((p) => p.collection === template.collection)?.id) continue;

    // Only screens that declare a family; standalone core designs are
    // deliberately one-offs and share nothing.
    const family = template.family;
    if (!family) continue;

    const backdrop = template.layers.find((l) => l.type === "background");
    if (!backdrop) continue; // overlays have no scene ground, by design

    const key = signature(backdrop);
    if (!groups.has(family)) groups.set(family, new Map());
    const sigs = groups.get(family)!;
    if (!sigs.has(key)) sigs.set(key, []);
    sigs.get(key)!.push(template.name);
  }

  for (const [family, sigs] of groups) {
    if (sigs.size > 1) {
      const detail = [...sigs.entries()]
        .map(([sig, names]) => `${sig} <- ${names.length} screen(s)`)
        .join(" | ");
      out.push(`family "${family}": ${sigs.size} different scene backdrops — ${detail}`);
    }
  }
  return out;
}

function signature(layer: Layer): string {
  const g = layer.effects.gradient;
  const fill = "fill" in layer ? layer.fill : "?";
  return g.enabled ? `${fill}->${g.from}->${g.to}@${g.angle}` : `${fill}`;
}
