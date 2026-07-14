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
  removeBg: boolean;
  chromaKey: string;
  chromaTolerance: number;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/**
 * Guess a solid key colour to knock out. Samples the four corners: if they're
 * already transparent, nothing to do; if they agree on one opaque colour (a
 * magenta-key / flat-colour sheet), return it so the background auto-clears.
 */
function detectChroma(cv: HTMLCanvasElement): { removeBg: boolean; chromaKey: string; chromaTolerance: number } {
  const off = { removeBg: false, chromaKey: "#ff00ff", chromaTolerance: 18 };
  const ctx = cv.getContext("2d");
  if (!ctx || cv.width < 2 || cv.height < 2) return off;
  const w = cv.width;
  const h = cv.height;
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);

  if (corners.every((c) => c[3] < 16)) return off; // already transparent
  const [r, g, b] = corners[0];
  const uniform = corners.every(
    (c) => c[3] > 200 && Math.abs(c[0] - r) < 24 && Math.abs(c[1] - g) < 24 && Math.abs(c[2] - b) < 24,
  );
  if (!uniform) return off;
  return { removeBg: true, chromaKey: `#${toHex(r)}${toHex(g)}${toHex(b)}`, chromaTolerance: 18 };
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h || "ff00ff", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Guess the frame grid of a sheet. Builds an "is this a background pixel" test
 * from the detected key (or alpha for an already-transparent sheet), then reads
 * the horizontal and vertical projection profiles: full-length empty runs are
 * the gutters *between* frames, so the count of content bands is cols / rows.
 * Cells are then probed to count the frames that actually carry art.
 */
function detectGrid(
  cv: HTMLCanvasElement,
  chroma: ReturnType<typeof detectChroma>,
): { cols: number; rows: number; frameCount: number } {
  const fail = { cols: 1, rows: 1, frameCount: 1 };
  const ctx = cv.getContext("2d");
  if (!ctx || cv.width < 4 || cv.height < 4) return fail;
  const w = cv.width;
  const h = cv.height;
  const d = ctx.getImageData(0, 0, w, h).data;

  const [kr, kg, kb] = hexRgb(chroma.chromaKey);
  const keyThr = (chroma.chromaTolerance / 100) * 442;
  const isBg = (i: number): boolean => {
    if (d[i + 3] < 16) return true;
    if (!chroma.removeBg) return false;
    const dr = d[i] - kr;
    const dg = d[i + 1] - kg;
    const db = d[i + 2] - kb;
    return Math.sqrt(dr * dr + dg * dg + db * db) < keyThr;
  };

  const colCount = new Int32Array(w);
  const rowCount = new Int32Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBg((y * w + x) * 4)) {
        colCount[x]++;
        rowCount[y]++;
      }
    }
  }

  // Count content bands between empty gutters, trimming outer margins.
  const bands = (counts: Int32Array, cross: number): number => {
    const thr = Math.max(1, Math.floor(cross * 0.004));
    let start = 0;
    while (start < counts.length && counts[start] <= thr) start++;
    let end = counts.length - 1;
    while (end >= 0 && counts[end] <= thr) end--;
    if (start > end) return 0;
    let count = 0;
    let inBand = false;
    for (let i = start; i <= end; i++) {
      const filled = counts[i] > thr;
      if (filled && !inBand) count++;
      inBand = filled;
    }
    return count;
  };

  const cols = Math.min(16, Math.max(1, bands(colCount, h)));
  const rows = Math.min(16, Math.max(1, bands(rowCount, w)));
  if (cols === 1 && rows === 1) return fail;

  // Count cells that actually carry art (a trailing partial row may be empty).
  const cw = w / cols;
  const ch = h / rows;
  let filled = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw + cw * 0.25);
      const x1 = Math.floor(c * cw + cw * 0.75);
      const y0 = Math.floor(r * ch + ch * 0.15);
      const y1 = Math.floor(r * ch + ch * 0.9);
      let has = false;
      for (let y = y0; y < y1 && !has; y += 3) {
        for (let x = x0; x < x1; x += 3) {
          if (!isBg((y * w + x) * 4)) {
            has = true;
            break;
          }
        }
      }
      if (has) filled++;
    }
  }
  return { cols, rows, frameCount: Math.max(1, filled) };
}

function analyze(
  src: string,
): Promise<{ w: number; h: number; chroma: ReturnType<typeof detectChroma>; grid: ReturnType<typeof detectGrid> }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      const chroma = detectChroma(cv);
      resolve({ w: img.naturalWidth, h: img.naturalHeight, chroma, grid: detectGrid(cv, chroma) });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
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
    ...detectChroma(canvas),
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

  // Static image: keep it as the sheet. Auto-detect the frame grid from the
  // gutters; the display box follows one frame's shape (not the whole sheet).
  const src = await readDataUrl(file);
  const { w, h, chroma, grid } = await analyze(src);
  return {
    src,
    cols: grid.cols,
    rows: grid.rows,
    frameCount: grid.frameCount,
    fps: 12,
    ...displayBox(w / grid.cols, h / grid.rows),
    name: file.name.replace(/\.[^.]+$/, "") || "Sprite",
    ...chroma,
  };
}
