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

  // timeline
  playing: boolean;
  time: number;
  duration: number;

  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;

  load: (project: Project) => void;
  markSaved: () => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string, additive: boolean) => void;

  /** `commit: false` for continuous gestures (drag, slider) — coalesces history. */
  updateLayer: (id: string, patch: LayerPatch, commit?: boolean) => void;
  beginGesture: () => void;

  addLayer: (type: LayerType, partial?: Partial<Layer>) => void;
  insertLayer: (layer: Layer) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  reorder: (id: string, toIndex: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  toggleVisible: (id: string) => void;
  toggleLock: (id: string) => void;
  renameLayer: (id: string, name: string) => void;

  setTheme: (theme: Theme) => void;
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

  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;

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
      return { ...base, type, shape: "rect", fill: "@primary", cornerRadius: 12 };
    case "image":
    case "logo":
    case "video":
      return { ...base, type, src: type === "logo" ? "{{LOGO}}" : "", fit: "contain", cornerRadius: 0 };
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
    // Paused at a settled frame: entry animations have finished, so what you
    // see is the layout you are editing rather than a mid-flight pose.
    playing: false,
    time: SETTLED_TIME,
    duration: 5000,
    past: [],
    future: [],
    dirty: false,

    load: (project) =>
      set({ project, selectedIds: [], past: [], future: [], dirty: false, time: SETTLED_TIME }),
    markSaved: () => set({ dirty: false }),

    select: (ids) => set({ selectedIds: ids }),
    toggleSelect: (id, additive) =>
      set((s) => {
        if (!additive) return { selectedIds: [id] };
        return s.selectedIds.includes(id)
          ? { selectedIds: s.selectedIds.filter((x) => x !== id) }
          : { selectedIds: [...s.selectedIds, id] };
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
      const layer = { ...makeLayer(type, (s.project?.layers.length ?? 0) + 1), ...partial } as Layer;
      mapLayers((layers) => [...layers, layer]);
      set({ selectedIds: [layer.id] });
    },

    insertLayer: (layer) => {
      pushHistory();
      mapLayers((layers) => [...layers, layer]);
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
      const zoom = Math.min(vw / 1920, vh / 1080) * 0.92;
      set({ zoom, panX: (vw - 1920 * zoom) / 2, panY: (vh - 1080 * zoom) / 2 });
    },
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
    toggleSnap: () => set((s) => ({ snap: !s.snap })),

    setPlaying: (playing) => set({ playing }),
    setTime: (time) => set({ time }),
    setDuration: (duration) => set({ duration: Math.max(500, duration) }),

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
