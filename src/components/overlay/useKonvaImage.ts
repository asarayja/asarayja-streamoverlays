"use client";

import { useEffect, useReducer } from "react";

export type ImageStatus = "empty" | "loading" | "loaded" | "failed";

/**
 * Module-level caches, shared by every stage on the page. The gallery renders
 * the same logo across dozens of cards; decoding it once matters.
 */
const loaded = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

/**
 * Load an image for Konva.
 *
 * State lives in the caches rather than in React, so the hook derives its
 * result during render and only forces an update from the async load callback.
 *
 * `crossOrigin` is set on remote URLs so they don't taint the canvas — a
 * tainted canvas makes `toDataURL` throw, which would break PNG export.
 */
export function useKonvaImage(src: string): [HTMLImageElement | undefined, ImageStatus] {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!src || loaded.has(src) || failed.has(src)) return;

    let cancelled = false;
    const image = new window.Image();
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";

    image.onload = () => {
      loaded.set(src, image);
      if (!cancelled) forceUpdate();
    };
    image.onerror = () => {
      failed.add(src);
      if (!cancelled) forceUpdate();
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return [undefined, "empty"];
  const image = loaded.get(src);
  if (image) return [image, "loaded"];
  return [undefined, failed.has(src) ? "failed" : "loading"];
}
