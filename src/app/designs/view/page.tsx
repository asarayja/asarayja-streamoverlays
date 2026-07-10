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
import type { Template } from "@/lib/types";

function DesignDetail() {
  const key = useSearchParams().get("d") ?? "";
  const router = useRouter();
  const profile = useRenderProfile();
  const createDraft = useProjectsStore((s) => s.createDraft);
  const design = getDesign(key);

  const [paletteId, setPaletteId] = useState(design?.coverPalette ?? "");

  const screens = useMemo(
    () => (design ? designScreens(design, paletteId) : []),
    [design, paletteId],
  );

  if (!design) {
    return (
      <div className="app-bg min-h-screen">
        <TopNav />
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <h1 className="text-lg font-semibold text-white">Design not found</h1>
            <Link href="/designs">
              <Button className="mt-4">Back to designs</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const open = (template: Template) => {
    const project = createDraft(template.id);
    if (project) router.push(`/editor?id=${project.id}`);
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
            All designs
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">{design.name}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {screens.length} {screens.length === 1 ? "screen" : "screens"} ·{" "}
            {design.palettes.length} {design.palettes.length === 1 ? "colour" : "colours"} · every
            screen picks up your channel profile
          </p>
        </div>

        {/* The one design, in each of its colours — pick one and the whole set
            recolours. */}
        <div className="sticky top-16 z-30 -mx-6 mb-8 border-y border-white/[0.06] bg-ink-950/85 px-6 py-4 backdrop-blur-xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Colour
          </p>
          <div className="flex flex-wrap gap-2">
            {design.palettes.map((id) => (
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
        "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors",
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
