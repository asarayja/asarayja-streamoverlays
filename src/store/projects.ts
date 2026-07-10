"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloneLayers, getTemplate } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import { obsCode, uid } from "@/lib/id";
import { completeTheme } from "@/lib/theme";
import type { Project, Theme } from "@/lib/types";

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
    }),
    {
      name: "asarayja:projects",
      version: 2,
      skipHydration: true,
      // v1 projects predate the sixteen-token system and the motion switch.
      migrate: (persisted) => {
        const state = persisted as Pick<ProjectsState, "projects" | "folders">;
        for (const project of state?.projects ?? []) {
          project.theme = completeTheme(project.theme);
          project.animationsEnabled = project.animationsEnabled ?? true;
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
