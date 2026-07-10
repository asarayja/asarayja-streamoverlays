"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import {
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Star,
  Text,
} from "react-konva";
import { sample } from "@/lib/animation";
import { measureText } from "@/lib/measure";
import { resolveSrc, resolveText, type MissingFieldMode } from "@/lib/placeholders";
import { resolveColor } from "@/lib/theme";
import type {
  AlertLayer,
  ChannelProfile,
  ChatBoxLayer,
  Effects,
  FrameLayer,
  Gradient,
  ImageLayer,
  Layer,
  ParticleLayer,
  ShapeLayer,
  SocialLayer,
  TextLayer,
  Theme,
} from "@/lib/types";
import { noise } from "@/lib/animation";
import { SocialGlyph, formatHandle } from "./SocialGlyph";
import { useKonvaImage } from "./useKonvaImage";

/** `edit` draws helper fills; `live` keeps the camera hole fully transparent. */
export type RenderMode = "edit" | "preview" | "live";

export interface RenderContext {
  theme: Theme;
  profile: ChannelProfile;
  /** Milliseconds since the overlay started playing. */
  time: number;
  mode: RenderMode;
}

/** A blank profile field must never reach a live stream as its own label. */
const missingMode = (mode: RenderMode): MissingFieldMode => (mode === "live" ? "empty" : "label");

/* -------------------------------------------------------------------------- */
/*                               Paint helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * Canvas gives a node exactly one shadow, so glow and drop-shadow compete for
 * it. Glow wins when both are on — it is the effect users reach for.
 */
function shadowProps(effects: Effects, theme: Theme, glowBoost: number) {
  if (effects.glow.enabled) {
    return {
      shadowColor: resolveColor(effects.glow.color, theme),
      shadowBlur: effects.glow.strength + glowBoost,
      shadowOpacity: 1,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  }
  if (effects.shadow.enabled) {
    return {
      shadowColor: resolveColor(effects.shadow.color, theme),
      shadowBlur: effects.shadow.blur,
      shadowOpacity: effects.shadow.opacity,
      shadowOffsetX: effects.shadow.offsetX,
      shadowOffsetY: effects.shadow.offsetY,
    };
  }
  if (glowBoost > 0) {
    return {
      shadowColor: resolveColor("@glow", theme),
      shadowBlur: glowBoost,
      shadowOpacity: 1,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  }
  return {};
}

function gradientProps(gradient: Gradient, theme: Theme, w: number, h: number) {
  if (!gradient.enabled) return {};
  const rad = (gradient.angle * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const length = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const dx = (Math.cos(rad) * length) / 2;
  const dy = (Math.sin(rad) * length) / 2;
  return {
    fillLinearGradientStartPoint: { x: cx - dx, y: cy - dy },
    fillLinearGradientEndPoint: { x: cx + dx, y: cy + dy },
    fillLinearGradientColorStops: [
      0,
      resolveColor(gradient.from, theme),
      1,
      resolveColor(gradient.to, theme),
    ],
  };
}

function borderProps(effects: Effects, theme: Theme) {
  if (!effects.border.enabled) return {};
  return {
    stroke: resolveColor(effects.border.color, theme),
    strokeWidth: effects.border.width,
  };
}

function polygonPoints(shape: string, w: number, h: number): number[] {
  switch (shape) {
    case "triangle":
      return [w / 2, 0, w, h, 0, h];
    case "hexagon":
      return [w * 0.5, 0, w, h * 0.25, w, h * 0.75, w * 0.5, h, 0, h * 0.75, 0, h * 0.25];
    case "line":
      return [0, h / 2, w, h / 2];
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
}

/** Rect with its four corners cut — the "hex cut" webcam frame. */
function chamferPoints(w: number, h: number): number[] {
  const c = Math.min(w, h) * 0.12;
  return [c, 0, w - c, 0, w, c, w, h - c, w - c, h, c, h, 0, h - c, 0, c];
}

function fontStyleOf(weight: number, italic: boolean): string {
  return italic ? `italic ${weight}` : `${weight}`;
}

function applyTransform(text: string, transform: TextLayer["textTransform"]): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

/* -------------------------------------------------------------------------- */
/*                              Layer contents                                */
/* -------------------------------------------------------------------------- */

function ShapeContent({ layer, ctx, glowBoost }: { layer: ShapeLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const fill = layer.effects.gradient.enabled
    ? undefined
    : resolveColor(layer.fill, ctx.theme);
  const paint = {
    ...gradientProps(layer.effects.gradient, ctx.theme, w, h),
    ...borderProps(layer.effects, ctx.theme),
    ...shadowProps(layer.effects, ctx.theme, glowBoost),
    fill,
  };

  // A scene background must be opaque: gradients routinely fade to a
  // semi-transparent stop (`@primary/30`), and painted directly onto nothing
  // that would leave a Starting Soon screen 30% see-through in OBS. Painting
  // the solid fill underneath keeps the design while sealing the frame.
  if (layer.type === "background" && layer.effects.gradient.enabled) {
    return (
      <Group listening={false}>
        <Rect width={w} height={h} fill={resolveColor(layer.fill, ctx.theme)} />
        <Rect width={w} height={h} {...paint} />
      </Group>
    );
  }

  if (layer.shape === "ellipse") {
    return <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...paint} />;
  }
  if (layer.shape === "rect") {
    return <Rect width={w} height={h} cornerRadius={layer.cornerRadius} {...paint} />;
  }
  if (layer.shape === "line") {
    return (
      <Line
        points={polygonPoints("line", w, h)}
        stroke={fill ?? resolveColor(layer.fill, ctx.theme)}
        strokeWidth={Math.max(2, h)}
        lineCap="round"
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />
    );
  }
  return <Line closed points={polygonPoints(layer.shape, w, h)} {...paint} />;
}

function TextContent({ layer, ctx, reveal, glowBoost }: { layer: TextLayer; ctx: RenderContext; reveal: number; glowBoost: number }) {
  const resolved = applyTransform(
    resolveText(layer.text, ctx.profile, missingMode(ctx.mode)),
    layer.textTransform,
  );
  const visible = reveal >= 1 ? resolved : resolved.slice(0, Math.ceil(resolved.length * reveal));

  // Auto-fit: placeholder text is unbounded — a channel called
  // THEQUEENOFDARKNESSANDDESPAIR must shrink, not spill out of the design.
  // Letter spacing is constant per gap while glyphs scale with font size, so
  // the two are solved separately; folding spacing into the scale factor
  // under-shrinks and Konva then wraps the overflow onto a clipped line.
  // Multi-line text keeps its authored size and wraps instead.
  let fontSize = layer.fontSize;
  if (!resolved.includes("\n") && resolved.length > 0) {
    const glyphs = measureText(resolved, fontSize, layer.fontFamily, layer.fontWeight);
    // Konva charges letterSpacing per *character* (not per gap) when it decides
    // whether a line fits — match that, or a 1px miss wraps the overflow onto a
    // second line that the fixed layer height then clips.
    const spacing = layer.letterSpacing * resolved.length;
    if (glyphs + spacing > layer.width - 4 && glyphs > 0) {
      const target = Math.max(20, layer.width - 4 - spacing);
      fontSize = Math.max(9, fontSize * (target / glyphs));
    }
  }

  return (
    <Text
      text={visible}
      width={layer.width}
      height={layer.height}
      fontFamily={layer.fontFamily}
      fontSize={fontSize}
      fontStyle={fontStyleOf(layer.fontWeight, layer.italic)}
      align={layer.align}
      verticalAlign="top"
      lineHeight={layer.lineHeight}
      letterSpacing={layer.letterSpacing}
      fill={resolveColor(layer.fill, ctx.theme)}
      wrap="word"
      {...shadowProps(layer.effects, ctx.theme, glowBoost)}
    />
  );
}

function fitRect(iw: number, ih: number, w: number, h: number, fit: ImageLayer["fit"]) {
  if (fit === "fill" || iw === 0 || ih === 0) return { x: 0, y: 0, width: w, height: h };
  const scale = fit === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  return { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh };
}

function ImageContent({ layer, ctx, glowBoost }: { layer: ImageLayer; ctx: RenderContext; glowBoost: number }) {
  const src = resolveSrc(layer.src, ctx.profile);
  const [image, status] = useKonvaImage(src);
  const { width: w, height: h } = layer;

  if (status !== "loaded" || !image) {
    if (ctx.mode === "live") return null;
    const label = layer.src.includes("{{")
      ? layer.src.replace(/[{}]/g, "").replace(/_/g, " ")
      : status === "failed"
        ? "Image failed"
        : "Image";
    return (
      <Group listening={false}>
        <Rect
          width={w}
          height={h}
          cornerRadius={layer.cornerRadius}
          fill={resolveColor("@background/50", ctx.theme)}
          stroke={resolveColor("@border", ctx.theme)}
          strokeWidth={2}
          dash={[8, 6]}
        />
        <Text
          text={label}
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          fontFamily="Inter"
          fontSize={Math.max(11, Math.min(20, w * 0.09))}
          fill={resolveColor("@border", ctx.theme)}
        />
      </Group>
    );
  }

  const box = fitRect(image.width, image.height, w, h, layer.fit);
  const needsClip = layer.fit === "cover" || layer.cornerRadius > 0;

  const picture = (
    <KonvaImage image={image} {...box} {...shadowProps(layer.effects, ctx.theme, glowBoost)} />
  );

  if (!needsClip) return picture;

  return (
    <Group
      clipFunc={(c) => {
        const r = Math.min(layer.cornerRadius, w / 2, h / 2);
        c.beginPath();
        c.moveTo(r, 0);
        c.arcTo(w, 0, w, h, r);
        c.arcTo(w, h, 0, h, r);
        c.arcTo(0, h, 0, 0, r);
        c.arcTo(0, 0, w, 0, r);
        c.closePath();
      }}
    >
      {picture}
    </Group>
  );
}

function FrameContent({ layer, ctx, glowBoost }: { layer: FrameLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  // In OBS the webcam sits *behind* the browser source, so any fill here would
  // tint the camera. Only the studio draws the placeholder fill.
  const fill = ctx.mode === "live" && layer.type === "camera" ? undefined : resolveColor(layer.fill, ctx.theme);
  const stroke = resolveColor(layer.strokeColor, ctx.theme);
  const shadow = shadowProps(layer.effects, ctx.theme, glowBoost);

  const outline =
    layer.frameShape === "ellipse" ? (
      <Ellipse
        x={w / 2}
        y={h / 2}
        radiusX={w / 2}
        radiusY={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={layer.strokeWidth}
        {...shadow}
      />
    ) : layer.frameShape === "hexagon" ? (
      <Line
        closed
        points={chamferPoints(w, h)}
        fill={fill}
        stroke={stroke}
        strokeWidth={layer.strokeWidth}
        lineJoin="round"
        {...shadow}
      />
    ) : (
      <Rect
        width={w}
        height={h}
        cornerRadius={layer.cornerRadius}
        fill={fill}
        stroke={stroke}
        strokeWidth={layer.strokeWidth}
        {...shadow}
      />
    );

  const cornerLen = Math.min(w, h) * 0.14;
  const accent = resolveColor("@accent", ctx.theme);

  return (
    <Group listening={false}>
      {outline}
      {ctx.mode !== "live" && layer.type === "camera" && (
        <Text
          text="CAMERA"
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          fontFamily="Inter"
          fontSize={Math.max(12, w * 0.035)}
          letterSpacing={4}
          fill={resolveColor("@border", ctx.theme)}
          opacity={0.55}
        />
      )}
      {layer.corners && (
        <>
          <Line points={[0, cornerLen, 0, 0, cornerLen, 0]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[w - cornerLen, 0, w, 0, w, cornerLen]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[w, h - cornerLen, w, h, w - cornerLen, h]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[cornerLen, h, 0, h, 0, h - cornerLen]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
        </>
      )}
    </Group>
  );
}

const CHAT_SAMPLE: Array<{ user: string; message: string }> = [
  { user: "NovaByte", message: "that clutch was insane" },
  { user: "pixel_wren", message: "first time here, loving the vibe" },
  { user: "Kaelthas", message: "what mouse are you using?" },
  { user: "mossy", message: "gg" },
  { user: "TinCanRobot", message: "the overlay looks so clean" },
  { user: "juniper", message: "raid incoming in 5" },
  { user: "Sable", message: "chat is going feral" },
  { user: "orbit_", message: "let's gooo" },
  { user: "quietstorm", message: "been lurking all stream" },
  { user: "hex", message: "new sub hype" },
  { user: "Cinder", message: "how long is the stream today?" },
];

function ChatBoxContent({ layer, ctx, glowBoost }: { layer: ChatBoxLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const pad = Math.max(14, layer.fontSize * 0.8);
  const rowHeight = layer.fontSize * 2.4;
  const capacity = Math.max(1, Math.floor((h - pad * 2) / rowHeight));
  const rows = CHAT_SAMPLE.slice(0, Math.min(layer.rows, capacity));
  const avatar = layer.fontSize * 0.62;

  return (
    <Group listening={false}>
      <Rect
        width={w}
        height={h}
        cornerRadius={layer.cornerRadius}
        fill={resolveColor(layer.fill, ctx.theme)}
        {...borderProps(layer.effects, ctx.theme)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />
      {rows.map((row, i) => {
        const y = pad + i * rowHeight;
        const nameWidth = measureText(`${row.user}:`, layer.fontSize, layer.fontFamily, 700);
        return (
          <Group key={row.user} y={y}>
            <Circle
              x={pad + avatar}
              y={layer.fontSize * 0.7}
              radius={avatar}
              fill={resolveColor(i % 2 === 0 ? "@primary" : "@secondary", ctx.theme)}
              opacity={0.85}
            />
            <Text
              x={pad + avatar * 2 + 10}
              text={`${row.user}:`}
              fontFamily={layer.fontFamily}
              fontSize={layer.fontSize}
              fontStyle="700"
              fill={resolveColor(layer.usernameColor, ctx.theme)}
            />
            <Text
              x={pad + avatar * 2 + 10 + nameWidth + 8}
              width={w - (pad + avatar * 2 + 10 + nameWidth + 8) - pad}
              text={row.message}
              fontFamily={layer.fontFamily}
              fontSize={layer.fontSize}
              fill={resolveColor(layer.messageColor, ctx.theme)}
              ellipsis
              wrap="none"
            />
          </Group>
        );
      })}
    </Group>
  );
}

function AlertContent({ layer, ctx, glowBoost }: { layer: AlertLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const avatarSize = h * 0.52;
  const titleSize = h * 0.26;
  const subtitleSize = h * 0.15;
  const left = h * 0.24 + avatarSize + h * 0.16;

  return (
    <Group listening={false}>
      <Rect
        width={w}
        height={h}
        cornerRadius={layer.cornerRadius}
        fill={resolveColor(layer.fill, ctx.theme)}
        {...borderProps(layer.effects, ctx.theme)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />
      <Circle
        x={h * 0.24 + avatarSize / 2}
        y={h / 2}
        radius={avatarSize / 2}
        fill={resolveColor("@primary", ctx.theme)}
        stroke={resolveColor("@accent", ctx.theme)}
        strokeWidth={3}
      />
      <Text
        x={left}
        y={h * 0.26}
        width={w - left - h * 0.2}
        text={resolveText(layer.title, ctx.profile, missingMode(ctx.mode))}
        fontFamily={layer.fontFamily}
        fontSize={titleSize}
        letterSpacing={2}
        fill={resolveColor(layer.titleColor, ctx.theme)}
      />
      <Text
        x={left}
        y={h * 0.26 + titleSize * 1.2}
        width={w - left - h * 0.2}
        text={resolveText(layer.subtitle, ctx.profile, missingMode(ctx.mode))}
        fontFamily="Inter"
        fontSize={subtitleSize}
        fill={resolveColor(layer.subtitleColor, ctx.theme)}
      />
    </Group>
  );
}

function SocialContent({ layer, ctx, glowBoost }: { layer: SocialLayer; ctx: RenderContext; glowBoost: number }) {
  const iconSize = layer.fontSize * 1.15;
  const padX = layer.fontSize * 0.6;
  const iconColor = resolveColor(layer.iconColor, ctx.theme);
  const textColor = resolveColor(layer.textColor, ctx.theme);
  const pillColor = resolveColor(layer.pillColor, ctx.theme);
  const rowHeight = Math.max(iconSize, layer.fontSize) + padX;

  // A platform the streamer isn't on shouldn't be advertised, so an empty
  // profile field drops it. In the studio, an entirely empty bar would be an
  // invisible, unselectable layer — there we keep the icons as a placeholder.
  const onPlatforms = layer.platforms.filter((platform) => ctx.profile.socials[platform]);
  const platforms =
    onPlatforms.length > 0 ? onPlatforms : ctx.mode === "live" ? [] : layer.platforms;

  const items = platforms.map((platform) => {
    const handle = layer.showHandles ? formatHandle(platform, ctx.profile.socials[platform]) : "";
    const textWidth = handle ? measureText(handle, layer.fontSize, layer.fontFamily, 600) : 0;
    const inner = iconSize + (handle ? 10 + textWidth : 0);
    return { platform, handle, width: layer.pill ? inner + padX * 2 : inner };
  });

  // Prefix sum of item extents along the bar's axis.
  const horizontal = layer.direction === "horizontal";
  const step = (index: number) => (horizontal ? items[index].width : rowHeight) + layer.gap;

  const placed: Array<(typeof items)[number] & { position: number }> = [];
  for (let i = 0, position = 0; i < items.length; position += step(i), i++) {
    placed.push({ ...items[i], position });
  }

  // Centre the row within the layer box. Without this a bar keeps its
  // left-aligned origin as the profile gains or loses platforms, so a streamer
  // with one social ends up with it hanging off the left of the frame.
  const contentLength = placed.length === 0 ? 0 : placed.at(-1)!.position + (horizontal ? placed.at(-1)!.width : rowHeight);
  const offset = Math.max(0, ((horizontal ? layer.width : layer.height) - contentLength) / 2);

  return (
    <Group listening={false} {...shadowProps(layer.effects, ctx.theme, glowBoost)}>
      {placed.map((item) => {
        const x = horizontal ? offset + item.position : 0;
        const y = horizontal ? 0 : offset + item.position;
        const innerX = layer.pill ? padX : 0;
        return (
          <Group key={item.platform} x={x} y={y}>
            {layer.pill && (
              <Rect
                width={item.width}
                height={rowHeight}
                cornerRadius={rowHeight / 2}
                fill={pillColor}
                {...borderProps(layer.effects, ctx.theme)}
              />
            )}
            <Group x={innerX} y={(rowHeight - iconSize) / 2}>
              <SocialGlyph platform={item.platform} size={iconSize} color={iconColor} />
            </Group>
            {item.handle && (
              <Text
                x={innerX + iconSize + 10}
                y={0}
                height={rowHeight}
                verticalAlign="middle"
                text={item.handle}
                fontFamily={layer.fontFamily}
                fontSize={layer.fontSize}
                fontStyle="600"
                fill={textColor}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

/**
 * Bat silhouette on a unit grid, scaled by `s`. `flap` raises and lowers the
 * wingtips; tension rounds the polygon into wing membranes.
 */
function batPoints(s: number, flap: number): number[] {
  const tip = -s * flap;
  return [
    -3.0 * s, tip,
    -1.4 * s, -0.2 * s,
    -0.5 * s, -0.55 * s,
    0, -0.9 * s,
    0.5 * s, -0.55 * s,
    1.4 * s, -0.2 * s,
    3.0 * s, tip,
    1.5 * s, 0.5 * s,
    0.55 * s, 0.35 * s,
    0, 0.95 * s,
    -0.55 * s, 0.35 * s,
    -1.5 * s, 0.5 * s,
  ];
}

function ParticleContent({ layer, ctx }: { layer: ParticleLayer; ctx: RenderContext }) {
  const { width: w, height: h } = layer;
  const color = resolveColor(layer.color, ctx.theme);
  const t = ctx.time / 1000;
  const count = ctx.mode === "preview" ? Math.min(layer.count, 30) : layer.count;

  // Positions are a pure function of index and time, so a preview, the OBS
  // source and an exported frame at the same timestamp look identical.
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const seedX = noise(i * 1.7);
    const seedY = noise(i * 3.1 + 5);
    const seedS = noise(i * 5.3 + 11);
    const size = layer.size * (0.5 + seedS);
    const opacity = 0.35 + 0.65 * noise(i * 7.9);

    switch (layer.kind) {
      case "bats": {
        // Glide across the sky on a slow horizontal track with a wing-beat
        // bounce; each bat has its own altitude band and speed.
        const span = w + 400;
        const x = ((seedX * span + t * layer.speed * (60 + seedS * 80)) % span) - 200;
        const y = seedY * h * 0.7 + h * 0.05 + Math.sin(t * (1.2 + seedS) + i) * 26;
        const flap = 0.25 + Math.abs(Math.sin(t * (5 + seedS * 3) + i * 2.1)) * 1.1;
        nodes.push(
          <Line
            key={i}
            x={x}
            y={y}
            closed
            points={batPoints(size * 1.6, flap)}
            fill={color}
            tension={0.25}
            opacity={0.5 + 0.5 * seedS}
          />,
        );
        break;
      }

      case "moths": {
        // Flutter in a loose orbit around a fixed anchor, like moths at a lamp.
        const ax = seedX * w;
        const ay = seedY * h;
        const x = ax + Math.cos(t * (0.6 + seedS) + i * 2) * 46;
        const y = ay + Math.sin(t * (0.9 + seedS * 0.5) + i) * 30;
        const flap = 0.35 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.9;
        const s = size * 1.1;
        nodes.push(
          <Group key={i} x={x} y={y} rotation={Math.sin(t + i) * 20} opacity={opacity}>
            <Line closed points={[0, 0, -2.1 * s, -1.4 * s * flap, -2.1 * s, 1.0 * s * flap]} fill={color} tension={0.3} />
            <Line closed points={[0, 0, 2.1 * s, -1.4 * s * flap, 2.1 * s, 1.0 * s * flap]} fill={color} tension={0.3} />
          </Group>,
        );
        break;
      }

      case "petals": {
        // Tumble downward with a sideways sway — rose petals, not snow.
        const fall = t * layer.speed * 55 * (0.5 + seedS);
        const y = ((seedY * h + fall) % (h + 40)) - 20;
        const x = ((seedX * w + Math.sin(t * (0.5 + seedS) + i) * 70) % w + w) % w;
        nodes.push(
          <Ellipse
            key={i}
            x={x}
            y={y}
            radiusX={size * 1.4}
            radiusY={size * 0.6}
            rotation={(t * 70 * layer.speed + i * 47) % 360}
            fill={color}
            opacity={opacity * 0.9}
          />,
        );
        break;
      }

      case "fog": {
        // Large soft blobs drifting horizontally. The radial fade is what
        // sells it — a hard-edged circle reads as a balloon, not weather.
        const radius = layer.size * (18 + seedS * 22);
        const span = w + radius * 4;
        const x = ((seedX * span + t * layer.speed * (14 + seedS * 20)) % span) - radius * 2;
        const y = h * 0.35 + seedY * h * 0.6;
        nodes.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={radius}
            opacity={0.05 + seedS * 0.09}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={radius}
            fillRadialGradientColorStops={[0, color, 1, "rgba(0,0,0,0)"]}
          />,
        );
        break;
      }

      case "stars": {
        const drift = t * layer.speed * 40 * (0.4 + seedS);
        const y = (((seedY * h + drift) % h) + h) % h;
        const x = (seedX * w + Math.sin(t * (0.3 + seedS) + i) * 18) % w;
        nodes.push(
          <Star
            key={i}
            x={x}
            y={y}
            numPoints={4}
            innerRadius={size * 0.35}
            outerRadius={size * 1.6}
            fill={color}
            opacity={opacity * (0.6 + 0.4 * Math.sin(t * 2 + i))}
          />,
        );
        break;
      }

      default: {
        const drift = t * layer.speed * 40 * (0.4 + seedS);
        const rises = layer.kind === "embers" || layer.kind === "bubbles";
        const rawY = rises ? seedY * h - drift : seedY * h + drift;
        const y = ((rawY % h) + h) % h;
        const x = (seedX * w + Math.sin(t * (0.3 + seedS) + i) * 18) % w;
        nodes.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={size}
            fill={color}
            opacity={layer.kind === "embers" ? opacity * (0.5 + 0.5 * Math.sin(t * 3 + i)) : opacity}
          />,
        );
      }
    }
  }

  return <Group listening={false}>{nodes}</Group>;
}

/* -------------------------------------------------------------------------- */
/*                                 LayerNode                                  */
/* -------------------------------------------------------------------------- */

function Content({ layer, ctx, reveal, glowBoost }: { layer: Layer; ctx: RenderContext; reveal: number; glowBoost: number }) {
  switch (layer.type) {
    case "shape":
    case "background":
      return <ShapeContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "text":
      return <TextContent layer={layer} ctx={ctx} reveal={reveal} glowBoost={glowBoost} />;
    case "image":
    case "logo":
    case "video":
      return <ImageContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "frame":
    case "camera":
      return <FrameContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "chatbox":
      return <ChatBoxContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "alert":
      return <AlertContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "social":
      return <SocialContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "particle":
      return <ParticleContent layer={layer} ctx={ctx} />;
    default:
      return null;
  }
}

interface LayerNodeProps {
  layer: Layer;
  ctx: RenderContext;
  /** Editor-only interaction. */
  draggable?: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  onDragStart?: () => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onTransformEnd?: (id: string, node: Konva.Group) => void;
  onDoubleClick?: (id: string) => void;
}

/**
 * Two nested groups: the outer one carries the layer's own transform and is
 * what the editor's Transformer attaches to; the inner one carries the
 * animation offset. Keeping them apart means playback never fights the
 * selection handles.
 */
export function LayerNode({
  layer,
  ctx,
  draggable = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onDoubleClick,
}: LayerNodeProps) {
  const innerRef = useRef<Konva.Group>(null);

  const anim = sample(layer.animation, ctx.time);
  const { width: w, height: h } = layer;
  const blur = layer.effects.blur;

  // Konva filters require a cached bitmap. A cache taken while an animation is
  // running would freeze that frame, so blur is only honoured on static layers.
  const blurrable = blur.enabled && layer.animation.preset === "none";
  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    if (blurrable) {
      node.cache();
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(blur.amount);
    } else {
      node.clearCache();
      node.filters([]);
    }
    node.getLayer()?.batchDraw();
  }, [blurrable, blur.amount, layer]);

  if (!layer.visible) return null;

  return (
    <Group
      id={layer.id}
      name="layer-node"
      x={layer.x + w / 2}
      y={layer.y + h / 2}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={layer.rotation}
      opacity={layer.opacity * anim.opacity}
      listening={draggable && !layer.locked}
      draggable={draggable && !layer.locked}
      onMouseDown={(e) => onSelect?.(layer.id, e.evt.shiftKey || e.evt.metaKey)}
      onTouchStart={() => onSelect?.(layer.id, false)}
      onDblClick={() => onDoubleClick?.(layer.id)}
      onDragStart={onDragStart}
      onDragMove={(e) => onDragMove?.(layer.id, e.target.x() - w / 2, e.target.y() - h / 2)}
      onDragEnd={(e) => onDragEnd?.(layer.id, e.target.x() - w / 2, e.target.y() - h / 2)}
      onTransformEnd={(e) => onTransformEnd?.(layer.id, e.target as Konva.Group)}
    >
      {/* Hit area: thin outlines and text are otherwise nearly unclickable. */}
      {draggable && <Rect width={w} height={h} fill="transparent" />}
      <Group
        ref={innerRef}
        x={w / 2 + anim.dx}
        y={h / 2 + anim.dy}
        offsetX={w / 2}
        offsetY={h / 2}
        scaleX={anim.scaleX}
        scaleY={anim.scaleY}
        rotation={anim.rotation}
      >
        <Content layer={layer} ctx={ctx} reveal={anim.reveal} glowBoost={anim.glowBoost} />
      </Group>
    </Group>
  );
}
