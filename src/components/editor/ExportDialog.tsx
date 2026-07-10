"use client";

import { useMemo, useState } from "react";
import type Konva from "konva";
import {
  Check,
  Copy,
  Download,
  FileJson,
  Film,
  Image as ImageIcon,
  Layers,
  Package,
  X,
} from "lucide-react";
import { Button, Field, Segmented, Select, Slider, cx } from "@/components/ui";
import {
  canvasToBlob,
  downloadBlob,
  exportJpg,
  exportPng,
  exportPngSequence,
  layerCropBox,
  nextFrame,
  recordVideo,
  slugify,
  supportedVideo,
} from "@/lib/export";
import { createZip, toBytes, type ZipEntry } from "@/lib/zip";
import { SETTLED_TIME } from "@/store/editor";
import { buildObsUrl } from "@/lib/share";
import { resolveColor } from "@/lib/theme";
import { cloneLayers, getTemplate, packScreens } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import type { ChannelProfile, Layer, Project, Template, Theme } from "@/lib/types";

type Job = { label: string; progress: number } | null;

interface ExportDialogProps {
  project: Project;
  profile: ChannelProfile;
  stageRef: React.RefObject<Konva.Stage | null>;
  /** Drives the hidden export stage's clock. */
  setExportTime: (t: number) => void;
  /** Restricts the hidden export stage to a single layer. */
  setSoloLayer: (id: string | null) => void;
  /** Renders arbitrary layers/theme on the hidden stage — used to sweep the
      other screens of a pack for a bulk export. */
  setExportOverride: (o: { layers: Layer[]; theme: Theme } | null) => void;
  duration: number;
  onClose: () => void;
}

/** The screen's own name within its pack, e.g. "Starting Soon" from
    "Hallowed Night — Starting Soon". */
function screenLabel(t: Template): string {
  const i = t.name.lastIndexOf("—");
  return i === -1 ? t.name : t.name.slice(i + 1).trim();
}

export function ExportDialog({
  project,
  profile,
  stageRef,
  setExportTime,
  setSoloLayer,
  setExportOverride,
  duration,
  onClose,
}: ExportDialogProps) {
  const [scale, setScale] = useState(1);
  const [fps, setFps] = useState(30);
  const [videoFormat, setVideoFormat] = useState<"mp4" | "webm">("webm");
  const [job, setJob] = useState<Job>(null);
  const [obsUrl, setObsUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // The other screens of this pack: same design family, same palette.
  const pack = useMemo(() => packScreens(project.templateId), [project.templateId]);
  const packLabel = useMemo(() => {
    const template = getTemplate(project.templateId);
    if (!template?.family) return project.name;
    return `${template.family} · ${getPalette(template.paletteId).name}`;
  }, [project.templateId, project.name]);
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pack.map((s) => [s.id, true])),
  );
  const [packVideo, setPackVideo] = useState(false);
  const pickedCount = pack.filter((s) => picked[s.id]).length;

  const name = slugify(project.name);
  const background = resolveColor("@background", project.theme);
  const video = supportedVideo(videoFormat);
  const animated = project.layers.some((l) => l.animation.preset !== "none");
  // Scenes (Starting Soon, BRB, Ending…) carry a canvas-filling background
  // layer and export edge-to-edge. Overlays don't — the play area stays
  // transparent so the game shows through.
  const isScene = project.layers.some((l) => l.type === "background" && l.visible);

  const run = async (label: string, task: () => Promise<void>) => {
    setError("");
    setJob({ label, progress: 0 });
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed");
    } finally {
      setJob(null);
      setExportTime(0);
    }
  };

  const stage = () => {
    const s = stageRef.current;
    if (!s) throw new Error("Export canvas is not ready yet");
    return s;
  };

  const doPng = () =>
    run("Rendering PNG", async () => {
      downloadBlob(await exportPng(stage(), scale), `${name}@${scale}x.png`);
    });

  const doJpg = () =>
    run("Rendering JPG", async () => {
      downloadBlob(await exportJpg(stage(), background, scale), `${name}@${scale}x.jpg`);
    });

  const doVideo = () =>
    run(`Recording ${videoFormat.toUpperCase()} in real time`, async () => {
      if (!video) throw new Error("This browser cannot record video");
      const blob = await recordVideo({
        stage: stage(),
        durationMs: duration,
        fps,
        mime: video.mime,
        background,
        setTime: setExportTime,
        onProgress: (progress) => setJob({ label: "Recording", progress }),
      });
      downloadBlob(blob, `${name}.${video.extension}`);
    });

  const doSequence = () =>
    run("Rendering transparent frames", async () => {
      const blob = await exportPngSequence({
        stage: stage(),
        durationMs: duration,
        fps,
        setTime: setExportTime,
        onProgress: (progress) => setJob({ label: "Rendering frames", progress }),
      });
      downloadBlob(blob, `${name}-png-sequence.zip`);
    });

  /**
   * Every visible layer as its own tightly-cropped transparent PNG. This is
   * how the pieces come apart for use outside the app: the alert box, the
   * camera frame and the social bar as separate images, each with real alpha.
   */
  const doElements = () =>
    run("Rendering elements", async () => {
      const layers = project.layers.filter((l) => l.visible);
      const entries: ZipEntry[] = [];
      // Settled pose: entry animations finished, ambient effects at rest.
      setExportTime(SETTLED_TIME);
      try {
        for (let i = 0; i < layers.length; i++) {
          setSoloLayer(layers[i].id);
          await nextFrame();
          await nextFrame(); // one for React's commit, one for Konva's draw

          const crop = layerCropBox(layers[i]);
          const blob = await canvasToBlob(stage().toCanvas({ ...crop, pixelRatio: scale }), "image/png");
          entries.push({
            name: `${String(i + 1).padStart(2, "0")}-${slugify(layers[i].name)}.png`,
            data: new Uint8Array(await blob.arrayBuffer()),
          });
          setJob({ label: "Rendering elements", progress: (i + 1) / layers.length });
        }
      } finally {
        setSoloLayer(null);
      }
      entries.push({
        name: "README.txt",
        data: toBytes(
          [
            `Asarayja — "${project.name}" as individual elements`,
            "",
            `${layers.length} transparent PNGs at ${scale}x, each cropped to its own layer`,
            "(plus padding for glow and shadow), rendered at the overlay's settled pose.",
            "",
            "Layer positions on the 1920x1080 canvas:",
            ...layers.map(
              (l, i) =>
                `  ${String(i + 1).padStart(2, "0")}-${slugify(l.name)}.png  x=${Math.round(l.x)} y=${Math.round(l.y)} w=${Math.round(l.width)} h=${Math.round(l.height)}`,
            ),
          ].join("\n"),
        ),
      });
      downloadBlob(createZip(entries), `${name}-elements.zip`);
    });

  /**
   * The whole pack in one ZIP: a PNG of every chosen screen (transparent for
   * overlays, full-frame for scenes), and optionally a video of each. Screens
   * other than the one being edited render from their pristine template layers,
   * but all share this project's theme so the pack stays coherent.
   */
  const doPack = () =>
    run("Exporting pack", async () => {
      const chosen = pack.filter((s) => picked[s.id]);
      if (chosen.length === 0) throw new Error("Pick at least one screen to export");
      const withVideo = packVideo && !!video;
      const perScreen = 1 + (withVideo ? 1 : 0);
      const total = chosen.length * perScreen;
      const entries: ZipEntry[] = [];
      let done = 0;

      try {
        for (let i = 0; i < chosen.length; i++) {
          const s = chosen[i];
          const label = screenLabel(s);
          const prefix = `${String(i + 1).padStart(2, "0")}-${slugify(label)}`;
          // The current screen carries the user's edits; siblings come straight
          // from the template. All wear this project's theme.
          const layers =
            s.id === project.templateId ? project.layers : cloneLayers(s.layers);
          setExportOverride({ layers, theme: project.theme });

          // Still, at the settled pose. Extra frames let a just-swapped screen's
          // images (logo, avatar) load before we read the canvas.
          setExportTime(SETTLED_TIME);
          await nextFrame();
          await nextFrame();
          await nextFrame();
          const png = await canvasToBlob(stage().toCanvas({ pixelRatio: scale }), "image/png");
          entries.push({ name: `${prefix}.png`, data: new Uint8Array(await png.arrayBuffer()) });
          done++;
          setJob({ label: `Screen ${i + 1}/${chosen.length} · ${label}`, progress: done / total });

          if (withVideo) {
            const blob = await recordVideo({
              stage: stage(),
              durationMs: duration,
              fps,
              mime: video!.mime,
              background,
              setTime: setExportTime,
              onProgress: (p) =>
                setJob({
                  label: `Screen ${i + 1}/${chosen.length} · recording ${label}`,
                  progress: (done + p) / total,
                }),
            });
            entries.push({
              name: `${prefix}.${video!.extension}`,
              data: new Uint8Array(await blob.arrayBuffer()),
            });
            done++;
          }
        }
      } finally {
        setExportOverride(null);
      }

      entries.push({
        name: "README.txt",
        data: toBytes(
          [
            `Asarayja — "${packLabel}" pack`,
            "",
            `${chosen.length} screen${chosen.length === 1 ? "" : "s"}, each a ${scale}x PNG` +
              (withVideo ? ` and a ${video!.extension.toUpperCase()} video` : "") +
              ".",
            "Scenes (Starting Soon, BRB, Ending…) are full-frame; overlays keep",
            "true transparency so gameplay shows through, and camera windows stay",
            "transparent for your webcam.",
            "",
            "Screens:",
            ...chosen.map((s, i) => `  ${String(i + 1).padStart(2, "0")}-${slugify(screenLabel(s))}  ${screenLabel(s)}`),
          ].join("\n"),
        ),
      });
      downloadBlob(createZip(entries), `${slugify(packLabel)}-pack.zip`);
    });

  const doJson = () => {
    const blob = new Blob([JSON.stringify({ project, profile }, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `${name}.asarayja.json`);
  };

  const copyObs = async () => {
    const url = await buildObsUrl({ project, profile });
    setObsUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the URL is shown below for manual copying */
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="panel-solid max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Export</h2>
            <p className="text-xs text-zinc-500">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {job && (
          <div className="border-b border-white/[0.06] px-5 py-3">
            <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
              <span>{job.label}…</span>
              <span className="font-mono">{Math.round(job.progress * 100)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width]"
                style={{ width: `${job.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-6 p-5">
          <section>
            <SectionTitle icon={<ImageIcon className="size-3.5" />}>Still image</SectionTitle>
            <div className="mb-3">
              <Slider
                label="Resolution"
                min={1}
                max={4}
                step={1}
                value={scale}
                suffix={`× · ${1920 * scale}×${1080 * scale}`}
                onChange={setScale}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" disabled={!!job} onClick={doPng} className="flex-1">
                <Download className="size-4" />
                {isScene ? "PNG · full scene" : "PNG · transparent"}
              </Button>
              <Button disabled={!!job} onClick={doJpg} className="flex-1">
                JPG · on background
              </Button>
            </div>
            <Note>
              {isScene
                ? "This is a full screen — its background layer fills the frame, so the export is opaque edge to edge. Only screens like Starting Soon, BRB and Ending work this way."
                : "This is an overlay — everything outside the drawn elements exports as true transparency, so gameplay shows through. The camera window is always transparent too: OBS layers your webcam behind it."}
            </Note>
          </section>

          <section>
            <SectionTitle icon={<Film className="size-3.5" />}>Animation</SectionTitle>
            {!animated && (
              <p className="mb-3 text-xs text-zinc-500">
                Nothing on this overlay is animated, so a video would be {duration / 1000}s of a
                still frame.
              </p>
            )}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Field label="Frame rate">
                <Select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                  {[24, 30, 60].map((f) => (
                    <option key={f} value={f}>
                      {f} fps
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Container">
                <Segmented
                  value={videoFormat}
                  onChange={setVideoFormat}
                  options={[
                    { value: "webm", label: "WebM" },
                    { value: "mp4", label: "MP4" },
                  ]}
                />
              </Field>
            </div>

            <div className="flex gap-2">
              <Button disabled={!!job || !video} onClick={doVideo} className="flex-1">
                <Film className="size-4" />
                {video ? `Record ${video.extension.toUpperCase()}` : "Not supported here"}
              </Button>
              <Button variant="primary" disabled={!!job} onClick={doSequence} className="flex-1">
                <Layers className="size-4" />
                PNG sequence · alpha
              </Button>
            </div>

            <Note>
              No browser video codec carries an alpha channel, so a recorded {videoFormat.toUpperCase()}{" "}
              is flattened onto your background colour. For a genuinely transparent animated overlay,
              export the PNG sequence — it ships with the exact FFmpeg commands for WebM/VP9 and
              ProRes 4444 — or point OBS at the browser source below, which needs no export at all.
            </Note>
            <Note>
              Recording plays the overlay once at normal speed, so it takes about{" "}
              {(duration / 1000).toFixed(1)}s.
            </Note>
          </section>

          {pack.length > 1 && (
            <section>
              <SectionTitle icon={<Package className="size-3.5" />}>Whole pack</SectionTitle>
              <p className="mb-3 text-xs leading-relaxed text-zinc-500">
                Every screen that belongs to this design — {packLabel} — in one ZIP. Each chosen
                screen exports as a {scale}× PNG (transparent overlays, full-frame scenes), plus a
                video if you like. The screens you aren&apos;t editing use this project&apos;s
                colours, so the whole pack stays coherent.
              </p>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">
                  {pickedCount} of {pack.length} screens
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPicked(Object.fromEntries(pack.map((s) => [s.id, true])))}
                    className="rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setPicked({})}
                    className="rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {pack.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={!!picked[s.id]}
                      onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.checked }))}
                      className="size-3.5 accent-brand-500"
                    />
                    <span className="truncate">{screenLabel(s)}</span>
                  </label>
                ))}
              </div>

              <label className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={packVideo}
                  disabled={!video}
                  onChange={(e) => setPackVideo(e.target.checked)}
                  className="size-3.5 accent-brand-500"
                />
                Include a video of each screen
                {video ? (
                  <span className="text-zinc-600">
                    ({fps} fps {video.extension.toUpperCase()} — set above)
                  </span>
                ) : (
                  <span className="text-zinc-600">(video not supported here)</span>
                )}
              </label>

              <Button
                variant="primary"
                disabled={!!job || pickedCount === 0}
                onClick={doPack}
                className="w-full"
              >
                <Package className="size-4" />
                Export {pickedCount} {pickedCount === 1 ? "screen" : "screens"} as ZIP
              </Button>
              {packVideo && video && (
                <Note>
                  Videos record in real time, one screen at a time — about{" "}
                  {((duration / 1000) * pickedCount).toFixed(0)}s for {pickedCount}{" "}
                  {pickedCount === 1 ? "screen" : "screens"}. No video codec carries alpha, so each
                  is flattened onto your background colour; for transparent motion use the PNG
                  sequence or the OBS source.
                </Note>
              )}
            </section>
          )}

          <section>
            <SectionTitle icon={<Layers className="size-3.5" />}>Individual elements</SectionTitle>
            <p className="mb-3 text-xs leading-relaxed text-zinc-500">
              Every layer as its own transparent PNG — camera frame, chat box, alert and social bar
              come apart as separate images, cropped to size with their glow intact. A README lists
              each element&apos;s position on the canvas.
            </p>
            <Button variant="primary" disabled={!!job} onClick={doElements} className="w-full">
              <Layers className="size-4" />
              All elements as PNGs (ZIP)
            </Button>
          </section>

          <section>
            <SectionTitle icon={<Copy className="size-3.5" />}>OBS browser source</SectionTitle>
            <p className="mb-3 text-xs leading-relaxed text-zinc-500">
              A self-contained link: the overlay and your profile are compressed into the URL
              fragment, which never leaves your machine. Paste it into OBS as a Browser Source at
              1920×1080.
            </p>
            <Button variant="primary" onClick={copyObs} className="w-full">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied to clipboard" : "Generate and copy OBS URL"}
            </Button>
            {obsUrl && (
              <textarea
                readOnly
                value={obsUrl}
                onFocus={(e) => e.currentTarget.select()}
                rows={3}
                className="mt-3 w-full break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400"
              />
            )}
            <Note>
              Code <span className="font-mono text-zinc-400">{project.obsCode}</span>. While this tab
              stays open, edits stream to any open live view instantly.
            </Note>
          </section>

          <section>
            <SectionTitle icon={<FileJson className="size-3.5" />}>Project file</SectionTitle>
            <Button onClick={doJson} className="w-full">
              <Download className="size-4" />
              Download .asarayja.json
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
      <span className="text-brand-400">{icon}</span>
      {children}
    </h3>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className={cx("mt-3 text-[11px] leading-relaxed text-zinc-600")}>{children}</p>;
}
