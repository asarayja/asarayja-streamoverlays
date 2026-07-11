"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { useElementSize, useInView } from "@/lib/useElementSize";
import { SETTLED_TIME } from "@/store/editor";
import { useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import type { Project } from "@/lib/types";
import { cx } from "@/components/ui";
import { useT } from "@/lib/i18n";

/**
 * A compact strip of the most recently edited projects on the home page, so
 * "continue where I left off" is one click from the gallery rather than buried
 * on a separate page.
 */
export function RecentProjects() {
  const t = useT();
  const router = useRouter();
  const projects = useProjectsStore((s) => s.projects);
  const profile = useRenderProfile();

  if (projects.length === 0) return null;

  const recent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Clock className="size-4 text-brand-400" />
          {t("Continue editing")}
        </h2>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {t("All projects")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {recent.map((project) => (
          <RecentCard
            key={project.id}
            project={project}
            profile={profile}
            onOpen={() => router.push(`/editor?id=${project.id}`)}
          />
        ))}
      </div>
    </section>
  );
}

function RecentCard({
  project,
  profile,
  onOpen,
}: {
  project: Project;
  profile: ReturnType<typeof useRenderProfile>;
  onOpen: () => void;
}) {
  const [viewRef, inView] = useInView<HTMLButtonElement>();
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const hasBackdrop = project.layers.some((l) => l.type === "background");

  return (
    <button
      ref={viewRef}
      onClick={onOpen}
      className="group block w-full text-left"
    >
      <div
        ref={sizeRef}
        className={cx(
          "aspect-video w-full overflow-hidden rounded-xl border border-white/10 transition-colors group-hover:border-brand-400/50",
          hasBackdrop ? "bg-ink-900" : "checker",
        )}
      >
        {inView && size.width > 0 && (
          <ClientOverlayStage
            layers={project.layers}
            theme={project.theme}
            profile={profile}
            time={SETTLED_TIME}
            mode="preview"
            width={size.width}
          />
        )}
      </div>
      <p className="mt-2 truncate text-xs font-medium text-zinc-300">{project.name}</p>
    </button>
  );
}
