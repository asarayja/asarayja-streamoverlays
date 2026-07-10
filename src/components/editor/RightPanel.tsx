"use client";

import { MousePointerSquareDashed } from "lucide-react";
import {
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
  LayerPatch,
  ParticleKind,
  ParticleLayer,
  ShapeKind,
  ShapeLayer,
  SocialLayer,
  TextLayer,
  Theme,
} from "@/lib/types";

const SHAPE_KINDS: ShapeKind[] = ["rect", "ellipse", "triangle", "hexagon", "line", "moon", "crescent", "coffin", "plaque", "scanlines", "web", "drip", "graveyard", "chain", "shard", "hexmesh", "wave"];
const PARTICLE_KINDS: ParticleKind[] = ["dots", "stars", "embers", "snow", "bubbles", "bats", "moths", "petals", "fog", "confetti", "hearts", "rays", "clouds", "shootingStars", "blobs", "ghosts", "bokeh"];
import { useEditorStore, useSelectedLayer } from "@/store/editor";

export function RightPanel() {
  const layer = useSelectedLayer();
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const beginGesture = useEditorStore((s) => s.beginGesture);

  if (!project) return null;

  if (!layer) {
    return (
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-ink-900">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <MousePointerSquareDashed className="size-8 text-zinc-700" />
          <p className="text-sm font-medium text-zinc-400">
            {selectedIds.length > 1 ? `${selectedIds.length} layers selected` : "Nothing selected"}
          </p>
          <p className="text-xs leading-relaxed text-zinc-600">
            {selectedIds.length > 1
              ? "Select a single layer to edit its properties."
              : "Click a layer on the canvas or in the Layers panel."}
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
          {layer.type}
        </p>
        <h2 className="truncate text-sm font-semibold text-zinc-100">{layer.name}</h2>
      </div>

      <Section title="Transform">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={layer.x} onChange={(x) => commit({ x })} />
          <NumberField label="Y" value={layer.y} onChange={(y) => commit({ y })} />
          <NumberField label="Width" value={layer.width} min={8} onChange={(width) => commit({ width })} />
          <NumberField label="Height" value={layer.height} min={8} onChange={(height) => commit({ height })} />
        </div>
        <Slider
          label="Rotation"
          suffix="°"
          min={-180}
          max={180}
          value={Math.round(layer.rotation)}
          onBegin={beginGesture}
          onChange={(rotation) => live({ rotation })}
        />
        <Slider
          label="Opacity"
          suffix="%"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onBegin={beginGesture}
          onChange={(v) => live({ opacity: v / 100 })}
        />
      </Section>

      <TypeSection layer={layer} theme={theme} live={live} commit={commit} beginGesture={beginGesture} />

      <Section title="Effects">
        <Toggle
          label="Glow"
          checked={layer.effects.glow.enabled}
          onChange={(enabled) => patchEffects({ glow: { ...layer.effects.glow, enabled } })}
        />
        {layer.effects.glow.enabled && (
          <>
            <ColorField
              label="Glow colour"
              theme={theme}
              value={layer.effects.glow.color}
              onChange={(color) => patchEffects({ glow: { ...layer.effects.glow, color } }, false)}
              onCommit={(color) => patchEffects({ glow: { ...layer.effects.glow, color } })}
            />
            <Slider
              label="Strength"
              min={0}
              max={120}
              value={layer.effects.glow.strength}
              onBegin={beginGesture}
              onChange={(strength) => patchEffects({ glow: { ...layer.effects.glow, strength } }, false)}
            />
          </>
        )}

        <Toggle
          label="Shadow"
          checked={layer.effects.shadow.enabled}
          onChange={(enabled) => patchEffects({ shadow: { ...layer.effects.shadow, enabled } })}
        />
        {layer.effects.shadow.enabled && (
          <>
            {layer.effects.glow.enabled && (
              <p className="text-[11px] leading-relaxed text-amber-400/80">
                Canvas allows one shadow per shape, so glow is taking precedence here.
              </p>
            )}
            <ColorField
              label="Shadow colour"
              theme={theme}
              value={layer.effects.shadow.color}
              onChange={(color) => patchEffects({ shadow: { ...layer.effects.shadow, color } }, false)}
              onCommit={(color) => patchEffects({ shadow: { ...layer.effects.shadow, color } })}
            />
            <Slider
              label="Blur"
              min={0}
              max={100}
              value={layer.effects.shadow.blur}
              onBegin={beginGesture}
              onChange={(blur) => patchEffects({ shadow: { ...layer.effects.shadow, blur } }, false)}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Offset X"
                value={layer.effects.shadow.offsetX}
                onChange={(offsetX) => patchEffects({ shadow: { ...layer.effects.shadow, offsetX } })}
              />
              <NumberField
                label="Offset Y"
                value={layer.effects.shadow.offsetY}
                onChange={(offsetY) => patchEffects({ shadow: { ...layer.effects.shadow, offsetY } })}
              />
            </div>
          </>
        )}

        <Toggle
          label="Border"
          checked={layer.effects.border.enabled}
          onChange={(enabled) => patchEffects({ border: { ...layer.effects.border, enabled } })}
        />
        {layer.effects.border.enabled && (
          <>
            <ColorField
              label="Border colour"
              theme={theme}
              value={layer.effects.border.color}
              onChange={(color) => patchEffects({ border: { ...layer.effects.border, color } }, false)}
              onCommit={(color) => patchEffects({ border: { ...layer.effects.border, color } })}
            />
            <Slider
              label="Width"
              min={0}
              max={24}
              value={layer.effects.border.width}
              onBegin={beginGesture}
              onChange={(width) => patchEffects({ border: { ...layer.effects.border, width } }, false)}
            />
          </>
        )}

        <Toggle
          label="Gradient fill"
          checked={layer.effects.gradient.enabled}
          onChange={(enabled) => patchEffects({ gradient: { ...layer.effects.gradient, enabled } })}
        />
        {layer.effects.gradient.enabled && (
          <>
            <ColorField
              label="From"
              theme={theme}
              value={layer.effects.gradient.from}
              onChange={(from) => patchEffects({ gradient: { ...layer.effects.gradient, from } }, false)}
              onCommit={(from) => patchEffects({ gradient: { ...layer.effects.gradient, from } })}
            />
            <ColorField
              label="To"
              theme={theme}
              value={layer.effects.gradient.to}
              onChange={(to) => patchEffects({ gradient: { ...layer.effects.gradient, to } }, false)}
              onCommit={(to) => patchEffects({ gradient: { ...layer.effects.gradient, to } })}
            />
            <Slider
              label="Angle"
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
          label="Gloss"
          checked={layer.effects.gloss?.enabled ?? false}
          onChange={(enabled) =>
            patchEffects({ gloss: { strength: layer.effects.gloss?.strength ?? 0.8, enabled } })
          }
        />
        {layer.effects.gloss?.enabled && (
          <Slider
            label="Gloss strength"
            min={0.1}
            max={1}
            step={0.05}
            value={layer.effects.gloss.strength}
            onBegin={beginGesture}
            onChange={(strength) => patchEffects({ gloss: { enabled: true, strength } }, false)}
          />
        )}

        <Toggle
          label="Blur"
          checked={layer.effects.blur.enabled}
          onChange={(enabled) => patchEffects({ blur: { ...layer.effects.blur, enabled } })}
        />
        {layer.effects.blur.enabled && (
          <>
            {layer.animation.preset !== "none" && (
              <p className="text-[11px] leading-relaxed text-amber-400/80">
                Blur needs a cached bitmap, which an animation would freeze. It is skipped while this
                layer is animated.
              </p>
            )}
            <Slider
              label="Amount"
              min={0}
              max={60}
              value={layer.effects.blur.amount}
              onBegin={beginGesture}
              onChange={(amount) => patchEffects({ blur: { ...layer.effects.blur, amount } }, false)}
            />
          </>
        )}
      </Section>

      <Section title="Animation">
        <Field label="Preset">
          <Select
            value={layer.animation.preset}
            onChange={(e) =>
              commit({
                animation: { ...layer.animation, preset: e.target.value as AnimationPreset },
              })
            }
          >
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </Select>
        </Field>

        {(layer.animation.preset === "glow" || layer.animation.preset === "shimmer") &&
          !layer.effects.glow.enabled && (
            <p className="text-[11px] leading-relaxed text-amber-400/80">
              This preset pulses the glow effect, which is currently off. Enable Glow under Effects
              to see it.
            </p>
          )}
        {layer.animation.preset !== "none" && (
          <>
            <Slider
              label="Duration"
              suffix=" ms"
              min={100}
              max={6000}
              step={50}
              value={layer.animation.duration}
              onBegin={beginGesture}
              onChange={(duration) => live({ animation: { ...layer.animation, duration } })}
            />
            <Slider
              label="Delay"
              suffix=" ms"
              min={0}
              max={5000}
              step={50}
              value={layer.animation.delay}
              onBegin={beginGesture}
              onChange={(delay) => live({ animation: { ...layer.animation, delay } })}
            />
            <Slider
              label="Intensity"
              min={0.2}
              max={3}
              step={0.1}
              value={layer.animation.intensity}
              onBegin={beginGesture}
              onChange={(intensity) => live({ animation: { ...layer.animation, intensity } })}
            />
            <Field label="Easing">
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
              <Field label="Direction">
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
              label="Loop"
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

function TypeSection({ layer, theme, live, commit, beginGesture }: TypeSectionProps) {
  switch (layer.type) {
    case "text": {
      const text = layer as TextLayer;
      return (
        <Section title="Text">
          <Field label="Content">
            <TextInput
              value={text.text}
              onChange={(e) => live({ text: e.target.value })}
              onBlur={(e) => commit({ text: e.target.value })}
            />
          </Field>
          <ColorField
            label="Colour"
            theme={theme}
            value={text.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <Slider
            label="Size"
            suffix=" px"
            min={8}
            max={220}
            value={Math.round(text.fontSize)}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label="Weight"
            min={100}
            max={900}
            step={100}
            value={text.fontWeight}
            onBegin={beginGesture}
            onChange={(fontWeight) => live({ fontWeight })}
          />
          <Slider
            label="Letter spacing"
            min={-5}
            max={30}
            value={text.letterSpacing}
            onBegin={beginGesture}
            onChange={(letterSpacing) => live({ letterSpacing })}
          />
          <Slider
            label="Line height"
            min={0.8}
            max={2.5}
            step={0.05}
            value={text.lineHeight}
            onBegin={beginGesture}
            onChange={(lineHeight) => live({ lineHeight })}
          />
          <Field label="Align">
            <Segmented
              value={text.align}
              onChange={(align) => commit({ align })}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          </Field>
          <Field label="Case">
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
          <Toggle label="Italic" checked={text.italic} onChange={(italic) => commit({ italic })} />
        </Section>
      );
    }

    case "shape":
    case "background": {
      const shape = layer as ShapeLayer;
      return (
        <Section title="Shape">
          <Field label="Kind">
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
          <ColorField
            label="Fill"
            theme={theme}
            value={shape.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          {shape.shape === "rect" && (
            <Slider
              label="Corner radius"
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
                label="Phase"
                min={0.05}
                max={1}
                step={0.01}
                value={shape.moonPhase ?? 1}
                suffix={(shape.moonPhase ?? 1) >= 0.99 ? " · full" : (shape.moonPhase ?? 1) <= 0.5 ? " · waxing" : " · gibbous"}
                onBegin={beginGesture}
                onChange={(moonPhase) => live({ moonPhase })}
              />
              <Toggle
                label="Craters"
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
        <Section title="Flag">
          <Field label="Stripes" hint={`${flag.stripes.length} colours`}>
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
                    title="Remove stripe"
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
            + Add stripe
          </button>
          <Field label="Direction">
            <Segmented
              value={flag.stackDirection}
              onChange={(stackDirection) => commit({ stackDirection })}
              options={[
                { value: "horizontal", label: "Side by side" },
                { value: "vertical", label: "Stacked" },
              ]}
            />
          </Field>
          <Slider
            label="Corner radius"
            min={0}
            max={100}
            value={flag.cornerRadius}
            onBegin={beginGesture}
            onChange={(cornerRadius) => live({ cornerRadius })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Stripe colours are literal — a flag&apos;s colours belong to the flag, not the theme, so
            they survive palette swaps.
          </p>
        </Section>
      );
    }

    case "icon": {
      const ico = layer as IconLayer;
      return (
        <Section title="Icon">
          <Field label="Symbol">
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
            label="Colour"
            theme={theme}
            value={ico.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <Slider
            label="Outline weight"
            min={0.5}
            max={4}
            step={0.1}
            value={ico.strokeWidth}
            onBegin={beginGesture}
            onChange={(strokeWidth) => live({ strokeWidth })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Icons are plain paths, so the colour is a theme token like any other fill — recolour the
            theme and every icon follows.
          </p>
        </Section>
      );
    }

    case "window": {
      const win = layer as WindowLayer;
      return (
        <Section title="Window">
          <Field label="Title">
            <TextInput
              value={win.title}
              onChange={(e) => live({ title: e.target.value })}
              onBlur={(e) => commit({ title: e.target.value })}
            />
          </Field>
          <ColorField label="Title bar" theme={theme} value={win.titleBarColor}
            onChange={(titleBarColor) => live({ titleBarColor })}
            onCommit={(titleBarColor) => commit({ titleBarColor })} />
          <ColorField label="Body" theme={theme} value={win.fill}
            onChange={(fill) => live({ fill })} onCommit={(fill) => commit({ fill })} />
          <Slider label="Corner radius" min={0} max={40} value={win.cornerRadius}
            onBegin={beginGesture} onChange={(cornerRadius) => live({ cornerRadius })} />
          <Toggle label="Traffic-light buttons" checked={win.buttons} onChange={(buttons) => commit({ buttons })} />
          <Toggle label="Glass gloss" checked={win.gloss} onChange={(gloss) => commit({ gloss })} />
          {win.gloss && win.content === "camera" && (
            <p className="text-[11px] leading-relaxed text-amber-400/80">
              The gloss paints a faint white sheen across the window, so in OBS it tints your
              webcam.
            </p>
          )}
          <Field label="Contents">
            <Segmented
              value={win.content}
              onChange={(content) => commit({ content })}
              options={[
                { value: "empty", label: "Empty" },
                { value: "camera", label: "Camera" },
                { value: "chat", label: "Chat" },
              ]}
            />
          </Field>
          {win.content === "camera" && (
            <p className="text-[11px] leading-relaxed text-zinc-600">
              The interior stays transparent in OBS so your webcam shows through the window.
            </p>
          )}
        </Section>
      );
    }

    case "chip": {
      const chip = layer as ChipLayer;
      return (
        <Section title="Event badge">
          <Field label="Label">
            <TextInput value={chip.label} onChange={(e) => live({ label: e.target.value })}
              onBlur={(e) => commit({ label: e.target.value })} />
          </Field>
          <Field label="Value">
            <TextInput value={chip.value} onChange={(e) => live({ value: e.target.value })}
              onBlur={(e) => commit({ value: e.target.value })} />
          </Field>
          <Field label="Icon">
            <Segmented value={chip.icon} onChange={(icon) => commit({ icon })}
              options={[
                { value: "heart", label: "Heart" },
                { value: "star", label: "Star" },
                { value: "none", label: "None" },
              ]} />
          </Field>
          <ColorField label="Background" theme={theme} value={chip.fill}
            onChange={(fill) => live({ fill })} onCommit={(fill) => commit({ fill })} />
          <ColorField label="Label colour" theme={theme} value={chip.labelColor}
            onChange={(labelColor) => live({ labelColor })} onCommit={(labelColor) => commit({ labelColor })} />
          <Slider label="Font size" min={10} max={36} value={chip.fontSize}
            onBegin={beginGesture} onChange={(fontSize) => live({ fontSize })} />
          <Slider label="Corner radius" min={0} max={40} value={chip.cornerRadius}
            onBegin={beginGesture} onChange={(cornerRadius) => live({ cornerRadius })} />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Values are placeholders — without a Twitch connection there is no live event to read.
          </p>
        </Section>
      );
    }

    case "image":
    case "logo":
    case "video": {
      const image = layer as ImageLayer;
      return (
        <Section title="Image">
          <Field label="Source" hint="URL or placeholder">
            <TextInput
              value={image.src}
              onChange={(e) => live({ src: e.target.value })}
              onBlur={(e) => commit({ src: e.target.value })}
              placeholder="{{LOGO}}"
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Fit">
            <Segmented
              value={image.fit}
              onChange={(fit) => commit({ fit })}
              options={[
                { value: "contain", label: "Contain" },
                { value: "cover", label: "Cover" },
                { value: "fill", label: "Fill" },
              ]}
            />
          </Field>
          <Slider
            label="Corner radius"
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
        <Section title={layer.type === "camera" ? "Camera frame" : "Frame"}>
          <Field label="Shape">
            <Segmented
              value={frame.frameShape}
              onChange={(frameShape) => commit({ frameShape })}
              options={[
                { value: "rect", label: "Rect" },
                { value: "ellipse", label: "Ellipse" },
                { value: "hexagon", label: "Hex cut" },
              ]}
            />
          </Field>
          <ColorField
            label="Stroke"
            theme={theme}
            value={frame.strokeColor}
            onChange={(strokeColor) => live({ strokeColor })}
            onCommit={(strokeColor) => commit({ strokeColor })}
          />
          <Slider
            label="Stroke width"
            min={0}
            max={24}
            value={frame.strokeWidth}
            onBegin={beginGesture}
            onChange={(strokeWidth) => live({ strokeWidth })}
          />
          {frame.frameShape === "rect" && (
            <Slider
              label="Corner radius"
              min={0}
              max={200}
              value={frame.cornerRadius}
              onBegin={beginGesture}
              onChange={(cornerRadius) => live({ cornerRadius })}
            />
          )}
          <Toggle
            label="Corner accents"
            checked={frame.corners}
            onChange={(corners) => commit({ corners })}
          />
          {layer.type === "camera" && (
            <p className="text-[11px] leading-relaxed text-zinc-600">
              The fill is a studio placeholder only. In OBS the interior stays transparent so your
              webcam shows through.
            </p>
          )}
        </Section>
      );
    }

    case "chatbox": {
      const chat = layer as ChatBoxLayer;
      return (
        <Section title="Chat box">
          <Field label="Panel shape">
            <Segmented
              value={chat.boxShape ?? "rect"}
              onChange={(boxShape) => commit({ boxShape })}
              options={[
                { value: "rect", label: "Rounded" },
                { value: "coffin", label: "Coffin" },
              ]}
            />
          </Field>
          <ColorField
            label="Background"
            theme={theme}
            value={chat.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <ColorField
            label="Username"
            theme={theme}
            value={chat.usernameColor}
            onChange={(usernameColor) => live({ usernameColor })}
            onCommit={(usernameColor) => commit({ usernameColor })}
          />
          <ColorField
            label="Message"
            theme={theme}
            value={chat.messageColor}
            onChange={(messageColor) => live({ messageColor })}
            onCommit={(messageColor) => commit({ messageColor })}
          />
          <Slider
            label="Font size"
            min={12}
            max={48}
            value={chat.fontSize}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label="Rows"
            min={1}
            max={11}
            value={chat.rows}
            onBegin={beginGesture}
            onChange={(rows) => live({ rows })}
          />
          <Slider
            label="Corner radius"
            min={0}
            max={60}
            value={chat.cornerRadius}
            onBegin={beginGesture}
            onChange={(cornerRadius) => live({ cornerRadius })}
          />
        </Section>
      );
    }

    case "alert": {
      const alert = layer as AlertLayer;
      return (
        <Section title="Alert">
          <Field label="Title">
            <TextInput
              value={alert.title}
              onChange={(e) => live({ title: e.target.value })}
              onBlur={(e) => commit({ title: e.target.value })}
            />
          </Field>
          <Field label="Subtitle">
            <TextInput
              value={alert.subtitle}
              onChange={(e) => live({ subtitle: e.target.value })}
              onBlur={(e) => commit({ subtitle: e.target.value })}
            />
          </Field>
          <ColorField
            label="Background"
            theme={theme}
            value={alert.fill}
            onChange={(fill) => live({ fill })}
            onCommit={(fill) => commit({ fill })}
          />
          <ColorField
            label="Title colour"
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
        <Section title="Goal">
          <Field label="Style">
            <Segmented
              value={g.goalStyle}
              onChange={(goalStyle) => commit({ goalStyle })}
              options={[
                { value: "bar", label: "Bar" },
                { value: "ring", label: "Ring" },
              ]}
            />
          </Field>
          <Field label="Label">
            <TextInput
              value={g.label}
              onChange={(e) => live({ label: e.target.value })}
              onBlur={(e) => commit({ label: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Current">
              <TextInput
                value={String(g.current)}
                inputMode="numeric"
                onChange={(e) => live({ current: num(e.target.value) })}
                onBlur={(e) => commit({ current: num(e.target.value) })}
              />
            </Field>
            <Field label="Target">
              <TextInput
                value={String(g.target)}
                inputMode="numeric"
                onChange={(e) => live({ target: num(e.target.value) })}
                onBlur={(e) => commit({ target: num(e.target.value) })}
              />
            </Field>
          </div>
          {g.goalStyle === "bar" && (
            <Field label="Plate shape">
              <Segmented
                value={g.barShape ?? "rect"}
                onChange={(barShape) => commit({ barShape })}
                options={[
                  { value: "rect", label: "Rect" },
                  { value: "coffin", label: "Coffin" },
                  { value: "plaque", label: "Plaque" },
                ]}
              />
            </Field>
          )}
          <ColorField
            label="Bar colour"
            theme={theme}
            value={g.barColor}
            onChange={(barColor) => live({ barColor })}
            onCommit={(barColor) => commit({ barColor })}
          />
          <ColorField
            label="Track colour"
            theme={theme}
            value={g.trackColor}
            onChange={(trackColor) => live({ trackColor })}
            onCommit={(trackColor) => commit({ trackColor })}
          />
          <ColorField
            label="Label colour"
            theme={theme}
            value={g.labelColor}
            onChange={(labelColor) => live({ labelColor })}
            onCommit={(labelColor) => commit({ labelColor })}
          />
        </Section>
      );
    }

    case "social": {
      const social = layer as SocialLayer;
      return (
        <Section title="Social bar">
          <Field label="Direction">
            <Segmented
              value={social.direction}
              onChange={(direction) => commit({ direction })}
              options={[
                { value: "horizontal", label: "Row" },
                { value: "vertical", label: "Column" },
              ]}
            />
          </Field>
          <Toggle
            label="Show handles"
            checked={social.showHandles}
            onChange={(showHandles) => commit({ showHandles })}
          />
          <Toggle label="Pill background" checked={social.pill} onChange={(pill) => commit({ pill })} />
          <ColorField
            label="Icon colour"
            theme={theme}
            value={social.iconColor}
            onChange={(iconColor) => live({ iconColor })}
            onCommit={(iconColor) => commit({ iconColor })}
          />
          <Slider
            label="Font size"
            min={12}
            max={48}
            value={social.fontSize}
            onBegin={beginGesture}
            onChange={(fontSize) => live({ fontSize })}
          />
          <Slider
            label="Gap"
            min={0}
            max={80}
            value={social.gap}
            onBegin={beginGesture}
            onChange={(gap) => live({ gap })}
          />
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Handles come from your channel profile. Clear a field there to drop it from the bar.
          </p>
        </Section>
      );
    }

    case "particle": {
      const particle = layer as ParticleLayer;
      return (
        <Section title="Particles">
          <Field label="Kind">
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
            label="Colour"
            theme={theme}
            value={particle.color}
            onChange={(color) => live({ color })}
            onCommit={(color) => commit({ color })}
          />
          <Slider
            label="Count"
            min={5}
            max={200}
            value={particle.count}
            onBegin={beginGesture}
            onChange={(count) => live({ count })}
          />
          <Slider
            label="Size"
            min={1}
            max={20}
            value={particle.size}
            onBegin={beginGesture}
            onChange={(size) => live({ size })}
          />
          <Slider
            label="Speed"
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
  return (
    <Field label={label} hint={value.startsWith("@") ? "theme token" : undefined}>
      <ColorInput
        value={value}
        resolved={resolveColor(value, theme)}
        onChange={onChange}
        onCommit={onCommit}
      />
    </Field>
  );
}
