"use client";

import { AlertTriangle, Check, Eye, Wand2 } from "lucide-react";
import { Button, cx } from "@/components/ui";
import {
  colorDistance,
  contrastRatio,
  ensureContrast,
  simulateCvd,
  type CvdType,
} from "@/lib/theme";
import type { Theme, ThemeToken } from "@/lib/types";

/**
 * Automatic contrast control.
 *
 * Checks the token pairs that decide whether an overlay is readable on stream,
 * against WCAG 2.x thresholds: 4.5 for text, 3.0 for UI edges. Each failing
 * pair gets a deterministic one-click fix — `ensureContrast` moves only the
 * foreground's lightness, so the palette's hue identity survives the repair.
 *
 * Below that, a colour-vision pass simulates protanopia and deuteranopia and
 * warns when two roles that must be tellable apart (success/error,
 * primary/accent) collapse into the same colour.
 */

interface Pair {
  fg: ThemeToken;
  bg: ThemeToken;
  label: string;
  target: number;
}

const PAIRS: Pair[] = [
  { fg: "text", bg: "background", label: "Text on background", target: 4.5 },
  { fg: "text", bg: "surface", label: "Text on surface", target: 4.5 },
  { fg: "textSecondary", bg: "background", label: "Secondary text on background", target: 4.5 },
  { fg: "textSecondary", bg: "surface", label: "Secondary text on surface", target: 4.5 },
  { fg: "accent", bg: "background", label: "Accent on background", target: 3 },
  { fg: "border", bg: "background", label: "Borders on background", target: 1.6 },
  { fg: "success", bg: "surface", label: "Success on surface", target: 3 },
  { fg: "warning", bg: "surface", label: "Warning on surface", target: 3 },
  { fg: "error", bg: "surface", label: "Error on surface", target: 3 },
];

const CVD_PAIRS: Array<{ a: ThemeToken; b: ThemeToken; label: string }> = [
  { a: "success", b: "error", label: "Success vs error" },
  { a: "primary", b: "accent", label: "Primary vs accent" },
];

const CVD_TYPES: Array<{ type: CvdType; label: string }> = [
  { type: "deuteranopia", label: "green-blind" },
  { type: "protanopia", label: "red-blind" },
];

export function ContrastCheck({
  theme,
  onFix,
}: {
  theme: Theme;
  /** Applies token corrections; absent = read-only report. */
  onFix?: (patch: Partial<Theme>) => void;
}) {
  const results = PAIRS.map((pair) => {
    const ratio = contrastRatio(theme[pair.fg], theme[pair.bg]);
    return { ...pair, ratio, pass: ratio >= pair.target };
  });
  const failing = results.filter((r) => !r.pass);

  const cvdWarnings = CVD_PAIRS.flatMap(({ a, b, label }) =>
    CVD_TYPES.filter(
      ({ type }) => colorDistance(simulateCvd(theme[a], type), simulateCvd(theme[b], type)) < 55,
    ).map(({ label: typeLabel }) => ({ label, typeLabel })),
  );

  const fixAll = () => {
    if (!onFix) return;
    const patch: Partial<Theme> = {};
    // Later fixes see earlier ones, so text fixed against background stays
    // fixed when also checked against surface.
    const working = { ...theme };
    for (const pair of PAIRS) {
      const fixed = ensureContrast(working[pair.fg], working[pair.bg], pair.target);
      if (fixed !== working[pair.fg]) {
        working[pair.fg] = fixed;
        patch[pair.fg] = fixed;
      }
    }
    if (Object.keys(patch).length > 0) onFix(patch);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <Eye className="size-3.5" />
          Contrast check
        </p>
        <span
          className={cx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            failing.length === 0
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-amber-400/10 text-amber-300",
          )}
        >
          {failing.length === 0 ? "All pass" : `${failing.length} below target`}
        </span>
      </div>

      <ul className="space-y-1">
        {results.map((r) => (
          <li
            key={r.label}
            className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5"
          >
            {/* Live swatch: the actual pair, so the number has a face. */}
            <span
              className="grid h-6 w-9 shrink-0 place-items-center rounded text-[10px] font-bold"
              style={{ background: theme[r.bg], color: theme[r.fg] }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{r.label}</span>
            <span
              className={cx(
                "font-mono text-[11px] tabular-nums",
                r.pass ? "text-emerald-400" : "text-amber-300",
              )}
            >
              {r.ratio.toFixed(1)}:1
            </span>
            {r.pass ? (
              <Check className="size-3.5 shrink-0 text-emerald-400" />
            ) : (
              onFix && (
                <button
                  onClick={() => onFix({ [r.fg]: ensureContrast(theme[r.fg], theme[r.bg], r.target) })}
                  className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-400/25"
                >
                  Fix
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {failing.length > 1 && onFix && (
        <Button variant="outline" className="w-full" onClick={fixAll}>
          <Wand2 className="size-3.5" />
          Fix all ({failing.length})
        </Button>
      )}

      {cvdWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
          {cvdWarnings.map((w) => (
            <p key={w.label + w.typeLabel} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-300/90">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              {w.label} look alike for {w.typeLabel} viewers — separate their lightness, not just
              their hue.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
