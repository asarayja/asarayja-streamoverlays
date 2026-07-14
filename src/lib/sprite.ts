"use client";

/**
 * Sprite import: turn a user's file into a single packed sprite sheet plus the
 * grid metadata the editor needs. Two paths converge on the same model:
 *
 *  - An animated GIF / APNG / animated WebP is decoded frame-by-frame with the
 *    native `ImageDecoder` (WebCodecs) — no dependency, fully offline, and
 *    supported by Chromium (our web + Tauri/WebView2 target). The frames are
 *    packed into a near-square grid.
 *  - Any other image is treated as a sheet the user already has; we keep it as
 *    is and let them set the grid in the panel.
 */

/** Largest cell we keep — the user asked for sprites up to 512px. */
const MAX_CELL = 512;
/** Default on-canvas size when a sprite is dropped in (resizable up to 512). */
const DEFAULT_DISPLAY = 256;

export interface SpriteImport {
  src: string;
  cols: number;
  rows: number;
  frameCount: number;
  fps: number;
  /** Suggested on-canvas display box (aspect-correct, capped). */
  width: number;
  height: number;
  name: string;
}

type DecoderCtor = new (init: { data: ArrayBuffer; type: string }) => {
  tracks: {
    ready: Promise<void>;
    selectedTrack?: { frameCount: number } | null;
  };
  decode: (opts: { frameIndex: number }) => Promise<{ image: CanvasImageSource & { duration?: number | null; displayWidth?: number; displayHeight?: number; close?: () => void } }>;
  close?: () => void;
};

function getImageDecoder(): DecoderCtor | null {
  const g = globalThis as unknown as { ImageDecoder?: DecoderCtor };
  return typeof g.ImageDecoder === "function" ? g.ImageDecoder : null;
}

const ANIMATED_TYPES = /image\/(gif|apng|webp|png)/i;

function displayBox(fw: number, fh: number): { width: number; height: number } {
  const scale = Math.min(1, DEFAULT_DISPLAY / Math.max(fw, fh));
  return { width: Math.round(fw * scale), height: Math.round(fh * scale) };
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Decode an animated image to a packed grid sheet. Returns null if the file
    isn't actually animated (single frame) so the caller can fall back. */
async function packAnimated(file: File): Promise<SpriteImport | null> {
  const Decoder = getImageDecoder();
  if (!Decoder) return null;
  const buf = await file.arrayBuffer();
  const dec = new Decoder({ data: buf, type: file.type || "image/gif" });
  await dec.tracks.ready;
  const count = dec.tracks.selectedTrack?.frameCount ?? 1;
  if (count <= 1) {
    dec.close?.();
    return null;
  }

  // Decode every frame, tracking size and duration.
  const frames: CanvasImageSource[] = [];
  const closers: Array<() => void> = [];
  let fw = 0;
  let fh = 0;
  let totalDurUs = 0;
  for (let i = 0; i < count; i++) {
    const { image } = await dec.decode({ frameIndex: i });
    fw = Math.max(fw, image.displayWidth ?? (image as unknown as { width: number }).width ?? 0);
    fh = Math.max(fh, image.displayHeight ?? (image as unknown as { height: number }).height ?? 0);
    totalDurUs += image.duration ?? 0;
    frames.push(image);
    if (image.close) closers.push(() => image.close!());
  }
  dec.close?.();

  // Cell size, capped to MAX_CELL, aspect-correct.
  const cellScale = Math.min(1, MAX_CELL / Math.max(fw, fh || 1));
  const cellW = Math.max(1, Math.round(fw * cellScale));
  const cellH = Math.max(1, Math.round(fh * cellScale));

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const c = canvas.getContext("2d")!;
  frames.forEach((frame, i) => {
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * cellH;
    c.drawImage(frame, x, y, cellW, cellH);
  });
  closers.forEach((close) => close());

  const avgMs = totalDurUs > 0 ? totalDurUs / 1000 / count : 90;
  const fps = Math.max(1, Math.min(30, Math.round(1000 / avgMs)));

  return {
    src: canvas.toDataURL("image/png"),
    cols,
    rows,
    frameCount: count,
    fps,
    ...displayBox(cellW, cellH),
    name: file.name.replace(/\.[^.]+$/, "") || "Sprite",
  };
}

/** Import any sprite file into a single packed sheet + grid metadata. */
export async function importSprite(file: File): Promise<SpriteImport> {
  // Try the animated path for formats that can carry frames.
  if (ANIMATED_TYPES.test(file.type)) {
    try {
      const packed = await packAnimated(file);
      if (packed) return packed;
    } catch {
      // fall through to static
    }
  }

  // Static image: keep it as the sheet, single cell — the user sets the grid.
  const src = await readDataUrl(file);
  const { w, h } = await loadDimensions(src);
  return {
    src,
    cols: 1,
    rows: 1,
    frameCount: 1,
    fps: 12,
    ...displayBox(w, h),
    name: file.name.replace(/\.[^.]+$/, "") || "Sprite",
  };
}
