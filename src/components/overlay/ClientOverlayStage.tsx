"use client";

import dynamic from "next/dynamic";

/**
 * Konva touches `window` at import time, so every stage enters the tree through
 * this client-only boundary. Loading it once here keeps it in a single shared
 * chunk rather than one per call site.
 */
export const ClientOverlayStage = dynamic(
  () => import("./OverlayStage").then((m) => m.OverlayStage),
  { ssr: false },
);
