"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloneLayers, getTemplate, packScreens } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import { obsCode, uid } from "@/lib/id";
import { completeTheme } from "@/lib/theme";
import type { DesignFile } from "@/lib/design-file";
import type { Layer, Project, Theme } from "@/lib/types";

interface ProjectsState {
  projects: Project[];
  folders: string[];
  /** False until localStorage has been read. Distinguishes "no projects yet"
      from "not loaded yet" — the editor needs that to avoid a false 404. */
  hydrated: boolean;
  markHydrated: () => void;
  /**
   * A template opened for editing but not yet saved. It lives here, out of the
   * `projects` list, so merely browsing into the editor never litters history
   * with untouched overlays. The editor promotes it to a real project the
   * moment the user actually edits something.
   */
  draft: Project | null;
  createDraft: (templateId: string, theme?: Theme) => Project | null;
  createFromTemplate: (templateId: string, theme?: Theme) => Project | null;
  upsert: (project: Project) => void;
  get: (id: string) => Project | undefined;
  getByObsCode: (code: string) => Project | undefined;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => Project | undefined;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setFolder: (id: string, folder: string | null) => void;
  addFolder: (name: string) => void;

  // --- packs: linked sibling screens sharing a packId ---
  /** Open a design as a pack: seed every sibling screen as a linked project.
      Returns the cover (packOrder 0) to open. */
  createPack: (anchorTemplateId: string, theme?: Theme) => Project | null;
  /** Delete every screen in a pack in one go (from the Projects grid, which
      shows one card per pack). */
  removePack: (packId: string) => void;
  /** Clone a whole pack into a fresh linked pack; returns the new cover to open. */
  duplicatePack: (packId: string) => Project | null;
  addScreenToPack: (packId: string, templateId: string) => Project | null;
  removeScreenFromPack: (id: string) => void;
  reorderPackScreen: (packId: string, id: string, toIndex: number) => void;
  renamePack: (packId: string, name: string) => void;
  /** Fan a theme out to every sibling of a pack (the one theme chokepoint). */
  syncPackTheme: (packId: string, theme: Theme) => void;
  /** Import a design file as a fresh pack; returns the cover to open. */
  importDesign: (file: DesignFile) => Project | null;
  packScreensOf: (packId: string) => Project[];
  packIds: () => string[];
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      folders: [],
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      draft: null,

      createDraft: (templateId, theme) => {
        const template = getTemplate(templateId);
        if (!template) return null;
        const now = Date.now();
        const draft: Project = {
          id: uid(),
          name: template.name,
          templateId,
          theme: theme ?? getPalette(template.paletteId).theme,
          layers: cloneLayers(template.layers),
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          favorite: false,
          folder: null,
          packId: uid(),
          packName: template.family ?? null,
          packOrder: 0,
          category: template.category ?? null,
        };
        set({ draft });
        return draft;
      },

      createFromTemplate: (templateId, theme) => {
        // A committed create (e.g. "New from template" in Projects) that
        // persists immediately.
        const template = getTemplate(templateId);
        if (!template) return null;
        const now = Date.now();
        const project: Project = {
          id: uid(),
          name: template.name,
          templateId,
          theme: theme ?? getPalette(template.paletteId).theme,
          layers: cloneLayers(template.layers),
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          favorite: false,
          folder: null,
          packId: uid(),
          packName: template.family ?? null,
          packOrder: 0,
          category: template.category ?? null,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      upsert: (project) =>
        set((s) => {
          const next = { ...project, updatedAt: Date.now() };
          // A draft being upserted has just been edited: promote it and clear
          // the draft slot so it isn't offered again.
          const draft = s.draft?.id === project.id ? null : s.draft;
          const i = s.projects.findIndex((p) => p.id === project.id);
          if (i === -1) return { projects: [next, ...s.projects], draft };
          const projects = s.projects.slice();
          projects[i] = next;
          return { projects, draft };
        }),

      get: (id) => {
        const { projects, draft } = get();
        return projects.find((p) => p.id === id) ?? (draft?.id === id ? draft : undefined);
      },
      getByObsCode: (code) => {
        const { projects, draft } = get();
        return projects.find((p) => p.obsCode === code) ?? (draft?.obsCode === code ? draft : undefined);
      },

      rename: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
        })),

      duplicate: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return undefined;
        const now = Date.now();
        const copy: Project = {
          ...structuredClone(source),
          id: uid(),
          name: `${source.name} copy`,
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          // A duplicate is a fresh standalone pack, never joins the source group.
          packId: uid(),
          packOrder: 0,
        };
        set((s) => ({ projects: [copy, ...s.projects] }));
        return copy;
      },

      remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      toggleFavorite: (id) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
        })),

      setFolder: (id, folder) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, folder } : p)) })),

      addFolder: (name) =>
        set((s) => (s.folders.includes(name) ? s : { folders: [...s.folders, name] })),

      createPack: (anchorTemplateId, theme) => {
        const anchor = getTemplate(anchorTemplateId);
        if (!anchor) return null;
        const now = Date.now();
        const packId = uid();
        const sharedTheme = theme ?? getPalette(anchor.paletteId).theme;
        const siblings = anchor.family ? packScreens(anchorTemplateId) : [anchor];
        const built: Project[] = siblings.map((t, i) => ({
          id: uid(),
          name: t.name,
          templateId: t.id,
          theme: sharedTheme,
          layers: cloneLayers(t.layers),
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          favorite: false,
          folder: null,
          packId,
          packName: anchor.family ?? anchor.name,
          packOrder: i,
          category: t.category ?? null,
        }));
        set((s) => ({ projects: [...built, ...s.projects] }));
        return built[0] ?? null;
      },

      removePack: (packId) =>
        set((s) => ({ projects: s.projects.filter((p) => p.packId !== packId) })),

      duplicatePack: (packId) => {
        const siblings = get()
          .projects.filter((p) => p.packId === packId)
          .sort((a, b) => a.packOrder - b.packOrder);
        if (siblings.length === 0) return null;
        const now = Date.now();
        const newPackId = uid();
        const copyName = siblings[0].packName ? `${siblings[0].packName} copy` : null;
        const copies: Project[] = siblings.map((src) => ({
          ...structuredClone(src),
          id: uid(),
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          packId: newPackId,
          packName: copyName ?? src.packName,
        }));
        set((s) => ({ projects: [...copies, ...s.projects] }));
        return copies[0] ?? null;
      },

      addScreenToPack: (packId, templateId) => {
        const template = getTemplate(templateId);
        if (!template) return null;
        const siblings = get().projects.filter((p) => p.packId === packId);
        if (siblings.length === 0) return null;
        const base = siblings[0];
        const now = Date.now();
        const project: Project = {
          id: uid(),
          name: template.name,
          templateId,
          theme: base.theme,
          layers: cloneLayers(template.layers),
          obsCode: obsCode(),
          createdAt: now,
          updatedAt: now,
          favorite: false,
          folder: base.folder,
          packId,
          packName: base.packName,
          packOrder: Math.max(...siblings.map((p) => p.packOrder)) + 1,
          category: template.category ?? null,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      removeScreenFromPack: (id) =>
        set((s) => {
          const target = s.projects.find((p) => p.id === id);
          const rest = s.projects.filter((p) => p.id !== id);
          if (!target?.packId) return { projects: rest };
          // Re-normalise packOrder across the remaining siblings.
          const order = rest
            .filter((p) => p.packId === target.packId)
            .sort((a, b) => a.packOrder - b.packOrder);
          const rank = new Map(order.map((p, i) => [p.id, i]));
          return {
            projects: rest.map((p) => (rank.has(p.id) ? { ...p, packOrder: rank.get(p.id)! } : p)),
          };
        }),

      reorderPackScreen: (packId, id, toIndex) =>
        set((s) => {
          const order = s.projects
            .filter((p) => p.packId === packId)
            .sort((a, b) => a.packOrder - b.packOrder);
          const from = order.findIndex((p) => p.id === id);
          if (from === -1) return s;
          const [moved] = order.splice(from, 1);
          order.splice(Math.max(0, Math.min(order.length, toIndex)), 0, moved);
          const rank = new Map(order.map((p, i) => [p.id, i]));
          return {
            projects: s.projects.map((p) => (rank.has(p.id) ? { ...p, packOrder: rank.get(p.id)! } : p)),
          };
        }),

      renamePack: (packId, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.packId === packId ? { ...p, packName: name, updatedAt: Date.now() } : p,
          ),
        })),

      syncPackTheme: (packId, theme) =>
        set((s) => {
          const json = JSON.stringify(theme);
          let changed = false;
          const projects = s.projects.map((p) => {
            if (p.packId !== packId || JSON.stringify(p.theme) === json) return p;
            changed = true;
            return { ...p, theme, updatedAt: Date.now() };
          });
          return changed ? { projects } : s;
        }),

      importDesign: (file) => {
        if (file?.kind !== "asarayja-design" || (file.version ?? 0) > 1) return null;
        const now = Date.now();
        const packId = uid();
        const theme = completeTheme(file.theme);
        const built: Project[] = [...file.screens]
          .sort((a, b) => a.packOrder - b.packOrder)
          .map((screen, i) => ({
            id: uid(),
            name: screen.name,
            templateId: screen.templateId,
            theme,
            layers: (screen.layers ?? []) as Layer[],
            obsCode: obsCode(),
            createdAt: now,
            updatedAt: now,
            favorite: false,
            folder: "My designs",
            packId,
            packName: file.name,
            packOrder: i,
            category: screen.category,
          }));
        if (built.length === 0) return null;
        set((s) => ({ projects: [...built, ...s.projects] }));
        return built[0];
      },

      packScreensOf: (packId) =>
        get()
          .projects.filter((p) => p.packId === packId)
          .sort((a, b) => a.packOrder - b.packOrder),

      packIds: () => {
        const seen: string[] = [];
        for (const p of get().projects) {
          if (p.packId && !seen.includes(p.packId)) seen.push(p.packId);
        }
        return seen;
      },
    }),
    {
      name: "asarayja:projects",
      version: 3,
      skipHydration: true,
      // v1 projects predate the sixteen-token system and the motion switch;
      // v3 adds the pack fields — a legacy project becomes a standalone screen.
      migrate: (persisted) => {
        const state = persisted as Pick<ProjectsState, "projects" | "folders">;
        for (const project of state?.projects ?? []) {
          project.theme = completeTheme(project.theme);
          project.animationsEnabled = project.animationsEnabled ?? true;
          project.packId = project.packId ?? null;
          project.packName = project.packName ?? null;
          project.packOrder = project.packOrder ?? 0;
          project.category = project.category ?? getTemplate(project.templateId)?.category ?? null;
        }
        return state;
      },
      // `hydrated` is derived at runtime, never read back from storage.
      // `draft` and `hydrated` are runtime-only, never written to storage.
      partialize: ({ projects, folders }) => ({ projects, folders }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
