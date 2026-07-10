import type Konva from "konva";
import { createZip, toBytes, type ZipEntry } from "./zip";
import { CANVAS_HEIGHT, CANVAS_WIDTH, type Layer } from "./types";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke on the next tick — Safari needs the URL alive during the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "overlay"
  );
}

/** The Konva layer's backing canvas — no re-render, no extra allocation. */
function nativeCanvas(stage: Konva.Stage): HTMLCanvasElement {
  const layer = stage.getLayers()[0];
  return layer.getNativeCanvasElement();
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      type,
      quality,
    );
  });
}

/* --------------------------------- images --------------------------------- */

/** PNG with a real alpha channel — the stage never paints a background. */
export async function exportPng(stage: Konva.Stage, pixelRatio = 1): Promise<Blob> {
  const canvas = stage.toCanvas({ pixelRatio });
  return canvasToBlob(canvas, "image/png");
}

/** JPG has no alpha, so transparent pixels are composited onto `background`. */
export async function exportJpg(stage: Konva.Stage, background: string, pixelRatio = 1): Promise<Blob> {
  const source = stage.toCanvas({ pixelRatio });
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return canvasToBlob(out, "image/jpeg", 0.92);
}

/* --------------------------------- video ---------------------------------- */

const VIDEO_MIMES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export interface VideoSupport {
  mime: string;
  extension: "mp4" | "webm";
}

export function supportedVideo(preferred: "mp4" | "webm"): VideoSupport | null {
  if (typeof MediaRecorder === "undefined") return null;
  const ordered =
    preferred === "webm" ? VIDEO_MIMES.filter((m) => m.startsWith("video/webm")) : VIDEO_MIMES;
  for (const mime of ordered) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return { mime, extension: mime.startsWith("video/mp4") ? "mp4" : "webm" };
    }
  }
  return null;
}

export const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/* ------------------------------ per-element ------------------------------- */

/**
 * The crop rectangle for exporting one layer on its own: the layer's rotated
 * bounding box plus room for glow, shadow and stroke to bleed past the edges.
 * Clamped to the canvas — pixels outside it don't exist in the overlay either.
 */
export function layerCropBox(layer: Layer): { x: number; y: number; width: number; height: number } {
  const { effects } = layer;
  let pad = 40;
  if (effects.glow.enabled) pad += effects.glow.strength * 1.5;
  if (effects.shadow.enabled) {
    pad += effects.shadow.blur + Math.max(Math.abs(effects.shadow.offsetX), Math.abs(effects.shadow.offsetY));
  }

  const rad = (Math.abs(layer.rotation) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = layer.width * cos + layer.height * sin;
  const bh = layer.width * sin + layer.height * cos;
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;

  const x0 = Math.max(0, Math.floor(cx - bw / 2 - pad));
  const y0 = Math.max(0, Math.floor(cy - bh / 2 - pad));
  const x1 = Math.min(CANVAS_WIDTH, Math.ceil(cx + bw / 2 + pad));
  const y1 = Math.min(CANVAS_HEIGHT, Math.ceil(cy + bh / 2 + pad));

  return { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
}

export interface RecordOptions {
  stage: Konva.Stage;
  durationMs: number;
  fps: number;
  mime: string;
  /** Moves the overlay clock. Must trigger a re-render of the stage. */
  setTime: (t: number) => void;
  /** Painted under the overlay; MediaRecorder cannot encode alpha. */
  background: string;
  /**
   * Clock value the recording starts from. Default 0 captures the one-shot
   * entry animations. Passing a settled time skips them so a looped video does
   * not replay the intro on every cycle.
   */
  startTime?: number;
  onProgress?: (fraction: number) => void;
}

/**
 * Record the stage in real time.
 *
 * `captureStream(fps)` samples the canvas on a wall-clock schedule, so the
 * recording must play at 1× — exporting five seconds takes five seconds. Trying
 * to render faster than realtime yields a video whose timestamps are wrong.
 *
 * Note that no MediaRecorder codec carries an alpha channel. For a transparent
 * animated overlay, use `exportPngSequence` or point OBS at the browser source.
 */
export async function recordVideo(options: RecordOptions): Promise<Blob> {
  const { stage, durationMs, fps, mime, setTime, background, onProgress } = options;
  const startTime = options.startTime ?? 0;

  const target = document.createElement("canvas");
  target.width = CANVAS_WIDTH;
  target.height = CANVAS_HEIGHT;
  const ctx = target.getContext("2d")!;

  const stream = target.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start();
  const started = performance.now();

  // Frame n's time is set here and painted on the *next* frame, once React has
  // committed the new stage props.
  setTime(startTime);
  await nextFrame();

  for (;;) {
    const elapsed = performance.now() - started;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(nativeCanvas(stage), 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    onProgress?.(Math.min(1, elapsed / durationMs));
    if (elapsed >= durationMs) break;

    setTime(startTime + elapsed);
    await nextFrame();
  }

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return done;
}

/* ------------------------------ PNG sequence ------------------------------ */

export interface SequenceOptions {
  stage: Konva.Stage;
  durationMs: number;
  fps: number;
  setTime: (t: number) => void;
  onProgress?: (fraction: number) => void;
}

/**
 * A frame-accurate, fully transparent PNG sequence zipped up. Unlike the video
 * path this is decoupled from wall-clock time: each frame is rendered, awaited,
 * then encoded, so a slow machine produces the same output as a fast one.
 */
export async function exportPngSequence(options: SequenceOptions): Promise<Blob> {
  const { stage, durationMs, fps, setTime, onProgress } = options;
  const frames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const entries: ZipEntry[] = [];

  for (let i = 0; i < frames; i++) {
    setTime((i / fps) * 1000);
    await nextFrame();
    await nextFrame(); // one frame for React's commit, one for Konva's draw

    const blob = await canvasToBlob(stage.toCanvas({ pixelRatio: 1 }), "image/png");
    entries.push({
      name: `frame_${String(i).padStart(4, "0")}.png`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
    onProgress?.((i + 1) / frames);
  }

  entries.push({
    name: "README.txt",
    data: toBytes(
      [
        "Asarayja — transparent PNG sequence",
        "",
        `${frames} frames at ${fps} fps (${(durationMs / 1000).toFixed(2)}s), 1920x1080 RGBA.`,
        "",
        "Encode to WebM with alpha (for OBS, browsers):",
        `  ffmpeg -framerate ${fps} -i frame_%04d.png -c:v libvpx-vp9 \\`,
        "      -pix_fmt yuva420p -auto-alt-ref 0 overlay.webm",
        "",
        "  -auto-alt-ref 0 is a safety measure: older libvpx builds corrupt the",
        "  alpha plane when alt-ref frames are enabled.",
        "",
        "Encode to MOV with alpha (for video editors):",
        `  ffmpeg -framerate ${fps} -i frame_%04d.png -c:v prores_ks \\`,
        "      -profile:v 4444 -pix_fmt yuva444p10le overlay.mov",
        "",
        "Checking the result:",
        "  ffprobe reports pix_fmt=yuv420p for an alpha WebM. That is expected —",
        "  VP9 stores alpha as a separate plane, flagged by the container's",
        "  AlphaMode element. To inspect it, force the libvpx decoder:",
        "    ffmpeg -c:v libvpx-vp9 -i overlay.webm -frames:v 1 -pix_fmt rgba check.png",
        "  ffmpeg's native vp9 decoder silently drops alpha, so decoding without",
        "  -c:v libvpx-vp9 will make a perfectly good file look opaque.",
      ].join("\n"),
    ),
  });

  return createZip(entries);
}
