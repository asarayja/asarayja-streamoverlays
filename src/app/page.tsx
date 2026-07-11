"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Palette, PenTool, Search, Upload, Wand2 } from "lucide-react";
import { PALETTES } from "@/data/palettes";
import { TEMPLATES } from "@/data/templates";
import { TemplateCard } from "@/components/gallery/TemplateCard";
import { RecentProjects } from "@/components/gallery/RecentProjects";
import { MyDesigns } from "@/components/gallery/MyDesigns";
import { TopNav } from "@/components/site/TopNav";
import { Button, Chip, Select, TextInput, cx } from "@/components/ui";
import { useProfileStore, useRenderProfile } from "@/store/profile";
import { useProjectsStore } from "@/store/projects";
import { GOTHIC_STYLES, PRIDE_STYLES, STYLE_TAGS, TEMPLATE_CATEGORIES } from "@/lib/types";
import type { Collection, StyleTag, Template, TemplateCategory } from "@/lib/types";

const PAGE_SIZE = 24;

export default function GalleryPage() {
  const router = useRouter();
  const profile = useRenderProfile();
  const brandTheme = useProfileStore((s) => s.profile.theme);
  const profileConfigured = useProfileStore((s) => s.configured);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const createDraft = useProjectsStore((s) => s.createDraft);
  const importDesign = useProjectsStore((s) => s.importDesign);
  const importRef = useRef<HTMLInputElement>(null);

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.kind !== "asarayja-design") {
        alert("That isn't an Asarayja design file.");
        return;
      }
      const cover = importDesign(parsed);
      if (cover) router.push(`/editor?id=${cover.id}`);
    } catch {
      alert("Could not read that design file.");
    }
  };

  // Channel profile comes first. A brand-new visitor is sent to fill it in;
  // once it exists it is remembered, and every later visit lands here on the
  // gallery. Gated on `hydrated` so a returning user never flashes a redirect.
  useEffect(() => {
    if (profileHydrated && !profileConfigured) router.replace("/profile");
  }, [profileHydrated, profileConfigured, router]);

  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const [collection, setCollection] = useState<Collection | "all">("all");
  const [subStyle, setSubStyle] = useState<string>("all");
  const [tags, setTags] = useState<StyleTag[]>([]);
  const [paletteId, setPaletteId] = useState("all");
  const [query, setQuery] = useState("");
  const [useBrand, setUseBrand] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (collection !== "all" && t.collection !== collection) return false;
      if (collection !== "all" && subStyle !== "all" && t.subStyle !== subStyle) return false;
      if (category !== "All" && t.category !== category) return false;
      if (paletteId !== "all" && t.paletteId !== paletteId) return false;
      if (tags.length > 0 && !tags.every((tag) => t.tags.includes(tag))) return false;
      if (needle && !`${t.name} ${t.category}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [collection, subStyle, category, tags, paletteId, query]);

  const shown = filtered.slice(0, visible);
  const resetPaging = () => setVisible(PAGE_SIZE);

  const toggleTag = (tag: StyleTag) => {
    resetPaging();
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  const open = (template: Template) => {
    // Opening a template makes a draft, not a saved project. It only enters
    // history once you actually edit it — browsing never clutters the list.
    const project = createDraft(template.id, useBrand ? brandTheme : undefined);
    if (project) router.push(`/editor?id=${project.id}`);
  };

  const openBlank = () => {
    const project = createDraft("blank", useBrand ? brandTheme : undefined);
    if (project) router.push(`/editor?id=${project.id}`);
  };

  const clearAll = () => {
    setTags([]);
    setCollection("all");
    setSubStyle("all");
    setCategory("All");
    setPaletteId("all");
    setQuery("");
    resetPaging();
  };

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 pb-24">
        <section className="py-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400">
            <Wand2 className="size-3.5 text-brand-400" />
            {TEMPLATES.length} templates · {PALETTES.length} palettes · one channel profile
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            <span className="gradient-text">Professional stream overlays</span>
            <br />
            <span className="text-white">in under five minutes.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-400">
            Everything is free, every template works as a still or animated. Fill in your channel
            details once — every design picks up your name, logo and socials automatically.
          </p>
        </section>

        <RecentProjects />

        <MyDesigns />

        <div className="sticky top-16 z-30 -mx-6 mb-8 border-y border-white/[0.06] bg-ink-950/85 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
              <TextInput
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPaging();
                }}
                placeholder="Search templates…"
                className="pl-9"
              />
            </div>

            <Button onClick={openBlank} title="Open an empty canvas and build from scratch">
              <PenTool className="size-3.5" />
              Start from scratch
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFile}
            />
            <Button onClick={() => importRef.current?.click()} title="Import a design file (.asarayja-design.json)">
              <Upload className="size-3.5" />
              Import design
            </Button>

            <div className="w-40">
              <Select
                value={collection}
                onChange={(e) => {
                  setCollection(e.target.value as Collection | "all");
                  setSubStyle("all");
                  resetPaging();
                }}
              >
                <option value="all">All collections</option>
                <option value="core">Core</option>
                <option value="gothic">Gothic</option>
                <option value="pride">Pride</option>
              </Select>
            </div>

            <div className="w-44">
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as TemplateCategory | "All");
                  resetPaging();
                }}
              >
                <option value="All">All categories</option>
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Select
                value={paletteId}
                onChange={(e) => {
                  setPaletteId(e.target.value);
                  resetPaging();
                }}
              >
                <option value="all">All palettes</option>
                {PALETTES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <button
              onClick={() => setUseBrand((v) => !v)}
              title="Preview every template using the colours from your channel profile"
              className={cx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                useBrand
                  ? "border-brand-400/50 bg-brand-500/15 text-brand-400"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Palette className="size-3.5" />
              My brand colours
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {STYLE_TAGS.map((tag) => (
              <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
            {tags.length > 0 && <Chip onClick={() => { setTags([]); resetPaging(); }}>Clear ×</Chip>}
          </div>

          {(collection === "gothic" || collection === "pride") && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {collection === "gothic" ? "Gothic style" : "Pride style"}
              </span>
              <Chip active={subStyle === "all"} onClick={() => { setSubStyle("all"); resetPaging(); }}>
                All
              </Chip>
              {(collection === "gothic" ? GOTHIC_STYLES : PRIDE_STYLES).map((style) => (
                <Chip
                  key={style}
                  active={subStyle === style}
                  onClick={() => {
                    setSubStyle(style);
                    resetPaging();
                  }}
                >
                  {style}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <p className="mb-5 text-xs text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "template" : "templates"}
        </p>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <p className="text-sm text-zinc-400">No templates match those filters.</p>
            <Button className="mt-4" onClick={clearAll}>
              Reset filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                profile={profile}
                theme={useBrand ? brandTheme : undefined}
                onOpen={open}
              />
            ))}
          </div>
        )}

        {visible < filtered.length && (
          <div className="mt-14 text-center">
            <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Load {Math.min(PAGE_SIZE, filtered.length - visible)} more
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
