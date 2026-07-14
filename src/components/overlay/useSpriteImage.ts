"use client";

import { useKonvaImage, type ImageStatus } from "./useKonvaImage";

/**
 * A sprite sheet, optionally with a solid background colour knocked out to
 * transparent (magenta-key sheets and the like). The chroma pass runs once per
 * unique (src, key, tolerance) on an offscreen canvas and is cached — Konva
 * draws the canvas directly, so there's no per-frame cost and no async reload.
 */

const cache = new Map<string, HTMLCanvasElement>();

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full || "ff00ff", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildChroma(img: HTMLImageElement, key: string, tol: number): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const [kr, kg, kb] = hexToRgb(key);
  // 442 ≈ max RGB distance; tolerance is a 0..100 fraction of it.
  const thresh = (Math.max(0, Math.min(100, tol)) / 100) * 442;
  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - kr;
    const dg = px[i + 1] - kg;
    const db = px[i + 2] - kb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= thresh) px[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  return cv;
}

export interface SpriteImageResult {
  source?: CanvasImageSource;
  width: number;
  height: number;
  status: ImageStatus;
}

export function useSpriteImage(src: string, removeBg: boolean, key: string, tol: number): SpriteImageResult {
  const [base, status] = useKonvaImage(src);

  if (status !== "loaded" || !base) {
    return { source: undefined, width: 0, height: 0, status };
  }

  const iw = base.naturalWidth;
  const ih = base.naturalHeight;

  if (!removeBg || !key || !key.startsWith("#")) {
    return { source: base, width: iw, height: ih, status };
  }

  const ck = `${src}|${key}|${tol}`;
  let cv = cache.get(ck);
  if (!cv) {
    if (cache.size > 40) cache.clear(); // bound memory while a slider is dragged
    cv = buildChroma(base, key, tol);
    cache.set(ck, cv);
  }
  return { source: cv, width: cv.width, height: cv.height, status };
}
