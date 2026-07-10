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
  MousePointer2,
  Palette,
  Radio,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { OverlayStage } from "@/components/overlay/OverlayStage";
import { Button, cx } from "@/components/ui";
import { publishLive } from "@/lib/share";
import { CANVAS_WIDTH } from "@/lib/types";
import { useEditorStore } from "@/store/editor";
import { useProfileStore, useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { EditorCanvas } from "./EditorCanvas";
import { ExportDialog } from "./ExportDialog";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Timeline } from "./Timeline";

const AUTOSAVE_DELAY = 700;

export default function EditorShell({ projectId }: { projectId: string }) {
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

  const upsert = useProjectsStore((s) => s.upsert);
  const renameProject = useEditorStore((s) => s.renameProject);
  const hydrated = useProjectsStore((s) => s.hydrated);
  const saved = useProjectsStore((s) =>
    s.projects.find((p) => p.id === projectId) ?? (s.draft?.id === projectId ? s.draft : null),
  );

  const profile = useRenderProfile();
  const brandTheme = useProfileStore((s) => s.profile.theme);

  const [panTool, setPanTool] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportTime, setExportTime] = useState(0);
  /** When set, the export stage renders only this layer — per-element export. */
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);
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
      publishLive({ project, profile });
      markSaved();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(handle);
  }, [project, dirty, upsert, markSaved, profile]);

  // Keyboard shortcuts. Ignored while typing into a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable]")) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key === " ") {
        e.preventDefault();
        setPanTool(true);
      } else if (e.key.toLowerCase() === "v") {
        setPanTool(false);
      } else if (e.key.toLowerCase() === "h") {
        setPanTool(true);
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

  if (missing) {
    return (
      <div className="app-bg grid min-h-screen place-items-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white">Project not found</h1>
          <p className="mt-1 text-sm text-zinc-500">It may have been deleted from this browser.</p>
          <Link href="/">
            <Button className="mt-5">Back to templates</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <p className="text-sm text-zinc-500">Loading project…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-ink-900 px-4">
        <Link
          href="/projects"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title="All projects"
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
          {dirty ? "Saving…" : "Saved"}
        </span>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={undo} disabled={past.length === 0} title="Undo (⌘Z)">
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton onClick={redo} disabled={future.length === 0} title="Redo (⇧⌘Z)">
          <Redo2 className="size-4" />
        </ToolButton>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={() => setPanTool(false)} active={!panTool} title="Select (V)">
          <MousePointer2 className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => setPanTool(true)} active={panTool} title="Pan (H or hold Space)">
          <Hand className="size-4" />
        </ToolButton>
        <ToolButton onClick={toggleSnap} active={snap} title="Snap to guides">
          <Magnet className="size-4" />
        </ToolButton>
        <ToolButton onClick={toggleGrid} active={showGrid} title="Grid">
          <Grid3x3 className="size-4" />
        </ToolButton>
        <ToolButton
          onClick={() => setMotion(project.animationsEnabled === false)}
          active={project.animationsEnabled !== false}
          title="Motion: when off, the OBS view and exports use the settled still pose"
        >
          <Clapperboard className="size-4" />
        </ToolButton>

        <div className="mx-2 h-6 w-px bg-white/8" />

        <ToolButton onClick={() => setZoom(zoom / 1.2)} title="Zoom out">
          <ZoomOut className="size-4" />
        </ToolButton>
        <span className="w-12 text-center font-mono text-[11px] text-zinc-500">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => setZoom(zoom * 1.2)} title="Zoom in">
          <ZoomIn className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => setZoom(1)} title="Zoom to 100%">
          <Maximize className="size-4" />
        </ToolButton>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setTheme(brandTheme)} title="Apply the colours from your channel profile">
            <Palette className="size-3.5" />
            My brand
          </Button>
          <Link href={`/live/overlay/${project.obsCode}`} target="_blank">
            <Button title="Open the OBS view in a new tab">
              <Radio className="size-3.5" />
              Live view
            </Button>
          </Link>
          <Button
            variant="primary"
            onClick={() => {
              setExportTime(time);
              setShowExport(true);
            }}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorCanvas profile={profile} panTool={panTool} />
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
          layers={soloLayerId ? project.layers.filter((l) => l.id === soloLayerId) : project.layers}
          theme={project.theme}
          profile={profile}
          time={exportTime}
          mode="live"
          width={CANVAS_WIDTH}
        />
      </div>

      {showExport && (
        <ExportDialog
          project={project}
          profile={profile}
          stageRef={exportStageRef}
          setExportTime={setExportTime}
          setSoloLayer={setSoloLayerId}
          duration={duration}
          onClose={() => {
            setSoloLayerId(null);
            setShowExport(false);
          }}
        />
      )}
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
