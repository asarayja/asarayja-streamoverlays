"use client";

import { use, useEffect, useState } from "react";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { decodePayload, subscribeLive, type SharePayload } from "@/lib/share";
import { useClock } from "@/lib/useClock";
import { useElementSize } from "@/lib/useElementSize";
import { useProfileStore } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { SETTLED_TIME } from "@/store/editor";

/**
 * The OBS browser source.
 *
 * Resolution order, and why:
 *  1. `#d=` fragment — the only thing that works inside OBS, which runs its own
 *     Chromium with its own empty localStorage.
 *  2. localStorage — for previewing in the tab where you built the overlay.
 *
 * Once mounted it also subscribes to same-origin edits so a live preview tab
 * updates as you work.
 */
export default function LiveOverlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  const loopMs = 6000;
  // The project's motion switch travels with the payload: off means OBS gets
  // the settled still frame instead of a running clock.
  const motion = payload?.project.animationsEnabled !== false;
  const clock = useClock(status === "ready" && motion, loopMs);
  const time = motion ? clock : SETTLED_TIME;

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const hash = window.location.hash;
      const encoded = hash.startsWith("#d=") ? hash.slice(3) : "";

      if (encoded) {
        const decoded = await decodePayload(encoded);
        if (!cancelled && decoded) {
          setPayload(decoded);
          setStatus("ready");
          return;
        }
      }

      // No payload in the URL: fall back to this browser's own saved projects.
      await useProjectsStore.persist.rehydrate();
      await useProfileStore.persist.rehydrate();
      if (cancelled) return;

      const project = useProjectsStore.getState().getByObsCode(code);
      if (project) {
        setPayload({ project, profile: useProfileStore.getState().profile });
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Live edits from the studio tab, same origin only.
  useEffect(() => subscribeLive(code, setPayload), [code]);

  // OBS captures the page as-is: the document must be transparent, not dark.
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  if (status === "missing") {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold text-white">Overlay {code} not found</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            This browser has no project with that code. Open the project in the studio and use
            Export → Generate and copy OBS URL — that link carries the overlay with it, so it works
            inside OBS.
          </p>
        </div>
      </div>
    );
  }

  // In OBS the viewport is exactly 1920×1080 and this is a no-op. In a normal
  // tab it letterboxes rather than distorting the overlay.
  const width = size.height > 0 ? Math.min(size.width, (size.height * 16) / 9) : size.width;

  return (
    <div ref={containerRef} className="grid h-screen w-screen place-items-center overflow-hidden">
      {payload && width > 0 && (
        <ClientOverlayStage
          layers={payload.project.layers}
          theme={payload.project.theme}
          profile={payload.profile}
          time={time}
          mode="live"
          width={width}
        />
      )}
    </div>
  );
}
