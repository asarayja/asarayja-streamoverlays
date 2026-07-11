"use client";

import { useCallback } from "react";
import { useLangStore } from "@/store/lang";
import { NO } from "@/data/translations";

/** Replace `{name}` placeholders in a string with the given values. */
function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Translate hook. Returns `t(englishText, vars?)`:
 *  - English is the key. In English mode the text is returned as authored.
 *  - In Norwegian mode it is looked up in the NO map, falling back to the
 *    English source if no translation exists yet.
 *  - `{name}` placeholders are filled from `vars`, in either language.
 *
 * Usage: `const t = useT(); ... {t("Designs")} ... {t("{n} screens", { n })}`.
 */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return useCallback(
    (en: string, vars?: Record<string, string | number>) => {
      const base = lang === "no" ? NO[en] ?? en : en;
      return interpolate(base, vars);
    },
    [lang],
  );
}
