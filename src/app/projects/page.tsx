"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Star, Trash2 } from "lucide-react";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { TopNav } from "@/components/site/TopNav";
import { Button, cx } from "@/components/ui";
import { useElementSize, useInView } from "@/lib/useElementSize";
import type { Project } from "@/lib/types";
import { useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { useT } from "@/lib/i18n";

const SETTLED = 6000;

export default function ProjectsPage() {
  const t = useT();
  const projects = useProjectsStore((s) => s.projects);
  const profile = useRenderProfile();
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const shown = onlyFavorites ? projects.filter((p) => p.favorite) : projects;
  const sorted = [...shown].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t("Projects")}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {t("Saved in this browser. Every project keeps its own OBS code.")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setOnlyFavorites((v) => !v)}
              className={cx(onlyFavorites && "!border-amber-400/40 !text-amber-300")}
            >
              <Star className={cx("size-3.5", onlyFavorites && "fill-current")} />
              {t("Favorites")}
            </Button>
            <Link href="/templates">
              <Button variant="primary">{t("New from template")}</Button>
            </Link>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <p className="text-sm text-zinc-400">
              {projects.length === 0 ? t("No projects yet.") : t("No favorites yet.")}
            </p>
            <Link href="/templates">
              <Button className="mt-4">{t("Browse templates")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((project) => (
              <ProjectCard key={project.id} project={project} profile={profile} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project, profile }: { project: Project; profile: ReturnType<typeof useRenderProfile> }) {
  const t = useT();
  const router = useRouter();
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const duplicate = useProjectsStore((s) => s.duplicate);
  const remove = useProjectsStore((s) => s.remove);
  const toggleFavorite = useProjectsStore((s) => s.toggleFavorite);
  const [confirming, setConfirming] = useState(false);

  const hasBackdrop = project.layers.some((l) => l.type === "background");

  return (
    <div ref={viewRef} className="group animate-rise">
      <button
        onClick={() => router.push(`/editor?id=${project.id}`)}
        className="relative block w-full overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50"
      >
        <div ref={sizeRef} className={cx("aspect-video w-full", hasBackdrop ? "bg-ink-900" : "checker")}>
          {inView && size.width > 0 && (
            <ClientOverlayStage
              layers={project.layers}
              theme={project.theme}
              profile={profile}
              time={SETTLED}
              mode="preview"
              width={size.width}
            />
          )}
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{project.name}</p>
          <p className="truncate font-mono text-[11px] text-zinc-600">{project.obsCode}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => toggleFavorite(project.id)}
            title={t("Favorite")}
            className={cx(
              "rounded p-1.5 transition-colors hover:bg-white/5",
              project.favorite ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300",
            )}
          >
            <Star className={cx("size-3.5", project.favorite && "fill-current")} />
          </button>
          <button
            onClick={() => {
              const copy = duplicate(project.id);
              if (copy) router.push(`/editor?id=${copy.id}`);
            }}
            title={t("Duplicate")}
            className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            onClick={() => (confirming ? remove(project.id) : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            title={confirming ? t("Click again to delete") : t("Delete")}
            className={cx(
              "rounded p-1.5 transition-colors hover:bg-white/5",
              confirming ? "bg-red-500/20 text-red-300" : "text-zinc-600 hover:text-red-400",
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
