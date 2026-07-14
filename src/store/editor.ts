"use client";

import { create } from "zustand";
import { getPalette } from "@/data/palettes";
import { cloneLayers, getTemplate } from "@/data/templates";
import { uid } from "@/lib/id";
import { DEFAULT_ANIMATION, DEFAULT_EFFECTS } from "@/lib/types";
import type { Layer, LayerPatch, LayerType, Project, Theme, ThemeToken } from "@/lib/types";

interface Snapshot {
  layers: Layer[];
  theme: Theme;
}

/** Freehand brush presets for the pencil tool. */
export type BrushKind =
  | "pen"
  | "marker"
  | "highlighter"
  | "neon"
  | "dashed"
  | "dotted"
  | "ink"
  | "calligraphy"
  | "fill"
  | "spray"
  | "crayon"
  | "rainbow"
  | "sketch"
  | "ribbon"
  | "eraser";

export const BRUSH_KINDS: { id: BrushKind; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "marker", label: "Marker" },
  { id: "ink", label: "Ink" },
  { id: "calligraphy", label: "Calligraphy" },
  { id: "fill", label: "Fill" },
  { id: "ribbon", label: "Ribbon" },
  { id: "highlighter", label: "Highlight" },
  { id: "neon", label: "Neon" },
  { id: "rainbow", label: "Rainbow" },
  { id: "spray", label: "Spray" },
  { id: "crayon", label: "Crayon" },
  { id: "sketch", label: "Sketch" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
  { id: "eraser", label: "Eraser" },
];

/** A camera layer punches a transparent hole; drawings sit below it so the
    webcam always shows through (you can't paint over the camera). */
export function isCameraLayer(l: Layer): boolean {
  return l.type === "camera" || (l.type === "window" && l.content === "camera");
}

/** Expand a selection to include every layer sharing a group with a selected one. */
function withGroups(ids: string[], layers: Layer[]): string[] {
  const groups = new Set(
    layers.filter((l) => ids.includes(l.id) && l.groupId).map((l) => l.groupId),
  );
  if (groups.size === 0) return ids;
  const set = new Set(ids);
  for (const l of layers) if (l.groupId && groups.has(l.groupId)) set.add(l.id);
  return [...set];
}

/** How a brush turns a raw width into stroke width, opacity, dash and glow. */
export function brushStyle(
  brush: BrushKind,
  width: number,
): { strokeWidth: number; opacity: number; dash?: number[]; glow?: number } {
  switch (brush) {
    case "marker":
      return { strokeWidth: width * 1.8, opacity: 0.9 };
    case "highlighter":
      return { strokeWidth: width * 3.5, opacity: 0.3 };
    case "neon":
      return { strokeWidth: width, opacity: 1, glow: Math.max(12, width * 2.4) };
    case "dashed":
      return { strokeWidth: width, opacity: 1, dash: [width * 2.4, width * 2] };
    case "dotted":
      return { strokeWidth: width, opacity: 1, dash: [0.1, width * 2.6] };
    default:
      return { strokeWidth: width, opacity: 1 };
  }
}

interface EditorState {
  project: Project | null;
  selectedIds: string[];

  // viewport
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showGuides: boolean;
  snap: boolean;

  // freehand pencil tool
  drawColor: string;
  drawWidth: number;
  drawBrush: BrushKind;

  /** Detached copies of layers held for paste — survives screen switches. */
  clipboard: Layer[];

  // timeline
  playing: boolean;
  time: number;
  duration: number;

  past: Snapshot[];
  future: Snapshot[];
  /** Per-screen undo stacks, so switching screens in a pack keeps each
      screen's own history. */
  historyByProject: Record<string, { past: Snapshot[]; future: Snapshot[] }>;
  dirty: boolean;

  load: (project: Project) => void;
  markSaved: () => void;
  renameProject: (name: string) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string, additive: boolean) => void;

  /** `commit: false` for continuous gestures (drag, slider) — coalesces history. */
  updateLayer: (id: string, patch: LayerPatch, commit?: boolean) => void;
  beginGesture: () => void;

  addLayer: (type: LayerType, partial?: Partial<Layer>) => void;
  insertLayer: (layer: Layer) => void;
  /** Drop a ready-made scaffold (webcam frame, panels, chat, socials) into the
      canvas as fresh layers — the starter pieces, now inside the editor. */
  insertStarter: (templateId: string) => void;
  /** Insert a drawing just below the first camera layer so the webcam hole cuts
      through it (draw around, never over, the camera). Appends if no camera. */
  insertDrawing: (layer: Layer) => void;
  /** Insert a bucket-fill just below the first freehand stroke so the drawn
      lines stay on top of the fill. Appends if there are no strokes. */
  insertFillLayer: (layer: Layer) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  /** Copy the selected layers to the in-editor clipboard (Ctrl/Cmd+C). */
  copySelected: () => void;
  /** Copy then delete the selected layers (Ctrl/Cmd+X). */
  cutSelected: () => void;
  /** Paste the clipboard layers with a small offset, and select them
      (Ctrl/Cmd+V). Works across screens in a pack. */
  pasteClipboard: () => void;
  /** The look (colour, effects, blend, typography) copied off one layer. */
  styleClipboard: Partial<Layer> | null;
  /** Copy the first selected layer's look. */
  copyStyle: () => void;
  /** Apply the copied look to every selected layer (only the fields it has). */
  pasteStyle: () => void;
  /** Move every selected (unlocked) layer by a delta — group/multi drag + nudge. */
  moveSelected: (dx: number, dy: number, commit?: boolean) => void;
  /** Align the selected layers to a shared edge or centre. */
  alignSelected: (edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => void;
  /** Space the selected layers evenly along an axis (needs 3+). */
  distributeSelected: (axis: "h" | "v") => void;
  /** Link the selected layers into a group — they select and move together. */
  groupSelected: () => void;
  /** Break the group on the selected layers. */
  ungroupSelected: () => void;
  reorder: (id: string, toIndex: number) => void;
  /** Replace the whole paint order in one undoable step — drag & drop commits here. */
  setLayersOrder: (orderedIds: string[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  toggleVisible: (id: string) => void;
  toggleLock: (id: string) => void;
  renameLayer: (id: string, name: string) => void;

  setTheme: (theme: Theme) => void;
  /** Change the artboard format (vertical/square/…); layers keep their coords. */
  setCanvasSize: (canvasWidth: number, canvasHeight: number) => void;
  setThemeToken: (token: ThemeToken, color: string) => void;
  /** Several tokens in one undoable step — used by the cascade and contrast fixes. */
  setThemePatch: (patch: Partial<Theme>) => void;
  setMotion: (enabled: boolean) => void;
  /** Swap the artwork, keep the project (and its OBS URL) intact. */
  applyTemplate: (templateId: string, adoptPalette: boolean) => void;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  zoomToFit: (viewportWidth: number, viewportHeight: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleSnap: () => void;

  setPlaying: (playing: boolean) => void;
  setTime: (time: number) => void;
  setDuration: (duration: number) => void;

  setDrawColor: (color: string) => void;
  setDrawWidth: (width: number) => void;
  setDrawBrush: (brush: BrushKind) => void;
  /** Stroke eraser: delete freehand layers the erase path (canvas coords) passes
      within `radius` of. */
  eraseStrokes: (erasePts: number[], radius: number) => void;

  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;

/** The look-fields that Copy style carries between layers — colour, effects,
    compositing and typography, but never geometry or content. Each is applied
    only to a target that already owns the field. */
const STYLE_KEYS = [
  "fill", "effects", "blend", "opacity", "strokeColor", "strokeWidth", "cornerRadius",
  "fontFamily", "fontWeight", "letterSpacing", "lineHeight", "textTransform", "italic",
  "fillStripes", "facetColors", "runnerColors", "usernameColor", "messageColor",
  "barColor", "trackColor", "valueColor", "labelColor", "iconColor", "titleColor", "subtitleColor",
] as const;

/** Late enough that every shipped entry animation has come to rest. */
export const SETTLED_TIME = 4000;

const snapshot = (s: EditorState): Snapshot => ({
  layers: structuredClone(s.project!.layers),
  theme: { ...s.project!.theme },
});

/** Layer defaults for each type, used by "add layer" in the left panel. */
function makeLayer(type: LayerType, index: number): Layer {
  const base = {
    id: uid(),
    name: `${type[0].toUpperCase()}${type.slice(1)} ${index}`,
    x: 760,
    y: 440,
    width: 400,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    effects: structuredClone(DEFAULT_EFFECTS),
    animation: { ...DEFAULT_ANIMATION },
  };

  switch (type) {
    case "text":
      return {
        ...base,
        type: "text",
        // Konva drops lines that overflow a fixed height, so the box must fit
        // the default string on one line at the default size.
        width: 620,
        height: 72,
        text: "Double-click to edit",
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: 700,
        italic: false,
        align: "left",
        letterSpacing: 0,
        lineHeight: 1.2,
        fill: "@text",
        textTransform: "none",
      };
    case "shape":
    case "background":
      return { ...base, type, shape: "rect", fill: "@primary", cornerRadius: 12, moonPhase: 1, craters: true };
    case "window":
      return {
        ...base,
        type: "window",
        width: 640,
        height: 400,
        title: "CAM.EXE",
        fill: "@surface/85",
        titleBarColor: "@primary",
        textColor: "@text",
        fontFamily: "Press Start 2P",
        fontSize: 12,
        cornerRadius: 10,
        buttons: true,
        gloss: true,
        content: "empty",
        chatFontSize: 20,
        usernameColor: "@accent",
        messageColor: "@text",
        rows: 8,
      };
    case "chip":
      return {
        ...base,
        type: "chip",
        width: 420,
        height: 52,
        label: "Recent sub",
        value: "pixel_wren",
        fill: "@surface/90",
        labelColor: "@accent",
        valueColor: "@text",
        fontFamily: "Inter",
        fontSize: 16,
        cornerRadius: 26,
        icon: "heart",
        split: false,
      };
    case "icon":
      return {
        ...base,
        type: "icon",
        width: 120,
        height: 120,
        symbol: "moon",
        fill: "@accent",
        strokeWidth: 2,
      };
    case "flag":
      return {
        ...base,
        type: "flag",
        width: 600,
        height: 24,
        stripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
        stackDirection: "horizontal",
        cornerRadius: 12,
      };
    case "image":
    case "logo":
    case "video":
      return { ...base, type, src: type === "logo" ? "{{LOGO}}" : "", fit: "contain", cornerRadius: 0 };
    case "sprite":
      return {
        ...base,
        type: "sprite",
        width: 200,
        height: 200,
        src: "",
        cols: 1,
        rows: 1,
        frameCount: 1,
        fps: 12,
        playing: true,
        motion: "none",
        motionSpeed: 1,
        faceDirection: true,
        removeBg: false,
        chromaKey: "#ff00ff",
        chromaTolerance: 16,
      };
    case "frame":
    case "camera":
      return {
        ...base,
        type,
        width: 480,
        height: 270,
        frameShape: "rect",
        fill: "@surface/60",
        strokeColor: "@primary",
        strokeWidth: 4,
        cornerRadius: 16,
        corners: false,
      };
    case "chatbox":
      return {
        ...base,
        type: "chatbox",
        width: 380,
        height: 560,
        fill: "@surface/85",
        cornerRadius: 18,
        fontFamily: "Inter",
        fontSize: 22,
        usernameColor: "@accent",
        messageColor: "@text",
        rows: 7,
      };
    case "alert":
      return {
        ...base,
        type: "alert",
        width: 800,
        height: 240,
        fill: "@surface/92",
        cornerRadius: 20,
        fontFamily: "Bebas Neue",
        title: "NEW FOLLOWER",
        subtitle: "AwesomeViewer",
        titleColor: "@accent",
        subtitleColor: "@text",
      };
    case "social":
      return {
        ...base,
        type: "social",
        width: 640,
        height: 56,
        platforms: ["twitch", "youtube", "discord", "instagram"],
        direction: "horizontal",
        gap: 24,
        iconColor: "@accent",
        textColor: "@text",
        fontFamily: "Inter",
        fontSize: 24,
        showHandles: true,
        pill: true,
        pillColor: "@surface/80",
      };
    case "goal":
      return {
        ...base,
        type: "goal",
        width: 640,
        height: 150,
        goalStyle: "bar",
        label: "FOLLOWER GOAL",
        current: 847,
        target: 1000,
        barShape: "rect",
        fill: "@surface/90",
        trackColor: "@surface/60",
        barColor: "@accent",
        labelColor: "@accent",
        valueColor: "@text",
        fontFamily: "Inter",
        cornerRadius: 16,
      };
    case "particle":
      return {
        ...base,
        type: "particle",
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        kind: "dots",
        count: 60,
        color: "@glow",
        size: 4,
        speed: 1,
      };
  }
}

export const useEditorStore = create<EditorState>()((set, get) => {
  /** Push the current state onto the undo stack before mutating. */
  const pushHistory = () => {
    const s = get();
    if (!s.project) return;
    set({ past: [...s.past, snapshot(s)].slice(-HISTORY_LIMIT), future: [] });
  };

  const patchProject = (fn: (project: Project) => Project) =>
    set((s) => (s.project ? { project: fn(s.project), dirty: true } : s));

  const mapLayers = (fn: (layers: Layer[]) => Layer[]) =>
    patchProject((project) => ({ ...project, layers: fn(project.layers) }));

  return {
    project: null,
    selectedIds: [],
    zoom: 0.5,
    panX: 0,
    panY: 0,
    showGrid: false,
    showGuides: true,
    snap: true,
    drawColor: "@accent",
    drawWidth: 8,
    drawBrush: "pen",
    clipboard: [],
    styleClipboard: null,
    // Paused at a settled frame: entry animations have finished, so what you
    // see is the layout you are editing rather than a mid-flight pose.
    playing: false,
    time: SETTLED_TIME,
    duration: 5000,
    past: [],
    future: [],
    historyByProject: {},
    dirty: false,

    load: (project) =>
      set((s) => {
        // Stash the outgoing screen's undo stacks and restore the incoming
        // screen's, so switching screens in a pack keeps per-screen undo.
        const byId = { ...s.historyByProject };
        if (s.project) byId[s.project.id] = { past: s.past, future: s.future };
        const restored = byId[project.id] ?? { past: [], future: [] };
        return {
          project,
          selectedIds: [],
          past: restored.past,
          future: restored.future,
          historyByProject: byId,
          dirty: false,
          time: SETTLED_TIME,
        };
      }),
    markSaved: () => set({ dirty: false }),
    renameProject: (name) => patchProject((project) => ({ ...project, name })),

    select: (ids) =>
      set((s) => ({ selectedIds: withGroups(ids, s.project?.layers ?? []) })),
    toggleSelect: (id, additive) =>
      set((s) => {
        const layers = s.project?.layers ?? [];
        if (!additive) return { selectedIds: withGroups([id], layers) };
        const next = s.selectedIds.includes(id)
          ? s.selectedIds.filter((x) => x !== id)
          : [...s.selectedIds, id];
        return { selectedIds: withGroups(next, layers) };
      }),

    beginGesture: pushHistory,

    updateLayer: (id, patch, commit = true) => {
      if (commit) pushHistory();
      mapLayers((layers) =>
        layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      );
    },

    addLayer: (type, partial) => {
      pushHistory();
      const s = get();
      const base = makeLayer(type, (s.project?.layers.length ?? 0) + 1);
      // Merge effects (shallow, per effect) so a preset can set just a gradient
      // or glow without dropping the other default effect blocks.
      const effects = partial?.effects
        ? { ...base.effects, ...(partial.effects as Partial<typeof base.effects>) }
        : base.effects;
      const layer = { ...base, ...partial, effects } as Layer;
      mapLayers((layers) => [...layers, layer]);
      set({ selectedIds: [layer.id] });
    },

    insertLayer: (layer) => {
      pushHistory();
      mapLayers((layers) => [...layers, layer]);
      set({ selectedIds: [layer.id] });
    },

    insertStarter: (templateId) => {
      const template = getTemplate(templateId);
      if (!template) return;
      pushHistory();
      // Fresh ids so the same starter can be dropped more than once, and never
      // collides with layers already on the canvas.
      const added = cloneLayers(template.layers).map((l) => ({ ...l, id: uid() }));
      mapLayers((layers) => [...layers, ...added]);
      set({ selectedIds: added.map((l) => l.id) });
    },

    insertDrawing: (layer) => {
      pushHistory();
      mapLayers((layers) => {
        const camIdx = layers.findIndex(isCameraLayer);
        if (camIdx === -1) return [...layers, layer];
        const next = layers.slice();
        next.splice(camIdx, 0, layer);
        return next;
      });
      set({ selectedIds: [layer.id] });
    },

    insertFillLayer: (layer) => {
      pushHistory();
      mapLayers((layers) => {
        const idx = layers.findIndex(
          (l) => l.type === "shape" && l.shape === "freehand" && (l.drawStyle ?? "line") !== "fill",
        );
        if (idx === -1) return [...layers, layer];
        const next = layers.slice();
        next.splice(idx, 0, layer);
        return next;
      });
      set({ selectedIds: [layer.id] });
    },

    removeSelected: () => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      pushHistory();
      mapLayers((layers) => layers.filter((l) => !selectedIds.includes(l.id) || l.locked));
      set({ selectedIds: [] });
    },

    duplicateSelected: () => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      pushHistory();
      const copies: Layer[] = [];
      for (const l of project.layers) {
        if (!selectedIds.includes(l.id)) continue;
        copies.push({ ...structuredClone(l), id: uid(), name: `${l.name} copy`, x: l.x + 24, y: l.y + 24 });
      }
      mapLayers((layers) => [...layers, ...copies]);
      set({ selectedIds: copies.map((c) => c.id) });
    },

    copySelected: () => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      const picked = project.layers.filter((l) => selectedIds.includes(l.id));
      if (picked.length) set({ clipboard: structuredClone(picked) });
    },

    cutSelected: () => {
      get().copySelected();
      get().removeSelected();
    },

    pasteClipboard: () => {
      const { clipboard, project } = get();
      if (!project || clipboard.length === 0) return;
      pushHistory();
      // Fresh ids and a small offset so the paste lands just off the original
      // and never collides with the layer it came from.
      const copies: Layer[] = clipboard.map((l) => ({
        ...structuredClone(l),
        id: uid(),
        x: l.x + 24,
        y: l.y + 24,
      }));
      mapLayers((layers) => [...layers, ...copies]);
      // Keep pasting from the same clipboard walking further out each time.
      set({
        selectedIds: copies.map((c) => c.id),
        clipboard: structuredClone(copies),
      });
    },

    copyStyle: () => {
      const { selectedIds, project } = get();
      const src = project?.layers.find((l) => selectedIds.includes(l.id));
      if (!src) return;
      const style: Record<string, unknown> = {};
      for (const k of STYLE_KEYS) {
        if (k in src) style[k] = structuredClone((src as unknown as Record<string, unknown>)[k]);
      }
      set({ styleClipboard: style as Partial<Layer> });
    },

    pasteStyle: () => {
      const { styleClipboard, selectedIds, project } = get();
      if (!project || !styleClipboard || selectedIds.length === 0) return;
      pushHistory();
      // Only copy over the look-fields the target actually owns, so a text's
      // font never lands on a shape and a shape's fill never wipes a photo.
      mapLayers((layers) =>
        layers.map((l) => {
          if (!selectedIds.includes(l.id) || l.locked) return l;
          const patch: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(styleClipboard)) {
            if (k in l) patch[k] = structuredClone(v);
          }
          return { ...l, ...patch } as Layer;
        }),
      );
    },

    moveSelected: (dx, dy, commit = true) => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0 || (dx === 0 && dy === 0)) return;
      if (commit) pushHistory();
      const ids = new Set(selectedIds);
      mapLayers((layers) =>
        layers.map((l) => (ids.has(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
      );
    },

    alignSelected: (edge) => {
      const { selectedIds, project } = get();
      if (!project) return;
      const sel = project.layers.filter((l) => selectedIds.includes(l.id) && !l.locked);
      if (sel.length < 2) return;
      pushHistory();
      const minX = Math.min(...sel.map((l) => l.x));
      const maxX = Math.max(...sel.map((l) => l.x + l.width));
      const minY = Math.min(...sel.map((l) => l.y));
      const maxY = Math.max(...sel.map((l) => l.y + l.height));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const ids = new Set(sel.map((l) => l.id));
      mapLayers((layers) =>
        layers.map((l) => {
          if (!ids.has(l.id)) return l;
          switch (edge) {
            case "left": return { ...l, x: minX };
            case "centerX": return { ...l, x: cx - l.width / 2 };
            case "right": return { ...l, x: maxX - l.width };
            case "top": return { ...l, y: minY };
            case "centerY": return { ...l, y: cy - l.height / 2 };
            case "bottom": return { ...l, y: maxY - l.height };
          }
        }),
      );
    },

    distributeSelected: (axis) => {
      const { selectedIds, project } = get();
      if (!project) return;
      const sel = project.layers.filter((l) => selectedIds.includes(l.id) && !l.locked);
      if (sel.length < 3) return;
      pushHistory();
      const key = axis === "h" ? "x" : "y";
      const ext = axis === "h" ? "width" : "height";
      const sorted = [...sel].sort((a, b) => a[key] - b[key]);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const inner = sorted.slice(1, -1).reduce((n, l) => n + l[ext], 0);
      const gap = (last[key] - (first[key] + first[ext]) - inner) / (sorted.length - 1);
      const pos: Record<string, number> = {};
      let cursor = first[key] + first[ext];
      for (let i = 1; i < sorted.length - 1; i++) {
        cursor += gap;
        pos[sorted[i].id] = cursor;
        cursor += sorted[i][ext];
      }
      mapLayers((layers) => layers.map((l) => (l.id in pos ? { ...l, [key]: pos[l.id] } : l)));
    },

    groupSelected: () => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length < 2) return;
      pushHistory();
      const gid = uid();
      const ids = new Set(selectedIds);
      mapLayers((layers) => layers.map((l) => (ids.has(l.id) ? { ...l, groupId: gid } : l)));
    },

    ungroupSelected: () => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      pushHistory();
      const ids = new Set(selectedIds);
      mapLayers((layers) => layers.map((l) => (ids.has(l.id) ? { ...l, groupId: undefined } : l)));
    },

    reorder: (id, toIndex) => {
      pushHistory();
      mapLayers((layers) => {
        const from = layers.findIndex((l) => l.id === id);
        if (from === -1) return layers;
        const next = layers.slice();
        const [moved] = next.splice(from, 1);
        next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
        return next;
      });
    },

    setLayersOrder: (orderedIds) => {
      pushHistory();
      mapLayers((layers) => {
        const byId = new Map(layers.map((l) => [l.id, l]));
        const next = orderedIds.map((id) => byId.get(id)).filter((l): l is Layer => Boolean(l));
        // Anything missing from the requested order (shouldn't happen) survives at the bottom.
        const seen = new Set(orderedIds);
        return [...layers.filter((l) => !seen.has(l.id)), ...next];
      });
    },

    bringToFront: (id) => {
      pushHistory();
      mapLayers((layers) => {
        const l = layers.find((x) => x.id === id);
        return l ? [...layers.filter((x) => x.id !== id), l] : layers;
      });
    },

    sendToBack: (id) => {
      pushHistory();
      mapLayers((layers) => {
        const l = layers.find((x) => x.id === id);
        return l ? [l, ...layers.filter((x) => x.id !== id)] : layers;
      });
    },

    toggleVisible: (id) => {
      pushHistory();
      mapLayers((layers) => layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
    },

    toggleLock: (id) => {
      pushHistory();
      mapLayers((layers) => layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
    },

    renameLayer: (id, name) => {
      pushHistory();
      mapLayers((layers) => layers.map((l) => (l.id === id ? { ...l, name } : l)));
    },

    setTheme: (theme) => {
      pushHistory();
      patchProject((project) => ({ ...project, theme }));
    },

    setCanvasSize: (canvasWidth, canvasHeight) => {
      pushHistory();
      patchProject((project) => ({ ...project, canvasWidth, canvasHeight }));
    },

    setThemeToken: (token, color) => {
      pushHistory();
      patchProject((project) => ({ ...project, theme: { ...project.theme, [token]: color } }));
    },

    setThemePatch: (patch) => {
      pushHistory();
      patchProject((project) => ({ ...project, theme: { ...project.theme, ...patch } }));
    },

    setMotion: (enabled) => {
      patchProject((project) => ({ ...project, animationsEnabled: enabled }));
      if (!enabled) set({ playing: false, time: SETTLED_TIME });
    },

    applyTemplate: (templateId, adoptPalette) => {
      const template = getTemplate(templateId);
      if (!template) return;
      pushHistory();
      patchProject((project) => ({
        ...project,
        templateId,
        name: template.name,
        theme: adoptPalette ? getPalette(template.paletteId).theme : project.theme,
        layers: cloneLayers(template.layers),
      }));
      set({ selectedIds: [] });
    },

    setZoom: (zoom) => set({ zoom: Math.max(0.05, Math.min(4, zoom)) }),
    setPan: (panX, panY) => set({ panX, panY }),
    zoomToFit: (vw, vh) => {
      const { project } = get();
      const cw = project?.canvasWidth ?? 1920;
      const ch = project?.canvasHeight ?? 1080;
      const zoom = Math.min(vw / cw, vh / ch) * 0.92;
      set({ zoom, panX: (vw - cw * zoom) / 2, panY: (vh - ch * zoom) / 2 });
    },
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
    toggleSnap: () => set((s) => ({ snap: !s.snap })),

    setPlaying: (playing) => set({ playing }),
    setTime: (time) => set({ time }),
    setDuration: (duration) => set({ duration: Math.max(500, duration) }),

    setDrawColor: (drawColor) => set({ drawColor }),
    setDrawWidth: (drawWidth) => set({ drawWidth: Math.max(1, Math.min(80, drawWidth)) }),
    setDrawBrush: (drawBrush) => set({ drawBrush }),

    eraseStrokes: (erasePts, radius) => {
      const { project } = get();
      if (!project) return;
      const r2 = radius * radius;
      const hit = (l: Layer) => {
        if (l.type !== "shape" || l.shape !== "freehand" || !l.points || l.locked) return false;
        for (let i = 0; i < l.points.length; i += 2) {
          const ax = l.x + l.points[i], ay = l.y + l.points[i + 1];
          for (let j = 0; j < erasePts.length; j += 2) {
            const dx = ax - erasePts[j], dy = ay - erasePts[j + 1];
            if (dx * dx + dy * dy < r2) return true;
          }
        }
        return false;
      };
      const remove = new Set(project.layers.filter(hit).map((l) => l.id));
      if (remove.size === 0) return;
      pushHistory();
      mapLayers((layers) => layers.filter((l) => !remove.has(l.id)));
      set((s) => ({ selectedIds: s.selectedIds.filter((id) => !remove.has(id)) }));
    },

    undo: () => {
      const s = get();
      if (!s.project || s.past.length === 0) return;
      const previous = s.past[s.past.length - 1];
      set({
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, HISTORY_LIMIT),
        project: { ...s.project, layers: previous.layers, theme: previous.theme },
        dirty: true,
      });
    },

    redo: () => {
      const s = get();
      if (!s.project || s.future.length === 0) return;
      const next = s.future[0];
      set({
        past: [...s.past, snapshot(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        project: { ...s.project, layers: next.layers, theme: next.theme },
        dirty: true,
      });
    },
  };
});

export function useSelectedLayer(): Layer | null {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  if (!project || selectedIds.length !== 1) return null;
  return project.layers.find((l) => l.id === selectedIds[0]) ?? null;
}
