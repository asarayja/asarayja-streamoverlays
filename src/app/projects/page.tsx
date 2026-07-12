"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Star, Trash2 } from "lucide-react";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { TopNav } from "@/components/site/TopNav";
import { Button, cx } from "@/components/ui";
import { useClock } from "@/lib/useClock";
import { isStingerMotion, previewClock, settledTime, timelineDuration } from "@/lib/animation";
import { useElementSize, useInView, useOnScreen, usePrefersReducedMotion } from "@/lib/useElementSize";
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

  // The grid shows one card per PACK, not one per screen: a design opened as a
  // pack seeds ~17 linked sibling screens (same packId), all edited together in
  // the editor, so listing every screen here just clutters. Group by packId and
  // show the cover; the screen count hints at the rest.
  const packs = useMemo(() => {
    const groups = new Map<string, Project[]>();
    for (const p of projects) {
      const key = p.packId ?? p.id;
      const arr = groups.get(key);
      if (arr) arr.push(p);
      else groups.set(key, [p]);
    }
    return [...groups.values()]
      .map((arr) => {
        const screens = [...arr].sort((a, b) => a.packOrder - b.packOrder);
        return { cover: screens[0], count: arr.length, updatedAt: Math.max(...arr.map((p) => p.updatedAt)) };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects]);
  const sorted = onlyFavorites ? packs.filter((g) => g.cover.favorite) : packs;

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
            <Link href="/">
              <Button variant="primary">{t("New from a design")}</Button>
            </Link>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <p className="text-sm text-zinc-400">
              {projects.length === 0 ? t("No projects yet.") : t("No favorites yet.")}
            </p>
            <Link href="/">
              <Button className="mt-4">{t("Browse designs")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((pack) => (
              <ProjectCard key={pack.cover.id} pack={pack} profile={profile} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

type PackView = { cover: Project; count: number; updatedAt: number };

function ProjectCard({ pack, profile }: { pack: PackView; profile: ReturnType<typeof useRenderProfile> }) {
  const t = useT();
  const router = useRouter();
  const [viewRef, inView] = useInView<HTMLDivElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const [screenRef, onScreen] = useOnScreen<HTMLDivElement>();
  const reduceMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const duplicate = useProjectsStore((s) => s.duplicate);
  const duplicatePack = useProjectsStore((s) => s.duplicatePack);
  const remove = useProjectsStore((s) => s.remove);
  const removePack = useProjectsStore((s) => s.removePack);
  const toggleFavorite = useProjectsStore((s) => s.toggleFavorite);
  const [confirming, setConfirming] = useState(false);

  const { cover, count } = pack;
  const isPack = count > 1;
  const hasBackdrop = cover.layers.some((l) => l.type === "background");
  const title = cover.packName ?? cover.name;

  // Autoplay the motion so the animation is visible without hovering (on screen
  // and unless the user disabled motion). Gated on being on screen so a long
  // grid isn't driving dozens of live canvases at once.
  const play = cover.animationsEnabled !== false && (hovered || (onScreen && !reduceMotion));
  const loopPeriod = useMemo(() => {
    // Skip layers with no animation — a hand-added layer can lack one, and the
    // stinger/duration helpers read .preset off each entry.
    const anims = cover.layers.map((l) => l.animation).filter(Boolean);
    const loop = isStingerMotion(anims) || cover.layers.some((l) => l.type === "alert");
    return loop ? timelineDuration(anims) : 0;
  }, [cover.layers]);
  const clock = useClock(play);
  const time = play ? previewClock(clock, loopPeriod) : settledTime(cover.category ?? "", SETTLED);

  const onDuplicate = () => {
    const copy = cover.packId ? duplicatePack(cover.packId) : duplicate(cover.id);
    if (copy) router.push(`/editor?id=${copy.id}`);
  };
  const onDelete = () => {
    if (cover.packId) removePack(cover.packId);
    else remove(cover.id);
  };

  return (
    <div
      ref={viewRef}
      className="group animate-rise"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => router.push(`/editor?id=${cover.id}`)}
        className="relative block w-full overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50"
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
              layers={cover.layers}
              theme={cover.theme}
              profile={profile}
              time={time}
              mode="preview"
              width={size.width}
            />
          )}
          {isPack && (
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-zinc-100 backdrop-blur">
              {count} {t("screens")}
            </span>
          )}
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{title}</p>
          <p className="truncate font-mono text-[11px] text-zinc-600">
            {isPack ? `${count} ${t("screens")}` : cover.obsCode}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => toggleFavorite(cover.id)}
            title={t("Favorite")}
            className={cx(
              "rounded p-1.5 transition-colors hover:bg-white/5",
              cover.favorite ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300",
            )}
          >
            <Star className={cx("size-3.5", cover.favorite && "fill-current")} />
          </button>
          <button
            onClick={onDuplicate}
            title={isPack ? t("Duplicate pack") : t("Duplicate")}
            className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            onClick={() => (confirming ? onDelete() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            title={confirming ? t("Click again to delete") : isPack ? t("Delete pack") : t("Delete")}
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
