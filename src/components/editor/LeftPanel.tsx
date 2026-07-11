"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Bell,
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
import { TEMPLATES } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import { ContrastCheck } from "@/components/ContrastCheck";
import { HarmonyGenerator, PaletteGrid, ThemeTokens } from "@/components/ThemeEditor";
import { Button, Chip, Field, TextInput, cx } from "@/components/ui";
import { uid } from "@/lib/id";
import { fileToDataUrl } from "@/lib/image";
import { PLACEHOLDERS } from "@/lib/placeholders";
import { ANIMATION_PRESETS, DEFAULT_ANIMATION, DEFAULT_EFFECTS } from "@/lib/types";
import type { AnimationPreset, Layer, LayerPatch, LayerType, TextLayer } from "@/lib/types";
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

export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("layers");

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
            {label}
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
        title="Screens"
        subtitle="Every screen in this pack — switch, add or remove without leaving the editor."
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
                  {active && <span className="ml-1.5 text-[10px] text-brand-400">• editing</span>}
                </span>
                {siblings.length > 1 && (
                  <button
                    onClick={() => remove(s.id)}
                    className="shrink-0 text-zinc-600 transition-colors hover:text-red-400"
                    title="Remove screen"
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
            <Plus className="size-4" /> Add blank screen
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
      <PanelHeader title="Templates" subtitle="Swap the design. Your OBS link and project stay the same." />
      <div className="space-y-3 p-4">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" />
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
          <input
            type="checkbox"
            checked={adoptPalette}
            onChange={(e) => setAdoptPalette(e.target.checked)}
            className="size-3.5 accent-brand-500"
          />
          Also adopt the template&apos;s palette
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
const DECOR_PRESETS: Array<{ label: string; patch: LayerPatch }> = [
  { label: "Colour fill", patch: { shape: "rect", x: 0, y: 0, width: 1920, height: 1080, fill: "@secondary" } },
  { label: "Curved split", patch: { shape: "arcsplit", x: 0, y: 420, width: 1920, height: 660, fill: "@primary", cornerRadius: 180 } },
  { label: "Rectangle", patch: { shape: "rect", width: 320, height: 180, cornerRadius: 12, fill: "@primary" } },
  { label: "Ellipse", patch: { shape: "ellipse", width: 240, height: 240, fill: "@primary" } },
  { label: "Triangle", patch: { shape: "triangle", width: 220, height: 200, fill: "@accent" } },
  { label: "Hexagon", patch: { shape: "hexagon", width: 220, height: 220, fill: "@accent" } },
  { label: "Shard", patch: { shape: "shard", width: 240, height: 240, fill: "@accent" } },
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
];

function AddTab() {
  const addLayer = useEditorStore((s) => s.addLayer);

  return (
    <div>
      <PanelHeader title="Add layer" subtitle="New layers land in the middle of the canvas." />
      <div className="grid grid-cols-2 gap-2 p-4">
        {ADDABLE.map((type) => {
          const Icon = LAYER_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => addLayer(type)}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-4 text-[11px] font-medium capitalize text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
            >
              <Icon className="size-5 text-zinc-500" />
              {type}
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Decor</p>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
          Shapes with their own geometry. Every one takes its colour from a theme token, and the
          moon has a phase and craters you can edit.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DECOR_PRESETS.map(({ label, patch }) => (
            <button
              key={label}
              onClick={() => addLayer("shape", patch as Partial<Layer>)}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
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
      <PanelHeader title="Layers" subtitle={`${project.layers.length} layers · drag to reorder · top of list draws on top`} />

      <div className="flex gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <Button onClick={duplicateSelected} disabled={selectedIds.length === 0} className="flex-1 !px-2 !py-1.5 text-xs">
          <Copy className="size-3.5" />
          Duplicate
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
              draggable
              onDragStart={(e) => {
                setDragId(layer.id);
                e.dataTransfer.effectAllowed = "move";
              }}
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
              onDragEnd={() => {
                setDragId(null);
                setDropTarget(null);
              }}
              className={cx(
                "group flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 transition-colors active:cursor-grabbing",
                selected ? "bg-brand-500/15 ring-1 ring-brand-400/40" : "hover:bg-white/[0.04]",
                dragId === layer.id && "opacity-40",
                isDropTarget && !dropTarget!.below && "shadow-[0_-2px_0_0_theme(colors.brand.400)]",
                isDropTarget && dropTarget!.below && "shadow-[0_2px_0_0_theme(colors.brand.400)]",
              )}
            >
              <GripVertical className="size-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
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
                <IconAction title="Move up" disabled={index === project.layers.length - 1} onClick={() => reorder(layer.id, index + 1)}>
                  <ArrowUp className="size-3" />
                </IconAction>
                <IconAction title="Move down" disabled={index === 0} onClick={() => reorder(layer.id, index - 1)}>
                  <ArrowDown className="size-3" />
                </IconAction>
              </div>

              <IconAction title={layer.locked ? "Unlock" : "Lock"} onClick={() => toggleLock(layer.id)} active={layer.locked}>
                {layer.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              </IconAction>
              <IconAction title={layer.visible ? "Hide" : "Show"} onClick={() => toggleVisible(layer.id)}>
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
  if (!project) return null;

  return (
    <div>
      <PanelHeader
        title="Colors"
        subtitle="Layers reference tokens, not hex codes. Change a token and the whole overlay follows."
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

function TextTab() {
  const layer = useSelectedLayer();
  const addLayer = useEditorStore((s) => s.addLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const isText = layer?.type === "text";

  const insert = (token: string) => {
    if (!isText) return;
    updateLayer(layer.id, { text: `${(layer as TextLayer).text} ${token}`.trim() });
  };

  return (
    <div>
      <PanelHeader title="Text" subtitle={isText ? layer.name : "Select a text layer to edit it."} />

      <div className="space-y-4 p-4">
        <Button variant="primary" className="w-full" onClick={() => addLayer("text")}>
          <Type className="size-4" />
          Add text layer
        </Button>

        {isText && (
          <Field label="Content">
            <textarea
              value={(layer as TextLayer).text}
              onChange={(e) => updateLayer(layer.id, { text: e.target.value }, false)}
              onBlur={(e) => updateLayer(layer.id, { text: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500/60 focus:outline-none"
            />
          </Field>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Profile placeholders
          </p>
          <p className="mb-2.5 text-[11px] leading-relaxed text-zinc-600">
            These resolve from your channel profile every time the overlay renders.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.filter((p) => !["{{LOGO}}", "{{PROFILE_IMAGE}}"].includes(p.token)).map((p) => (
              <Chip key={p.token} onClick={() => insert(p.token)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Fonts</p>
          <div className="space-y-1">
            {FONTS.map((font) => (
              <button
                key={font.family}
                disabled={!isText}
                onClick={() => isText && updateLayer(layer.id, { fontFamily: font.family })}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-40",
                  isText && (layer as TextLayer).fontFamily === font.family
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-zinc-300 hover:bg-white/[0.04]",
                )}
              >
                <span style={{ fontFamily: `"${font.family}", sans-serif` }} className="truncate text-sm">
                  {font.family}
                </span>
                <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
                  {font.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Animations ------------------------------ */

function AnimateTab() {
  const layer = useSelectedLayer();
  const updateLayer = useEditorStore((s) => s.updateLayer);

  if (!layer) {
    return (
      <div>
        <PanelHeader title="Animations" />
        <p className="p-4 text-xs text-zinc-500">Select a layer to animate it.</p>
      </div>
    );
  }

  const set = (preset: AnimationPreset) =>
    updateLayer(layer.id, { animation: { ...layer.animation, preset } });

  return (
    <div>
      <PanelHeader title="Animations" subtitle={layer.name} />
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
            {preset}
          </button>
        ))}
      </div>
      <p className="px-4 pb-4 text-[11px] leading-relaxed text-zinc-600">
        Timing, easing and looping live in the Properties panel on the right. Press play in the
        timeline to preview.
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

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      try {
        // 1024 px: large enough for a full-bleed background at half canvas width.
        const dataUrl = await fileToDataUrl(file, 1024);
        setUploads((current) => [dataUrl, ...current]);
      } catch {
        setError(`Could not read ${file.name}`);
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
      <PanelHeader title="Uploads" subtitle="Images stay in your browser — nothing is uploaded to a server." />
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
          Choose images
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {uploads.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {uploads.map((src) => (
              <button
                key={src.slice(-32)}
                onClick={() => place(src)}
                className="checker aspect-square overflow-hidden rounded-lg border border-white/10 transition-colors hover:border-brand-400/60"
                title="Add to canvas"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Upload" className="size-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
