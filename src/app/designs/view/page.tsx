"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDesign, designScreens } from "@/lib/designs";
import { getPalette } from "@/data/palettes";
import { TemplateCard } from "@/components/gallery/TemplateCard";
import { TopNav } from "@/components/site/TopNav";
import { Button, cx } from "@/components/ui";
import { useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { useT } from "@/lib/i18n";
import type { Template } from "@/lib/types";

/** A palette reads as "light" when its background is bright. Drives the
    dark/light filter so a streamer can jump straight to the mode they run. */
function paletteIsLight(id: string): boolean {
  const n = getPalette(id).theme.background.replace("#", "");
  if (n.length < 6) return false;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

type ColourMode = "all" | "dark" | "light";

function DesignDetail() {
  const t = useT();
  const key = useSearchParams().get("d") ?? "";
  const router = useRouter();
  const profile = useRenderProfile();
  const createPack = useProjectsStore((s) => s.createPack);
  const design = getDesign(key);

  const [paletteId, setPaletteId] = useState(design?.coverPalette ?? "");

  const screens = useMemo(
    () => (design ? designScreens(design, paletteId) : []),
    [design, paletteId],
  );

  const [mode, setMode] = useState<ColourMode>("all");
  const shownPalettes = useMemo(() => {
    const list = design?.palettes ?? [];
    return mode === "all" ? list : list.filter((id) => paletteIsLight(id) === (mode === "light"));
  }, [design, mode]);
  const hasLight = useMemo(() => (design?.palettes ?? []).some(paletteIsLight), [design]);
  const hasDark = useMemo(() => (design?.palettes ?? []).some((id) => !paletteIsLight(id)), [design]);

  // Switching filter keeps a valid selection: if the active colour is filtered
  // out, jump to the first one still shown so the grid never renders empty.
  const pickMode = (m: ColourMode) => {
    setMode(m);
    const next = (design?.palettes ?? []).filter(
      (id) => m === "all" || paletteIsLight(id) === (m === "light"),
    );
    if (next.length && !next.includes(paletteId)) setPaletteId(next[0]);
  };

  if (!design) {
    return (
      <div className="app-bg min-h-screen">
        <TopNav />
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <h1 className="text-lg font-semibold text-white">{t("Design not found")}</h1>
            <Link href="/designs">
              <Button className="mt-4">{t("Back to designs")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const open = (template: Template) => {
    // Open the whole design as a pack: seed every sibling screen so the editor's
    // Screens tab can switch between Starting Soon, BRB, alerts, … in place.
    const cover = createPack(template.id);
    if (cover) router.push(`/editor?id=${cover.id}`);
  };

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 pb-24">
        <div className="py-8">
          <Link
            href="/designs"
            className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="size-4" />
            {t("All designs")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">{design.name}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {screens.length} {screens.length === 1 ? t("screen") : t("screens")} ·{" "}
            {design.palettes.length} {design.palettes.length === 1 ? t("colour") : t("colours")} ·{" "}
            {t("every screen picks up your channel profile")}
          </p>
        </div>

        {/* The one design, in each of its colours — pick one and the whole set
            recolours. */}
        <div className="sticky top-16 z-30 -mx-6 mb-8 border-y border-white/[0.06] bg-ink-950/85 px-6 py-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t("Colour")}
            </p>
            {/* Only worth showing when the design actually has both modes. */}
            {hasLight && hasDark && (
              <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-medium">
                {(["all", "dark", "light"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => pickMode(m)}
                    className={cx(
                      "rounded-full px-2.5 py-1 transition-colors",
                      mode === m ? "bg-brand-500/20 text-white" : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {t(m === "all" ? "All" : m === "dark" ? "Dark" : "Light")}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* One swipeable row on a phone (so the sticky bar stays short), a
              wrapped grid on bigger screens. */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0">
            {shownPalettes.map((id) => (
              <PaletteSwatch
                key={id}
                id={id}
                active={id === paletteId}
                onClick={() => setPaletteId(id)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {screens.map((template) => (
            <TemplateCard key={template.id} template={template} profile={profile} onOpen={open} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PaletteSwatch({ id, active, onClick }: { id: string; active: boolean; onClick: () => void }) {
  const palette = getPalette(id);
  const t = palette.theme;
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors",
        active
          ? "border-brand-400/60 bg-brand-500/15 text-white"
          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
      )}
    >
      <span
        className="size-5 shrink-0 rounded-full border border-white/15"
        style={{
          background: `conic-gradient(${t.primary}, ${t.accent}, ${t.secondary}, ${t.primary})`,
        }}
      />
      {palette.name}
    </button>
  );
}

export default function DesignDetailPage() {
  return (
    <Suspense fallback={<div className="app-bg min-h-screen" />}>
      <DesignDetail />
    </Suspense>
  );
}
