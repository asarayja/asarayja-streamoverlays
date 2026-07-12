"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { getPalette } from "@/data/palettes";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { useClock } from "@/lib/useClock";
import { settledTime } from "@/lib/animation";
import { useElementSize, useInView } from "@/lib/useElementSize";
import { cx } from "@/components/ui";
import { useT } from "@/lib/i18n";
import type { ChannelProfile, Template, Theme } from "@/lib/types";

/**
 * Time at which every entry animation has finished. Cards render this single
 * settled frame until hovered — 200 live canvases would melt the page.
 */
const SETTLED = 6000;

interface TemplateCardProps {
  template: Template;
  profile: ChannelProfile;
  /** Overrides the template's own palette when the user previews their brand. */
  theme?: Theme;
  onOpen: (template: Template) => void;
}

export function TemplateCard({ template, profile, theme, onOpen }: TemplateCardProps) {
  const t = useT();
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const [hovered, setHovered] = useState(false);

  // Every template supports motion — hover previews it, rest shows the still.
  // The clock is unbounded: a looping one would replay the entry animation
  // every cycle, which reads as the preview restarting.
  const clock = useClock(hovered);
  const time = hovered ? clock : settledTime(template.category, SETTLED);

  const resolvedTheme = theme ?? getPalette(template.paletteId).theme;
  // Full-screen scenes carry their own background; partial overlays are meant to
  // sit on top of gameplay, so we show them against a transparency checker.
  const hasBackdrop = template.layers.some((l) => l.type === "background");

  return (
    <div
      ref={viewRef}
      className="group animate-rise"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onOpen(template)}
        className={cx(
          "relative block w-full overflow-hidden rounded-2xl border border-white/10 text-left",
          "transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50",
          "hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.55)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
        )}
      >
        <div
          ref={sizeRef}
          className={cx("relative aspect-video w-full", hasBackdrop ? "bg-ink-900" : "checker")}
        >
          {inView && size.width > 0 && (
            <ClientOverlayStage
              layers={template.layers}
              theme={resolvedTheme}
              profile={profile}
              time={time}
              mode="preview"
              width={size.width}
            />
          )}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
              <Sparkles className="size-4" />
              {t("Open in editor")}
            </span>
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{template.name}</p>
          <p className="truncate text-xs text-zinc-500">{template.category}</p>
        </div>
        <PaletteDot theme={resolvedTheme} name={getPalette(template.paletteId).name} />
      </div>
    </div>
  );
}

function PaletteDot({ theme, name }: { theme: Theme; name: string }) {
  return (
    <span title={name} className="mt-0.5 flex shrink-0 -space-x-1.5">
      {[theme.primary, theme.accent, theme.secondary].map((color) => (
        <span
          key={color}
          className="size-3.5 rounded-full ring-2 ring-ink-950"
          style={{ background: color }}
        />
      ))}
    </span>
  );
}
