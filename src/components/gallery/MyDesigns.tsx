"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Layers, Trash2 } from "lucide-react";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { downloadBlob, slugify } from "@/lib/export";
import { packToDesignFile } from "@/lib/design-file";
import { SETTLED_TIME } from "@/store/editor";
import { useProjectsStore } from "@/store/projects";
import { useRenderProfile } from "@/store/profile";
import type { Project } from "@/lib/types";

/** User-made / imported packs, grouped by packId, one card per pack. Reads the
    existing projects store — no new persistence. Hidden until there is one. */
export function MyDesigns() {
  const router = useRouter();
  const profile = useRenderProfile();
  const projects = useProjectsStore((s) => s.projects);
  const hydrated = useProjectsStore((s) => s.hydrated);
  const remove = useProjectsStore((s) => s.remove);

  const packs = useMemo(() => {
    const byId = new Map<string, Project[]>();
    for (const p of projects) {
      if (!p.packId) continue;
      const list = byId.get(p.packId) ?? [];
      list.push(p);
      byId.set(p.packId, list);
    }
    // Only show real multi-screen or explicitly-named custom packs.
    return [...byId.values()]
      .map((list) => list.sort((a, b) => a.packOrder - b.packOrder))
      .filter((list) => list.length > 1 || list[0].folder === "My designs")
      .sort((a, b) => b[0].updatedAt - a[0].updatedAt);
  }, [projects]);

  if (!hydrated || packs.length === 0) return null;

  const exportPack = (screens: Project[]) => {
    const file = packToDesignFile(screens);
    downloadBlob(
      new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }),
      `${slugify(file.name)}.asarayja-design.json`,
    );
  };

  const removePack = (screens: Project[]) => {
    if (!confirm(`Delete “${screens[0].packName ?? screens[0].name}” and its ${screens.length} screen(s)?`)) return;
    for (const s of screens) remove(s.id);
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <Layers className="size-4 text-brand-400" />
        <h2 className="text-lg font-semibold text-white">My designs</h2>
        <span className="text-sm text-zinc-600">{packs.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {packs.map((screens) => {
          const cover = screens[0];
          const hasBackdrop = cover.layers.some((l) => l.type === "background");
          return (
            <div key={cover.packId} className="group">
              <button
                onClick={() => router.push(`/editor?id=${cover.id}`)}
                className="block w-full overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-brand-400/40"
              >
                <div className={`relative aspect-video w-full ${hasBackdrop ? "bg-ink-900" : "checker"}`}>
                  <ClientOverlayStage
                    layers={cover.layers}
                    theme={cover.theme}
                    profile={profile}
                    time={SETTLED_TIME}
                    mode="preview"
                    width={360}
                  />
                </div>
              </button>
              <div className="mt-2.5 flex items-start justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {cover.packName ?? cover.name}
                  </p>
                  <p className="text-xs text-zinc-500">{screens.length} screens</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => exportPack(screens)}
                    title="Export design file"
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    onClick={() => removePack(screens)}
                    title="Delete design"
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
