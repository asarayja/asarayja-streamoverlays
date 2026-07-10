"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LayoutGrid, UserRound, Zap } from "lucide-react";
import { cx } from "@/components/ui";
import { useProfileStore } from "@/store/profile";

const LINKS = [
  { href: "/", label: "Templates", icon: LayoutGrid },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/profile", label: "Channel profile", icon: UserRound },
];

export function TopNav() {
  const pathname = usePathname();
  const configured = useProfileStore((s) => s.configured);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-glow shadow-[0_4px_16px_-4px_rgba(139,92,246,0.8)]">
            <Zap className="size-4 fill-white text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Asarayja <span className="text-zinc-500">Stream Overlays</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          {!configured && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-400/20"
            >
              <span className="size-1.5 rounded-full bg-amber-400" />
              Set up your channel profile
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
