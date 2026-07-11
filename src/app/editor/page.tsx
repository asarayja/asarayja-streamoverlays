"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n";

/**
 * Konva reads `window` at import time, so the whole editor loads client-side
 * only. The project id travels in the query string (?id=…) so this route is a
 * single static page rather than a runtime-parameterised one.
 */
const EditorShell = dynamic(() => import("@/components/editor/EditorShell"), {
  ssr: false,
  loading: () => {
    const t = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <p className="text-sm text-zinc-500">{t("Loading editor…")}</p>
      </div>
    );
  },
});

function EditorInner() {
  const id = useSearchParams().get("id") ?? "";
  return <EditorShell projectId={id} />;
}

export default function EditorPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-ink-950">
          <p className="text-sm text-zinc-500">{t("Loading editor…")}</p>
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
