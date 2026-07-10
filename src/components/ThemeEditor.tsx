"use client";

import { Sparkles } from "lucide-react";
import { PALETTES } from "@/data/palettes";
import { Button, ColorInput, Field, cx } from "@/components/ui";
import { resolveColor, themeFromSeed } from "@/lib/theme";
import { THEME_TOKENS } from "@/lib/types";
import type { Theme, ThemeToken } from "@/lib/types";

const TOKEN_LABELS: Record<ThemeToken, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  text: "Text",
  border: "Border",
  glow: "Glow",
  shadow: "Shadow",
};

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
 * Editing a token here repaints every layer that references it, because layers
 * store `@primary` rather than `#8b5cf6`.
 */
export function ThemeTokens({
  theme,
  onChange,
  onCommit,
}: {
  theme: Theme;
  onChange: (token: ThemeToken, color: string) => void;
  onCommit?: (token: ThemeToken, color: string) => void;
}) {
  return (
    <div className="space-y-3">
      {THEME_TOKENS.map((token) => (
        <Field key={token} label={TOKEN_LABELS[token]}>
          <ColorInput
            value={theme[token]}
            resolved={resolveColor(theme[token], theme)}
            onChange={(color) => onChange(token, color)}
            onCommit={(color) => onCommit?.(token, color)}
          />
        </Field>
      ))}
    </div>
  );
}

/** Derives a full harmony from the primary colour — no model call involved. */
export function HarmonyButton({ theme, onApply }: { theme: Theme; onApply: (theme: Theme) => void }) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => onApply({ ...themeFromSeed(theme.primary), text: theme.text })}
      title="Rebuild secondary, accent, background, border and glow from your primary colour"
    >
      <Sparkles className="size-3.5 text-brand-400" />
      Generate palette from primary
    </Button>
  );
}
