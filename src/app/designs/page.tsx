"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Palette as PaletteIcon, Search } from "lucide-react";
import { DESIGNS } from "@/lib/designs";
import type { Design } from "@/lib/designs";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { TopNav } from "@/components/site/TopNav";
import { MyDesigns } from "@/components/gallery/MyDesigns";
import { Chip, TextInput, cx } from "@/components/ui";
import { getPalette } from "@/data/palettes";
import { useElementSize, useInView, useOnScreen, usePrefersReducedMotion } from "@/lib/useElementSize";
import { useClock } from "@/lib/useClock";
import { isContinuous, previewClock, settledTime, timelineDuration } from "@/lib/animation";
import { useRenderProfile } from "@/store/profile";
import { useT } from "@/lib/i18n";
import type { Collection } from "@/lib/types";

const SETTLED = 6000;

const FILTERS: Array<{ id: Collection | "all"; label: string }> = [
  { id: "all", label: "All designs" },
  { id: "core", label: "Core" },
  { id: "gothic", label: "Gothic" },
  { id: "pride", label: "Pride" },
];

export default function DesignsPage() {
  const t = useT();
  const profile = useRenderProfile();
  const [collection, setCollection] = useState<Collection | "all">("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESIGNS.filter((d) => {
      if (collection !== "all" && d.collection !== collection) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.collection.toLowerCase().includes(q) ||
        (d.cover.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [collection, query]);

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 pb-24">
        <section className="py-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400">
            <LayoutGrid className="size-3.5 text-brand-400" />
            {t("{count} designs", { count: DESIGNS.length })}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            <span className="gradient-text">{t("Browse by design")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-400">
            {t("One card per look. Open a design to see every screen it comes with — and try it in each of its colours.")}
          </p>
        </section>

        <MyDesigns />

        <div className="mx-auto mb-5 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search designs…")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={collection === f.id} onClick={() => setCollection(f.id)}>
              {t(f.label)}
            </Chip>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">{t("No designs match those filters.")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((design) => (
              <DesignCard key={design.key} design={design} profile={profile} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DesignCard({ design, profile }: { design: Design; profile: ReturnType<typeof useRenderProfile> }) {
  const t = useT();
  const [viewRef, inView] = useInView<HTMLAnchorElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const [screenRef, onScreen] = useOnScreen<HTMLDivElement>();
  const reduceMotion = usePrefersReducedMotion();
  const theme = getPalette(design.coverPalette).theme;
  const hasBackdrop = design.cover.layers.some((l) => l.type === "background");

  // Autoplay the cover's motion while the card is on screen. Continuous ambient
  // motion flows unbounded; anything else ping-pongs so its one-shot loops
  // smoothly (in → settle → out) instead of hard-cutting back to the start.
  const play = onScreen && !reduceMotion;
  const loopPeriod = useMemo(() => {
    const anims = design.cover.layers.map((l) => l.animation);
    if (anims.some((a) => isContinuous(a.preset))) return 0;
    return timelineDuration(anims);
  }, [design.cover.layers]);
  const clock = useClock(play);
  const time = play ? previewClock(clock, loopPeriod) : settledTime(design.cover.category, SETTLED);

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
      <div
        ref={(el) => {
          sizeRef.current = el;
          screenRef.current = el;
        }}
        className={cx("relative aspect-video w-full", hasBackdrop ? "bg-ink-900" : "checker")}
      >
        {inView && size.width > 0 && (
          <ClientOverlayStage
            layers={design.cover.layers}
            theme={theme}
            profile={profile}
            time={time}
            mode="preview"
            width={size.width}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{design.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            {design.screenCount} {design.screenCount === 1 ? t("screen") : t("screens")}
            <span className="text-zinc-700">·</span>
            <PaletteIcon className="size-3" />
            {design.palettes.length} {design.palettes.length === 1 ? t("colour") : t("colours")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {design.collection}
        </span>
      </div>
    </Link>
  );
}
