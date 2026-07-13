"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Group as GroupIcon,
  MousePointerSquareDashed,
  Ungroup,
} from "lucide-react";
import {
  Button,
  ColorInput,
  Field,
  Section,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
  cx,
} from "@/components/ui";
import { resolveColor } from "@/lib/theme";
import { ANIMATION_PRESETS, EASINGS } from "@/lib/types";
import { ICON_GROUPS, ICONS } from "@/data/icons";
import type { IconName } from "@/data/icons";
import type {
  AlertLayer,
  AnimationPreset,
  ChatBoxLayer,
  ChipLayer,
  IconLayer,
  WindowLayer,
  Easing,
  Effects,
  FlagLayer,
  FrameLayer,
  GoalLayer,
  ImageLayer,
  Layer,
  BlendMode,
  LayerPatch,
  ParticleKind,
  ParticleLayer,
  ShapeKind,
  ShapeLayer,
  SocialLayer,
  Text3D,
  TextLayer,
  Theme,
} from "@/lib/types";

const SHAPE_KINDS: ShapeKind[] = ["rect", "ellipse", "triangle", "hexagon", "diamond", "star", "gem", "cross", "gear", "heart", "check", "ring", "arrow", "banner", "bubble", "line", "moon", "crescent", "coffin", "plaque", "scanlines", "web", "drip", "graveyard", "chain", "shard", "hexmesh", "wave", "chamfer", "carbon", "flagarc", "flagwave", "flaground", "flagrays", "flagzig"];
const PARTICLE_KINDS: ParticleKind[] = ["dots", "stars", "embers", "snow", "bubbles", "bats", "moths", "petals", "fog", "confetti", "hearts", "rays", "clouds", "shootingStars", "blobs", "ghosts", "bokeh"];
// Shapes coloured by a list of `facetColors` (a pride flag, a gradient) rather
// than a single fill. The pure flag bands ignore `fill` entirely.
const BLEND_MODES: BlendMode[] = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
const FLAG_SHAPES = new Set<ShapeKind>(["flagarc", "flagwave", "flaground", "flagrays", "flagzig"]);
const FACET_SHAPES = new Set<ShapeKind>([...FLAG_SHAPES, "flagwaves", "glasssheet", "auroraField", "bloomVeil"]);
import { useEditorStore, useSelectedLayer } from "@/store/editor";
import { useT } from "@/lib/i18n";

/** Presets that drive the glow effect — picking one enables glow. */
const GLOW_ANIM_PRESETS = new Set<AnimationPreset>(["glow", "shimmer", "blink", "neon"]);

/** Colour sets for the "multi-colour letters" toggle — each letter cycles the
    palette. The first is the default when the toggle is switched on. */
const MULTI_LETTER_PALETTES: Array<{ label: string; colors: string[] }> = [
  // Rainbow + pride flags (authentic stripe colours).
  { label: "Rainbow", colors: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787"] },
  { label: "Progress", colors: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787", "#FFFFFF", "#FFAFC8", "#74D7EE", "#613915", "#000000"] },
  { label: "Trans", colors: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"] },
  { label: "Lesbian", colors: ["#D52D00", "#FF9A56", "#FFFFFF", "#D362A4", "#A30262"] },
  { label: "Bisexual", colors: ["#D60270", "#9B4F96", "#0038A8"] },
  { label: "Pansexual", colors: ["#FF218C", "#FFD800", "#21B1FF"] },
  { label: "Nonbinary", colors: ["#FCF434", "#FFFFFF", "#9C59D1", "#2C2C2C"] },
  { label: "Asexual", colors: ["#000000", "#A3A3A3", "#FFFFFF", "#800080"] },
  { label: "Genderfluid", colors: ["#FF75A2", "#FFFFFF", "#BE18D6", "#000000", "#333EBD"] },
  { label: "Aromantic", colors: ["#3DA542", "#A7D379", "#FFFFFF", "#A9A9A9", "#000000"] },
  // Colour moods.
  { label: "Warm", colors: ["#FF4E50", "#FC913A", "#F9D423", "#FF6A00"] },
  { label: "Cool", colors: ["#00C6FB", "#005BEA", "#43E97B", "#38F9D7"] },
  { label: "Pastel", colors: ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#D5BAFF"] },
  { label: "Neon", colors: ["#FF00A0", "#00FFF0", "#FFF700", "#00FF66", "#B400FF"] },
  { label: "Fire", colors: ["#FFF200", "#FFB300", "#FF6A00", "#FF2600", "#C1121F"] },
  { label: "Ocean", colors: ["#013A63", "#2A6F97", "#61A5C2", "#A9D6E5"] },
  { label: "Candy", colors: ["#FF6FB5", "#FF9AD5", "#C77DFF", "#9D4EDD", "#5A189A"] },
  { label: "Sunset", colors: ["#F9C74F", "#F8961E", "#F3722C", "#F94144", "#9D4EDD"] },
  { label: "Forest", colors: ["#1B4332", "#2D6A4F", "#40916C", "#74C69D", "#B7E4C7"] },
  { label: "Vaporwave", colors: ["#FF71CE", "#B967FF", "#01CDFE", "#05FFA1", "#FFFB96"] },
  { label: "Gold", colors: ["#7A5210", "#B9812A", "#F3CE6A", "#FFF6CF", "#B9812A"] },
  { label: "Grayscale", colors: ["#FFFFFF", "#C7CDD6", "#8A9099", "#4A4E55", "#1A1A22"] },
];
const MULTI_LETTER_COLORS = MULTI_LETTER_PALETTES[0].colors;

export function RightPanel() {
  const t = useT();
  const layer = useSelectedLayer();
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const beginGesture = useEditorStore((s) => s.beginGesture);
  const copyStyle = useEditorStore((s) => s.copyStyle);
  const pasteStyle = useEditorStore((s) => s.pasteStyle);
  const hasStyle = useEditorStore((s) => s.styleClipboard !== null);

  if (!project) return null;

  if (!layer) {
    return (
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-ink-900">
        {selectedIds.length > 1 && <ArrangeControls />}
        {selectedIds.length > 1 && <MultiAnimationSpeed />}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <MousePointerSquareDashed className="size-8 text-zinc-700" />
          <p className="text-sm font-medium text-zinc-400">
            {selectedIds.length > 1 ? t("{n} layers selected", { n: selectedIds.length }) : t("Nothing selected")}
          </p>
          <p className="text-xs leading-relaxed text-zinc-600">
            {selectedIds.length > 1
              ? t("Align, distribute or group the selected layers above.")
              : t("Click a layer on the canvas or in the Layers panel.")}
          </p>
        </div>
      </aside>
    );
  }

  const theme = project.theme;
  /** Live edit — folded into the history entry opened by `beginGesture`. */
  const live = (patch: LayerPatch) => updateLayer(layer.id, patch, false);
  /** Discrete edit — one undoable step. */
  const commit = (patch: LayerPatch) => updateLayer(layer.id, patch);
  const patchEffects = (patch: Partial<Effects>, discrete = true) =>
    updateLayer(layer.id, { effects: { ...layer.effects, ...patch } }, discrete);

  return (
    <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-white/[0.06] bg-ink-900">
      <div className="border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              {layer.type}
            </p>
            <h2 className="truncate text-sm font-semibold text-zinc-100">{layer.name}</h2>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={copyStyle}
              title={t("Copy style (colour, effects, blend, type)")}
              className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white"
            >
              {t("Copy style")}
            </button>
            <button
              onClick={pasteStyle}
              disabled={!hasStyle}
              title={t("Paste style onto the selected layer(s)")}
              className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white disabled:opacity-30"
            >
              {t("Paste")}
            </button>
          </div>
        </div>
      </div>

      <Section title={t("Transform")}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label={t("X")} value={layer.x} onChange={(x) => commit({ x })} />
          <NumberField label={t("Y")} value={layer.y} onChange={(y) => commit({ y })} />
          <NumberField label={t("Width")} value={layer.width} min={8} onChange={(width) => commit({ width })} />
          <NumberField label={t("Height")} value={layer.height} min={8} onChange={(height) => commit({ height })} />
        </div>
        <Slider
          label={t("Rotation")}
          suffix="°"
          min={-180}
          max={180}
          value={Math.round(layer.rotation)}
          onBegin={beginGesture}
          onChange={(rotation) => live({ rotation })}
        />
        <Slider
          label={t("Opacity")}
          suffix="%"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onBegin={beginGesture}
          onChange={(v) => live({ opacity: v / 100 })}
        />
        <Field label={t("Blend")}>
          <Select value={layer.blend ?? "normal"} onChange={(e) => commit({ blend: e.target.value as BlendMode })}>
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <TypeSection layer={layer} theme={theme} live={live} commit={commit} beginGesture={beginGesture} />

      <Section title={t("Effects")}>
        <Toggle
          label={t("Glow")}
          checked={layer.effects.glow.enabled}
          onChange={(enabled) => patchEffects({ glow: { ...layer.effects.glow, enabled } })}
        />
        {layer.effects.glow.enabled && (
          <>
            <ColorField
              label={t("Glow colour")}
              theme={theme}
              value={layer.effects.glow.color}
              onChange={(color) => patchEffects({ glow: { ...layer.effects.glow, color } }, false)}
              onCommit={(color) => patchEffects({ glow: { ...layer.effects.glow, color } })}
            />
            <Slider
              label={t("Strength")}
              min={0}
              max={120}
              value={layer.effects.glow.strength}
              onBegin={beginGesture}
              onChange={(strength) => patchEffects({ glow: { ...layer.effects.glow, strength } }, false)}
            />
          </>
        )}

        <Toggle
          label={t("Shadow")}
          checked={layer.effects.shadow.enabled}
          onChange={(enabled) => patchEffects({ shadow: { ...layer.effects.shadow, enabled } })}
        />
        {layer.effects.shadow.enabled && (
          <>
            {layer.effects.glow.enabled && (
              <p className="text-[11px] leading-relaxed text-amber-400/80">
                {t("Canvas allows one shadow per shape, so glow is taking precedence here.")}
              </p>
            )}
            <ColorField
              label={t("Shadow colour")}
              theme={theme}
              value={layer.effects.shadow.color}
              onChange={(color) => patchEffects({ shadow: { ...layer.effects.shadow, color } }, false)}
              onCommit={(color) => patchEffects({ shadow: { ...layer.effects.shadow, color } })}
            />
            <Slider
              label={t("Blur")}
              min={0}
              max={100}
              value={layer.effects.shadow.blur}
              onBegin={beginGesture}
              onChange={(blur) => patchEffects({ shadow: { ...layer.effects.shadow, blur } }, false)}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Offset X")}
                value={layer.effects.shadow.offsetX}
                onChange={(offsetX) => patchEffects({ shadow: { ...layer.effects.shadow, offsetX } })}
              />
              <NumberField
                label={t("Offset Y")}
                value={layer.effects.shadow.offsetY}
                onChange={(offsetY) => patchEffects({ shadow: { ...layer.effects.shadow, offsetY } })}
              />
            </div>
          </>
        )}

        <Toggle
          label={t("Border")}
          checked={layer.effects.border.enabled}
          onChange={(enabled) => patchEffects({ border: { ...layer.effects.border, enabled } })}
        />
        {layer.effects.border.enabled && (
          <>
            <ColorField
              label={t("Border colour")}
              theme={theme}
              value={layer.effects.border.color}
              onChange={(color) => patchEffects({ border: { ...layer.effects.border, color } }, false)}
              onCommit={(color) => patchEffects({ border: { ...layer.effects.border, color } })}
            />
            <Slider
              label={t("Width")}
              min={0}
              max={24}
              value={layer.effects.border.width}
              onBegin={beginGesture}
              onChange={(width) => patchEffects({ border: { ...layer.effects.border, width } }, false)}
            />
          </>
        )}

        <Toggle
          label={t("Gradient fill")}
          checked={layer.effects.gradient.enabled}
          onChange={(enabled) => patchEffects({ gradient: { ...layer.effects.gradient, enabled } })}
        />
        {layer.effects.gradient.enabled && (
          <>
            <ColorField
              label={t("From")}
              theme={theme}
              value={layer.effects.gradient.from}
              onChange={(from) => patchEffects({ gradient: { ...layer.effects.gradient, from } }, false)}
              onCommit={(from) => patchEffects({ gradient: { ...layer.effects.gradient, from } })}
            />
            <ColorField
              label={t("To")}
              theme={theme}
              value={layer.effects.gradient.to}
              onChange={(to) => patchEffects({ gradient: { ...layer.effects.gradient, to } }, false)}
              onCommit={(to) => patchEffects({ gradient: { ...layer.effects.gradient, to } })}
            />
            <Slider
              label={t("Angle")}
              suffix="°"
              min={0}
              max={360}
              value={layer.effects.gradient.angle}
              onBegin={beginGesture}
              onChange={(angle) => patchEffects({ gradient: { ...layer.effects.gradient, angle } }, false)}
            />
          </>
        )}

        <Toggle
          label={t("Gloss")}
          checked={layer.effects.gloss?.enabled ?? false}
          onChange={(enabled) =>
            patchEffects({ gloss: { ...layer.effects.gloss, strength: layer.effects.gloss?.strength ?? 0.8, enabled } })
          }
        />
        {layer.effects.gloss?.enabled && (
          <>
            <Field label={t("Finish")}>
              <Segmented
                value={layer.effects.gloss.style ?? "sheen"}
                onChange={(style) =>
                  patchEffects({ gloss: { ...layer.effects.gloss, enabled: true, strength: layer.effects.gloss?.strength ?? 0.8, style } })
                }
                options={[
                  { value: "sheen", label: t("Frost") },
                  { value: "streak", label: t("Glints") },
                  { value: "liquid", label: t("Liquid") },
                ]}
              />
            </Field>
            <Slider
              label={t("Gloss strength")}
              min={0.1}
              max={1}
              step={0.05}
              value={layer.effects.gloss.strength}
              onBegin={beginGesture}
              onChange={(strength) => patchEffects({ gloss: { ...layer.effects.gloss, enabled: true, strength } }, false)}
            />
          </>
        )}

        <Toggle
          label={t("Blur")}
          checked={layer.effects.blur.enabled}
          onChange={(enabled) => patchEffects({ blur: { ...layer.effects.blur, enabled } })}
        />
        {layer.effects.blur.enabled && (
          <>
            {layer.animation.preset !== "none" && (
              <p className="text-[11px] leading-relaxed text-amber-400/80">
                {t("Blur needs a cached bitmap, which an animation would freeze. It is skipped while this layer is animated.")}
              </p>
            )}
            <Slider
              label={t("Amount")}
              min={0}
              max={60}
              value={layer.effects.blur.amount}
              onBegin={beginGesture}
              onChange={(amount) => patchEffects({ blur: { ...layer.effects.blur, amount } }, false)}
            />
          </>
        )}
      </Section>

      <Section title={t("Animation")}>
        <Field label={t("Preset")}>
          <Select
            value={layer.animation.preset}
            onChange={(e) => {
              const preset = e.target.value as AnimationPreset;
              const patch: LayerPatch = { animation: { ...layer.animation, preset } };
              // Glow-driven presets light up the glow effect automatically.
              if (GLOW_ANIM_PRESETS.has(preset) && !layer.effects.glow.enabled) {
                patch.effects = {
                  ...layer.effects,
                  glow: { ...layer.effects.glow, enabled: true, strength: layer.effects.glow.strength || 24 },
                };
              }
              commit(patch);
            }}
          >
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </Select>
        </Field>

        {GLOW_ANIM_PRESETS.has(layer.animation.preset) && !layer.effects.glow.enabled && (
          <p className="text-[11px] leading-relaxed text-amber-400/80">
            {t("This preset pulses the glow effect, which is currently off. Enable Glow under Effects to see it.")}
          </p>
        )}
        {layer.animation.preset !== "none" && (
          <>
            <Slider
              label={t("Duration")}
              suffix=" ms"
              min={100}
              max={6000}
              step={50}
              value={layer.animation.duration}
              onBegin={beginGesture}
              onChange={(duration) => live({ animation: { ...layer.animation, duration } })}
            />
            <Slider
              label={t("Delay")}
              suffix=" ms"
              min={0}
              max={5000}
              step={50}
              value={layer.animation.delay}
              onBegin={beginGesture}
              onChange={(delay) => live({ animation: { ...layer.animation, delay } })}
            />
            <Slider
              label={t("Intensity")}
              min={0.2}
              max={3}
              step={0.1}
              value={layer.animation.intensity}
              onBegin={beginGesture}
              onChange={(intensity) => live({ animation: { ...layer.animation, intensity } })}
            />
            <Field label={t("Easing")}>
              <Select
                value={layer.animation.easing}
                onChange={(e) =>
                  commit({ animation: { ...layer.animation, easing: e.target.value as Easing } })
                }
              >
                {EASINGS.map((easing) => (
                  <option key={easing} value={easing}>
                    {easing}
                  </option>
                ))}
              </Select>
            </Field>
            {layer.animation.preset === "slide" && (
              <Field label={t("Direction")}>
                <Segmented
                  value={layer.animation.direction}
                  onChange={(direction) =>
                    commit({ animation: { ...layer.animation, direction } })
                  }
                  options={[
                    { value: "left", label: "←" },
                    { value: "right", label: "→" },
                    { value: "up", label: "↑" },
                    { value: "down", label: "↓" },
                  ]}
                />
              </Field>
            )}
            <Toggle
              label={t("Loop")}
              checked={layer.animation.loop}
              onChange={(loop) => commit({ animation: { ...layer.animation, loop } })}
            />
          </>
        )}
      </Section>
    </aside>
  );
}

/* ------------------------------ Type sections ----------------------------- */

interface TypeSectionProps {
  layer: Layer;
  theme: Theme;
  live: (patch: LayerPatch) => void;
  commit: (patch: LayerPatch) => void;
  beginGesture: () => void;
}

/**
 * The travelling edge light (runner) — the moving line around a webcam, chat
 * box or goal. It isn't a keyframe `animation` preset, so it never showed up in
 * the Animation panel; this exposes it where the colours live: a switch and,
 * unless the palette is flying a pride flag, a colour override.
 */
function RunnerControl({
  layer,
  theme,
  live,
  commit,
}: {
  layer: FrameLayer | ChatBoxLayer | GoalLayer;
  theme: Theme;
  live: (patch: LayerPatch) => void;
  commit: (patch: LayerPatch) => void;
}) {
  const t = useT();
  const isCamera = layer.type === "camera";
  const on = layer.runner ?? isCamera;
  const colors = layer.runnerColors ?? [];
  const setColor = (index: number, value: string, discrete: boolean) => {
    const next = colors.slice();
    next[index] = value;
    (discrete ? commit : live)({ runnerColors: next } as LayerPatch);
  };
  return (
    <>
      <Toggle
        label={t("Animated edge light")}
        checked={on}
        onChange={(v) => commit({ runner: v } as LayerPatch)}
      />
      {on && (
        <>
          {/* One colour → a solid light; several → the light is a gradient of
              them (a pride palette seeds the flag here). Empty → the accent. */}
          <Field
            label={t("Edge light colours")}
            hint={colors.length ? t("{n} colours", { n: colors.length }) : t("Accent")}
          >
            {colors.length > 0 && (
              <div className="space-y-1.5">
                {colors.map((c, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <ColorInput
                      value={c}
                      resolved={resolveColor(c, theme)}
                      onChange={(value) => setColor(index, value, false)}
                      onCommit={(value) => setColor(index, value, true)}
                    />
                    <button
                      title={t("Remove colour")}
                      onClick={() => commit({ runnerColors: colors.filter((_, i) => i !== index) } as LayerPatch)}
                      className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-white/10 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
          <button
            onClick={() => commit({ runnerColors: [...colors, colors.at(-1) ?? "@accent"] } as LayerPatch)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20"
          >
            {t("+ Add colour")}
          </button>
          {colors.length === 0 && (
            <p className="text-[11px] leading-relaxed text-zinc-600">
              {t("Using the accent colour — add one or more to customise the light.")}
            </p>
          )}
        </>
      )}
    </>
  );
}

/** The colour list for a facet shape — a pride band, a gradient sheet. Edit each
    colour, remove, or add; empty falls back to the shape's own rainbow default. */
function FacetColours({
  colors,
  theme,
  live,
  commit,
}: {
  colors: string[];
  theme: Theme;
  live: (patch: LayerPatch) => void;
  commit: (patch: LayerPatch) => void;
}) {
  const t = useT();
  const setCol = (index: number, value: string, discrete: boolean) => {
    const next = colors.slice();
    next[index] = value;
    (discrete ? commit : live)({ facetColors: next } as LayerPatch);
  };
  return (
    <>
      <Field label={t("Colours")} hint={colors.length ? t("{n} colours", { n: colors.length }) : undefined}>
        {colors.length > 0 && (
          <div className="space-y-1.5">
            {colors.map((c, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <ColorInput
                  value={c}
                  resolved={resolveColor(c, theme)}
                  onChange={(value) => setCol(index, value, false)}
                  onCommit={(value) => setCol(index, value, true)}
                />
                <button
                  title={t("Remove colour")}
                  onClick={() => commit({ facetColors: colors.filter((_, i) => i !== index) } as LayerPatch)}
                  className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-white/10 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <button
        onClick={() => commit({ facetColors: [...colors, colors.at(-1) ?? "@accent"] } as LayerPatch)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20"
      >
        {t("+ Add colour")}
      </button>
    </>
  );
}

function TypeSection({ layer, theme, live, commit, beginGesture }: TypeSectionProps) {
  const t = useT();
  switch (layer.type) {
    case "text": {
      const text = layer as TextLayer;
      return (
        <Section title={t("Text")}>
          <Field label={t("Content")}>
            <TextInput
              value={text.text}
              onChange={(e) => live({ text: e.target.value })}
              onBlur={(e) => commit({ text: e.target.value })}
            />
          </Field>
          <ColorField
            label={t("Colour")}
            theme={theme}
            value={text.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <Slider
            label={t("Size")}
            suffix=" px"
            min={8}
            max={220}
            value={Math.round(text.fontSize)}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label={t("Weight")}
            min={100}
            max={900}
            step={100}
            value={text.fontWeight}
            onBegin={beginGesture}
            onChange={(fontWeight) => live({ fontWeight })}
          />
          <Slider
            label={t("Letter spacing")}
            min={-5}
            max={30}
            value={text.letterSpacing}
            onBegin={beginGesture}
            onChange={(letterSpacing) => live({ letterSpacing })}
          />
          <Slider
            label={t("Line height")}
            min={0.8}
            max={2.5}
            step={0.05}
            value={text.lineHeight}
            onBegin={beginGesture}
            onChange={(lineHeight) => live({ lineHeight })}
          />
          <Field label={t("Align")}>
            <Segmented
              value={text.align}
              onChange={(align) => commit({ align })}
              options={[
                { value: "left", label: t("Left") },
                { value: "center", label: t("Center") },
                { value: "right", label: t("Right") },
              ]}
            />
          </Field>
          <Field label={t("Case")}>
            <Segmented
              value={text.textTransform}
              onChange={(textTransform) => commit({ textTransform })}
              options={[
                { value: "none", label: "Aa" },
                { value: "uppercase", label: "AA" },
                { value: "lowercase", label: "aa" },
              ]}
            />
          </Field>
          <Toggle label={t("Italic")} checked={text.italic} onChange={(italic) => commit({ italic })} />

          <Slider
            label={t("Curve")}
            min={-100}
            max={100}
            value={Math.round(text.curve ?? 0)}
            onBegin={beginGesture}
            onChange={(curve) => live({ curve })}
          />
          <Toggle
            label={t("Multi-colour letters")}
            checked={!!(text.fillStripes && text.fillStripes.length)}
            onChange={(on) => commit({ fillStripes: on ? MULTI_LETTER_COLORS : undefined })}
          />
          {!(text.fillStripes && text.fillStripes.length) && (
            <p className="-mt-1 text-[11px] leading-relaxed text-zinc-600">
              {t("Turn on to colour letters individually — pick a palette, or tap any single letter below to recolour just it. Add as many colours as you like.")}
            </p>
          )}
          {text.fillStripes && text.fillStripes.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {MULTI_LETTER_PALETTES.map((pal) => {
                  const active = JSON.stringify(text.fillStripes) === JSON.stringify(pal.colors);
                  return (
                    <button
                      key={pal.label}
                      title={t(pal.label)}
                      onClick={() => commit({ fillStripes: pal.colors })}
                      className={cx(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors",
                        active ? "border-brand-400/60 bg-brand-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
                      )}
                    >
                      <span className="flex shrink-0 overflow-hidden rounded">
                        {pal.colors.map((c, i) => (
                          <span key={i} style={{ background: c }} className="h-3.5 w-2" />
                        ))}
                      </span>
                      <span className="truncate text-[10px] text-zinc-400">{t(pal.label)}</span>
                    </button>
                  );
                })}
              </div>
              {(() => {
                const letters = [...text.text].filter((ch) => ch.trim() !== "");
                if (letters.length === 0 || letters.length > 30) return null;
                const stripes = text.fillStripes ?? [];
                const len = Math.max(1, stripes.length);
                const colorAt = (i: number) => stripes[i % len] ?? "#ffffff";
                const setLetter = (i: number, color: string) => {
                  const next = letters.map((_, j) => colorAt(j));
                  next[i] = color;
                  commit({ fillStripes: next });
                };
                return (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">{t("Per letter")}</p>
                    <div className="flex flex-wrap gap-1">
                      {letters.map((ch, i) => {
                        const col = colorAt(i);
                        const val = /^#[0-9a-fA-F]{6}$/.test(col) ? col : "#ffffff";
                        return (
                          <label
                            key={i}
                            title={t("Letter colour")}
                            className="relative grid size-7 cursor-pointer place-items-center rounded border border-white/15 text-[11px] font-bold"
                            style={{ background: col }}
                          >
                            <span style={{ color: "#fff", mixBlendMode: "difference" }}>{ch}</span>
                            <input
                              type="color"
                              value={val}
                              onChange={(e) => setLetter(i, e.target.value)}
                              className="absolute inset-0 cursor-pointer opacity-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {(() => {
            const cur: Text3D = text.effects.text3d ?? { enabled: false, depth: 16, angle: 45, color: "@accent" };
            const setTd = (patch: Partial<Text3D>, discrete = true) =>
              (discrete ? commit : live)({ effects: { ...text.effects, text3d: { ...cur, ...patch } } });
            return (
              <>
                <Toggle label={t("3D extrude")} checked={cur.enabled} onChange={(enabled) => setTd({ enabled })} />
                {cur.enabled && (
                  <>
                    <Slider
                      label={t("Depth")}
                      suffix=" px"
                      min={0}
                      max={60}
                      value={Math.round(cur.depth)}
                      onBegin={beginGesture}
                      onChange={(depth) => setTd({ depth }, false)}
                    />
                    <Slider
                      label={t("Direction")}
                      suffix="°"
                      min={-180}
                      max={180}
                      value={Math.round(cur.angle)}
                      onBegin={beginGesture}
                      onChange={(angle) => setTd({ angle }, false)}
                    />
                    <ColorField
                      label={t("Side colour")}
                      theme={theme}
                      value={cur.color}
                      onChange={(color) => setTd({ color }, false)}
                      onCommit={(color) => setTd({ color })}
                    />
                    <ColorField
                      label={t("Side back colour")}
                      theme={theme}
                      value={cur.colorTo ?? cur.color}
                      onChange={(colorTo) => setTd({ colorTo }, false)}
                      onCommit={(colorTo) => setTd({ colorTo })}
                    />
                  </>
                )}
              </>
            );
          })()}
        </Section>
      );
    }

    case "shape":
    case "background": {
      const shape = layer as ShapeLayer;
      return (
        <Section title={t("Shape")}>
          <Field label={t("Kind")}>
            <Select
              value={shape.shape}
              onChange={(e) => commit({ shape: e.target.value as ShapeKind })}
            >
              {SHAPE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
          </Field>
          {!FLAG_SHAPES.has(shape.shape) && (
            <ColorField
              label={t("Fill")}
              theme={theme}
              value={shape.fill}
              onChange={(fill) => live({ fill })}
              onCommit={(fill) => commit({ fill })}
            />
          )}
          {FACET_SHAPES.has(shape.shape) && (
            <FacetColours colors={shape.facetColors ?? []} theme={theme} live={live} commit={commit} />
          )}
          {shape.shape === "freehand" && (shape.drawStyle ?? "line") !== "fill" && (
            <Slider
              label={t("Thickness")}
              suffix=" px"
              min={1}
              max={80}
              value={Math.round(shape.strokeWidth ?? 6)}
              onBegin={beginGesture}
              onChange={(strokeWidth) => live({ strokeWidth })}
            />
          )}
          {shape.shape === "rect" && (
            <Slider
              label={t("Corner radius")}
              min={0}
              max={200}
              value={shape.cornerRadius}
              onBegin={beginGesture}
              onChange={(cornerRadius) => live({ cornerRadius })}
            />
          )}
          {shape.shape === "moon" && (
            <>
              <Slider
                label={t("Phase")}
                min={0.05}
                max={1}
                step={0.01}
                value={shape.moonPhase ?? 1}
                suffix={(shape.moonPhase ?? 1) >= 0.99 ? ` · ${t("full")}` : (shape.moonPhase ?? 1) <= 0.5 ? ` · ${t("waxing")}` : ` · ${t("gibbous")}`}
                onBegin={beginGesture}
                onChange={(moonPhase) => live({ moonPhase })}
              />
              <Toggle
                label={t("Craters")}
                checked={shape.craters ?? true}
                onChange={(craters) => commit({ craters })}
              />
            </>
          )}
        </Section>
      );
    }

    case "flag": {
      const flag = layer as FlagLayer;
      const setStripe = (index: number, value: string, discrete: boolean) => {
        const stripes = flag.stripes.slice();
        stripes[index] = value;
        (discrete ? commit : live)({ stripes });
      };
      return (
        <Section title={t("Flag")}>
          <Field label={t("Stripes")} hint={t("{n} colours", { n: flag.stripes.length })}>
            <div className="space-y-1.5">
              {flag.stripes.map((stripe, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <ColorInput
                    value={stripe}
                    resolved={stripe}
                    onChange={(value) => setStripe(index, value, false)}
                    onCommit={(value) => setStripe(index, value, true)}
                  />
                  <button
                    title={t("Remove stripe")}
                    disabled={flag.stripes.length <= 2}
                    onClick={() => commit({ stripes: flag.stripes.filter((_, i) => i !== index) })}
                    className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-25"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Field>
          <button
            onClick={() => commit({ stripes: [...flag.stripes, flag.stripes.at(-1) ?? "#ffffff"] })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20"
          >
            {t("+ Add stripe")}
          </button>
          <Field label={t("Direction")}>
            <Segmented
              value={flag.stackDirection}
              onChange={(stackDirection) => commit({ stackDirection })}
              options={[
                { value: "horizontal", label: t("Side by side") },
                { value: "vertical", label: t("Stacked") },
              ]}
            />
          </Field>
          <Slider
            label={t("Corner radius")}
            min={0}
            max={100}
            value={flag.cornerRadius}
            onBegin={beginGesture}
            onChange={(cornerRadius) => live({ cornerRadius })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            {t("Stripe colours are literal — a flag's colours belong to the flag, not the theme, so they survive palette swaps.")}
          </p>
        </Section>
      );
    }

    case "icon": {
      const ico = layer as IconLayer;
      return (
        <Section title={t("Icon")}>
          <Field label={t("Symbol")}>
            <Select value={ico.symbol} onChange={(e) => commit({ symbol: e.target.value })}>
              {ICON_GROUPS.map(({ group, names }) => (
                <optgroup key={group} label={group}>
                  {names.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <IconPreview symbol={ico.symbol} colour={resolveColor(ico.fill, theme)} />
          <ColorField
            label={t("Colour")}
            theme={theme}
            value={ico.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <Slider
            label={t("Outline weight")}
            min={0.5}
            max={4}
            step={0.1}
            value={ico.strokeWidth}
            onBegin={beginGesture}
            onChange={(strokeWidth) => live({ strokeWidth })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            {t("Icons are plain paths, so the colour is a theme token like any other fill — recolour the theme and every icon follows.")}
          </p>
        </Section>
      );
    }

    case "window": {
      const win = layer as WindowLayer;
      return (
        <Section title={t("Window")}>
          <Field label={t("Title")}>
            <TextInput
              value={win.title}
              onChange={(e) => live({ title: e.target.value })}
              onBlur={(e) => commit({ title: e.target.value })}
            />
          </Field>
          <ColorField label={t("Title bar")} theme={theme} value={win.titleBarColor}
            onChange={(titleBarColor) => live({ titleBarColor })}
            onCommit={(titleBarColor) => commit({ titleBarColor })} />
          <ColorField label={t("Body")} theme={theme} value={win.fill}
            onChange={(fill) => live({ fill })} onCommit={(fill) => commit({ fill })} />
          <Slider label={t("Corner radius")} min={0} max={40} value={win.cornerRadius}
            onBegin={beginGesture} onChange={(cornerRadius) => live({ cornerRadius })} />
          <Toggle label={t("Traffic-light buttons")} checked={win.buttons} onChange={(buttons) => commit({ buttons })} />
          <Toggle label={t("Glass gloss")} checked={win.gloss} onChange={(gloss) => commit({ gloss })} />
          {win.gloss && win.content === "camera" && (
            <p className="text-[11px] leading-relaxed text-amber-400/80">
              {t("The gloss paints a faint white sheen across the window, so in OBS it tints your webcam.")}
            </p>
          )}
          <Field label={t("Contents")}>
            <Segmented
              value={win.content}
              onChange={(content) => commit({ content })}
              options={[
                { value: "empty", label: t("Empty") },
                { value: "camera", label: t("Camera") },
                { value: "chat", label: t("Chat") },
              ]}
            />
          </Field>
          {win.content === "camera" && (
            <p className="text-[11px] leading-relaxed text-zinc-600">
              {t("The interior stays transparent in OBS so your webcam shows through the window.")}
            </p>
          )}
        </Section>
      );
    }

    case "chip": {
      const chip = layer as ChipLayer;
      return (
        <Section title={t("Event badge")}>
          <Field label={t("Label")}>
            <TextInput value={chip.label} onChange={(e) => live({ label: e.target.value })}
              onBlur={(e) => commit({ label: e.target.value })} />
          </Field>
          <Field label={t("Value")}>
            <TextInput value={chip.value} onChange={(e) => live({ value: e.target.value })}
              onBlur={(e) => commit({ value: e.target.value })} />
          </Field>
          <Field label={t("Icon")}>
            <Segmented value={chip.icon} onChange={(icon) => commit({ icon })}
              options={[
                { value: "heart", label: t("Heart") },
                { value: "star", label: t("Star") },
                { value: "none", label: t("None") },
              ]} />
          </Field>
          <ColorField label={t("Background")} theme={theme} value={chip.fill}
            onChange={(fill) => live({ fill })} onCommit={(fill) => commit({ fill })} />
          <ColorField label={t("Label colour")} theme={theme} value={chip.labelColor}
            onChange={(labelColor) => live({ labelColor })} onCommit={(labelColor) => commit({ labelColor })} />
          <Slider label={t("Font size")} min={10} max={36} value={chip.fontSize}
            onBegin={beginGesture} onChange={(fontSize) => live({ fontSize })} />
          <Slider label={t("Corner radius")} min={0} max={40} value={chip.cornerRadius}
            onBegin={beginGesture} onChange={(cornerRadius) => live({ cornerRadius })} />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            {t("Values are placeholders — without a Twitch connection there is no live event to read.")}
          </p>
        </Section>
      );
    }

    case "image":
    case "logo":
    case "video": {
      const image = layer as ImageLayer;
      return (
        <Section title={t("Image")}>
          <Field label={t("Source")} hint={t("URL or placeholder")}>
            <TextInput
              value={image.src}
              onChange={(e) => live({ src: e.target.value })}
              onBlur={(e) => commit({ src: e.target.value })}
              placeholder="{{LOGO}}"
              className="font-mono text-xs"
            />
          </Field>
          <Field label={t("Fit")}>
            <Segmented
              value={image.fit}
              onChange={(fit) => commit({ fit })}
              options={[
                { value: "contain", label: t("Contain") },
                { value: "cover", label: t("Cover") },
                { value: "fill", label: t("Fill") },
              ]}
            />
          </Field>
          <Slider
            label={t("Corner radius")}
            min={0}
            max={400}
            value={image.cornerRadius}
            onBegin={beginGesture}
            onChange={(cornerRadius) => live({ cornerRadius })}
          />
        </Section>
      );
    }

    case "frame":
    case "camera": {
      const frame = layer as FrameLayer;
      return (
        <Section title={layer.type === "camera" ? t("Camera frame") : t("Frame")}>
          <Field label={t("Shape")}>
            <Segmented
              value={frame.frameShape}
              onChange={(frameShape) => commit({ frameShape })}
              options={[
                { value: "rect", label: t("Rect") },
                { value: "ellipse", label: t("Ellipse") },
                { value: "hexagon", label: t("Hex cut") },
              ]}
            />
          </Field>
          <ColorField
            label={t("Stroke")}
            theme={theme}
            value={frame.strokeColor}
            onChange={(strokeColor) => live({ strokeColor })}
            onCommit={(strokeColor) => commit({ strokeColor })}
          />
          <Slider
            label={t("Stroke width")}
            min={0}
            max={24}
            value={frame.strokeWidth}
            onBegin={beginGesture}
            onChange={(strokeWidth) => live({ strokeWidth })}
          />
          {frame.frameShape === "rect" && (
            <Slider
              label={t("Corner radius")}
              min={0}
              max={200}
              value={frame.cornerRadius}
              onBegin={beginGesture}
              onChange={(cornerRadius) => live({ cornerRadius })}
            />
          )}
          <Toggle
            label={t("Corner accents")}
            checked={frame.corners}
            onChange={(corners) => commit({ corners })}
          />
          <RunnerControl layer={frame} theme={theme} live={live} commit={commit} />
          {layer.type === "camera" && (
            <p className="text-[11px] leading-relaxed text-zinc-600">
              {t("The fill is a studio placeholder only. In OBS the interior stays transparent so your webcam shows through.")}
            </p>
          )}
        </Section>
      );
    }

    case "chatbox": {
      const chat = layer as ChatBoxLayer;
      return (
        <Section title={t("Chat box")}>
          <Field label={t("Panel shape")}>
            <Segmented
              value={chat.boxShape ?? "rect"}
              onChange={(boxShape) => commit({ boxShape })}
              options={[
                { value: "rect", label: t("Rounded") },
                { value: "coffin", label: t("Coffin") },
              ]}
            />
          </Field>
          <ColorField
            label={t("Background")}
            theme={theme}
            value={chat.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <ColorField
            label={t("Username")}
            theme={theme}
            value={chat.usernameColor}
            onChange={(usernameColor) => live({ usernameColor })}
            onCommit={(usernameColor) => commit({ usernameColor })}
          />
          <ColorField
            label={t("Message")}
            theme={theme}
            value={chat.messageColor}
            onChange={(messageColor) => live({ messageColor })}
            onCommit={(messageColor) => commit({ messageColor })}
          />
          <Slider
            label={t("Font size")}
            min={12}
            max={48}
            value={chat.fontSize}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label={t("Rows")}
            min={1}
            max={11}
            value={chat.rows}
            onBegin={beginGesture}
            onChange={(rows) => live({ rows })}
          />
          <Slider
            label={t("Corner radius")}
            min={0}
            max={60}
            value={chat.cornerRadius}
            onBegin={beginGesture}
            onChange={(cornerRadius) => live({ cornerRadius })}
          />
          <RunnerControl layer={chat} theme={theme} live={live} commit={commit} />
        </Section>
      );
    }

    case "alert": {
      const alert = layer as AlertLayer;
      return (
        <Section title={t("Alert")}>
          <Field label={t("Title")}>
            <TextInput
              value={alert.title}
              onChange={(e) => live({ title: e.target.value })}
              onBlur={(e) => commit({ title: e.target.value })}
            />
          </Field>
          <Field label={t("Subtitle")}>
            <TextInput
              value={alert.subtitle}
              onChange={(e) => live({ subtitle: e.target.value })}
              onBlur={(e) => commit({ subtitle: e.target.value })}
            />
          </Field>
          <ColorField
            label={t("Background")}
            theme={theme}
            value={alert.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <ColorField
            label={t("Title colour")}
            theme={theme}
            value={alert.titleColor}
            onChange={(titleColor) => live({ titleColor })}
            onCommit={(titleColor) => commit({ titleColor })}
          />
        </Section>
      );
    }

    case "goal": {
      const g = layer as GoalLayer;
      const num = (v: string) => {
        const n = Number(v.replace(/[^0-9.]/g, ""));
        return Number.isFinite(n) ? n : 0;
      };
      return (
        <Section title={t("Goal")}>
          <Field label={t("Style")}>
            <Segmented
              value={g.goalStyle}
              onChange={(goalStyle) => commit({ goalStyle })}
              options={[
                { value: "bar", label: t("Bar") },
                { value: "ring", label: t("Ring") },
              ]}
            />
          </Field>
          <Field label={t("Label")}>
            <TextInput
              value={g.label}
              onChange={(e) => live({ label: e.target.value })}
              onBlur={(e) => commit({ label: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("Current")}>
              <TextInput
                value={String(g.current)}
                inputMode="numeric"
                onChange={(e) => live({ current: num(e.target.value) })}
                onBlur={(e) => commit({ current: num(e.target.value) })}
              />
            </Field>
            <Field label={t("Target")}>
              <TextInput
                value={String(g.target)}
                inputMode="numeric"
                onChange={(e) => live({ target: num(e.target.value) })}
                onBlur={(e) => commit({ target: num(e.target.value) })}
              />
            </Field>
          </div>
          {g.goalStyle === "bar" && (
            <Field label={t("Plate shape")}>
              <Segmented
                value={g.barShape ?? "rect"}
                onChange={(barShape) => commit({ barShape })}
                options={[
                  { value: "rect", label: t("Rect") },
                  { value: "coffin", label: t("Coffin") },
                  { value: "plaque", label: t("Plaque") },
                ]}
              />
            </Field>
          )}
          <ColorField
            label={t("Bar colour")}
            theme={theme}
            value={g.barColor}
            onChange={(barColor) => live({ barColor })}
            onCommit={(barColor) => commit({ barColor })}
          />
          <ColorField
            label={t("Track colour")}
            theme={theme}
            value={g.trackColor}
            onChange={(trackColor) => live({ trackColor })}
            onCommit={(trackColor) => commit({ trackColor })}
          />
          <ColorField
            label={t("Label colour")}
            theme={theme}
            value={g.labelColor}
            onChange={(labelColor) => live({ labelColor })}
            onCommit={(labelColor) => commit({ labelColor })}
          />
          <RunnerControl layer={g} theme={theme} live={live} commit={commit} />
        </Section>
      );
    }

    case "social": {
      const social = layer as SocialLayer;
      return (
        <Section title={t("Social bar")}>
          <Field label={t("Direction")}>
            <Segmented
              value={social.direction}
              onChange={(direction) => commit({ direction })}
              options={[
                { value: "horizontal", label: t("Row") },
                { value: "vertical", label: t("Column") },
              ]}
            />
          </Field>
          <Toggle
            label={t("Show handles")}
            checked={social.showHandles}
            onChange={(showHandles) => commit({ showHandles })}
          />
          <Toggle label={t("Pill background")} checked={social.pill} onChange={(pill) => commit({ pill })} />
          <ColorField
            label={t("Icon colour")}
            theme={theme}
            value={social.iconColor}
            onChange={(iconColor) => live({ iconColor })}
            onCommit={(iconColor) => commit({ iconColor })}
          />
          <Slider
            label={t("Font size")}
            min={12}
            max={48}
            value={social.fontSize}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label={t("Gap")}
            min={0}
            max={80}
            value={social.gap}
            onBegin={beginGesture}
            onChange={(gap) => live({ gap })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            {t("Handles come from your channel profile. Clear a field there to drop it from the bar.")}
          </p>
        </Section>
      );
    }

    case "particle": {
      const particle = layer as ParticleLayer;
      return (
        <Section title={t("Particles")}>
          <Field label={t("Kind")}>
            <Select
              value={particle.kind}
              onChange={(e) => commit({ kind: e.target.value as ParticleKind })}
            >
              {PARTICLE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
          </Field>
          <ColorField
            label={t("Colour")}
            theme={theme}
            value={particle.color}
            onChange={(color) => live({ color })}
            onCommit={(color) => commit({ color })}
          />
          <Slider
            label={t("Count")}
            min={5}
            max={200}
            value={particle.count}
            onBegin={beginGesture}
            onChange={(count) => live({ count })}
          />
          <Slider
            label={t("Size")}
            min={1}
            max={20}
            value={particle.size}
            onBegin={beginGesture}
            onChange={(size) => live({ size })}
          />
          <Slider
            label={t("Speed")}
            min={0}
            max={4}
            step={0.1}
            value={particle.speed}
            onBegin={beginGesture}
            onChange={(speed) => live({ speed })}
          />
        </Section>
      );
    }

    default:
      return null;
  }
}

/* -------------------------------- Controls -------------------------------- */

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        type="number"
        value={Math.round(value)}
        min={min}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(min !== undefined ? Math.max(min, next) : next);
        }}
        className="font-mono text-xs"
      />
    </Field>
  );
}

/** The catalogue, drawn at a glance. Picking an icon by name alone is guesswork. */
/** Align, distribute and group controls, shown while several layers are selected. */
/** With several layers selected, set the animation duration for all of them at
    once — the easy way to slow a whole stinger (or any multi-layer motion). */
function MultiAnimationSpeed() {
  const t = useT();
  const layers = useEditorStore((s) => s.project?.layers);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const beginGesture = useEditorStore((s) => s.beginGesture);
  const animated = (layers ?? []).filter(
    (l) => selectedIds.includes(l.id) && l.animation.preset !== "none",
  );
  if (!animated.length) return null;
  const dur = Math.max(...animated.map((l) => l.animation.duration));
  const setAll = (duration: number) =>
    animated.forEach((l) => updateLayer(l.id, { animation: { ...l.animation, duration } }, false));
  return (
    <div className="border-b border-white/[0.06] px-4 py-3.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {t("Animation speed")}
      </p>
      <Slider
        label={t("Duration")}
        suffix=" ms"
        min={100}
        max={6000}
        step={50}
        value={dur}
        onBegin={beginGesture}
        onChange={setAll}
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
        {t("Sets the speed for all {n} animated layers — slow a whole stinger at once.", {
          n: animated.length,
        })}
      </p>
    </div>
  );
}

function ArrangeControls() {
  const t = useT();
  const alignSelected = useEditorStore((s) => s.alignSelected);
  const distributeSelected = useEditorStore((s) => s.distributeSelected);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const layers = useEditorStore((s) => s.project?.layers);
  const grouped = layers?.some((l) => selectedIds.includes(l.id) && l.groupId) ?? false;

  const btn =
    "grid aspect-square place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white";

  return (
    <div className="border-b border-white/[0.06] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t("Arrange")}</p>
      <div className="grid grid-cols-6 gap-1.5">
        <button className={btn} title={t("Align left")} onClick={() => alignSelected("left")}><AlignStartVertical className="size-4" /></button>
        <button className={btn} title={t("Align centre")} onClick={() => alignSelected("centerX")}><AlignCenterVertical className="size-4" /></button>
        <button className={btn} title={t("Align right")} onClick={() => alignSelected("right")}><AlignEndVertical className="size-4" /></button>
        <button className={btn} title={t("Align top")} onClick={() => alignSelected("top")}><AlignStartHorizontal className="size-4" /></button>
        <button className={btn} title={t("Align middle")} onClick={() => alignSelected("centerY")}><AlignCenterHorizontal className="size-4" /></button>
        <button className={btn} title={t("Align bottom")} onClick={() => alignSelected("bottom")}><AlignEndHorizontal className="size-4" /></button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <button className={cx(btn, "aspect-auto py-2")} title={t("Distribute horizontally")} onClick={() => distributeSelected("h")}>
          <AlignHorizontalDistributeCenter className="size-4" />
        </button>
        <button className={cx(btn, "aspect-auto py-2")} title={t("Distribute vertically")} onClick={() => distributeSelected("v")}>
          <AlignVerticalDistributeCenter className="size-4" />
        </button>
      </div>
      <Button className="mt-2 w-full" onClick={grouped ? ungroupSelected : groupSelected}>
        {grouped ? <Ungroup className="size-4" /> : <GroupIcon className="size-4" />}
        {grouped ? t("Ungroup") : t("Group")}
      </Button>
    </div>
  );
}

function IconPreview({ symbol, colour }: { symbol: string; colour: string }) {
  return (
    <div className="grid grid-cols-8 gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-2">
      {ICON_GROUPS.flatMap(({ names }) => names).map((name) => {
        const def = ICONS[name as IconName];
        const active = name === symbol;
        const outlined = "stroke" in def && def.stroke;
        return (
          <span
            key={name}
            title={name}
            className={cx(
              "grid aspect-square place-items-center rounded",
              active && "bg-brand-500/25 ring-1 ring-brand-400/50",
            )}
          >
            <svg viewBox="0 0 24 24" className="size-4">
              <path
                d={def.d}
                fill={outlined ? "none" : active ? colour : "#8b8794"}
                stroke={outlined ? (active ? colour : "#8b8794") : undefined}
                strokeWidth={outlined ? 2 * (("strokeScale" in def && def.strokeScale) || 1) : 0}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

function ColorField({
  label,
  value,
  theme,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  theme: Theme;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const t = useT();
  return (
    <Field label={label} hint={value.startsWith("@") ? t("theme token") : undefined}>
      <ColorInput
        value={value}
        resolved={resolveColor(value, theme)}
        onChange={onChange}
        onCommit={onCommit}
      />
    </Field>
  );
}
