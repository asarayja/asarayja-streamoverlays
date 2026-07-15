"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { useFavorites } from "@/store/favorites";
import { useKeybinds } from "@/store/keybinds";

/**
 * The persisted stores are created with `skipHydration` so that the server
 * render and the first client render agree. Reading localStorage here — after
 * mount — swaps in the real data without a hydration mismatch.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useProfileStore.persist.rehydrate();
    void useProjectsStore.persist.rehydrate();
    void useFavorites.persist.rehydrate();
    void useKeybinds.persist.rehydrate();
  }, []);
  return null;
}
