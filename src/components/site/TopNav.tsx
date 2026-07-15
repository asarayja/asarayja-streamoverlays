"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FolderOpen, Shapes, UserRound } from "lucide-react";
import { cx } from "@/components/ui";
import { useProfileStore } from "@/store/profile";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/site/LangSwitch";

// The design gallery is the landing page (/) and the single catalog: browse by
// look, open a design to see every screen, create from the "new" section there.
const LINKS = [
  { href: "/", label: "Designs", icon: Shapes, match: ["/", "/designs"] },
  { href: "/projects", label: "Projects", icon: FolderOpen, match: ["/projects"] },
  { href: "/profile", label: "Channel profile", icon: UserRound, match: ["/profile"] },
];

export function TopNav() {
  const pathname = usePathname();
  const configured = useProfileStore((s) => s.configured);
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="Asarayja"
            width={32}
            height={32}
            priority
            className="size-8 rounded-lg shadow-[0_4px_16px_-4px_rgba(139,92,246,0.8)]"
          />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Asarayja <span className="hidden text-zinc-500 sm:inline">Stream Overlays</span>
          </span>
        </Link>

        <nav className="ml-0 flex items-center gap-0.5 sm:ml-2 sm:gap-1">
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
            return (
              <Link
                key={href}
                href={href}
                title={t(label)}
                className={cx(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
                  active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden sm:inline">{t(label)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {!configured && (
            <Link
              href="/profile"
              className="hidden items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-400/20 md:flex"
            >
              <span className="size-1.5 rounded-full bg-amber-400" />
              {t("Set up your channel profile")}
            </Link>
          )}
          <LangSwitch />
        </div>
      </div>
    </header>
  );
}
