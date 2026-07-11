"use client";

import { Languages } from "lucide-react";
import { cx } from "@/components/ui";
import { useLangStore, type Lang } from "@/store/lang";

const OPTIONS: Array<{ id: Lang; label: string }> = [
  { id: "en", label: "EN" },
  { id: "no", label: "NO" },
];

/**
 * English / Norwegian switch. English is the default; the choice persists in
 * localStorage and every `useT()` consumer re-renders when it changes.
 */
export function LangSwitch() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5"
      role="group"
      aria-label="Language"
    >
      <Languages className="ml-1.5 size-3.5 text-zinc-500" />
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setLang(o.id)}
          aria-pressed={lang === o.id}
          className={cx(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            lang === o.id ? "bg-brand-500/20 text-brand-300" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
