"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Starred designs, kept in the browser. Projects have their own favourite flag;
 * this is the equivalent for the design gallery. Created with `skipHydration`
 * and rehydrated by StoreHydrator, like the other persisted stores.
 */
interface FavoritesState {
  /** Set-like map of starred design keys. */
  designs: Record<string, true>;
  toggleDesign: (key: string) => void;
  isFavorite: (key: string) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      designs: {},
      toggleDesign: (key) =>
        set((s) => {
          const next = { ...s.designs };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { designs: next };
        }),
      isFavorite: (key) => !!get().designs[key],
    }),
    { name: "asarayja:favorites", skipHydration: true },
  ),
);
