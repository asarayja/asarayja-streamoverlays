"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useT } from "@/lib/i18n";

/** A floating "scroll to top" button that appears once you've scrolled down.
    Hidden on the editor and OBS pages, which don't scroll the window. */
export function BackToTop() {
  const t = useT();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show || pathname.startsWith("/editor") || pathname.startsWith("/live")) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("Back to top")}
      title={t("Back to top")}
      className="fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full border border-white/15 bg-ink-900/90 text-zinc-200 shadow-xl backdrop-blur transition-colors hover:border-brand-400/50 hover:text-white"
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
