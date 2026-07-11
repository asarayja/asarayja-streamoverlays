"use client";

import { useState } from "react";
import { Link2, Link2Off, Sparkles } from "lucide-react";
import { PALETTES } from "@/data/palettes";
import { Button, ColorInput, Field, Select, cx } from "@/components/ui";
import {
  HARMONY_SCHEMES,
  SCHEME_LABELS,
  cascade,
  resolveColor,
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
export function HarmonyGenerator({
  theme,
  onApply,
}: {
  theme: Theme;
  onApply: (theme: Theme) => void;
}) {
  const t = useT();
  const [scheme, setScheme] = useState<HarmonyScheme>("analogous");

  return (
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
  );
}
