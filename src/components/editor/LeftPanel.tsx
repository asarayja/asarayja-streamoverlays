"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
  Film,
  Flag,
  GripVertical,
  AppWindow,
  Plus,
  Tag,
  Sticker,
  Image as ImageIcon,
  LayoutTemplate,
  Layers as LayersIcon,
  Lock,
  MessageSquare,
  Palette,
  PlusSquare,
  Share2,
  Sparkles,
  Square,
  Target,
  Trash2,
  Type,
  Unlock,
  Upload,
  Video,
  Wind,
} from "lucide-react";
import { FONTS } from "@/data/fonts";
import { importSprite } from "@/lib/sprite";
import { STARTERS, TEMPLATES } from "@/data/templates";
import { ICONS, ICON_GROUPS } from "@/data/icons";
import type { IconName } from "@/data/icons";
import { ICON_SOURCES, loadIconSource, searchIcons } from "@/data/icon-library";
import type { IconSource, LibIcon } from "@/data/icon-library";
import { getPalette } from "@/data/palettes";
import { ContrastCheck } from "@/components/ContrastCheck";
import { HarmonyGenerator, PaletteGrid, ThemeTokens } from "@/components/ThemeEditor";
import { Button, Chip, Field, TextInput, cx } from "@/components/ui";
import { uid } from "@/lib/id";
import { useT } from "@/lib/i18n";
import { resolveColor } from "@/lib/theme";
import { fileToDataUrl } from "@/lib/image";
import { PLACEHOLDERS } from "@/lib/placeholders";
import { ANIMATION_PRESETS, DEFAULT_ANIMATION, DEFAULT_EFFECTS } from "@/lib/types";
import type { AnimationPreset, Layer, LayerPatch, LayerType, TextLayer, Theme } from "@/lib/types";
import { SETTLED_TIME, useEditorStore, useSelectedLayer } from "@/store/editor";
import { useProjectsStore } from "@/store/projects";
import { useRenderProfile } from "@/store/profile";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";

type Tab = "screens" | "templates" | "add" | "layers" | "colors" | "text" | "animate" | "uploads";

const TABS: Array<{ id: Tab; label: string; icon: typeof LayersIcon }> = [
  { id: "screens", label: "Screens", icon: Film },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "add", label: "Add", icon: PlusSquare },
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "text", label: "Text", icon: Type },
  { id: "animate", label: "Animate", icon: Wind },
  { id: "uploads", label: "Uploads", icon: Upload },
];

const LAYER_ICONS: Record<LayerType, typeof Square> = {
  background: Square,
  shape: Square,
  flag: Flag,
  icon: Sticker,
  window: AppWindow,
  chip: Tag,
  text: Type,
  image: ImageIcon,
  logo: ImageIcon,
  frame: Square,
  camera: Video,
  chatbox: MessageSquare,
  alert: Bell,
  social: Share2,
  goal: Target,
  particle: Sparkles,
  video: Video,
  sprite: Film,
};

const ADDABLE: LayerType[] = [
  "text",
  "shape",
  "flag",
  "icon",
  "window",
  "chip",
  "image",
  "logo",
  "frame",
  "camera",
  "chatbox",
  "alert",
  "social",
  "goal",
  "particle",
];

function flagSwatch(stripes: string[]): string {
  const n = stripes.length;
  const stops = stripes
    .map((c, i) => `${c} ${((i / n) * 100).toFixed(2)}% ${(((i + 1) / n) * 100).toFixed(2)}%`)
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
}

export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("layers");
  const t = useT();

  return (
    <aside className="flex h-full w-[340px] shrink-0 border-r border-white/[0.06] bg-ink-900">
      <nav className="flex w-[68px] shrink-0 flex-col gap-0.5 border-r border-white/[0.06] p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[9px] font-medium transition-colors",
              tab === id ? "bg-brand-500/15 text-brand-400" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
            )}
          >
            <Icon className="size-[18px]" />
            {t(label)}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {tab === "screens" && <ScreensTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "add" && <AddTab />}
        {tab === "layers" && <LayersTab />}
        {tab === "colors" && <ColorsTab />}
        {tab === "text" && <TextTab />}
        {tab === "animate" && <AnimateTab />}
        {tab === "uploads" && <UploadsTab />}
      </div>
    </aside>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-white/[0.06] px-4 py-3.5">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{subtitle}</p>}
    </div>
  );
}

/* --------------------------------- Screens -------------------------------- */

function ScreensTab() {
  const project = useEditorStore((s) => s.project);
  const projects = useProjectsStore((s) => s.projects);
  const upsert = useProjectsStore((s) => s.upsert);
  const addScreenToPack = useProjectsStore((s) => s.addScreenToPack);
  const removeScreenFromPack = useProjectsStore((s) => s.removeScreenFromPack);
  const profile = useRenderProfile();
  const router = useRouter();
  const t = useT();

  if (!project) return null;
  const packId = project.packId;
  const siblings = packId
    ? projects.filter((p) => p.packId === packId).sort((a, b) => a.packOrder - b.packOrder)
    : [project];

  const goto = (id: string) => {
    if (id === project.id) return;
    upsert(project); // persist the current screen's edits before switching
    router.replace(`/editor?id=${id}`);
  };

  const addScreen = () => {
    if (!packId) return;
    upsert(project);
    const created = addScreenToPack(packId, "blank");
    if (created) router.replace(`/editor?id=${created.id}`);
  };

  const remove = (id: string) => {
    const next = siblings.find((x) => x.id !== id);
    removeScreenFromPack(id);
    if (id === project.id && next) router.replace(`/editor?id=${next.id}`);
  };

  return (
    <div>
      <PanelHeader
        title={t("Screens")}
        subtitle={t("Every screen in this pack — switch, add or remove without leaving the editor.")}
      />
      <div className="space-y-2.5 p-4">
        {siblings.map((s) => {
          const active = s.id === project.id;
          return (
            <div
              key={s.id}
              className={cx(
                "group overflow-hidden rounded-xl border transition-colors",
                active ? "border-brand-400" : "border-white/[0.06] hover:border-white/15",
              )}
            >
              <button onClick={() => goto(s.id)} className="block w-full text-left">
                <div className="checker relative aspect-video w-full">
                  <ClientOverlayStage
                    layers={active ? project.layers : s.layers}
                    theme={active ? project.theme : s.theme}
                    profile={profile}
                    time={SETTLED_TIME}
                    mode="preview"
                    width={292}
                  />
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="truncate text-[11px] font-medium text-zinc-300">
                  {s.name}
                  {active && <span className="ml-1.5 text-[10px] text-brand-400">• {t("editing")}</span>}
                </span>
                {siblings.length > 1 && (
                  <button
                    onClick={() => remove(s.id)}
                    className="shrink-0 text-zinc-600 transition-colors hover:text-red-400"
                    title={t("Remove screen")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {packId && (
          <button
            onClick={addScreen}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-[12px] font-medium text-zinc-400 transition-colors hover:border-brand-400/50 hover:text-white"
          >
            <Plus className="size-4" /> {t("Add blank screen")}
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Templates ------------------------------- */

function TemplatesTab() {
  const project = useEditorStore((s) => s.project);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const [adoptPalette, setAdoptPalette] = useState(false);
  const [query, setQuery] = useState("");
  const t = useT();

  // Show one card per design; the palette comes from the project, not the variant.
  const bases = useMemo(() => {
    const seen = new Set<string>();
    return TEMPLATES.filter((t) => {
      const base = t.id.split("--")[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    });
  }, []);

  const shown = bases.filter((t) =>
    `${t.name} ${t.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <PanelHeader title={t("Templates")} subtitle={t("Swap the design. Your OBS link and project stay the same.")} />
      <div className="space-y-3 p-4">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search…")} />
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
          <input
            type="checkbox"
            checked={adoptPalette}
            onChange={(e) => setAdoptPalette(e.target.checked)}
            className="size-3.5 accent-brand-500"
          />
          {t("Also adopt the template's palette")}
        </label>

        <div className="space-y-1">
          {shown.map((template) => {
            const active = project?.templateId.split("--")[0] === template.id.split("--")[0];
            const palette = getPalette(template.paletteId);
            return (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id, adoptPalette)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                  active
                    ? "border-brand-400/50 bg-brand-500/10"
                    : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]",
                )}
              >
                <span className="flex shrink-0 -space-x-1">
                  {[palette.theme.primary, palette.theme.accent].map((c) => (
                    <span key={c} className="size-4 rounded-full ring-2 ring-ink-900" style={{ background: c }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-200">{template.name}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{template.category}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- Add ---------------------------------- */

/**
 * Decor shapes worth reaching for directly. They are all `shape` layers, but
 * "add a shape then change its Kind to moon" is not a thing anyone discovers.
 */
const PRIDE_FLAGS: Array<{ label: string; stripes: string[] }> = [
  { label: "Rainbow", stripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"] },
  { label: "Progress", stripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982", "#FFFFFF", "#F5A9B8", "#5BCEFA", "#613915", "#2C2C2C"] },
  { label: "Trans", stripes: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"] },
  { label: "Bisexual", stripes: ["#D60270", "#D60270", "#9B4F96", "#0038A8", "#0038A8"] },
  { label: "Pansexual", stripes: ["#FF218C", "#FFD800", "#21B1FF"] },
  { label: "Lesbian", stripes: ["#D52D00", "#EF7627", "#FFFFFF", "#D162A4", "#A30262"] },
  { label: "Nonbinary", stripes: ["#FCF434", "#FFFFFF", "#9C59D1", "#2C2C2C"] },
  { label: "Asexual", stripes: ["#000000", "#A3A3A3", "#FFFFFF", "#800080"] },
  { label: "Genderfluid", stripes: ["#FF75A2", "#FFFFFF", "#BE18D6", "#000000", "#333EBD"] },
  { label: "Agender", stripes: ["#000000", "#B9B9B9", "#FFFFFF", "#B8F483", "#FFFFFF", "#B9B9B9", "#000000"] },
  { label: "Aromantic", stripes: ["#3DA542", "#A7D379", "#FFFFFF", "#A9A9A9", "#000000"] },
];

const DECOR_PRESETS: Array<{ label: string; patch: LayerPatch; type?: LayerType }> = [
  { label: "Colour fill", patch: { shape: "rect", x: 0, y: 0, width: 1920, height: 1080, fill: "@secondary" } },
  { label: "Curved split", patch: { shape: "arcsplit", x: 0, y: 420, width: 1920, height: 660, fill: "@primary", cornerRadius: 180 } },
  { label: "Wave split", patch: { shape: "wavesplit", x: 0, y: 430, width: 1920, height: 650, fill: "@primary", cornerRadius: 70 } },
  { label: "Diagonal split", patch: { shape: "diagonalsplit", x: 0, y: 0, width: 1920, height: 1080, fill: "@primary", cornerRadius: 240 } },
  { label: "Zigzag split", patch: { shape: "zigzagsplit", x: 0, y: 430, width: 1920, height: 650, fill: "@primary", cornerRadius: 60 } },
  { label: "Circle", patch: { shape: "ellipse", x: 660, y: 300, width: 600, height: 600, fill: "@primary" } },
  { label: "Rounded square", patch: { shape: "rect", x: 700, y: 340, width: 400, height: 400, cornerRadius: 64, fill: "@primary" } },
  { label: "Cross", patch: { shape: "cross", x: 760, y: 340, width: 360, height: 360, fill: "@accent" } },
  { label: "Gear", patch: { shape: "gear", x: 760, y: 340, width: 380, height: 380, fill: "@accent" } },
  { label: "Heart", patch: { shape: "heart", x: 760, y: 340, width: 380, height: 360, fill: "@accent" } },
  { label: "Checkmark", patch: { shape: "check", x: 760, y: 360, width: 340, height: 340, fill: "@accent" } },
  { label: "Progress ring", patch: { shape: "ring", x: 760, y: 340, width: 380, height: 380, cornerRadius: 74, fill: "@accent" } },
  {
    label: "Badge",
    patch: {
      shape: "burst",
      x: 760,
      y: 340,
      width: 380,
      height: 380,
      fill: "@accent",
      effects: { ...DEFAULT_EFFECTS, border: { enabled: true, color: "@text", width: 4, radius: 0 } },
    },
  },
  { label: "Arrow up", patch: { shape: "arrow", x: 810, y: 300, width: 300, height: 300, rotation: -90, fill: "@accent" } },
  { label: "Arrow down", patch: { shape: "arrow", x: 810, y: 300, width: 300, height: 300, rotation: 90, fill: "@accent" } },
  { label: "Arrow left", patch: { shape: "arrow", x: 760, y: 400, width: 400, height: 300, rotation: 180, fill: "@accent" } },
  {
    label: "Spotlight",
    patch: {
      shape: "ellipse",
      x: 560,
      y: 240,
      width: 800,
      height: 800,
      fill: "@primary",
      effects: { ...DEFAULT_EFFECTS, glow: { enabled: true, color: "@glow", strength: 80 } },
    },
  },
  {
    label: "Split — gradient",
    patch: {
      shape: "arcsplit",
      x: 0,
      y: 420,
      width: 1920,
      height: 660,
      fill: "@primary",
      cornerRadius: 180,
      effects: { ...DEFAULT_EFFECTS, gradient: { enabled: true, from: "@primary", to: "@accent", angle: 90 } },
    },
  },
  {
    label: "Split — plasma",
    patch: {
      shape: "arcsplit",
      x: 0,
      y: 420,
      width: 1920,
      height: 660,
      fill: "@primary",
      cornerRadius: 180,
      effects: { ...DEFAULT_EFFECTS, glow: { enabled: true, color: "@glow", strength: 60 } },
    },
  },
  { label: "Rectangle", patch: { shape: "rect", width: 320, height: 180, cornerRadius: 12, fill: "@primary" } },
  { label: "Ellipse", patch: { shape: "ellipse", width: 240, height: 240, fill: "@primary" } },
  { label: "Triangle", patch: { shape: "triangle", width: 220, height: 200, fill: "@accent" } },
  { label: "Hexagon", patch: { shape: "hexagon", width: 220, height: 220, fill: "@accent" } },
  { label: "Shard", patch: { shape: "shard", width: 240, height: 240, fill: "@accent" } },
  { label: "Star", patch: { shape: "star", width: 240, height: 240, fill: "@accent" } },
  {
    label: "Sunburst",
    patch: {
      shape: "burst",
      width: 360,
      height: 360,
      fill: "@accent",
      effects: { ...DEFAULT_EFFECTS, glow: { enabled: true, color: "@glow", strength: 24 } },
    },
  },
  { label: "Arrow", patch: { shape: "arrow", width: 300, height: 200, fill: "@accent" } },
  { label: "Lightning", patch: { shape: "bolt", width: 200, height: 320, fill: "@accent" } },
  { label: "Banner", patch: { shape: "banner", width: 520, height: 130, cornerRadius: 8, fill: "@primary" } },
  { label: "Speech bubble", patch: { shape: "bubble", width: 420, height: 260, cornerRadius: 28, fill: "@surface/92" } },
  {
    label: "Diamond plate",
    patch: {
      shape: "diamond",
      width: 460,
      height: 460,
      fill: "@surface/92",
      effects: {
        ...DEFAULT_EFFECTS,
        border: { enabled: true, color: "@accent", width: 3, radius: 0 },
        glow: { enabled: true, color: "@glow", strength: 26 },
      },
    },
  },
  {
    label: "Gem — glow",
    patch: {
      shape: "gem",
      width: 160,
      height: 160,
      fill: "@accent",
      effects: { ...DEFAULT_EFFECTS, glow: { enabled: true, color: "@glow", strength: 26 } },
    },
  },
  {
    label: "Gem — inset",
    patch: {
      shape: "gem",
      width: 160,
      height: 160,
      fill: "@accent",
      // No outer effect — just the diamond's own top-light / bottom-shadow.
      effects: { ...DEFAULT_EFFECTS },
    },
  },
  {
    label: "Gem — drop shadow",
    patch: {
      shape: "gem",
      width: 160,
      height: 160,
      fill: "@accent",
      effects: {
        ...DEFAULT_EFFECTS,
        shadow: { enabled: true, color: "@shadow", blur: 20, offsetX: 0, offsetY: 12, opacity: 0.7 },
      },
    },
  },
  { label: "Harlequin", patch: { shape: "harlequin", width: 1920, height: 1080, fill: "@primary/14" } },
  {
    label: "Liquid glass panel",
    patch: {
      shape: "rect",
      width: 520,
      height: 300,
      cornerRadius: 28,
      fill: "@text/10",
      effects: {
        ...DEFAULT_EFFECTS,
        border: { enabled: true, color: "@text/35", width: 2, radius: 28 },
        gloss: { enabled: true, strength: 0.6, style: "liquid" },
      },
    },
  },
  { label: "Line", patch: { shape: "line", width: 480, height: 6, fill: "@accent" } },
  { label: "Moon", patch: { shape: "moon", width: 220, height: 220, moonPhase: 1, craters: true, fill: "@accent" } },
  { label: "Crescent", patch: { shape: "crescent", width: 180, height: 180, fill: "@accent" } },
  { label: "Spiderweb", patch: { shape: "web", width: 300, height: 260, fill: "@accent/55", cornerRadius: 1.6 } },
  { label: "Chain", patch: { shape: "chain", width: 30, height: 300, fill: "@accent/80" } },
  { label: "Coffin", patch: { shape: "coffin", width: 260, height: 420, fill: "@surface/90" } },
  { label: "Graveyard", patch: { shape: "graveyard", width: 1920, height: 360, fill: "@background" } },
  { label: "Drip panel", patch: { shape: "drip", width: 520, height: 240, cornerRadius: 14, fill: "@primary" } },
  { label: "Plaque", patch: { shape: "plaque", width: 480, height: 160, fill: "@surface/92" } },
  { label: "Energy wave", patch: { shape: "wave", width: 900, height: 260, fill: "@accent" } },
  { label: "Hex mesh", patch: { shape: "hexmesh", width: 420, height: 360, fill: "@accent/40" } },
  { label: "Scanlines", patch: { shape: "scanlines", width: 420, height: 300, fill: "@accent/30" } },
  { label: "Carbon", patch: { shape: "carbon", width: 420, height: 300, fill: "@surface" } },
  { label: "Chamfer panel", patch: { shape: "chamfer", width: 360, height: 200, fill: "@surface/90" } },
  { label: "Paint splat", patch: { shape: "paintSplat", width: 520, height: 480, fill: "@primary" } },
  { label: "Spray splat", patch: { shape: "spraySplat", width: 560, height: 520, fill: "@primary" } },
  { label: "Concrete wall", patch: { shape: "concreteWall", width: 1920, height: 1080, fill: "@surface" } },
  // Pride patterns you can size to any part of the screen and rotate to any
  // direction: straight stripes (a flag layer) or bent into a curved band.
  ...PRIDE_FLAGS.flatMap(({ label, stripes }) => [
    {
      label: `Pride — ${label}`,
      type: "flag" as LayerType,
      patch: {
        stripes,
        stackDirection: "vertical",
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        cornerRadius: 0,
      } as LayerPatch,
    },
    {
      label: `Pride — ${label} (curved)`,
      patch: {
        shape: "flagarc",
        facetColors: stripes,
        x: 0,
        y: 220,
        width: 1920,
        height: 640,
        cornerRadius: 120,
      } as LayerPatch,
    },
    {
      label: `Pride — ${label} (waves)`,
      patch: {
        shape: "flagwave",
        facetColors: stripes,
        x: 0,
        y: 220,
        width: 1920,
        height: 640,
        cornerRadius: 80,
      } as LayerPatch,
    },
    {
      label: `Pride — ${label} (round)`,
      patch: {
        shape: "flaground",
        facetColors: stripes,
        x: 560,
        y: 60,
        width: 960,
        height: 960,
        cornerRadius: 0,
      } as LayerPatch,
    },
  ]),
];

// The decor list is long, so it is grouped: the panel first shows category
// buttons, and opening one reveals just that group's pieces — each rendered as a
// little live preview so you see what you get before placing it.
const DECOR_CATEGORIES = ["Shapes", "Blocks & splits", "Glow", "Gothic", "Textures", "Paint", "Pride"] as const;
type DecorCategory = (typeof DECOR_CATEGORIES)[number];

const DECOR_GROUP: Record<string, DecorCategory> = {
  "Colour fill": "Blocks & splits", "Curved split": "Blocks & splits", "Wave split": "Blocks & splits",
  "Diagonal split": "Blocks & splits", "Zigzag split": "Blocks & splits", "Split — gradient": "Blocks & splits",
  "Split — plasma": "Blocks & splits",
  "Circle": "Shapes", "Rounded square": "Shapes", "Cross": "Shapes", "Gear": "Shapes",
  "Heart": "Shapes", "Checkmark": "Shapes", "Progress ring": "Shapes", "Badge": "Shapes",
  "Arrow up": "Shapes", "Arrow down": "Shapes", "Arrow left": "Shapes",
  "Rectangle": "Shapes", "Ellipse": "Shapes", "Triangle": "Shapes", "Hexagon": "Shapes",
  "Shard": "Shapes", "Star": "Shapes", "Sunburst": "Shapes", "Arrow": "Shapes", "Lightning": "Shapes",
  "Banner": "Shapes", "Speech bubble": "Shapes", "Diamond plate": "Shapes", "Gem — glow": "Shapes",
  "Gem — inset": "Shapes", "Gem — drop shadow": "Shapes", "Line": "Shapes",
  "Spotlight": "Glow", "Energy wave": "Glow",
  "Moon": "Gothic", "Crescent": "Gothic", "Spiderweb": "Gothic", "Chain": "Gothic", "Coffin": "Gothic",
  "Graveyard": "Gothic", "Drip panel": "Gothic", "Plaque": "Gothic", "Harlequin": "Gothic",
  "Hex mesh": "Textures", "Scanlines": "Textures", "Carbon": "Textures", "Chamfer panel": "Textures",
  "Concrete wall": "Textures", "Liquid glass panel": "Textures",
  "Paint splat": "Paint", "Spray splat": "Paint",
};
const decorCategoryOf = (label: string): DecorCategory =>
  label.startsWith("Pride —") ? "Pride" : DECOR_GROUP[label] ?? "Shapes";

/** A decor piece rendered small over the family ground, so it's picked by sight. */
function DecorPreview({
  preset,
  theme,
  profile,
}: {
  preset: { patch: LayerPatch; type?: LayerType };
  theme: Theme;
  profile: ReturnType<typeof useRenderProfile>;
}) {
  const layers = useMemo<Layer[]>(() => {
    const base = {
      id: "d", name: "d", x: 0, y: 0, width: 400, height: 200, rotation: 0, opacity: 1,
      visible: true, locked: false, effects: structuredClone(DEFAULT_EFFECTS), animation: { ...DEFAULT_ANIMATION },
    };
    const bg = { ...base, id: "bg", type: "background", shape: "rect", fill: "@background", cornerRadius: 0, width: 1920, height: 1080 } as Layer;
    const item = { ...base, type: preset.type ?? "shape", shape: "rect", fill: "@primary", cornerRadius: 0, ...preset.patch } as Layer;
    return [bg, item];
  }, [preset]);
  return (
    <div className="checker relative aspect-video w-full overflow-hidden">
      <ClientOverlayStage layers={layers} theme={theme} profile={profile} time={SETTLED_TIME} mode="preview" width={148} />
    </div>
  );
}

/** h 0..360, s/l 0..1 → #rrggbb. */
function hslHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const BAND_SHAPES = [
  { id: "straight", label: "Straight" },
  { id: "diagonal", label: "Diagonal" },
  { id: "curved", label: "Curved" },
  { id: "waves", label: "Waves" },
  { id: "zigzag", label: "Zigzag" },
  { id: "round", label: "Round" },
  { id: "rays", label: "Rays" },
] as const;

/** Make N stripes in any colours + shape in one click. */
function NBandGenerator() {
  const addLayer = useEditorStore((s) => s.addLayer);
  const theme = useEditorStore((s) => s.project?.theme);
  const [count, setCount] = useState(6);
  const [shape, setShape] = useState<(typeof BAND_SHAPES)[number]["id"]>("straight");
  const [mode, setMode] = useState<"rainbow" | "theme">("rainbow");
  const t = useT();

  const build = () => {
    const stripes: string[] = [];
    if (mode === "rainbow") {
      for (let i = 0; i < count; i++) stripes.push(hslHex((i / count) * 300, 0.85, 0.52));
    } else {
      const toks = ["@primary", "@secondary", "@accent", "@accentSecondary", "@glow", "@text"];
      for (let i = 0; i < count; i++) {
        stripes.push(theme ? resolveColor(toks[i % toks.length], theme) : "#ffffff");
      }
    }
    if (shape === "straight" || shape === "diagonal") {
      addLayer("flag", {
        stripes,
        stackDirection: "vertical",
        // Diagonal = the striped flag turned 45°, oversized so it still covers.
        x: shape === "diagonal" ? -340 : 0,
        y: shape === "diagonal" ? -760 : 0,
        width: shape === "diagonal" ? 2600 : 1920,
        height: shape === "diagonal" ? 2600 : 1080,
        rotation: shape === "diagonal" ? 45 : 0,
        cornerRadius: 0,
      } as Partial<Layer>);
    } else if (shape === "round" || shape === "rays") {
      addLayer("shape", {
        shape: shape === "round" ? "flaground" : "flagrays",
        facetColors: stripes,
        x: 560,
        y: 60,
        width: 960,
        height: 960,
        cornerRadius: 0,
      } as Partial<Layer>);
    } else {
      const map = { curved: "flagarc", waves: "flagwave", zigzag: "flagzig" } as const;
      addLayer("shape", {
        shape: map[shape as "curved" | "waves" | "zigzag"],
        facetColors: stripes,
        x: 0,
        y: 220,
        width: 1920,
        height: 640,
        cornerRadius: shape === "curved" ? 120 : 80,
      } as Partial<Layer>);
    }
  };

  return (
    <div className="border-t border-white/[0.06] px-4 py-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Band generator")}</p>
      <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
        {t("Make N stripes in one click — rainbow or your theme, straight, curved, wavy or round.")}
      </p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="range"
          min={2}
          max={12}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="flex-1 accent-brand-400"
        />
        <span className="w-6 text-center font-mono text-[11px] text-zinc-400">{count}</span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {(["rainbow", "theme"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cx(
              "rounded-lg py-1.5 text-[11px] font-medium capitalize transition-colors",
              mode === m ? "bg-brand-500/25 text-brand-300" : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200",
            )}
          >
            {t(m)}
          </button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {BAND_SHAPES.map((sh) => (
          <button
            key={sh.id}
            onClick={() => setShape(sh.id)}
            className={cx(
              "rounded-lg py-1.5 text-[10px] font-medium transition-colors",
              shape === sh.id ? "bg-brand-500/25 text-brand-300" : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200",
            )}
          >
            {t(sh.label)}
          </button>
        ))}
      </div>
      <Button onClick={build} className="w-full">
        <PlusSquare className="size-3.5" />
        {t("Add {n} bands", { n: count })}
      </Button>
    </div>
  );
}

/** Search and place icons from the Lucide / Font Awesome libraries. The data is
    fetched lazily on first open, then filtered by name. */
function IconLibraryBrowser({ onPick }: { onPick: (ic: LibIcon) => void }) {
  const t = useT();
  const [source, setSource] = useState<IconSource>("lucide");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<LibIcon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    setLoading(true);
    loadIconSource(source).then((list) => {
      if (ok) {
        setAll(list);
        setLoading(false);
      }
    });
    return () => {
      ok = false;
    };
  }, [source]);

  const results = useMemo(() => searchIcons(all, query), [all, query]);
  const shown = results.slice(0, 300);

  return (
    <div>
      <div className="mb-2 flex gap-0.5 rounded-lg border border-white/10 bg-black/30 p-0.5">
        {ICON_SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={cx(
              "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              source === s.id ? "bg-brand-500/20 text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={loading ? t("Loading…") : t("Search {n} icons…", { n: all.length })}
        className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand-500/60 focus:outline-none"
      />
      {loading ? (
        <p className="py-8 text-center text-xs text-zinc-500">{t("Loading…")}</p>
      ) : (
        <>
          <div className="grid max-h-[420px] grid-cols-6 gap-1.5 overflow-y-auto pr-1">
            {shown.map((ic) => (
              <button
                key={ic.id}
                title={ic.name}
                onClick={() => onPick(ic)}
                className="grid aspect-square place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
              >
                <svg
                  viewBox={`0 0 ${ic.w} ${ic.h}`}
                  className="size-5"
                  dangerouslySetInnerHTML={{ __html: ic.body }}
                />
              </button>
            ))}
          </div>
          {results.length === 0 && <p className="py-6 text-center text-xs text-zinc-500">{t("No icons match.")}</p>}
          {results.length > shown.length && (
            <p className="mt-2 text-[11px] text-zinc-600">
              {t("Showing {a} of {b} — keep typing to narrow.", { a: shown.length, b: results.length })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function AddTab() {
  const addLayer = useEditorStore((s) => s.addLayer);
  const insertLayer = useEditorStore((s) => s.insertLayer);
  const insertStarter = useEditorStore((s) => s.insertStarter);
  const theme = useEditorStore((s) => s.project?.theme);
  const profile = useRenderProfile();
  const [openDecor, setOpenDecor] = useState<DecorCategory | null>(null);
  const [showIconLib, setShowIconLib] = useState(false);
  const t = useT();
  const imgInput = useRef<HTMLInputElement>(null);
  const spriteInput = useRef<HTMLInputElement>(null);

  const uploadSprite = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const s = await importSprite(file);
      addLayer("sprite", {
        name: s.name,
        src: s.src,
        cols: s.cols,
        rows: s.rows,
        frameCount: s.frameCount,
        fps: s.fps,
        width: s.width,
        height: s.height,
        removeBg: s.removeBg,
        chromaKey: s.chromaKey,
        chromaTolerance: s.chromaTolerance,
      });
    } catch {
      /* undecodable file — skip */
    }
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const src = await fileToDataUrl(file, 1024);
        insertLayer({
          id: uid(),
          name: file.name || "Image",
          type: "image",
          src,
          fit: "contain",
          cornerRadius: 0,
          x: 660,
          y: 340,
          width: 600,
          height: 400,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          effects: structuredClone(DEFAULT_EFFECTS),
          animation: { ...DEFAULT_ANIMATION },
        } as Layer);
      } catch {
        /* unreadable file — skip */
      }
    }
  };

  return (
    <div>
      <PanelHeader title={t("Add layer")} subtitle={t("New layers land in the middle of the canvas.")} />

      <div className="border-b border-white/[0.06] px-4 py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Ready pieces")}</p>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
          {t("Drop a ready-made scaffold onto the canvas — a webcam frame, panels, a chat box or a social bar — then make it yours.")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STARTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => insertStarter(s.id)}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 pb-2">
        {ADDABLE.map((type) => {
          const Icon = LAYER_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => addLayer(type)}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-4 text-[11px] font-medium capitalize text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
            >
              <Icon className="size-5 text-zinc-500" />
              {t(type)}
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-2">
        <input
          ref={imgInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadImages(e.target.files)}
        />
        <Button className="w-full" onClick={() => imgInput.current?.click()}>
          <Upload className="size-4" />
          {t("Upload image")}
        </Button>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
          {t("Your own images stay in your browser — nothing is uploaded to a server.")}
        </p>

        <input
          ref={spriteInput}
          type="file"
          accept="image/gif,image/apng,image/webp,image/png,image/*"
          className="hidden"
          onChange={(e) => void uploadSprite(e.target.files)}
        />
        <Button className="mt-2 w-full" onClick={() => spriteInput.current?.click()}>
          <Sparkles className="size-4" />
          {t("Import sprite / GIF")}
        </Button>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
          {t("Drop an animated GIF (auto-split into frames) or a sprite sheet. Set the grid, speed and movement on the right.")}
        </p>
      </div>

      <NBandGenerator />

      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Pride flags")}</p>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
          {t("Drop a flag bar onto the canvas, then move and resize it. Its stripes stay fixed to the flag you pick.")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRIDE_FLAGS.map((f) => (
            <button
              key={f.label}
              onClick={() => addLayer("flag", { stripes: f.stripes, cornerRadius: 6 } as Partial<Layer>)}
              className="flex items-center gap-2 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
              title={t("Add {name} flag bar", { name: f.label })}
            >
              <span className="h-5 w-8 shrink-0 rounded ring-1 ring-white/15" style={{ background: flagSwatch(f.stripes) }} />
              <span className="truncate">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          {openDecor && (
            <button
              onClick={() => setOpenDecor(null)}
              className="text-zinc-400 transition-colors hover:text-white"
              title={t("All categories")}
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t("Decor")}
            {openDecor && <span className="text-zinc-400"> · {t(openDecor)}</span>}
          </p>
        </div>

        {!openDecor ? (
          <>
            <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
              {t("Pick a category to see its pieces as previews, then place one.")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DECOR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setOpenDecor(cat)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-[11px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {DECOR_PRESETS.filter((p) => decorCategoryOf(p.label) === openDecor).map((preset) => (
              <button
                key={preset.label}
                onClick={() => addLayer(preset.type ?? "shape", preset.patch as Partial<Layer>)}
                className="group/decor overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-brand-400/40 hover:bg-brand-500/10"
                title={t("Add {name}", { name: t(preset.label) })}
              >
                {theme && <DecorPreview preset={preset} theme={theme} profile={profile} />}
                <span className="block truncate px-1.5 py-1 text-[11px] font-medium text-zinc-300 group-hover/decor:text-white">
                  {t(preset.label)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Icons")}</p>
          <button
            onClick={() => setShowIconLib((v) => !v)}
            className={cx(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              showIconLib
                ? "border-brand-400/60 bg-brand-500/15 text-white"
                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-brand-400/40 hover:text-white",
            )}
          >
            {showIconLib ? t("Built-in") : t("Icon library")}
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
          {showIconLib
            ? t("Thousands of Lucide, Tabler, Font Awesome, Phosphor (incl. duotone), Material & Game icons — search, then click to place. Each takes its colour from a theme token.")
            : t("Click one to drop it on the canvas. Icons take their colour from a theme token, like any other layer.")}
        </p>
        {showIconLib && (
          <IconLibraryBrowser
            onPick={(ic) =>
              addLayer("icon", { symbol: ic.id, body: ic.body, iconW: ic.w, iconH: ic.h } as Partial<Layer>)
            }
          />
        )}
        {!showIconLib && ICON_GROUPS.map(({ group, names }) => (
          <div key={group} className="mb-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">{t(group)}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {names.map((name) => {
                const def = ICONS[name as IconName];
                const outlined = "stroke" in def && def.stroke;
                return (
                  <button
                    key={name}
                    title={name}
                    onClick={() => addLayer("icon", { symbol: name } as Partial<Layer>)}
                    className="grid aspect-square place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-5">
                      <path
                        d={def.d}
                        fill={outlined ? "none" : "currentColor"}
                        stroke={outlined ? "currentColor" : undefined}
                        strokeWidth={outlined ? 2 * (("strokeScale" in def && def.strokeScale) || 1) : 0}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Layers -------------------------------- */

function LayersTab() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const toggleLock = useEditorStore((s) => s.toggleLock);
  const reorder = useEditorStore((s) => s.reorder);
  const setLayersOrder = useEditorStore((s) => s.setLayersOrder);
  const removeSelected = useEditorStore((s) => s.removeSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const renameLayer = useEditorStore((s) => s.renameLayer);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; below: boolean } | null>(null);
  const t = useT();

  if (!project) return null;

  // Topmost layer paints last, so the list reads top-down like every other editor.
  const ordered = [...project.layers].reverse();

  /** Commit a drag: rebuild the display order, then hand the reverse to the store. */
  const completeDrag = () => {
    if (dragId && dropTarget && dragId !== dropTarget.id) {
      const display = ordered.map((l) => l.id).filter((id) => id !== dragId);
      const at = display.indexOf(dropTarget.id);
      display.splice(dropTarget.below ? at + 1 : at, 0, dragId);
      setLayersOrder(display.reverse());
    }
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div>
      <PanelHeader title={t("Layers")} subtitle={t("{n} layers · drag to reorder · top of list draws on top", { n: project.layers.length })} />

      <div className="flex gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <Button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="flex-1 !px-2 !py-1.5 text-xs">
          <Copy className="size-3.5" />
          {t("Duplicate")}
        </Button>
        <Button variant="danger" onClick={removeSelected} disabled={selectedIds.length === 0} className="!px-2 !py-1.5 text-xs">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <ul className="p-2">
        {ordered.map((layer) => {
          const index = project.layers.indexOf(layer);
          const selected = selectedIds.includes(layer.id);
          const Icon = LAYER_ICONS[layer.type];

          const isDropTarget = dropTarget?.id === layer.id && dragId !== layer.id;
          return (
            <li
              key={layer.id}
              onClick={() => select([layer.id])}
              onDragOver={(e) => {
                if (!dragId || dragId === layer.id) return;
                e.preventDefault();
                const box = e.currentTarget.getBoundingClientRect();
                setDropTarget({ id: layer.id, below: e.clientY > box.top + box.height / 2 });
              }}
              onDrop={(e) => {
                e.preventDefault();
                completeDrag();
              }}
              className={cx(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                selected ? "bg-brand-500/15 ring-1 ring-brand-400/40" : "hover:bg-white/[0.04]",
                dragId === layer.id && "opacity-40",
                isDropTarget && !dropTarget!.below && "shadow-[0_-2px_0_0_theme(colors.brand.400)]",
                isDropTarget && dropTarget!.below && "shadow-[0_2px_0_0_theme(colors.brand.400)]",
              )}
            >
              {/* Only the grip is a drag source, so a click on the row selects
                  cleanly instead of accidentally starting a reorder. */}
              <span
                draggable
                onDragStart={(e) => {
                  setDragId(layer.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTarget(null);
                }}
                onClick={(e) => e.stopPropagation()}
                title={t("Drag to reorder")}
                className="shrink-0 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="size-3 text-zinc-700 group-hover:text-zinc-500" />
              </span>
              <Icon className={cx("size-3.5 shrink-0", selected ? "text-brand-400" : "text-zinc-600")} />

              {editingId === layer.id ? (
                <input
                  autoFocus
                  defaultValue={layer.name}
                  onBlur={(e) => {
                    renameLayer(layer.id, e.target.value.trim() || layer.name);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="min-w-0 flex-1 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white outline-none"
                />
              ) : (
                <button
                  onClick={() => select([layer.id])}
                  onDoubleClick={() => setEditingId(layer.id)}
                  className={cx(
                    "min-w-0 flex-1 truncate text-left text-xs",
                    layer.visible ? "text-zinc-300" : "text-zinc-600 line-through",
                  )}
                >
                  {layer.name}
                </button>
              )}

              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconAction title={t("Move up")} disabled={index === project.layers.length - 1} onClick={() => reorder(layer.id, index + 1)}>
                  <ArrowUp className="size-3" />
                </IconAction>
                <IconAction title={t("Move down")} disabled={index === 0} onClick={() => reorder(layer.id, index - 1)}>
                  <ArrowDown className="size-3" />
                </IconAction>
              </div>

              <IconAction title={layer.locked ? t("Unlock") : t("Lock")} onClick={() => toggleLock(layer.id)} active={layer.locked}>
                {layer.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              </IconAction>
              <IconAction title={layer.visible ? t("Hide") : t("Show")} onClick={() => toggleVisible(layer.id)}>
                {layer.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              </IconAction>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IconAction({
  children,
  onClick,
  title,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded p-1 transition-colors disabled:opacity-25",
        active ? "text-brand-400" : "text-zinc-500 hover:bg-white/10 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Colors -------------------------------- */

function ColorsTab() {
  const project = useEditorStore((s) => s.project);
  const setTheme = useEditorStore((s) => s.setTheme);
  const setThemePatch = useEditorStore((s) => s.setThemePatch);
  const t = useT();
  if (!project) return null;

  return (
    <div>
      <PanelHeader
        title={t("Colors")}
        subtitle={t("Layers reference tokens, not hex codes. Change a token and the whole overlay follows.")}
      />
      <div className="space-y-4 p-4">
        <PaletteGrid theme={project.theme} onApply={setTheme} />
        <HarmonyGenerator theme={project.theme} onApply={setTheme} />
        <div className="border-t border-white/[0.06] pt-4">
          <ContrastCheck theme={project.theme} onFix={setThemePatch} />
        </div>
        <div className="border-t border-white/[0.06] pt-4">
          <ThemeTokens theme={project.theme} onPatch={setThemePatch} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- Text --------------------------------- */

/** One-click 3D text looks — the front face is a solid or gradient fill, the
    sides run `color` → `colorTo`. Every one stays fully editable. */
const TEXT3D_PRESETS: Array<{ label: string; patch: Partial<Layer> }> = [
  {
    label: "Block",
    patch: {
      text: "BOLD", fontFamily: "Anton", fontWeight: 800, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@text",
      effects: { text3d: { enabled: true, depth: 26, angle: 45, color: "@accent" } },
    } as Partial<Layer>,
  },
  {
    label: "Gold",
    patch: {
      text: "GOLD", fontFamily: "Anton", fontWeight: 800, italic: true, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@text",
      effects: {
        gradient: { enabled: true, from: "#FFF6CF", via: "#F3CE6A", to: "#B9812A", angle: 90 },
        text3d: { enabled: true, depth: 26, angle: 45, color: "#C8901E", colorTo: "#5E3E10" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Cartoon",
    patch: {
      text: "YES!", fontFamily: "Baloo 2", fontWeight: 800, fontSize: 210, align: "center",
      x: 360, y: 400, width: 1200, height: 280, fill: "@text",
      effects: {
        shadow: { enabled: true, color: "@shadow", blur: 22, offsetX: 0, offsetY: 18, opacity: 0.4 },
        text3d: { enabled: true, depth: 32, angle: 62, color: "#F5A623", colorTo: "#B96F0E" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Script",
    patch: {
      text: "Self", fontFamily: "Pacifico", fontWeight: 400, fontSize: 200, align: "center",
      x: 360, y: 410, width: 1200, height: 260, fill: "@text",
      effects: { text3d: { enabled: true, depth: 24, angle: 62, color: "#7EC8F0", colorTo: "#2E7FB8" } },
    } as Partial<Layer>,
  },
  {
    label: "Neon",
    patch: {
      text: "NEON", fontFamily: "Anton", fontWeight: 800, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@accent",
      effects: {
        glow: { enabled: true, color: "@glow", strength: 34 },
        text3d: { enabled: true, depth: 22, angle: 45, color: "@accent-35" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Silver",
    patch: {
      text: "SILVER", fontFamily: "Anton", fontWeight: 800, italic: true, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@text",
      effects: {
        gradient: { enabled: true, from: "#FFFFFF", via: "#C9CFD8", to: "#868D99", angle: 90 },
        text3d: { enabled: true, depth: 26, angle: 45, color: "#AAB0BA", colorTo: "#464B54" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Candy",
    patch: {
      text: "CANDY", fontFamily: "Baloo 2", fontWeight: 800, fontSize: 200, align: "center",
      x: 360, y: 410, width: 1200, height: 260, fill: "#FF6FB5",
      effects: {
        shadow: { enabled: true, color: "@shadow", blur: 20, offsetX: 0, offsetY: 16, opacity: 0.35 },
        text3d: { enabled: true, depth: 28, angle: 60, color: "#8A3FD0", colorTo: "#3E1B7A" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Fire",
    patch: {
      text: "FIRE", fontFamily: "Anton", fontWeight: 800, italic: true, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@text",
      effects: {
        gradient: { enabled: true, from: "#FFE24A", via: "#FF8A2A", to: "#F0431E", angle: 90 },
        text3d: { enabled: true, depth: 26, angle: 45, color: "#A81E0E", colorTo: "#4E0A06" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Ice",
    patch: {
      text: "ICE", fontFamily: "Anton", fontWeight: 800, fontSize: 200, align: "center",
      x: 360, y: 420, width: 1200, height: 240, fill: "@text",
      effects: {
        gradient: { enabled: true, from: "#FFFFFF", to: "#BFE9FF", angle: 90 },
        text3d: { enabled: true, depth: 24, angle: 45, color: "#7FCFF2", colorTo: "#256E9E" },
      },
    } as Partial<Layer>,
  },
  {
    label: "Rainbow",
    patch: {
      text: "RAINBOW", fontFamily: "Anton", fontWeight: 800, fontSize: 180, align: "center",
      x: 260, y: 420, width: 1400, height: 240, fill: "@text",
      fillStripes: ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00A2FF", "#AF52DE"],
      effects: { text3d: { enabled: true, depth: 26, angle: 45, color: "@accent" } },
    } as Partial<Layer>,
  },
  {
    label: "Curved",
    patch: {
      text: "CURVE", fontFamily: "Anton", fontWeight: 800, fontSize: 150, align: "center",
      x: 360, y: 360, width: 1200, height: 360, fill: "@text", curve: 60,
      effects: { text3d: { enabled: true, depth: 20, angle: 45, color: "@accent" } },
    } as Partial<Layer>,
  },
];

function TextTab() {
  const layer = useSelectedLayer();
  const addLayer = useEditorStore((s) => s.addLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const isText = layer?.type === "text";
  const [fontQuery, setFontQuery] = useState("");
  const t = useT();

  const shownFonts = useMemo(() => {
    const q = fontQuery.trim().toLowerCase();
    return q
      ? FONTS.filter((f) => f.family.toLowerCase().includes(q) || f.category.includes(q))
      : FONTS;
  }, [fontQuery]);

  const insert = (token: string) => {
    if (!isText) return;
    updateLayer(layer.id, { text: `${(layer as TextLayer).text} ${token}`.trim() });
  };

  return (
    <div>
      <PanelHeader title={t("Text")} subtitle={isText ? layer.name : t("Select a text layer to edit it.")} />

      <div className="space-y-4 p-4">
        <Button variant="primary" className="w-full" onClick={() => addLayer("text")}>
          <Type className="size-4" />
          {t("Add text layer")}
        </Button>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("3D text")}</p>
          <p className="mb-2.5 text-[11px] leading-relaxed text-zinc-600">
            {t("Type any text — every side re-extrudes automatically. Front and sides can each be a gradient; tune it all in the panel on the right.")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEXT3D_PRESETS.map(({ label, patch }) => (
              <button
                key={label}
                onClick={() => addLayer("text", patch)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        {isText && (
          <Field label={t("Content")}>
            <textarea
              value={(layer as TextLayer).text}
              onChange={(e) => updateLayer(layer.id, { text: e.target.value }, false)}
              onBlur={(e) => updateLayer(layer.id, { text: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500/60 focus:outline-none"
            />
          </Field>
        )}

        {isText && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t("Profile placeholders")}
            </p>
            <p className="mb-2.5 text-[11px] leading-relaxed text-zinc-600">
              {t("Optional — insert one into the selected text (any text layer, not just 3D) and it auto-fills from your channel profile on every render. Leave them out for plain text.")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.filter((p) => !["{{LOGO}}", "{{PROFILE_IMAGE}}"].includes(p.token)).map((p) => (
                <Chip key={p.token} onClick={() => insert(p.token)}>
                  {t(p.label)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Fonts")}</p>
            <span className="text-[10px] text-zinc-600">{t("{n} fonts", { n: FONTS.length })}</span>
          </div>
          <input
            type="text"
            value={fontQuery}
            onChange={(e) => setFontQuery(e.target.value)}
            placeholder={t("Search fonts…")}
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand-500/60 focus:outline-none"
          />
          <div className="max-h-[440px] space-y-1 overflow-y-auto pr-1">
            {shownFonts.map((font) => {
              const active = isText && (layer as TextLayer).fontFamily === font.family;
              return (
                <button
                  key={font.family}
                  disabled={!isText}
                  onClick={() => isText && updateLayer(layer.id, { fontFamily: font.family })}
                  // content-visibility keeps 700 rows cheap: off-screen rows skip
                  // layout *and* their font download until scrolled into view.
                  style={{ contentVisibility: "auto", containIntrinsicSize: "auto 48px" }}
                  className={cx(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-40",
                    active
                      ? "bg-brand-500/15 ring-1 ring-brand-400/40"
                      : "hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    style={{ fontFamily: `"${font.family}", sans-serif` }}
                    className={cx("w-full truncate text-[19px] leading-tight", active ? "text-brand-300" : "text-zinc-100")}
                  >
                    {font.family}
                  </span>
                  <span className="flex w-full items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className="uppercase tracking-wider">{t(font.category)}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="truncate opacity-70" style={{ fontFamily: `"${font.family}", sans-serif` }}>
                      Handgloves 123
                    </span>
                  </span>
                </button>
              );
            })}
            {shownFonts.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-600">{t("No fonts match “{q}”.", { q: fontQuery })}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Animations ------------------------------ */

/** Presets that animate the glow effect, so picking one turns glow on. */
const GLOW_PRESETS = new Set<AnimationPreset>(["glow", "shimmer", "blink", "neon"]);

function AnimateTab() {
  const layer = useSelectedLayer();
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const t = useT();

  if (!layer) {
    return (
      <div>
        <PanelHeader title={t("Animations")} />
        <p className="p-4 text-xs text-zinc-500">{t("Select a layer to animate it.")}</p>
      </div>
    );
  }

  const set = (preset: AnimationPreset) => {
    const patch: LayerPatch = { animation: { ...layer.animation, preset } };
    // Glow-driven presets only show if there's a glow to pulse — light one up
    // automatically so blink/glow/neon work the moment they're picked.
    if (GLOW_PRESETS.has(preset) && !layer.effects.glow.enabled) {
      patch.effects = {
        ...layer.effects,
        glow: { ...layer.effects.glow, enabled: true, strength: layer.effects.glow.strength || 24 },
      };
    }
    updateLayer(layer.id, patch);
  };

  return (
    <div>
      <PanelHeader title={t("Animations")} subtitle={layer.name} />
      <div className="grid grid-cols-2 gap-2 p-4">
        {ANIMATION_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => set(preset)}
            className={cx(
              "rounded-xl border py-3 text-xs font-medium capitalize transition-colors",
              layer.animation.preset === preset
                ? "border-brand-400/50 bg-brand-500/15 text-brand-400"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:text-zinc-200",
            )}
          >
            {t(preset)}
          </button>
        ))}
      </div>
      <p className="px-4 pb-4 text-[11px] leading-relaxed text-zinc-600">
        {t("Timing, easing and looping live in the Properties panel on the right. Press play in the timeline to preview.")}
      </p>
    </div>
  );
}

/* --------------------------------- Uploads -------------------------------- */

function UploadsTab() {
  const insertLayer = useEditorStore((s) => s.insertLayer);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [error, setError] = useState("");
  const t = useT();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      try {
        // 1024 px: large enough for a full-bleed background at half canvas width.
        const dataUrl = await fileToDataUrl(file, 1024);
        setUploads((current) => [dataUrl, ...current]);
      } catch {
        setError(t("Could not read {name}", { name: file.name }));
      }
    }
  };

  const place = (src: string) => {
    insertLayer({
      id: uid(),
      name: "Upload",
      type: "image",
      src,
      fit: "contain",
      cornerRadius: 0,
      x: 660,
      y: 340,
      width: 600,
      height: 400,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      effects: structuredClone(DEFAULT_EFFECTS),
      animation: { ...DEFAULT_ANIMATION },
    } as Layer);
  };

  return (
    <div>
      <PanelHeader title={t("Uploads")} subtitle={t("Images stay in your browser — nothing is uploaded to a server.")} />
      <div className="space-y-3 p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button variant="primary" className="w-full" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          {t("Choose images")}
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {uploads.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {uploads.map((src) => (
              <button
                key={src.slice(-32)}
                onClick={() => place(src)}
                className="checker aspect-square overflow-hidden rounded-lg border border-white/10 transition-colors hover:border-brand-400/60"
                title={t("Add to canvas")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={t("Upload")} className="size-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
