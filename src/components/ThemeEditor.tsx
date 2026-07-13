"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Link2Off, Sparkles } from "lucide-react";
import { PALETTES } from "@/data/palettes";
import { Button, ColorInput, Field, Select, cx } from "@/components/ui";
import {
  HARMONY_SCHEMES,
  SCHEME_LABELS,
  cascade,
  resolveColor,
  rgbToHex,
  themeFromSeed,
  type HarmonyScheme,
} from "@/lib/theme";
import type { Theme, ThemeToken } from "@/lib/types";
import { useT } from "@/lib/i18n";

const TOKEN_LABELS: Record<ThemeToken, string> = {
  background: "Background",
  backgroundSecondary: "Background 2",
  surface: "Surface",
  surfaceSecondary: "Surface 2",
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  accentSecondary: "Accent 2",
  text: "Text",
  textSecondary: "Text 2",
  border: "Border",
  glow: "Glow",
  shadow: "Shadow",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

const TOKEN_GROUPS: Array<{ title: string; tokens: ThemeToken[] }> = [
  { title: "Backgrounds", tokens: ["background", "backgroundSecondary", "surface", "surfaceSecondary"] },
  { title: "Brand", tokens: ["primary", "secondary", "accent", "accentSecondary"] },
  { title: "Text", tokens: ["text", "textSecondary"] },
  { title: "Effects", tokens: ["border", "glow", "shadow"] },
  { title: "Status", tokens: ["success", "warning", "error"] },
];

export function PaletteGrid({
  theme,
  onApply,
}: {
  theme: Theme;
  onApply: (theme: Theme) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PALETTES.map((palette) => {
        const active = palette.theme.primary === theme.primary && palette.theme.accent === theme.accent;
        return (
          <button
            key={palette.id}
            onClick={() => onApply(palette.theme)}
            className={cx(
              "group flex items-center gap-2 rounded-xl border p-2 text-left transition-colors",
              active
                ? "border-brand-400/60 bg-brand-500/10"
                : "border-white/8 bg-white/[0.02] hover:border-white/20",
            )}
          >
            <span className="flex shrink-0 -space-x-1">
              {[palette.theme.primary, palette.theme.accent, palette.theme.secondary].map((c) => (
                <span key={c} className="size-4 rounded-full ring-2 ring-ink-900" style={{ background: c }} />
              ))}
            </span>
            <span className="truncate text-[11px] font-medium text-zinc-300">{palette.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The sixteen design tokens, grouped, with a linked-edit mode: editing a core
 * colour (background, text, accent, primary) recomputes the tones derived from
 * it, so changing one colour restyles the family instead of leaving nine other
 * pickers to update by hand.
 */
export function ThemeTokens({
  theme,
  onPatch,
}: {
  theme: Theme;
  onPatch: (patch: Partial<Theme>) => void;
}) {
  const t = useT();
  const [linked, setLinked] = useState(true);

  const edit = (token: ThemeToken, color: string) => {
    onPatch(linked ? cascade(theme, token, color) : { [token]: color });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setLinked((v) => !v)}
        className={cx(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
          linked
            ? "border-brand-400/40 bg-brand-500/10 text-brand-400"
            : "border-white/10 bg-white/[0.03] text-zinc-500",
        )}
        title={t("When on, editing background, text, accent or primary also updates the tones derived from them (surfaces, glow, borders, secondary text)")}
      >
        {linked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
        {linked ? t("Linked colours: derived tones follow") : t("Linked colours off: edit tokens individually")}
      </button>

      {TOKEN_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            {t(group.title)}
          </p>
          <div className="space-y-2.5">
            {group.tokens.map((token) => (
              <Field key={token} label={t(TOKEN_LABELS[token])}>
                <ColorInput
                  value={theme[token]}
                  resolved={resolveColor(theme[token], theme)}
                  onChange={(color) => edit(token, color)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Colour-wheel generation: the user picks a harmony scheme, the hues are
 * placed by that scheme's geometry, and the result is forced through the
 * contrast gate. Never a random colour.
 */
/** The dominant brand hue of an image: the most common colour, weighted toward
    saturated mid-tones so a logo's accent wins over its white/black padding. */
async function dominantColor(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("load"));
      img.src = url;
    });
    const N = 64;
    const canvas = document.createElement("canvas");
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#8b5cf6";
    ctx.drawImage(img, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);
    const buckets = new Map<string, { w: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (lum < 0.08 || lum > 0.95) continue; // skip near-black / near-white
      const w = 1 + sat * 4;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
      e.w += w;
      e.r += r * w;
      e.g += g * w;
      e.b += b * w;
      buckets.set(key, e);
    }
    let best: { w: number; r: number; g: number; b: number } | null = null;
    for (const e of buckets.values()) if (!best || e.w > best.w) best = e;
    if (!best) return "#8b5cf6";
    return rgbToHex(Math.round(best.r / best.w), Math.round(best.g / best.w), Math.round(best.b / best.w));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function HarmonyGenerator({
  theme,
  onApply,
}: {
  theme: Theme;
  onApply: (theme: Theme) => void;
}) {
  const t = useT();
  const [scheme, setScheme] = useState<HarmonyScheme>("analogous");
  const imgRef = useRef<HTMLInputElement>(null);

  const fromImage = async (file: File | undefined) => {
    if (!file) return;
    const seed = await dominantColor(file);
    onApply(themeFromSeed(seed, scheme));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-44 shrink-0">
          <Select value={scheme} onChange={(e) => setScheme(e.target.value as HarmonyScheme)}>
            {HARMONY_SCHEMES.map((s) => (
              <option key={s} value={s}>
                {SCHEME_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onApply(themeFromSeed(theme.primary, scheme))}
          title={t("Build all sixteen tokens from your primary colour using this harmony scheme, with WCAG contrast enforced")}
        >
          <Sparkles className="size-3.5 text-brand-400" />
          {t("Generate from primary")}
        </Button>
      </div>
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void fromImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button variant="outline" className="w-full" onClick={() => imgRef.current?.click()}>
        <ImagePlus className="size-3.5 text-brand-400" />
        {t("Generate from image / logo")}
      </Button>
    </div>
  );
}
