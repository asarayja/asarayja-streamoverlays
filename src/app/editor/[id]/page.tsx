"use client";

import { use } from "react";
import dynamic from "next/dynamic";

/**
 * Konva reads `window` at import time, so the whole editor loads client-side
 * only. Everything below this boundary can import react-konva directly.
 */
const EditorShell = dynamic(() => import("@/components/editor/EditorShell"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <p className="text-sm text-zinc-500">Loading editor…</p>
    </div>
  ),
});

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditorShell projectId={id} />;
}
