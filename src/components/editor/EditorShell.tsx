"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type Konva from "konva";
import {
  ArrowLeft,
  Clapperboard,
  Cloud,
  Download,
  Grid3x3,
  Hand,
  Magnet,
  Maximize,
  Monitor,
  MousePointer2,
  Keyboard,
  X,
  PaintBucket,
  Palette,
  Pencil,
  Radio,
  Redo2,
  RotateCw,
  Send,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { OverlayStage } from "@/components/overlay/OverlayStage";
import { Button, cx } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { publishLive } from "@/lib/share";
import { resolveColor } from "@/lib/theme";
import { downloadBlob, slugify } from "@/lib/export";
import { packToDesignFile } from "@/lib/design-file";
import { CANVAS_PRESETS, CANVAS_WIDTH } from "@/lib/types";
import type { Layer, Theme } from "@/lib/types";
import { BRUSH_KINDS, useEditorStore } from "@/store/editor";
import { useProfileStore, useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { EditorCanvas } from "./EditorCanvas";
import { ExportDialog } from "./ExportDialog";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Timeline } from "./Timeline";

const AUTOSAVE_DELAY = 700;

export default function EditorShell({ projectId }: { projectId: string }) {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const dirty = useEditorStore((s) => s.dirty);
  const zoom = useEditorStore((s) => s.zoom);
  const time = useEditorStore((s) => s.time);
  const duration = useEditorStore((s) => s.duration);
  const snap = useEditorStore((s) => s.snap);
  const showGrid = useEditorStore((s) => s.showGrid);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);

  const load = useEditorStore((s) => s.load);
  const markSaved = useEditorStore((s) => s.markSaved);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setZoom = useEditorStore((s) => s.setZoom);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const removeSelected = useEditorStore((s) => s.removeSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const setTheme = useEditorStore((s) => s.setTheme);
  const setMotion = useEditorStore((s) => s.setMotion);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);

  const upsert = useProjectsStore((s) => s.upsert);
  const syncPackTheme = useProjectsStore((s) => s.syncPackTheme);
  const packScreensOf = useProjectsStore((s) => s.packScreensOf);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  // Quick rotate: spin the selected layer(s) 90° — turn a pattern/split to any
  // direction without dragging the handle.
  const rotateSelected = () => {
    if (!project) return;
    for (const id of selectedIds) {
      const l = project.layers.find((x) => x.id === id);
      if (l) updateLayer(id, { rotation: (((l.rotation ?? 0) + 90) % 360 + 360) % 360 });
    }
  };
  const renameProject = useEditorStore((s) => s.renameProject);
  const hydrated = useProjectsStore((s) => s.hydrated);
  const saved = useProjectsStore((s) =>
    s.projects.find((p) => p.id === projectId) ?? (s.draft?.id === projectId ? s.draft : null),
  );

  const profile = useRenderProfile();
  const brandTheme = useProfileStore((s) => s.profile.theme);

  const [panTool, setPanTool] = useState(false);
  const [drawTool, setDrawTool] = useState(false);
  const [bucketTool, setBucketTool] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  // The editor needs a real workspace — gate it to bigger screens so phones
  // don't mount the (unusable) canvas. "unknown" until the client measures.
  const [device, setDevice] = useState<"unknown" | "small" | "ok">("unknown");
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setDevice(mq.matches ? "ok" : "small");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // "Send to site" is a hidden maintainer tool, off by default. Reveal it from
  // the browser console (see the local dev note, not committed to git).
  const [devMode, setDevMode] = useState(false);
  useEffect(() => {
    setDevMode(localStorage.getItem("asarayja:dev") === "1");
    (window as unknown as { asarayjaDev?: () => void }).asarayjaDev = () => {
      localStorage.setItem("asarayja:dev", "1");
      setDevMode(true);
    };
  }, []);
  const [showExport, setShowExport] = useState(false);
  const [exportTime, setExportTime] = useState(0);
  /** When set, the export stage renders only this layer — per-element export. */
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);
  /** When set, the export stage renders these layers/theme instead of the
      current project's — used to sweep the other screens of a pack. */
  const [exportOverride, setExportOverride] = useState<{ layers: Layer[]; theme: Theme } | null>(
    null,
  );
  const exportStageRef = useRef<Konva.Stage>(null);

  const missing = hydrated && !saved && project?.id !== projectId;

  // Pull the saved project into the editor once localStorage has been read.
  useEffect(() => {
    if (saved && project?.id !== projectId) load(saved);
  }, [saved, project?.id, projectId, load]);

  // Autosave, debounced, and broadcast to any open live view.
  useEffect(() => {
    if (!project || !dirty) return;
    const handle = setTimeout(() => {
      upsert(project);
      // One shared palette per pack: fan the theme out to every sibling screen
      // (a no-op when unchanged), then broadcast to this screen's live view.
      if (project.packId) syncPackTheme(project.packId, project.theme);
      publishLive({ project, profile });
      markSaved();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(handle);
  }, [project, dirty, upsert, syncPackTheme, markSaved, profile]);

  // Keyboard shortcuts. Ignored while typing into a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable]")) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && key === "c") {
        e.preventDefault();
        useEditorStore.getState().copySelected();
      } else if (mod && key === "x") {
        e.preventDefault();
        useEditorStore.getState().cutSelected();
      } else if (mod && key === "v") {
        e.preventDefault();
        useEditorStore.getState().pasteClipboard();
      } else if (mod && key === "a") {
        const st = useEditorStore.getState();
        if (!st.project) return;
        e.preventDefault();
        st.select(st.project.layers.filter((l) => !l.locked).map((l) => l.id));
      } else if (mod && key === "g") {
        // Combine the selected layers into one movable unit — a "layer" that
        // holds several things. Shift+Cmd/Ctrl+G breaks it apart again.
        e.preventDefault();
        if (e.shiftKey) useEditorStore.getState().ungroupSelected();
        else useEditorStore.getState().groupSelected();
      } else if (mod) {
        // Any other modifier combo (copy shortcuts on other layouts, browser
        // chrome) — leave it to the browser rather than swallowing a tool key.
        return;
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key === " ") {
        e.preventDefault();
        setPanTool(true);
      } else if (key === "v") {
        setPanTool(false);
        setDrawTool(false);
        setBucketTool(false);
      } else if (key === "h") {
        setPanTool(true);
        setDrawTool(false);
        setBucketTool(false);
      } else if (key === "b") {
        setDrawTool(true);
        setPanTool(false);
        setBucketTool(false);
      } else if (key === "g") {
        setBucketTool(true);
        setDrawTool(false);
        setPanTool(false);
      } else if (e.key.startsWith("Arrow")) {
        // Nudge the selected layer(s) with the arrow keys — move a layer that
        // sits behind others without having to reach it on the canvas.
        const st = useEditorStore.getState();
        if (!st.selectedIds.length || !st.project) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        for (const id of st.selectedIds) {
          const l = st.project.layers.find((x) => x.id === id);
          if (l && !l.locked) st.updateLayer(id, { x: l.x + dx, y: l.y + dy }, false);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setPanTool(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [undo, redo, removeSelected, duplicateSelected]);

  // Hold the first paint until the client knows the screen size, so a phone
  // never briefly mounts the canvas editor.
  if (device === "unknown") return null;

  if (device === "small") {
    return (
      <div className="app-bg flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Monitor className="size-10 text-brand-400" />
        <h1 className="text-lg font-semibold text-white">{t("The editor needs a bigger screen")}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
          {t("Open this on a computer to design and edit overlays. You can browse all the designs on your phone.")}
        </p>
        <Link href="/">
          <Button variant="primary" className="mt-1">{t("Browse designs")}</Button>
        </Link>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="app-bg grid min-h-screen place-items-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white">{t("Project not found")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("It may have been deleted from this browser.")}</p>
          <Link href="/">
            <Button className="mt-5">{t("Back to designs")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <p className="text-sm text-zinc-500">{t("Loading project…")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-950">
      <header className="liquid-glass flex h-14 shrink-0 items-center gap-3 px-4">
        <Link
          href="/projects"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title={t("All projects")}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <input
          value={project.name}
          onChange={(e) => renameProject(e.target.value)}
          className="w-56 rounded-lg bg-transparent px-2 py-1 text-sm font-medium text-white outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
        />

        <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Cloud className="size-3.5" />
          {dirty ? t("Saving…") : t("Saved")}
        </span>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={undo} disabled={past.length === 0} title={t("Undo") + " (⌘Z)"}>
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton onClick={redo} disabled={future.length === 0} title={t("Redo") + " (⇧⌘Z)"}>
          <Redo2 className="size-4" />
        </ToolButton>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton
          onClick={() => {
            setPanTool(false);
            setDrawTool(false);
            setBucketTool(false);
          }}
          active={!panTool && !drawTool && !bucketTool}
          title={t("Select") + " (V)"}
        >
          <MousePointer2 className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => {
            setPanTool(true);
            setDrawTool(false);
            setBucketTool(false);
          }}
          active={panTool}
          title={t("Pan") + " (H " + t("or hold Space") + ")"}
        >
          <Hand className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => {
            setDrawTool(true);
            setPanTool(false);
            setBucketTool(false);
          }}
          active={drawTool}
          title={t("Draw") + " (B) — " + t("freehand pencil")}
        >
          <Pencil className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => {
            setBucketTool(true);
            setDrawTool(false);
            setPanTool(false);
          }}
          active={bucketTool}
          title={t("Fill") + " (G) — " + t("click a region you drew to fill it with the chosen colour")}
        >
          <PaintBucket className="size-4" />
        </ToolButton>
        {(drawTool || bucketTool) && <DrawSettings />}
        <ToolButton
          onClick={rotateSelected}
          disabled={selectedIds.length === 0}
          title={t("Rotate selection 90° — flip a pattern/split to any direction")}
        >
          <RotateCw className="size-4" />
        </ToolButton>
        <ToolButton onClick={toggleSnap} active={snap} title={t("Snap to guides")}>
          <Magnet className="size-4" />
        </ToolButton>
        <ToolButton onClick={toggleGrid} active={showGrid} title={t("Grid")}>
          <Grid3x3 className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => setMotion(project.animationsEnabled === false)}
          active={project.animationsEnabled !== false}
          title={t("Motion: when off, the OBS view and exports use the settled still pose")}
        >
          <Clapperboard className="size-4" />
        </ToolButton>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <select
          value={CANVAS_PRESETS.find((p) => p.w === (project.canvasWidth ?? 1920) && p.h === (project.canvasHeight ?? 1080))?.id ?? "landscape"}
          onChange={(e) => {
            const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value);
            if (preset) setCanvasSize(preset.w, preset.h);
          }}
          title={t("Artboard format — layers keep their positions, so switching may need a reposition")}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-200 focus:border-brand-500/60 focus:outline-none"
        >
          {CANVAS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={() => setZoom(zoom / 1.2)} title={t("Zoom out")}>
          <ZoomOut className="size-4" />
        </ToolButton>
        <span className="w-12 text-center font-mono text-[11px] text-zinc-500">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => setZoom(zoom * 1.2)} title={t("Zoom in")}>
          <ZoomIn className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => setZoom(1)} title={t("Zoom to 100%")}>
          <Maximize className="size-4" />
        </ToolButton>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={() => setShowKeys(true)} title={t("Keyboard shortcuts")}>
          <Keyboard className="size-4" />
        </ToolButton>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setTheme(brandTheme)} title={t("Apply the colours from your channel profile")}>
            <Palette className="size-3.5" />
            {t("My brand")}
          </Button>
          <Link href={`/live/overlay?code=${project.obsCode}`} target="_blank">
            <Button title={t("Open the OBS view in a new tab")}>
              <Radio className="size-3.5" />
              {t("Live view")}
            </Button>
          </Link>
          {devMode && (
            <Button
              onClick={() => {
                // One click: package the whole pack (every screen + palette) as a
                // ready-to-bake design file. Send it in and it ships as a built-in.
                upsert(project);
                const screens = project.packId ? packScreensOf(project.packId) : [project];
                const merged = screens.map((s) => (s.id === project.id ? project : s));
                if (!merged.some((s) => s.id === project.id)) merged.push(project);
                const file = packToDesignFile(merged);
                downloadBlob(
                  new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }),
                  `${slugify(file.name)}.asarayja-design.json`,
                );
              }}
              title={t("Download this whole design as one file to send in and have it baked into the site")}
            >
              <Send className="size-3.5" />
              {t("Send to site")}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              setExportTime(time);
              setShowExport(true);
            }}
          >
            <Download className="size-4" />
            {t("Export")}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorCanvas profile={profile} panTool={panTool} drawTool={drawTool} bucketTool={bucketTool} />
          </div>
          <Timeline />
        </main>
        <RightPanel />
      </div>

      {/* Off-screen render target for export. Full canvas resolution, `live`
          mode so exported pixels match what OBS shows — no camera placeholder,
          no selection chrome. It must stay in the layout (not `display:none`)
          for the canvas to paint. Its clock is deliberately separate from the
          editor's: otherwise this 1920×1080 stage would redraw on every frame
          of timeline playback. */}
      <div className="pointer-events-none fixed left-[-99999px] top-0 opacity-0" aria-hidden>
        <OverlayStage
          ref={exportStageRef}
          layers={
            exportOverride
              ? exportOverride.layers
              : soloLayerId
                ? project.layers.filter((l) => l.id === soloLayerId)
                : project.layers
          }
          theme={exportOverride ? exportOverride.theme : project.theme}
          profile={profile}
          time={exportTime}
          mode="live"
          width={project.canvasWidth ?? CANVAS_WIDTH}
          canvasWidth={project.canvasWidth}
          canvasHeight={project.canvasHeight}
        />
      </div>

      {showExport && (
        <ExportDialog
          project={project}
          profile={profile}
          stageRef={exportStageRef}
          setExportTime={setExportTime}
          setSoloLayer={setSoloLayerId}
          setExportOverride={setExportOverride}
          duration={duration}
          onClose={() => {
            setSoloLayerId(null);
            setExportOverride(null);
            setShowExport(false);
          }}
        />
      )}
      {showKeys && <ShortcutsDialog onClose={() => setShowKeys(false)} />}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "rounded-lg p-2 transition-colors disabled:opacity-30",
        active ? "bg-brand-500/20 text-brand-400" : "text-zinc-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

const DRAW_TOKENS = ["@accent", "@primary", "@secondary", "@text", "@glow", "@error"];

function DrawSettings() {
  const t = useT();
  const drawColor = useEditorStore((s) => s.drawColor);
  const drawWidth = useEditorStore((s) => s.drawWidth);
  const drawBrush = useEditorStore((s) => s.drawBrush);
  const setDrawColor = useEditorStore((s) => s.setDrawColor);
  const setDrawWidth = useEditorStore((s) => s.setDrawWidth);
  const setDrawBrush = useEditorStore((s) => s.setDrawBrush);
  const theme = useEditorStore((s) => s.project?.theme);
  return (
    <div className="ml-1 flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1">
      <div className="flex items-center gap-0.5">
        {BRUSH_KINDS.map((brush) => (
          <button
            key={brush.id}
            onClick={() => setDrawBrush(brush.id)}
            title={t(brush.label)}
            className={cx(
              "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              drawBrush === brush.id
                ? "bg-brand-500/30 text-brand-300"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
            )}
          >
            {t(brush.label)}
          </button>
        ))}
      </div>
      <span className="mx-0.5 h-4 w-px bg-white/10" />
      {DRAW_TOKENS.map((tok) => (
        <button
          key={tok}
          onClick={() => setDrawColor(tok)}
          title={tok.slice(1)}
          className={cx(
            "size-4 rounded-full ring-1 ring-white/20 transition",
            drawColor === tok && "ring-2 ring-white",
          )}
          style={{ background: theme ? resolveColor(tok, theme) : "#fff" }}
        />
      ))}
      {/* Any RGB colour, not just the theme tokens. The swatch shows a custom
          pick; otherwise a rainbow hints that this opens the full picker. */}
      <label
        title={t("Custom colour")}
        className={cx(
          "relative size-4 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/20 transition",
          !DRAW_TOKENS.includes(drawColor) && "ring-2 ring-white",
        )}
        style={{
          background: !DRAW_TOKENS.includes(drawColor)
            ? theme
              ? resolveColor(drawColor, theme)
              : drawColor
            : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
        }}
      >
        <input
          type="color"
          value={theme ? resolveColor(drawColor, theme) : "#ffffff"}
          onChange={(e) => setDrawColor(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        type="range"
        min={1}
        max={40}
        value={drawWidth}
        onChange={(e) => setDrawWidth(Number(e.target.value))}
        className="ml-1 w-20 accent-brand-400"
        title={t("Brush width")}
      />
      <span className="w-5 text-center font-mono text-[10px] text-zinc-500">{drawWidth}</span>
    </div>
  );
}

/** A quick reference of the editor's keyboard shortcuts. */
function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const mod =
    typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
  const groups: Array<{ title: string; items: Array<[string, string]> }> = [
    {
      title: t("Edit"),
      items: [
        [`${mod} Z`, t("Undo")],
        [`⇧ ${mod} Z`, t("Redo")],
        [`${mod} C`, t("Copy")],
        [`${mod} X`, t("Cut")],
        [`${mod} V`, t("Paste")],
        [`${mod} D`, t("Duplicate")],
        [`${mod} A`, t("Select all")],
        [t("Delete / Backspace"), t("Delete selection")],
      ],
    },
    {
      title: t("Tools"),
      items: [
        ["V", t("Select")],
        [`H / ${t("Space")}`, t("Pan")],
        ["B", t("Draw (pencil)")],
        ["G", t("Fill bucket")],
      ],
    },
    {
      title: t("Move"),
      items: [
        [t("Arrow keys"), t("Nudge 1px")],
        [`⇧ ${t("Arrow keys")}`, t("Nudge 10px")],
      ],
    },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{t("Keyboard shortcuts")}</h2>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.title}</p>
              <div className="space-y-1">
                {g.items.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-[13px]">
                    <span className="text-zinc-300">{label}</span>
                    <kbd className="shrink-0 rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
