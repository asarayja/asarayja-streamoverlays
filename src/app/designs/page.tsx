"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Palette as PaletteIcon } from "lucide-react";
import { DESIGNS } from "@/lib/designs";
import type { Design } from "@/lib/designs";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { TopNav } from "@/components/site/TopNav";
import { MyDesigns } from "@/components/gallery/MyDesigns";
import { Chip, cx } from "@/components/ui";
import { getPalette } from "@/data/palettes";
import { useElementSize, useInView } from "@/lib/useElementSize";
import { useRenderProfile } from "@/store/profile";
import type { Collection } from "@/lib/types";

const SETTLED = 6000;

const FILTERS: Array<{ id: Collection | "all"; label: string }> = [
  { id: "all", label: "All designs" },
  { id: "core", label: "Core" },
  { id: "gothic", label: "Gothic" },
  { id: "pride", label: "Pride" },
];

export default function DesignsPage() {
  const profile = useRenderProfile();
  const [collection, setCollection] = useState<Collection | "all">("all");

  const shown = useMemo(
    () => (collection === "all" ? DESIGNS : DESIGNS.filter((d) => d.collection === collection)),
    [collection],
  );

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 pb-24">
        <section className="py-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400">
            <LayoutGrid className="size-3.5 text-brand-400" />
            {DESIGNS.length} designs
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            <span className="gradient-text">Browse by design</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-400">
            One card per look. Open a design to see every screen it comes with — and try it in each
            of its colours.
          </p>
        </section>

        <MyDesigns />

        <div className="mb-8 flex flex-wrap justify-center gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={collection === f.id} onClick={() => setCollection(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((design) => (
            <DesignCard key={design.key} design={design} profile={profile} />
          ))}
        </div>
      </main>
    </div>
  );
}

function DesignCard({ design, profile }: { design: Design; profile: ReturnType<typeof useRenderProfile> }) {
  const [viewRef, inView] = useInView<HTMLAnchorElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const theme = getPalette(design.coverPalette).theme;
  const hasBackdrop = design.cover.layers.some((l) => l.type === "background");

  return (
    <Link
      ref={viewRef}
      href={`/designs/view?d=${design.key}`}
      className={cx(
        "group animate-rise block overflow-hidden rounded-2xl border border-white/10",
        "transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50",
        "hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.55)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
      )}
    >
      <div ref={sizeRef} className={cx("relative aspect-video w-full", hasBackdrop ? "bg-ink-900" : "checker")}>
        {inView && size.width > 0 && (
          <ClientOverlayStage
            layers={design.cover.layers}
            theme={theme}
            profile={profile}
            time={SETTLED}
            mode="preview"
            width={size.width}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{design.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            {design.screenCount} {design.screenCount === 1 ? "screen" : "screens"}
            <span className="text-zinc-700">·</span>
            <PaletteIcon className="size-3" />
            {design.palettes.length} {design.palettes.length === 1 ? "colour" : "colours"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {design.collection}
        </span>
      </div>
    </Link>
  );
}
