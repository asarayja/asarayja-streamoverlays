"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Every rebindable editor action. Space (held) pans and the arrow keys nudge —
    those are fixed gestures, not in this list. */
export type KeybindAction =
  | "undo"
  | "redo"
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "selectAll"
  | "group"
  | "ungroup"
  | "newDrawLayer"
  | "delete"
  | "toolSelect"
  | "toolPan"
  | "toolBrush"
  | "toolBucket";

export const KEYBIND_ACTIONS: Array<{ id: KeybindAction; label: string; group: "Edit" | "Tools" }> = [
  { id: "undo", label: "Undo", group: "Edit" },
  { id: "redo", label: "Redo", group: "Edit" },
  { id: "copy", label: "Copy", group: "Edit" },
  { id: "cut", label: "Cut", group: "Edit" },
  { id: "paste", label: "Paste", group: "Edit" },
  { id: "duplicate", label: "Duplicate", group: "Edit" },
  { id: "selectAll", label: "Select all", group: "Edit" },
  { id: "group", label: "Group", group: "Edit" },
  { id: "ungroup", label: "Ungroup", group: "Edit" },
  { id: "newDrawLayer", label: "New drawing layer", group: "Edit" },
  { id: "delete", label: "Delete selection", group: "Edit" },
  { id: "toolSelect", label: "Select tool", group: "Tools" },
  { id: "toolPan", label: "Pan tool", group: "Tools" },
  { id: "toolBrush", label: "Draw (pencil)", group: "Tools" },
  { id: "toolBucket", label: "Fill bucket", group: "Tools" },
];

export const DEFAULT_BINDINGS: Record<KeybindAction, string> = {
  undo: "mod+z",
  redo: "mod+shift+z",
  copy: "mod+c",
  cut: "mod+x",
  paste: "mod+v",
  duplicate: "mod+d",
  selectAll: "mod+a",
  group: "mod+g",
  ungroup: "mod+shift+g",
  newDrawLayer: "mod+n",
  delete: "delete",
  toolSelect: "alt+v",
  toolPan: "alt+h",
  toolBrush: "alt+b",
  toolBucket: "alt+g",
};

/** The base key of an event, layout-independent where it matters. */
function baseKey(e: KeyboardEvent): string | null {
  if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase(); // KeyV -> v
  if (e.code.startsWith("Digit")) return e.code.slice(5); // Digit1 -> 1
  if (e.key === " " || e.code === "Space") return "space";
  if (e.key === "Delete" || e.key === "Backspace") return "delete";
  if (e.key.startsWith("Arrow")) return e.key.toLowerCase();
  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return null; // a bare modifier
  return e.key.toLowerCase();
}

/** Normalize a keyboard event to a combo string, e.g. "mod+shift+g", "alt+v",
    "delete". Ctrl and Cmd both fold to "mod" so bindings are cross-platform. */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const base = baseKey(e);
  if (!base) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("mod");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(base);
  return parts.join("+");
}

/** Human-readable combo for display, e.g. "⌘ ⇧ G" or "Alt V". */
export function comboLabel(combo: string, mac: boolean): string {
  if (!combo) return "—";
  const map: Record<string, string> = {
    mod: mac ? "⌘" : "Ctrl",
    alt: mac ? "⌥" : "Alt",
    shift: "⇧",
    space: "Space",
    delete: "Delete",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  return combo
    .split("+")
    .map((p) => map[p] ?? p.toUpperCase())
    .join(" ");
}

interface KeybindsState {
  bindings: Record<KeybindAction, string>;
  setBinding: (action: KeybindAction, combo: string) => void;
  reset: () => void;
  /** The action bound to this event, if any. */
  match: (e: KeyboardEvent) => KeybindAction | null;
}

export const useKeybinds = create<KeybindsState>()(
  persist(
    (set, get) => ({
      bindings: { ...DEFAULT_BINDINGS },
      setBinding: (action, combo) =>
        set((s) => {
          const next = { ...s.bindings };
          // A combo can drive only one action — clear it off any other first.
          for (const k of Object.keys(next) as KeybindAction[]) if (next[k] === combo) next[k] = "";
          next[action] = combo;
          return { bindings: next };
        }),
      reset: () => set({ bindings: { ...DEFAULT_BINDINGS } }),
      match: (e) => {
        const combo = comboFromEvent(e);
        if (!combo) return null;
        const b = get().bindings;
        for (const k of Object.keys(b) as KeybindAction[]) if (b[k] && b[k] === combo) return k;
        return null;
      },
    }),
    {
      name: "asarayja:keybinds",
      skipHydration: true,
      // Merge stored bindings over defaults so a newly added action still gets
      // its default binding for existing users.
      merge: (persisted, current) => ({
        ...current,
        bindings: { ...DEFAULT_BINDINGS, ...((persisted as Partial<KeybindsState>)?.bindings ?? {}) },
      }),
    },
  ),
);
