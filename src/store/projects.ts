"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloneLayers, getTemplate } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import { obsCode, uid } from "@/lib/id";
import type { Project, Theme } from "@/lib/types";

interface ProjectsState {
  projects: Project[];
  folders: string[];
  /** False until localStorage has been read. Distinguishes "no projects yet"
      from "not loaded yet" — the editor needs that to avoid a false 404. */
  hydrated: boolean;
  markHydrated: () => void;
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

      createFromTemplate: (templateId, theme) => {
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
          const i = s.projects.findIndex((p) => p.id === project.id);
          if (i === -1) return { projects: [next, ...s.projects] };
          const projects = s.projects.slice();
          projects[i] = next;
          return { projects };
        }),

      get: (id) => get().projects.find((p) => p.id === id),
      getByObsCode: (code) => get().projects.find((p) => p.obsCode === code),

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
      version: 1,
      skipHydration: true,
      // `hydrated` is derived at runtime, never read back from storage.
      partialize: ({ projects, folders }) => ({ projects, folders }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
