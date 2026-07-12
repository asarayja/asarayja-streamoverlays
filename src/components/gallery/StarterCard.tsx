"use client";

import { getPalette } from "@/data/palettes";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { useElementSize, useInView } from "@/lib/useElementSize";
import { cx } from "@/components/ui";
import type { useRenderProfile } from "@/store/profile";
import type { Template } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** A neutral scaffold (webcam frame, panels, chat box, social bar) opened as a
    fresh draft — the fiddly pieces that are painful to build on a blank canvas. */
export function StarterCard({
  template,
  profile,
  onOpen,
}: {
  template: Template;
  profile: ReturnType<typeof useRenderProfile>;
  onOpen: (t: Template) => void;
}) {
  const t = useT();
  const [viewRef, inView] = useInView<HTMLButtonElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const theme = getPalette(template.paletteId).theme;
  const hasBackdrop = template.layers.some((l) => l.type === "background");
  return (
    <button
      ref={viewRef}
      onClick={() => onOpen(template)}
      className="group block overflow-hidden rounded-xl border border-white/10 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400/50"
      title={t("Open in editor")}
    >
      <div
        ref={sizeRef}
        className={cx("relative aspect-video w-full", hasBackdrop ? "bg-ink-900" : "checker")}
      >
        {inView && size.width > 0 && (
          <ClientOverlayStage
            layers={template.layers}
            theme={theme}
            profile={profile}
            time={6000}
            mode="preview"
            width={size.width}
          />
        )}
      </div>
      <p className="truncate px-2.5 py-2 text-xs font-medium text-zinc-300">{template.name}</p>
    </button>
  );
}
