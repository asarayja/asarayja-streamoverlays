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

  // 442 ≈ max RGB distance. `inner` is a hard cut; between inner and outer the
  // alpha feathers, so anti-aliased edges fade instead of leaving a hard rim.
  const inner = (Math.max(0, Math.min(100, tol)) / 100) * 442;
  const outer = inner + 70;
  const despillMax = outer * 2.2;

  // If the key is dominated by one channel (green- or blue-screen), suppress
  // that channel's spill on kept edge pixels — clamp it to the other two so a
  // green fringe doesn't survive. Ambiguous keys (e.g. magenta) skip despill.
  const maxc = Math.max(kr, kg, kb);
  const single =
    kg === maxc && kg - Math.max(kr, kb) > 40
      ? 1
      : kr === maxc && kr - Math.max(kg, kb) > 40
        ? 0
        : kb === maxc && kb - Math.max(kr, kg) > 40
          ? 2
          : -1;
  const others = single === 0 ? [1, 2] : single === 1 ? [0, 2] : [0, 1];

  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - kr;
    const dg = px[i + 1] - kg;
    const db = px[i + 2] - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= inner) {
      px[i + 3] = 0;
      continue;
    }
    if (dist < outer) px[i + 3] = Math.round(px[i + 3] * ((dist - inner) / (outer - inner)));
    if (single >= 0 && dist < despillMax) {
      const cap = Math.max(px[i + others[0]], px[i + others[1]]);
      if (px[i + single] > cap) px[i + single] = cap;
    }
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
