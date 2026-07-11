"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI language. English is the default and the source of truth: every string in
 * the app is authored in English and used verbatim as its own translation key,
 * so a missing Norwegian entry falls back to readable English rather than a
 * broken key.
 */
export type Lang = "en" | "no";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
    }),
    { name: "asarayja:lang" },
  ),
);
