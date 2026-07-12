"use client";

import { cloneElement, useEffect, useRef, type ReactNode } from "react";
import Konva from "konva";
import {
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Path,
  Rect,
  Shape as KonvaShape,
  Star,
  Text,
  TextPath,
} from "react-konva";
import { ICONS, type IconName } from "@/data/icons";
import { sample } from "@/lib/animation";
import { measureText } from "@/lib/measure";
import { resolveSrc, resolveText, type MissingFieldMode } from "@/lib/placeholders";
import { darken, ensureContrast, lighten, resolveColor, withAlpha } from "@/lib/theme";
import type {
  AlertLayer,
  ChannelProfile,
  ChatBoxLayer,
  ChipLayer,
  Effects,
  FlagLayer,
  FrameLayer,
  GoalLayer,
  IconLayer,
  WindowLayer,
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
 *
 * The animation system's `glowBoost` only *amplifies* an enabled glow effect;
 * it never conjures one. The effect toggle is the single source of truth —
 * turning glow off must kill it even while a glow/shimmer preset is running.
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
    fillLinearGradientColorStops: gradient.via
      ? [
          0,
          resolveColor(gradient.from, theme),
          0.5,
          resolveColor(gradient.via, theme),
          1,
          resolveColor(gradient.to, theme),
        ]
      : [0, resolveColor(gradient.from, theme), 1, resolveColor(gradient.to, theme)],
  };
}

/**
 * A solid fill, or a per-layer linear gradient when the layer opts into one.
 * Works on any Konva node with a fill — text, alert plates, goal bars — so
 * every part can carry its own gradient, not just background shapes.
 */
function fillProps(color: string, effects: Effects, theme: Theme, w: number, h: number) {
  return effects.gradient.enabled
    ? gradientProps(effects.gradient, theme, w, h)
    : { fill: resolveColor(color, theme) };
}

function borderProps(effects: Effects, theme: Theme, w = 0, h = 0) {
  // A gradient stroke outranks a flat border — it is the more specific choice,
  // and Konva can only paint one stroke per shape.
  const gs = effects.gradientStroke;
  if (gs?.enabled) {
    const rad = (gs.angle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const length = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    const dx = (Math.cos(rad) * length) / 2;
    const dy = (Math.sin(rad) * length) / 2;
    return {
      strokeWidth: gs.width,
      strokeLinearGradientStartPoint: { x: cx - dx, y: cy - dy },
      strokeLinearGradientEndPoint: { x: cx + dx, y: cy + dy },
      strokeLinearGradientColorStops: [
        0,
        resolveColor(gs.from, theme),
        0.5,
        resolveColor(gs.to, theme),
        1,
        resolveColor(gs.from, theme),
      ],
    };
  }
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
    case "shard":
      // A parallelogram leaning top-left → bottom-right, the way esports
      // diagonals sweep. (Top edge sits left, bottom edge sits right.)
      return [0, 0, w * 0.68, 0, w, h, w * 0.32, h];
    case "star":
      return starPoints(w, h, 5, 0.42);
    case "burst":
      return starPoints(w, h, 12, 0.66);
    case "arrow":
      // A right-pointing block arrow; rotate the layer for any direction.
      return [
        0, h * 0.28, w * 0.6, h * 0.28, w * 0.6, 0, w, h * 0.5,
        w * 0.6, h, w * 0.6, h * 0.72, 0, h * 0.72,
      ];
    case "bolt":
      // A lightning bolt.
      return [
        w * 0.56, 0, w * 0.12, h * 0.56, w * 0.42, h * 0.56, w * 0.32, h,
        w * 0.9, h * 0.4, w * 0.56, h * 0.4,
      ];
    case "banner": {
      // A title ribbon: a bar with both ends forked inward.
      const n = Math.min(w * 0.14, h * 0.6);
      return [0, 0, w, 0, w - n, h * 0.5, w, h, 0, h, n, h * 0.5];
    }
    case "diamond":
      // A rhombus / rotated square — the diamond plate.
      return [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];
    default:
      return [0, 0, w, 0, w, h, 0, h];
  }
}

/** Points of an n-pointed star filling the box; `inner` is the valley radius. */
function starPoints(w: number, h: number, n: number, inner: number): number[] {
  const cx = w / 2;
  const cy = h / 2;
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const f = i % 2 ? inner : 1;
    pts.push(cx + Math.cos(a) * (w / 2) * f, cy + Math.sin(a) * (h / 2) * f);
  }
  return pts;
}

/** A honeycomb lattice: pointy-top hexagon outlines tiled across the box. */
function hexMeshPath(c: Konva.Context, w: number, h: number) {
  // Circumradius: scales with the box but capped so a full-screen field tiles
  // into a fine honeycomb rather than a few giant cells.
  const R = Math.max(14, Math.min(34, Math.min(w, h) * 0.11));
  const dx = R * 1.5;
  const dy = R * Math.sqrt(3);
  c.beginPath();
  let col = 0;
  for (let cx = 0; cx <= w + R; cx += dx, col++) {
    const offY = col % 2 ? dy / 2 : 0;
    for (let cy = -dy; cy <= h + dy; cy += dy) {
      const yc = cy + offY;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = cx + R * Math.cos(a);
        const py = yc + R * Math.sin(a);
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
    }
  }
}

/** Metrics for the sheeted ghost, matching the `ghosts` particle sprite so the
    stinger ghost is the same character, just bigger. */
function ghostMetrics(w: number, h: number) {
  const g = Math.min(w, h) * 0.44;
  return { g, cx: w / 2, cy: h * 0.44, hem: h * 0.44 + g * 1.15 };
}

/** A sheeted ghost — domed head, straight shoulders, a scalloped hem — drawn to
    fill the box. Same silhouette as the drifting `ghosts` particle. */
function ghostPath(c: Konva.Context, w: number, h: number) {
  const { g, cx, cy, hem } = ghostMetrics(w, h);
  c.beginPath();
  c.arc(cx, cy, g, Math.PI, 0, false); // dome over the top
  c.lineTo(cx + g, hem);
  for (let k = 0; k < 4; k++) {
    const x0 = cx + g - (k * 2 * g) / 4;
    const x1 = cx + g - ((k + 1) * 2 * g) / 4;
    const mid = (x0 + x1) / 2;
    c.quadraticCurveTo(mid, hem + (k % 2 === 0 ? g * 0.42 : -g * 0.12), x1, hem);
  }
  c.lineTo(cx - g, cy);
  c.closePath();
}

/** A classic heart filling the box. */
function heartPath(c: Konva.Context, w: number, h: number) {
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.32);
  c.bezierCurveTo(w * 0.5, h * 0.1, w * 0.08, h * 0.04, w * 0.04, h * 0.36);
  c.bezierCurveTo(w * 0.0, h * 0.64, w * 0.34, h * 0.82, w * 0.5, h);
  c.bezierCurveTo(w * 0.66, h * 0.82, w * 1.0, h * 0.64, w * 0.96, h * 0.36);
  c.bezierCurveTo(w * 0.92, h * 0.04, w * 0.5, h * 0.1, w * 0.5, h * 0.32);
  c.closePath();
}

/** Rect with its four corners cut — the "hex cut" webcam frame. */
function chamferPoints(w: number, h: number): number[] {
  const c = Math.min(w, h) * 0.12;
  return [c, 0, w - c, 0, w, c, w, h - c, w - c, h, c, h, 0, h - c, 0, c];
}

function fontStyleOf(weight: number, italic: boolean): string {
  return italic ? `italic ${weight}` : `${weight}`;
}

/**
 * Shrink a font so a single line fits its box.
 *
 * Konva charges `letterSpacing` per *character* (not per gap) when it decides
 * whether a line fits, and a Text with a width but no height silently wraps —
 * which is how an alert title ends up sitting on top of its own subtitle.
 * Every single-line label goes through here.
 */
function fitFontSize(
  text: string,
  boxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  letterSpacing = 0,
): number {
  if (!text || boxWidth <= 0) return fontSize;
  const glyphs = measureText(text, fontSize, fontFamily, fontWeight);
  const spacing = letterSpacing * text.length;
  if (glyphs <= 0 || glyphs + spacing <= boxWidth - 4) return fontSize;
  const target = Math.max(20, boxWidth - 4 - spacing);
  return Math.max(9, fontSize * (target / glyphs));
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
    const gloss = layer.effects.gloss;
    if (gloss?.enabled) {
      return (
        <Group listening={false}>
          <Rect width={w} height={h} cornerRadius={layer.cornerRadius} {...paint} />
          <KonvaShape
            listening={false}
            sceneFunc={(c) => {
              const r = Math.min(layer.cornerRadius, w / 2, h / 2);
              if (gloss.style === "liquid") drawLiquid(c, w, h, r, gloss.strength, ctx.time);
              else if (gloss.style === "streak") drawReflection(c, w, h, r, gloss.strength);
              else drawGloss(c, w, h, r, gloss.strength);
            }}
          />
        </Group>
      );
    }
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

  if (layer.shape === "moon") {
    const phase = layer.moonPhase ?? 1;
    const showCraters = layer.craters ?? true;
    const base = resolveColor(layer.fill, ctx.theme);
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          c.save();
          c.translate(w / 2, h / 2);
          moonPath(c, Math.min(w, h) / 2, phase);
          c.restore();
          // Fill through Konva so the glow/shadow props still apply.
          c.fillStrokeShape(shape);

          if (showCraters) {
            c.save();
            c.translate(w / 2, h / 2);
            moonPath(c, Math.min(w, h) / 2, phase);
            c.clip();
            drawCraters(c, Math.min(w, h) / 2, base);
            c.restore();
          }
        }}
      />
    );
  }

  if (layer.shape === "crescent") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          crescentPath(c, w, h);
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "scanlines") {
    const gap = Math.max(3, layer.cornerRadius || 4);
    const stroke = fill ?? resolveColor(layer.fill, ctx.theme);
    return (
      <KonvaShape
        sceneFunc={(c, shape) => {
          c.beginPath();
          for (let y = 0; y < h; y += gap) {
            c.moveTo(0, y);
            c.lineTo(w, y);
          }
          c.strokeShape(shape);
        }}
        stroke={stroke}
        strokeWidth={1}
      />
    );
  }

  if (layer.shape === "web") {
    const stroke = fill ?? resolveColor(layer.fill, ctx.theme);
    return (
      <KonvaShape
        stroke={stroke}
        strokeWidth={Math.max(1, layer.cornerRadius || 1.4)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c, shape) => {
          webPath(c, w, h);
          c.strokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "drip") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          dripPath(c, w, h, Math.min(layer.cornerRadius, w / 2, h / 2));
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "ghost") {
    const { g, cx, cy } = ghostMetrics(w, h);
    const eye = g * 0.16;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          ghostPath(c, w, h);
          c.fillStrokeShape(shape);
          // Two eyes + a mouth at the same proportions as the ghost sprite.
          c.setAttr("fillStyle", "rgba(12,10,20,0.8)");
          for (const dx of [-g * 0.32, g * 0.32]) {
            c.beginPath();
            c.arc(cx + dx, cy - g * 0.1, eye, 0, Math.PI * 2, false);
            c.fill();
          }
          c.beginPath();
          c.ellipse(cx, cy + g * 0.42, eye * 0.7, eye, 0, 0, Math.PI * 2, false);
          c.fill();
        }}
      />
    );
  }

  if (layer.shape === "heart") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          heartPath(c, w, h);
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "sinestrip") {
    // A thick bar bent into a gentle sine wave: stroke it at half the box
    // height, its centreline undulating a few times across the width.
    const th = h * 0.5;
    const amp = h * 0.2;
    const humps = Math.max(2, Math.round(w / 520));
    const stroke = fill ?? resolveColor(layer.fill, ctx.theme);
    return (
      <KonvaShape
        stroke={stroke}
        strokeWidth={th}
        lineCap="round"
        lineJoin="round"
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c, shape) => {
          c.beginPath();
          const mid = h / 2;
          c.moveTo(0, mid);
          for (let x = 0; x <= w; x += 10) {
            c.lineTo(x, mid + Math.sin((x / w) * Math.PI * 2 * humps) * amp);
          }
          c.strokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "graveyard") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          graveyardPath(c, w, h);
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "chain") {
    const stroke = fill ?? resolveColor(layer.fill, ctx.theme);
    const linkWidth = Math.max(1.6, w * 0.13);
    return (
      <Group listening={false} {...shadowProps(layer.effects, ctx.theme, glowBoost)}>
        <KonvaShape
          stroke={stroke}
          strokeWidth={linkWidth}
          sceneFunc={(c, shape) => {
            chainPath(c, w, h);
            c.strokeShape(shape);
          }}
        />
        <KonvaShape
          fill={stroke}
          sceneFunc={(c, shape) => {
            pendantPath(c, w, h);
            c.fillShape(shape);
          }}
        />
      </Group>
    );
  }

  if (layer.shape === "hexmesh") {
    return (
      <KonvaShape
        stroke={resolveColor(layer.fill, ctx.theme)}
        strokeWidth={2}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c, shape) => {
          hexMeshPath(c, w, h);
          c.strokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "wave") {
    // A flowing energy ribbon: an S-curve stroked thick with round caps. A
    // metallic (from → bright → from) gradient stroke reads as glossy chrome;
    // a solid stroke with heavy glow reads as a plasma streak.
    const th = h * 0.34;
    const gs = layer.effects.gradientStroke;
    const strokePaint = gs?.enabled
      ? {
          strokeLinearGradientStartPoint: { x: 0, y: 0 },
          strokeLinearGradientEndPoint: { x: 0, y: h },
          strokeLinearGradientColorStops: [
            0,
            resolveColor(gs.from, ctx.theme),
            0.5,
            resolveColor(gs.to, ctx.theme),
            1,
            resolveColor(gs.from, ctx.theme),
          ],
        }
      : { stroke: resolveColor(layer.fill, ctx.theme) };
    return (
      <KonvaShape
        strokeWidth={th}
        lineCap="round"
        lineJoin="round"
        {...strokePaint}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c, shape) => {
          c.beginPath();
          c.moveTo(0, h * 0.5);
          c.bezierCurveTo(w * 0.32, h * 0.08, w * 0.68, h * 0.92, w, h * 0.5);
          c.strokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "glasssheet") {
    const strength = layer.effects.gloss?.strength ?? 1;
    const glossy = layer.effects.gloss?.style !== "sheen";
    const facetMode = layer.facetMode ?? "sides";
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => drawGlassSheet(c, w, h, strength, ctx.time, glossy, facetMode, layer.facetColors)}
      />
    );
  }

  if (layer.shape === "flagwaves") {
    // A stack of flowing, glowing plasma ribbons — one per flag colour — that
    // drift and undulate across the band. Reads as rainbow plasma energy.
    const cols = layer.facetColors;
    if (!cols || !cols.length) return null;
    const tt = ctx.time / 1000;
    const n = cols.length;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const th = (h / n) * 1.3; // slight overlap so the band reads as one flow
          const amp = h * 0.1;
          c.setAttr("lineCap", "round");
          c.setAttr("lineJoin", "round");
          c.setAttr("lineWidth", th);
          for (let i = 0; i < n; i++) {
            const col = cols[i];
            const yc = ((i + 0.5) / n) * h;
            const drift = Math.sin(tt * 0.5 + i * 0.7) * amp * 0.6;
            c.setAttr("strokeStyle", hexAlpha(col, 0.82));
            c.setAttr("shadowColor", col);
            c.setAttr("shadowBlur", th * 0.7);
            c.beginPath();
            const steps = 28;
            for (let s = 0; s <= steps; s++) {
              const x = (w * s) / steps;
              const y = yc + drift + Math.sin((x / w) * Math.PI * 2 + tt * 0.8 + i * 0.6) * amp;
              if (s === 0) c.moveTo(x, y);
              else c.lineTo(x, y);
            }
            c.stroke();
          }
        }}
      />
    );
  }

  if (layer.shape === "paintSplat") {
    // Fill + glow come from `paint`, so the whole splatter blooms as lit wet
    // paint. Seed salts each instance so no two splats are identical.
    const seed = (layer.x + layer.y) * 0.013;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, s) => {
          paintSplatPath(c, w, h, ctx.time, seed);
          c.fillStrokeShape(s);
        }}
      />
    );
  }

  if (layer.shape === "paintSpray") {
    const col = resolveColor(layer.fill, ctx.theme);
    return <KonvaShape listening={false} sceneFunc={(c) => paintSprayField(c, w, h, col, ctx.time)} />;
  }

  if (layer.shape === "spraySplat") {
    const base = resolveColor(layer.fill, ctx.theme);
    const ink = resolveColor("@shadow", ctx.theme);
    const seed = (layer.x + layer.y) * 0.013;
    return (
      <KonvaShape listening={false} sceneFunc={(c) => spraySplatPaint(c, w, h, base, ink, ctx.time, seed)} />
    );
  }

  if (layer.shape === "concreteWall") {
    const base = resolveColor(layer.fill, ctx.theme);
    return <KonvaShape listening={false} sceneFunc={(c) => concreteWallPaint(c, w, h, base)} />;
  }

  if (layer.shape === "freehand") {
    const pts = layer.points ?? [];
    const col = resolveColor(layer.fill, ctx.theme);
    // A stroke can be masked to a rect (the webcam-frame band): only the part
    // inside the "selection" paints, like drawing inside a Photoshop marquee.
    const clip = layer.clip;
    const wrap = (el: ReactNode) =>
      clip ? (
        <Group listening={false} clipX={clip.x} clipY={clip.y} clipWidth={clip.width} clipHeight={clip.height}>
          {el}
        </Group>
      ) : (
        el
      );

    // Ink / calligraphy / fill: `points` is a closed polygon — render it filled.
    // `paint` carries fill + gradient + border + glow, so a hand-drawn fill can
    // take a gradient or plasma glow like the split shapes.
    if (layer.drawStyle === "fill") {
      return wrap(<Line points={pts} closed {...paint} />);
    }

    // Airbrush: scatter soft deterministic dots along the drawn path.
    if (layer.drawStyle === "spray") {
      const r = layer.strokeWidth ?? 8;
      return wrap(
        <KonvaShape
          listening={false}
          sceneFunc={(c) => {
            const TAU = Math.PI * 2;
            c.setAttr("fillStyle", col);
            let k = 0;
            for (let i = 0; i + 3 < pts.length; i += 2) {
              const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3];
              const segLen = Math.hypot(x1 - x0, y1 - y0);
              const dots = Math.min(50, Math.max(2, Math.floor(segLen / 3.5)));
              for (let d = 0; d < dots; d++) {
                const t = d / dots;
                const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
                const ang = noise(k * 1.7) * TAU;
                const rad = Math.sqrt(noise(k * 3.1 + 1)) * r;
                const dr = 0.6 + noise(k * 5.3 + 2) * 1.8;
                c.setAttr("globalAlpha", 0.35 + noise(k * 7.9 + 3) * 0.4);
                c.beginPath();
                c.arc(bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad, dr, 0, TAU);
                c.fill();
                k++;
              }
            }
            c.setAttr("globalAlpha", 1);
          }}
        />,
      );
    }

    // Pencil sketch: a few jittered overlaid strokes for a hand-drawn look.
    if (layer.drawStyle === "sketch") {
      const sw = layer.strokeWidth ?? 6;
      return wrap(
        <KonvaShape
          listening={false}
          sceneFunc={(c) => {
            c.setAttr("strokeStyle", col);
            c.setAttr("lineCap", "round");
            c.setAttr("lineJoin", "round");
            c.setAttr("lineWidth", sw);
            for (let pass = 0; pass < 3; pass++) {
              const jx = (noise(pass * 3.1) - 0.5) * sw * 1.5;
              const jy = (noise(pass * 5.7 + 1) - 0.5) * sw * 1.5;
              c.setAttr("globalAlpha", 0.5);
              c.beginPath();
              for (let i = 0; i + 1 < pts.length; i += 2) {
                const x = pts[i] + jx + (noise(i * 0.7 + pass) - 0.5) * sw * 0.6;
                const y = pts[i + 1] + jy + (noise(i * 0.9 + pass + 2) - 0.5) * sw * 0.6;
                if (i === 0) c.moveTo(x, y);
                else c.lineTo(x, y);
              }
              c.stroke();
            }
            c.setAttr("globalAlpha", 1);
          }}
        />,
      );
    }

    // Rainbow: a smoothed polyline stroked with a rainbow gradient.
    if (layer.rainbow) {
      return wrap(
        <Line
          points={pts}
          strokeLinearGradientStartPoint={{ x: 0, y: 0 }}
          strokeLinearGradientEndPoint={{ x: w, y: 0 }}
          strokeLinearGradientColorStops={[
            0, "#ff2d55", 0.17, "#ff8c00", 0.34, "#ffe000", 0.5, "#00c853",
            0.67, "#00b0ff", 0.84, "#7c4dff", 1, "#ff2d55",
          ]}
          strokeWidth={layer.strokeWidth ?? 8}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          dash={layer.dash}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />,
      );
    }

    // Default: a smoothed polyline stroked in the fill colour.
    return wrap(
      <Line
        points={pts}
        stroke={col}
        strokeWidth={layer.strokeWidth ?? 8}
        lineCap="round"
        lineJoin="round"
        tension={0.4}
        dash={layer.dash}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />,
    );
  }

  if (layer.shape === "printRules") {
    return <KonvaShape listening={false} sceneFunc={(c) => printRulesPaint(c, w, h, ctx.time, resolveColor(layer.fill, ctx.theme))} />;
  }

  if (layer.shape === "misprintBlock") {
    const seed = (layer.x + layer.y) * 0.013;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) =>
          misprintPaint(c, w, h, ctx.time, resolveColor(layer.fill, ctx.theme), resolveColor("@accentSecondary", ctx.theme), resolveColor("@text", ctx.theme), seed)
        }
      />
    );
  }

  if (layer.shape === "halftoneField") {
    return <KonvaShape listening={false} sceneFunc={(c) => halftonePaint(c, w, h, ctx.time, resolveColor(layer.fill, ctx.theme))} />;
  }

  if (layer.shape === "auroraField") {
    const toks = layer.facetColors ?? ["@primary", "@secondary", "@accent"];
    const cols = toks.map((t) => resolveColor(t, ctx.theme));
    const seed = (layer.x + layer.y) * 0.013;
    const bloom = 1 + (layer.cornerRadius ?? 0) / 100;
    return <KonvaShape listening={false} sceneFunc={(c) => drawAurora(c, w, h, ctx.time, cols, seed, bloom)} />;
  }

  if (layer.shape === "silkRibbon") {
    const accent = resolveColor((layer.fill ?? "@accent").split("/")[0], ctx.theme);
    const glow = layer.effects.glow?.strength ?? 22;
    const seed = (layer.x + layer.y) * 0.013;
    const bloom = 1 + (layer.cornerRadius ?? 0) / 100;
    return <KonvaShape listening={false} sceneFunc={(c) => drawSilk(c, w, h, ctx.time, accent, glow, seed, bloom)} />;
  }

  if (layer.shape === "bloomVeil") {
    const toks = layer.facetColors ?? ["@accent", "@secondary"];
    const hot = resolveColor(toks[0], ctx.theme);
    const cool = resolveColor(toks[1] ?? toks[0], ctx.theme);
    const seed = (layer.x + layer.y) * 0.013;
    return <KonvaShape listening={false} sceneFunc={(c) => drawBloomVeil(c, w, h, ctx.time, hot, cool, seed)} />;
  }

  if (layer.shape === "arcsplit") {
    // Fills the region below an arc across the top of the box. Lay it over
    // another colour and the screen splits into two along the curve.
    const bend = layer.cornerRadius ?? 0;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, s) => {
          c.beginPath();
          c.moveTo(0, bend);
          c.quadraticCurveTo(w / 2, -bend, w, bend);
          c.lineTo(w, h);
          c.lineTo(0, h);
          c.closePath();
          c.fillStrokeShape(s);
        }}
      />
    );
  }

  if (layer.shape === "wavesplit") {
    // Fills below a multi-peak wave across the box — a wavy divider.
    const amp = (layer.cornerRadius ?? 40) || 1;
    const peaks = 3;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, s) => {
          const steps = 64;
          c.beginPath();
          c.moveTo(0, amp);
          for (let i = 1; i <= steps; i++) {
            const x = (w * i) / steps;
            const y = amp + Math.sin((i / steps) * Math.PI * 2 * peaks) * amp;
            c.lineTo(x, y);
          }
          c.lineTo(w, h);
          c.lineTo(0, h);
          c.closePath();
          c.fillStrokeShape(s);
        }}
      />
    );
  }

  if (layer.shape === "diagonalsplit") {
    // Fills below a straight slanted edge through the box — a diagonal divider.
    const slant = layer.cornerRadius ?? 0;
    const mid = h / 2;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, s) => {
          c.beginPath();
          c.moveTo(0, mid - slant);
          c.lineTo(w, mid + slant);
          c.lineTo(w, h);
          c.lineTo(0, h);
          c.closePath();
          c.fillStrokeShape(s);
        }}
      />
    );
  }

  if (layer.shape === "zigzagsplit") {
    // Fills below a zigzag edge across the box — a jagged divider.
    const amp = (layer.cornerRadius ?? 40) || 1;
    const teeth = 10;
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, s) => {
          c.beginPath();
          c.moveTo(0, amp);
          for (let i = 1; i <= teeth; i++) {
            c.lineTo((w * i) / teeth, i % 2 === 0 ? 2 * amp : 0);
          }
          c.lineTo(w, h);
          c.lineTo(0, h);
          c.closePath();
          c.fillStrokeShape(s);
        }}
      />
    );
  }

  if (layer.shape === "flagarc") {
    // Flag stripes bent into parallel arcs — a curved pride band, any direction
    // via the layer's rotation.
    const cols =
      layer.facetColors && layer.facetColors.length
        ? layer.facetColors
        : ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
    const n = cols.length;
    const bend = layer.cornerRadius ?? 0;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const steps = 40;
          const arc = (x: number) => bend * (1 - Math.pow((2 * x) / w - 1, 2));
          for (let i = 0; i < n; i++) {
            const y0 = (i / n) * h;
            const y1 = ((i + 1) / n) * h;
            c.setAttr("fillStyle", cols[i]);
            c.beginPath();
            c.moveTo(0, y0 + arc(0));
            for (let sIdx = 1; sIdx <= steps; sIdx++) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y0 + arc(x));
            }
            for (let sIdx = steps; sIdx >= 0; sIdx--) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y1 + arc(x));
            }
            c.closePath();
            c.fill();
          }
        }}
      />
    );
  }

  if (layer.shape === "flagwave") {
    // Flag stripes bent into parallel waves — a wavy pride band.
    const cols =
      layer.facetColors && layer.facetColors.length
        ? layer.facetColors
        : ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
    const n = cols.length;
    const amp = layer.cornerRadius ?? 40;
    const peaks = 2;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const steps = 48;
          const off = (x: number) => amp * Math.sin((x / w) * Math.PI * 2 * peaks);
          for (let i = 0; i < n; i++) {
            const y0 = (i / n) * h;
            const y1 = ((i + 1) / n) * h;
            c.setAttr("fillStyle", cols[i]);
            c.beginPath();
            c.moveTo(0, y0 + off(0));
            for (let sIdx = 1; sIdx <= steps; sIdx++) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y0 + off(x));
            }
            for (let sIdx = steps; sIdx >= 0; sIdx--) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y1 + off(x));
            }
            c.closePath();
            c.fill();
          }
        }}
      />
    );
  }

  if (layer.shape === "flaground") {
    // Flag stripes as concentric rings — a round pride burst.
    const cols =
      layer.facetColors && layer.facetColors.length
        ? layer.facetColors
        : ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
    const n = cols.length;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const cx = w / 2, cy = h / 2;
          const maxR = Math.min(w, h) / 2;
          for (let i = 0; i < n; i++) {
            c.setAttr("fillStyle", cols[i]);
            c.beginPath();
            c.arc(cx, cy, maxR * (1 - i / n), 0, Math.PI * 2);
            c.fill();
          }
        }}
      />
    );
  }

  if (layer.shape === "flagrays") {
    // Flag colours as wedges radiating from the centre — a sunburst.
    const cols =
      layer.facetColors && layer.facetColors.length
        ? layer.facetColors
        : ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
    const n = cols.length;
    const rays = n * 2;
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const cx = w / 2, cy = h / 2;
          const R = Math.hypot(w, h);
          for (let i = 0; i < rays; i++) {
            c.setAttr("fillStyle", cols[i % n]);
            c.beginPath();
            c.moveTo(cx, cy);
            c.arc(cx, cy, R, (i / rays) * Math.PI * 2, ((i + 1) / rays) * Math.PI * 2);
            c.closePath();
            c.fill();
          }
        }}
      />
    );
  }

  if (layer.shape === "flagzig") {
    // Flag stripes bent into parallel zigzags.
    const cols =
      layer.facetColors && layer.facetColors.length
        ? layer.facetColors
        : ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
    const n = cols.length;
    const amp = layer.cornerRadius ?? 40;
    const teeth = 8;
    const off = (x: number) => {
      const t = ((x / w) * teeth) % 1;
      return (t < 0.5 ? t * 2 : 2 - t * 2) * 2 * amp - amp;
    };
    return (
      <KonvaShape
        listening={false}
        sceneFunc={(c) => {
          const steps = teeth * 2;
          for (let i = 0; i < n; i++) {
            const y0 = (i / n) * h;
            const y1 = ((i + 1) / n) * h;
            c.setAttr("fillStyle", cols[i]);
            c.beginPath();
            c.moveTo(0, y0 + off(0));
            for (let sIdx = 1; sIdx <= steps; sIdx++) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y0 + off(x));
            }
            for (let sIdx = steps; sIdx >= 0; sIdx--) {
              const x = (w * sIdx) / steps;
              c.lineTo(x, y1 + off(x));
            }
            c.closePath();
            c.fill();
          }
        }}
      />
    );
  }

  if (layer.shape === "chamfer") {
    return <Line closed points={chamferPoints(w, h)} {...paint} />;
  }

  if (layer.shape === "carbon") {
    const base = resolveColor(layer.fill, ctx.theme);
    return (
      <KonvaShape
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c) => {
          c.save();
          c.beginPath();
          c.rect(0, 0, w, h);
          c.clip();
          c.setAttr("fillStyle", base);
          c.fillRect(0, 0, w, h);
          // Basket-weave: a light diagonal per cell, alternating direction on a
          // checkerboard — the carbon-fibre tell.
          const s = 16;
          c.setAttr("lineWidth", 3);
          for (let x = 0; x < w; x += s) {
            for (let y = 0; y < h; y += s) {
              const flip = ((x / s + y / s) & 1) === 0;
              c.setAttr("strokeStyle", flip ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.28)");
              c.beginPath();
              if (flip) {
                c.moveTo(x, y + s);
                c.lineTo(x + s, y);
              } else {
                c.moveTo(x, y);
                c.lineTo(x + s, y + s);
              }
              c.stroke();
            }
          }
          c.restore();
        }}
      />
    );
  }

  if (layer.shape === "coffin") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          coffinPath(c, w, h);
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (layer.shape === "plaque") {
    return <KonvaShape {...paint} sceneFunc={(c, shape) => { plaquePath(c, w, h); c.fillStrokeShape(shape); }} />;
  }

  if (layer.shape === "damask" || layer.shape === "harlequin") {
    const stroke = fill ?? resolveColor(layer.fill, ctx.theme);
    const drawPattern = layer.shape === "harlequin" ? harlequinPath : damaskPath;
    return (
      <KonvaShape
        listening={false}
        stroke={stroke}
        strokeWidth={Math.max(1, layer.strokeWidth ?? 1.4)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c, shape) => {
          c.save();
          c.beginPath();
          c.rect(0, 0, w, h);
          c.clip();
          drawPattern(c, w, h);
          c.strokeShape(shape);
          c.restore();
        }}
      />
    );
  }

  if (layer.shape === "gem") {
    const base = resolveColor(layer.fill, ctx.theme);
    const cx = w / 2;
    const cy = h / 2;
    const t: [number, number] = [cx, 0];
    const r: [number, number] = [w, cy];
    const bo: [number, number] = [cx, h];
    const l: [number, number] = [0, cy];
    const border = layer.effects.border;
    const rhombus = (c: Konva.Context) => {
      c.beginPath();
      c.moveTo(t[0], t[1]);
      c.lineTo(r[0], r[1]);
      c.lineTo(bo[0], bo[1]);
      c.lineTo(l[0], l[1]);
      c.closePath();
    };
    return (
      <KonvaShape
        listening={false}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        sceneFunc={(c) => {
          // A clean diamond in the main colour, lit from the top and shaded
          // toward the bottom — the depth comes from a gradient, not facets.
          // The node's shadow (glow) is applied to this fill by Konva.
          const g = c.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, lighten(base, 16));
          g.addColorStop(0.5, base);
          g.addColorStop(1, darken(base, 26));
          rhombus(c);
          c.setAttr("fillStyle", g);
          c.fill();

          // Inside-only highlight (top edges) and shadow (bottom edges).
          c.save();
          rhombus(c);
          c.clip();
          c.setAttr("shadowColor", "transparent");
          c.setAttr("shadowBlur", 0);
          c.setAttr("lineJoin", "round");
          c.setAttr("strokeStyle", withAlpha(darken(base, 50), 0.6));
          c.setAttr("lineWidth", Math.max(4, Math.min(w, h) * 0.08));
          c.beginPath();
          c.moveTo(l[0], l[1]);
          c.lineTo(bo[0], bo[1]);
          c.lineTo(r[0], r[1]);
          c.stroke();
          c.setAttr("strokeStyle", withAlpha(lighten(base, 45), 0.7));
          c.setAttr("lineWidth", Math.max(2, Math.min(w, h) * 0.035));
          c.beginPath();
          c.moveTo(l[0], l[1]);
          c.lineTo(t[0], t[1]);
          c.lineTo(r[0], r[1]);
          c.stroke();
          c.restore();

          if (border.enabled) {
            rhombus(c);
            c.setAttr("strokeStyle", resolveColor(border.color, ctx.theme));
            c.setAttr("lineWidth", border.width);
            c.stroke();
          }
        }}
      />
    );
  }

  if (layer.shape === "scroll") {
    const rod = resolveColor("@accent", ctx.theme);
    const rollW = Math.min(w * 0.045, 20);
    const inset = rollW * 1.6;
    const bodyR = Math.min(layer.cornerRadius || 6, h * 0.45);
    return (
      <Group listening={false} {...shadowProps(layer.effects, ctx.theme, glowBoost)}>
        {/* The parchment sheet, tucked under the rods at each end. */}
        <Rect x={inset} y={h * 0.05} width={Math.max(0, w - inset * 2)} height={h * 0.9} cornerRadius={bodyR} {...paint} />
        {/* Two rolled rods — vertical cylinders read as a scroll. */}
        <Rect x={0} y={0} width={rollW * 2} height={h} cornerRadius={rollW} fill={rod} />
        <Rect x={w - rollW * 2} y={0} width={rollW * 2} height={h} cornerRadius={rollW} fill={rod} />
        {/* A soft sheen down each rod so it reads as round, not flat. */}
        <Rect x={rollW * 0.6} y={h * 0.12} width={Math.max(1.5, rollW * 0.4)} height={h * 0.76} cornerRadius={rollW * 0.2} fill={withAlpha(lighten(rod, 40), 0.5)} />
        <Rect x={w - rollW * 1.4} y={h * 0.12} width={Math.max(1.5, rollW * 0.4)} height={h * 0.76} cornerRadius={rollW * 0.2} fill={withAlpha(lighten(rod, 40), 0.5)} />
      </Group>
    );
  }

  if (layer.shape === "bubble") {
    return (
      <KonvaShape
        {...paint}
        sceneFunc={(c, shape) => {
          bubblePath(c, w, h);
          c.fillStrokeShape(shape);
        }}
      />
    );
  }

  return <Line closed points={polygonPoints(layer.shape, w, h)} {...paint} />;
}

/** A rounded speech bubble with a tail hanging from the lower-left. */
function bubblePath(c: Konva.Context, w: number, h: number) {
  const bodyH = h * 0.8;
  const r = Math.min(30, w * 0.1, bodyH * 0.4);
  c.beginPath();
  c.moveTo(r, 0);
  c.lineTo(w - r, 0);
  c.arcTo(w, 0, w, r, r);
  c.lineTo(w, bodyH - r);
  c.arcTo(w, bodyH, w - r, bodyH, r);
  c.lineTo(r, bodyH);
  c.arcTo(0, bodyH, 0, bodyH - r, r);
  c.lineTo(0, r);
  c.arcTo(0, 0, r, 0, r);
  c.closePath();
  // The tail — a triangle overlapping the body so the fill unions cleanly.
  c.moveTo(w * 0.2, bodyH - 6);
  c.lineTo(w * 0.32, bodyH - 6);
  c.lineTo(w * 0.16, h);
  c.closePath();
}


/**
 * A corner spiderweb: straight spokes from the anchor, and threads that sag
 * inward between them. The sag is what separates a web from a dartboard.
 */
function webPath(c: Konva.Context, w: number, h: number) {
  const spokes = 7;
  const rings = 5;
  const R = Math.hypot(w, h);
  c.beginPath();
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * R * 0.92;
    for (let i = 0; i < spokes; i++) {
      const a1 = (i / spokes) * (Math.PI / 2);
      const a2 = ((i + 1) / spokes) * (Math.PI / 2);
      const am = (a1 + a2) / 2;
      const sag = rad * 0.82;
      c.moveTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
      c.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, Math.cos(a2) * rad, Math.sin(a2) * rad);
    }
  }
}

/** A panel whose bottom melts. Drips are teardrops — they swell before the tip. */
function dripPath(c: Konva.Context, w: number, h: number, r: number) {
  const lip = h * 0.66;
  const lobes = 5;
  const TAU = Math.PI * 2;
  c.beginPath();
  c.moveTo(r, 0);
  c.arcTo(w, 0, w, h, r);
  c.lineTo(w, lip);
  for (let i = lobes - 1; i >= 0; i--) {
    const x1 = (w * (i + 1)) / lobes;
    const x0 = (w * i) / lobes;
    const mid = (x0 + x1) / 2;
    const depth = lip + (0.06 + noise(i * 3.7) * 0.16) * h;
    const bulge = (x1 - x0) * 0.34;
    c.bezierCurveTo(x1 - bulge * 0.2, lip + (depth - lip) * 0.35, mid + bulge, depth - (depth - lip) * 0.18, mid, depth);
    c.bezierCurveTo(mid - bulge, depth - (depth - lip) * 0.18, x0 + bulge * 0.2, lip + (depth - lip) * 0.35, x0, lip);
  }
  c.lineTo(0, r);
  c.arcTo(0, 0, w, 0, r);
  c.closePath();
  for (let i = 0; i < 3; i++) {
    const dx = w * (0.18 + noise(i * 5.1) * 0.64);
    const dy = lip + h * (0.3 + noise(i * 7.3) * 0.16);
    const dr = w * (0.012 + noise(i * 9.7) * 0.014);
    c.moveTo(dx + dr, dy);
    c.arc(dx, dy, dr, 0, TAU, false);
  }
}

/**
 * Graveyard horizon. Everything is planted *on* the hill curve — a headstone
 * hovering above the ground is the tell of a silhouette assembled by eye.
 */
function graveyardPath(c: Konva.Context, w: number, h: number) {
  const hillY = (t: number) => h * 0.66 - Math.sin(t * Math.PI) * h * 0.26 - Math.sin(t * Math.PI * 2.7) * h * 0.04;

  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(0, hillY(0));
  for (let i = 1; i <= 60; i++) c.lineTo((w * i) / 60, hillY(i / 60));
  c.lineTo(w, h);
  c.closePath();

  const bar = (cx: number, cy: number, bw: number, bh: number) => {
    c.moveTo(cx - bw / 2, cy);
    c.lineTo(cx + bw / 2, cy);
    c.lineTo(cx + bw / 2, cy - bh);
    c.lineTo(cx - bw / 2, cy - bh);
    c.closePath();
  };
  const cross = (t: number, s: number) => {
    const cx = w * t;
    const cy = hillY(t) + 2;
    bar(cx, cy, s * 0.22, s); // upright
    bar(cx, cy - s * 0.72, s * 0.72, s * 0.2); // arms
  };
  const headstone = (t: number, s: number) => {
    const cx = w * t;
    const cy = hillY(t) + 2;
    c.moveTo(cx - s * 0.32, cy);
    c.lineTo(cx - s * 0.32, cy - s * 0.5);
    c.arc(cx, cy - s * 0.5, s * 0.32, Math.PI, 0, false);
    c.lineTo(cx + s * 0.32, cy);
    c.closePath();
  };

  headstone(0.13, h * 0.34);
  cross(0.26, h * 0.32);
  cross(0.79, h * 0.26);

  const t0 = 0.4;
  const t1 = 0.62;
  const ph = h * 0.2;
  for (let i = 0; i < 8; i++) {
    const t = t0 + (i / 7) * (t1 - t0);
    const cx = w * t;
    const cy = hillY(t) + 2;
    const pw = w * 0.012;
    c.moveTo(cx - pw, cy);
    c.lineTo(cx - pw, cy - ph);
    c.lineTo(cx, cy - ph - pw * 1.4);
    c.lineTo(cx + pw, cy - ph);
    c.lineTo(cx + pw, cy);
    c.closePath();
  }
  for (const rail of [0.62, 0.86]) {
    c.moveTo(w * t0, hillY(t0) - ph * rail);
    for (let i = 1; i <= 20; i++) {
      const t = t0 + (i / 20) * (t1 - t0);
      c.lineTo(w * t, hillY(t) - ph * rail);
    }
    for (let i = 20; i >= 0; i--) {
      const t = t0 + (i / 20) * (t1 - t0);
      c.lineTo(w * t, hillY(t) - ph * rail + h * 0.016);
    }
    c.closePath();
  }
}

/**
 * A chain reads as a chain only when its links *interlock*: alternate a
 * face-on ring with an edge-on one, overlap them, and stroke them as rings.
 * Filled, evenly spaced ovals read as loose beads.
 */
function chainPath(c: Konva.Context, w: number, h: number) {
  const TAU = Math.PI * 2;
  const pendant = w * 1.9;
  const usable = Math.max(w, h - pendant);
  const linkHeight = w * 0.86;
  const step = linkHeight * 0.62; // < linkHeight, so consecutive links overlap
  const links = Math.max(3, Math.floor(usable / step));

  c.beginPath();
  for (let i = 0; i < links; i++) {
    const cy = step * i + linkHeight / 2;
    const faceOn = i % 2 === 0;
    const rx = faceOn ? w * 0.4 : w * 0.15;
    c.moveTo(w / 2 + rx, cy);
    c.ellipse(w / 2, cy, rx, linkHeight * 0.46, 0, 0, TAU, false);
  }
}

/** The cross pendant that finishes a chain. Filled, unlike the stroked links. */
function pendantPath(c: Konva.Context, w: number, h: number) {
  const pendant = w * 1.9;
  const usable = Math.max(w, h - pendant);
  const step = w * 0.86 * 0.62;
  const links = Math.max(3, Math.floor(usable / step));
  const cy = step * links + pendant * 0.42;
  const s = w * 0.95;
  const a = s * 0.17;
  const arm = s * 0.52;
  const up = s * 0.3;
  const cx = w / 2;

  c.beginPath();
  c.moveTo(cx - a, cy - s * 0.62);
  c.lineTo(cx + a, cy - s * 0.62);
  c.lineTo(cx + a, cy - up);
  c.lineTo(cx + arm, cy - up);
  c.lineTo(cx + arm, cy - up + a * 1.5);
  c.lineTo(cx + a, cy - up + a * 1.5);
  c.lineTo(cx + a * 0.7, cy + s * 0.75);
  c.lineTo(cx, cy + s * 0.95);
  c.lineTo(cx - a * 0.7, cy + s * 0.75);
  c.lineTo(cx - a, cy - up + a * 1.5);
  c.lineTo(cx - arm, cy - up + a * 1.5);
  c.lineTo(cx - arm, cy - up);
  c.lineTo(cx - a, cy - up);
  c.closePath();
}

/** A casket: narrow head, widest at the shoulders, tapering to the foot. */
function coffinPath(c: Konva.Context, w: number, h: number) {
  c.beginPath();
  c.moveTo(w * 0.3, 0);
  c.lineTo(w * 0.7, 0);
  c.lineTo(w, h * 0.24);
  c.lineTo(w * 0.86, h);
  c.lineTo(w * 0.14, h);
  c.lineTo(0, h * 0.24);
  c.closePath();
}

/** The same casket laid on its side: narrow head at the left, wider foot at
    the right, shoulders a quarter of the way in — the landscape alert plate. */
function coffinPathH(c: Konva.Context, w: number, h: number) {
  c.beginPath();
  c.moveTo(0, h * 0.3);
  c.lineTo(w * 0.24, 0);
  c.lineTo(w, h * 0.14);
  c.lineTo(w, h * 0.86);
  c.lineTo(w * 0.24, h);
  c.lineTo(0, h * 0.7);
  c.closePath();
}

/**
 * The moulded-plastic sweep: a light wash over the top of a rounded box and a
 * darkened lip along its bottom. Clipped to the box, so it never spills.
 */
function drawGloss(c: Konva.Context, w: number, h: number, r: number, strength: number) {
  c.save();
  c.beginPath();
  c.moveTo(r, 0);
  c.arcTo(w, 0, w, h, r);
  c.arcTo(w, h, 0, h, r);
  c.arcTo(0, h, 0, 0, r);
  c.arcTo(0, 0, w, 0, r);
  c.closePath();
  c.clip();

  const top = c.createLinearGradient(0, 0, 0, h * 0.55);
  top.addColorStop(0, `rgba(255,255,255,${0.55 * strength})`);
  top.addColorStop(1, "rgba(255,255,255,0)");
  c.setAttr("fillStyle", top);
  c.fillRect(0, 0, w, h * 0.55);

  const lip = c.createLinearGradient(0, h * 0.6, 0, h);
  lip.addColorStop(0, "rgba(0,0,0,0)");
  lip.addColorStop(1, `rgba(0,0,0,${0.35 * strength})`);
  c.setAttr("fillStyle", lip);
  c.fillRect(0, h * 0.6, w, h * 0.4);
  c.restore();
}

/**
 * Glass reflection: a faint top sheen plus two diagonal light glints sweeping
 * across the pane, the way a window reflects a light source. Clipped to the
 * rounded rect so it stays inside the glass.
 */
function drawReflection(c: Konva.Context, w: number, h: number, r: number, strength: number) {
  c.save();
  c.beginPath();
  c.moveTo(r, 0);
  c.arcTo(w, 0, w, h, r);
  c.arcTo(w, h, 0, h, r);
  c.arcTo(0, h, 0, 0, r);
  c.arcTo(0, 0, w, 0, r);
  c.closePath();
  c.clip();

  const sheen = c.createLinearGradient(0, 0, 0, h * 0.45);
  sheen.addColorStop(0, `rgba(255,255,255,${0.12 * strength})`);
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  c.setAttr("fillStyle", sheen);
  c.fillRect(0, 0, w, h * 0.45);

  // A diagonal band crossing the pane. `band` is its half-width; `alpha` its
  // peak brightness. A wide soft one is the reflection body; a thin bright one
  // just ahead of it is the crisp glint along its edge.
  const streak = (centreX: number, band: number, alpha: number) => {
    c.save();
    c.translate(centreX, h / 2);
    c.rotate(-0.5);
    const g = c.createLinearGradient(-band, 0, band, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * strength})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", g);
    c.fillRect(-band, -h * 1.8, band * 2, h * 3.6);
    c.restore();
  };
  streak(w * 0.3, w * 0.19, 0.26); // wide soft reflection body
  streak(w * 0.47, w * 0.022, 0.7); // crisp glint on its leading edge
  streak(w * 0.53, w * 0.012, 0.45); // faint trailing glint
  c.restore();
}

/**
 * Liquid glass: the Apple-style pane. A frosted base, a big soft lens caustic
 * that drifts across the surface (the "liquid" part), a bright specular rim on
 * the top-left inner edge, and a faint cyan/magenta chromatic fringe where the
 * edge refracts. A pure function of `time`, so it loops seamlessly and exports
 * frame-for-frame. Clipped to the rounded rect.
 */
function drawLiquid(c: Konva.Context, w: number, h: number, r: number, strength: number, time: number) {
  const t = time / 1000;
  const rr = (ctx: Konva.Context) => {
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
  };

  c.save();
  rr(c);
  c.clip();

  // Frosted top sheen and a soft shadow lip at the foot.
  const top = c.createLinearGradient(0, 0, 0, h * 0.6);
  top.addColorStop(0, `rgba(255,255,255,${0.26 * strength})`);
  top.addColorStop(1, "rgba(255,255,255,0)");
  c.setAttr("fillStyle", top);
  c.fillRect(0, 0, w, h * 0.6);
  const lip = c.createLinearGradient(0, h * 0.62, 0, h);
  lip.addColorStop(0, "rgba(0,0,0,0)");
  lip.addColorStop(1, `rgba(0,0,0,${0.2 * strength})`);
  c.setAttr("fillStyle", lip);
  c.fillRect(0, h * 0.62, w, h * 0.38);

  // The drifting lens caustic — a big soft bright pool on a slow Lissajous path.
  const rad = Math.max(w, h) * 0.6;
  const blob = (cx: number, cy: number, radius: number, alpha: number) => {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(255,255,255,${alpha * strength})`);
    g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.3 * strength})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", g);
    c.beginPath();
    c.arc(cx, cy, radius, 0, Math.PI * 2);
    c.fill();
  };
  blob(w * 0.5 + Math.sin(t * 0.6) * w * 0.28, h * 0.42 + Math.sin(t * 0.9 + 1.3) * h * 0.3, rad, 0.32);
  blob(w * 0.5 + Math.cos(t * 0.8 + 2) * w * 0.3, h * 0.55 + Math.cos(t * 0.5) * h * 0.26, rad * 0.42, 0.22);
  c.restore();

  // Specular rim + chromatic fringe on the inner edge. Clipped, so only the
  // inside half of each stroke shows — a crisp lit lip on the glass.
  c.save();
  rr(c);
  c.clip();
  c.setAttr("lineJoin", "round");
  // cyan and magenta offsets — the refraction rainbow at the edge.
  c.setAttr("lineWidth", 2.5);
  c.setAttr("strokeStyle", `rgba(120,220,255,${0.35 * strength})`);
  c.save();
  c.translate(-1.4, -1.4);
  rr(c);
  c.stroke();
  c.restore();
  c.setAttr("strokeStyle", `rgba(255,120,220,${0.3 * strength})`);
  c.save();
  c.translate(1.4, 1.4);
  rr(c);
  c.stroke();
  c.restore();
  // bright white specular rim on top.
  c.setAttr("lineWidth", 2);
  c.setAttr("strokeStyle", `rgba(255,255,255,${0.6 * strength})`);
  rr(c);
  c.stroke();
  c.restore();
}

/** Linearly blend two `#rrggbb` colours; `t` = 0 → a, 1 → b. Non-hex inputs
    (e.g. an already-alpha'd token) fall back to `a`. */
function mixColors(a: string, b: string, t: number): string {
  const pa = /^#?([0-9a-fA-F]{6})$/.exec(a.trim());
  const pb = /^#?([0-9a-fA-F]{6})$/.exec(b.trim());
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const lerp = (shift: number) => {
    const ca = (na >> shift) & 255;
    const cb = (nb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  return `rgb(${lerp(16)},${lerp(8)},${lerp(0)})`;
}

/** An SVG arc path spanning the box width for curved text. `curve` (-100…100)
    bends it: positive arches up, negative down; ~0 is a straight baseline. */
function arcPathData(w: number, h: number, curve: number): string {
  const c = Math.max(-100, Math.min(100, curve)) / 100;
  const yMid = h / 2;
  if (Math.abs(c) < 0.02) return `M0,${yMid} L${w},${yMid}`;
  const sag = Math.abs(c) * w * 0.32;
  const R = (sag * sag + (w / 2) * (w / 2)) / (2 * sag);
  const sweep = c > 0 ? 1 : 0;
  const y0 = c > 0 ? yMid + sag * 0.5 : yMid - sag * 0.5;
  return `M0,${y0} A${R.toFixed(2)},${R.toFixed(2)} 0 0 ${sweep} ${w},${y0}`;
}

/** A literal hex (#rrggbb) as an rgba() string at alpha `a`. */
function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * A full sheet of glass laid over the scene: a faint facet pattern, prismatic
 * colour where light refracts, and wide diagonal reflections. Everything is
 * drawn with light, translucent highlights only, so whatever sits beneath still
 * reads through — it just looks like it is behind a pane of glass.
 *
 * The whole thing breathes with `time`: the prism colours drift and pulse and
 * the reflections sway, all on sine phases so any loop point is seamless.
 * `facetColors` (a pride flag, per palette) turns the prism into that spectrum;
 * without it the glass catches the default cyan/magenta/gold tints.
 */
function drawGlassSheet(
  c: Konva.Context,
  w: number,
  h: number,
  strength: number,
  time: number,
  glossy: boolean,
  facetMode: "sides" | "stripes",
  facetColors?: string[],
) {
  const ph = time / 1000;
  c.save();
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();

  const facet = (cx: number, cy: number, rad: number, col: string) => {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", g);
    c.beginPath();
    c.arc(cx, cy, rad, 0, Math.PI * 2);
    c.fill();
  };

  if (facetColors && facetColors.length) {
    const n = facetColors.length;
    const scroll = Math.floor(ph * 0.6);
    if (facetMode === "stripes") {
      // A full field of thin diagonal pride pinstripes across the whole pane,
      // drifting slowly — the busier "flag through the glass" look.
      const step = 26;
      const period = step * n;
      const drift = (((ph * 8) % period) + period) % period;
      c.save();
      c.setAttr("lineCap", "butt");
      c.setAttr("lineWidth", glossy ? 7 : 9);
      c.setAttr("shadowBlur", 12); // plasma-style neon glow in each line's colour
      for (let x = -h - period; x < w + step; x += step) {
        const idx = ((Math.floor((x + drift) / step) % n) + n) % n;
        c.setAttr("shadowColor", facetColors[idx]);
        c.setAttr("strokeStyle", hexAlpha(facetColors[idx], (glossy ? 0.42 : 0.32) * strength));
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + h, h);
        c.stroke();
      }
      c.restore();
    } else {
      // A few thicker pride lines running at the same angle as the reflection,
      // grouped down one side (the left). They run the full height of the pane —
      // clipped to it, top edge to bottom edge — like the reflection, not a
      // short segment floating in the middle. Colours scroll slowly so it
      // shimmers.
      const lineW = glossy ? 15 : 17;
      const gap = 9;
      const len = h * 1.2; // over-long, clipped to the pane so it spans edge to edge
      c.save();
      c.translate(w * 0.1, h / 2); // left-side anchor
      c.rotate(-0.5); // the reflection's angle
      c.setAttr("lineCap", "butt");
      c.setAttr("lineWidth", lineW);
      c.setAttr("shadowBlur", 22); // plasma-style neon glow in each line's colour
      for (let i = 0; i < n; i++) {
        const idx = (((i + scroll) % n) + n) % n;
        const off = (i - (n - 1) / 2) * (lineW + gap); // perpendicular, centred
        c.setAttr("shadowColor", facetColors[idx]);
        c.setAttr("strokeStyle", hexAlpha(facetColors[idx], (glossy ? 0.7 : 0.6) * strength));
        c.beginPath();
        c.moveTo(off, -len);
        c.lineTo(off, len);
        c.stroke();
      }
      c.restore();
    }
  } else {
    // Faint diagonal facet lines — the texture of plain glass.
    c.setAttr("strokeStyle", `rgba(255,255,255,${0.03 * strength})`);
    c.setAttr("lineWidth", 1.5);
    for (let x = -h; x < w; x += 94) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + h, h);
      c.stroke();
    }
    // Default prism tints — cyan, magenta, warm gold, softly pulsing.
    const pulse = (i: number) => 0.7 + 0.3 * Math.sin(ph * 0.9 + i);
    facet(w * 0.52, h * 0.24, w * 0.2, hexAlpha("#5ac8ff", 0.13 * strength * pulse(0)));
    facet(w * 0.66, h * 0.52, w * 0.17, hexAlpha("#ff78dc", 0.11 * strength * pulse(1)));
    facet(w * 0.58, h * 0.78, w * 0.15, hexAlpha("#ffe182", 0.1 * strength * pulse(2)));
  }

  // Reflections, swaying slowly so the caught light plays across the glass.
  const streak = (centreX: number, band: number, alpha: number) => {
    c.save();
    c.translate(centreX, h / 2);
    c.rotate(-0.5);
    const g = c.createLinearGradient(-band, 0, band, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * strength})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", g);
    c.fillRect(-band, -h * 1.8, band * 2, h * 3.6);
    c.restore();
  };
  const sway = Math.sin(ph * 0.35) * w * 0.05;
  if (glossy) {
    // Glossy glass: a wet top-left sheen and a bright, crisp specular glint —
    // the look of polished, shiny glass catching a hard light.
    const sheen = c.createLinearGradient(0, 0, w * 0.55, h * 0.55);
    sheen.addColorStop(0, `rgba(255,255,255,${0.16 * strength})`);
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", sheen);
    c.fillRect(0, 0, w, h);
    streak(w * 0.34 + sway, w * 0.13, 0.12); // soft reflection body
    streak(w * 0.66 + sway, w * 0.04, 0.2); // narrower body
    streak(w * 0.71 + sway, w * 0.012, 0.44); // hard, bright glint
  } else {
    // Matte (frosted) glass: the light is diffused into a soft, even glow with
    // wide low-contrast reflections and no hard glint.
    const soft = c.createLinearGradient(0, 0, 0, h);
    soft.addColorStop(0, `rgba(255,255,255,${0.08 * strength})`);
    soft.addColorStop(1, "rgba(255,255,255,0)");
    c.setAttr("fillStyle", soft);
    c.fillRect(0, 0, w, h);
    streak(w * 0.4 + sway, w * 0.24, 0.06);
    streak(w * 0.6 + sway, w * 0.17, 0.05);
  }
  c.restore();
}

/**
 * A thrown-paint splatter drawn as one path: an irregular lobed blob, thin
 * curved tendrils ending in flung tip droplets, fling-stretched satellite
 * drops and fine speckle. Handed to fillStrokeShape so the layer's fill + glow
 * bloom a hard-edged paint mark, not an ellipse orb. `seed` salts each instance.
 */
function paintSplatPath(c: Konva.Context, w: number, h: number, time: number, seed: number) {
  const TAU = Math.PI * 2;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.3;
  const S = seed;
  const breathe = 1 + 0.012 * Math.sin(time / 1600);
  c.beginPath();

  // (1) Central blob with soft rounded lobes — a wavy bulbous outline, with a
  // few bumps reaching further. Curve passes through edge midpoints (vertices
  // as control points) so every lobe is round, never a facet or a spike.
  const N = 15;
  const px: number[] = [], py: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    let rr = R * (0.74 + noise(S + i * 1.7) * 0.42);
    if (noise(S + i * 3.1 + 5) > 0.62) rr *= 1.3 + noise(S + i * 2.2) * 0.4; // bulbous lobe
    rr *= breathe;
    px[i] = cx + Math.cos(a) * rr;
    py[i] = cy + Math.sin(a) * rr;
  }
  c.moveTo((px[N - 1] + px[0]) / 2, (py[N - 1] + py[0]) / 2);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    c.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
  }
  c.closePath();

  // (2) A ring of small round satellite droplets flung off the blob — varied
  // size, a few elongated. Round paint drops, the vector-splat idiom.
  const D = 14;
  for (let d = 0; d < D; d++) {
    const a = noise(S + d * 2.3 + 1) * TAU;
    const dist = R * (1.14 + Math.sqrt(noise(S + d * 4.7 + 1)) * 1.55);
    const dr = R * (0.03 + noise(S + d * 6.1 + 1) * 0.14);
    const ex = cx + Math.cos(a) * dist, ey = cy + Math.sin(a) * dist;
    const elong = noise(S + d * 3.3 + 4) > 0.6 ? 1.55 : 1.05;
    c.moveTo(ex + dr * elong, ey);
    c.ellipse(ex, ey, dr * elong, dr, a, 0, TAU, false);
  }

  // (4) A little fine speckle.
  const SP = 12;
  for (let s = 0; s < SP; s++) {
    const a = noise(S + s * 1.9 + 2) * TAU;
    const dist = R * (1.4 + Math.sqrt(noise(S + s * 3.7 + 2)) * 2.0);
    const sr = R * (0.009 + noise(S + s * 8.3 + 2) * 0.02);
    const sx = cx + Math.cos(a) * dist, sy = cy + Math.sin(a) * dist;
    c.moveTo(sx + sr, sy);
    c.arc(sx, sy, sr, 0, TAU, false);
  }
}

/** A matte aerosol haze: a 1/r density-graded cloud of fine dots, per-dot
 *  alpha (dense core, sparse rim). Clipped to the box. */
function paintSprayField(c: Konva.Context, w: number, h: number, color: string, time: number) {
  const TAU = Math.PI * 2;
  const cx = w * 0.5, cy = h * 0.5;
  const R = Math.min(w, h) * 0.5;
  const pulse = 1 + 0.03 * Math.sin(time / 1800);
  c.save();
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();
  c.setAttr("fillStyle", color);
  const DOTS = 200;
  for (let i = 0; i < DOTS; i++) {
    const a = noise(i * 1.7) * TAU;
    const rr = Math.pow(noise(i * 3.1), 1.5) * R * pulse;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const dr = 0.5 + noise(i * 5.3) * 1.9;
    const edge = 1 - rr / R;
    const al = 0.05 + edge * 0.4 * (0.4 + noise(i * 7.7) * 0.6);
    c.setAttr("globalAlpha", al > 0 ? al : 0);
    c.beginPath();
    c.arc(x, y, dr, 0, TAU, false);
    c.fill();
  }
  c.setAttr("globalAlpha", 1);
  c.restore();
}

/** A spray-can paint mark: a radial body clipped to an organic blob, a density-
 *  biased stipple, an overspray halo, wet drips and a hard matte outline. */
function spraySplatPaint(c: Konva.Context, w: number, h: number, base: string, ink: string, time: number, seed: number) {
  const TAU = Math.PI * 2;
  const cx = w * 0.5, cy = h * 0.46;
  const rx = w * 0.4, ry = h * 0.38;
  const N = 16, S = seed, ph = time / 1000;

  const vx: number[] = [], vy: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const rmod = 0.62 + noise(S + i * 1.7) * 0.5;
    const spike = noise(S + i * 2.3) > 0.82 ? 1.35 : 1.0;
    vx[i] = cx + Math.cos(a) * rx * rmod * spike;
    vy[i] = cy + Math.sin(a) * ry * rmod * spike;
  }
  const blob = () => {
    c.beginPath();
    c.moveTo((vx[0] + vx[N - 1]) / 2, (vy[0] + vy[N - 1]) / 2);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      c.quadraticCurveTo(vx[i], vy[i], (vx[i] + vx[j]) / 2, (vy[i] + vy[j]) / 2);
    }
    c.closePath();
  };

  // BODY — soft radial fill clipped to the silhouette.
  c.save();
  blob();
  c.clip();
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, hexAlpha(base, 0.55));
  g.addColorStop(0.7, hexAlpha(base, 0.32));
  g.addColorStop(1, hexAlpha(base, 0.05));
  c.setAttr("fillStyle", g);
  c.fillRect(0, 0, w, h);
  // STIPPLE spray — power<1 biases dots toward the nozzle centre.
  c.setAttr("fillStyle", base);
  for (let k = 0; k < 200; k++) {
    const th = noise(S + k * 1.7) * TAU;
    const rr = Math.pow(noise(S + k * 3.1), 0.65);
    const dx = cx + Math.cos(th) * rx * 1.05 * rr;
    const dy = cy + Math.sin(th) * ry * 1.05 * rr;
    const sr = 0.8 + noise(S + k * 5.7) * 2.4;
    c.setAttr("globalAlpha", 0.25 + (1 - rr) * 0.55);
    c.beginPath();
    c.arc(dx, dy, sr, 0, TAU, false);
    c.fill();
  }
  c.setAttr("globalAlpha", 1);
  c.restore();

  // OVERSPRAY halo — sparse faint dots just outside the edge.
  c.setAttr("fillStyle", base);
  for (let k = 0; k < 50; k++) {
    const th = noise(S + k * 2.7 + 7) * TAU;
    const band = 1.02 + noise(S + k * 4.9 + 7) * 0.3;
    const dx = cx + Math.cos(th) * rx * band;
    const dy = cy + Math.sin(th) * ry * band;
    const sr = 0.6 + noise(S + k * 8.3 + 7) * 1.4;
    const tw = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(ph * 0.6 + k));
    c.setAttr("globalAlpha", Math.max(0, tw * (1.3 - band)));
    c.beginPath();
    c.arc(dx, dy, sr, 0, TAU, false);
    c.fill();
  }
  c.setAttr("globalAlpha", 1);

  // WET DRIPS off the lower belly.
  for (let d = 0; d < 4; d++) {
    const t = 0.2 + (d / 3) * 0.6;
    const ox = cx + (t - 0.5) * 2 * rx * 0.8;
    const nx = (ox - cx) / rx;
    const oy = cy + Math.sqrt(Math.max(0, 1 - nx * nx)) * ry;
    const len = (0.1 + noise(S + d * 1.9 + 3) * 0.22) * h * (1 + 0.06 * Math.sin(ph * 0.5 + d));
    const wd = (0.01 + noise(S + d + 9) * 0.012) * w;
    c.setAttr("fillStyle", base);
    c.setAttr("globalAlpha", 0.9);
    c.beginPath();
    c.moveTo(ox - wd, oy - 4);
    c.bezierCurveTo(ox - wd, oy + len * 0.5, ox - wd * 1.6, oy + len, ox, oy + len + wd * 1.4);
    c.bezierCurveTo(ox + wd * 1.6, oy + len, ox + wd, oy + len * 0.5, ox + wd, oy - 4);
    c.closePath();
    c.fill();
    if (noise(S + d + 21) > 0.5) {
      c.beginPath();
      c.arc(ox, oy + len + wd * 3.5, wd * 0.7, 0, TAU, false);
      c.fill();
    }
  }
  c.setAttr("globalAlpha", 1);

  // HARD clean marker outline — the throw-up tell, matte.
  blob();
  c.setAttr("lineJoin", "round");
  c.setAttr("lineCap", "round");
  c.setAttr("lineWidth", Math.max(3, w * 0.006));
  c.setAttr("strokeStyle", ink);
  c.setAttr("shadowBlur", 0);
  c.stroke();
}

/** A procedurally lit, mottled, cracked, speckled concrete wall with a centre
 *  vignette — a surface for graffiti to sit on. Static. */
function concreteWallPaint(c: Konva.Context, w: number, h: number, base: string) {
  const TAU = Math.PI * 2;
  c.save();
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();
  const g = c.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, lighten(base, 0.06));
  g.addColorStop(1, darken(base, 0.1));
  c.setAttr("fillStyle", g);
  c.fillRect(0, 0, w, h);
  // Broad mottling — grime patches.
  for (let i = 0; i < 28; i++) {
    const x = noise(i * 1.9) * w, y = noise(i * 2.7 + 5) * h;
    const rad = 60 + noise(i * 3.3 + 2) * 220;
    const lite = noise(i * 4.9) > 0.5;
    const rg = c.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, hexAlpha(lite ? "#ffffff" : "#000000", 0.02 + noise(i * 5.3) * 0.04));
    rg.addColorStop(1, hexAlpha(lite ? "#ffffff" : "#000000", 0));
    c.setAttr("fillStyle", rg);
    c.beginPath();
    c.arc(x, y, rad, 0, TAU, false);
    c.fill();
  }
  // Grit speckle — concrete tooth.
  for (let k = 0; k < 280; k++) {
    const x = noise(k * 1.3) * w, y = noise(k * 2.7) * h;
    const lite = noise(k * 4.9) > 0.5;
    c.setAttr("fillStyle", lite ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.10)");
    c.fillRect(x, y, 1 + (noise(k * 6.1) > 0.85 ? 1 : 0), 1);
  }
  // Hairline cracks.
  c.setAttr("strokeStyle", hexAlpha(darken(base, 0.4), 0.9));
  c.setAttr("lineWidth", 1.4);
  c.setAttr("globalAlpha", 0.25);
  for (let s = 0; s < 3; s++) {
    let x = noise(s * 9.7) * w, y = noise(s * 3.3) * h * 0.3;
    let ang = Math.PI * 0.5 + (noise(s * 2.1) - 0.5);
    c.beginPath();
    c.moveTo(x, y);
    for (let j = 1; j < 13; j++) {
      ang += (noise(s * 5 + j) - 0.5) * 0.9;
      x += Math.cos(ang) * w * 0.03;
      y += Math.abs(Math.sin(ang)) * h * 0.045 + h * 0.01;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  c.setAttr("globalAlpha", 1);
  // Drip stains — faint vertical streaks.
  for (let s = 0; s < 4; s++) {
    const x = 100 + noise(s * 7.1 + 4) * (w - 200);
    const sh = c.createLinearGradient(x, 0, x, h);
    sh.addColorStop(0, hexAlpha(darken(base, 0.2), 0.12));
    sh.addColorStop(1, hexAlpha(darken(base, 0.2), 0));
    c.setAttr("fillStyle", sh);
    c.fillRect(x - 12, 0, 24, h);
  }
  // Vignette — focus the centre.
  const vg = c.createRadialGradient(w / 2, h * 0.5, h * 0.35, w / 2, h * 0.5, h * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, hexAlpha(darken(base, 0.3), 0.35));
  c.setAttr("fillStyle", vg);
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** Brutalist print scaffold: heavy rules, crop marks, a breathing registration
 *  crosshair and a shimmering tick ruler. Off-white ink, matte. */
function printRulesPaint(c: Konva.Context, w: number, h: number, time: number, col: string) {
  c.setAttr("lineCap", "butt");
  c.setAttr("strokeStyle", col);
  c.setAttr("shadowBlur", 0);
  c.setAttr("globalAlpha", 1);

  c.setAttr("lineWidth", 6);
  const vx = w * 0.2;
  c.beginPath(); c.moveTo(vx, h * 0.06); c.lineTo(vx, h * 0.94); c.stroke();
  const by = h * 0.8;
  c.beginPath(); c.moveTo(w * 0.06, by); c.lineTo(w * 0.94, by); c.stroke();

  c.setAttr("lineWidth", 3);
  const m = 64, L = 46;
  for (const cx of [m, w - m]) {
    for (const cy of [m, h - m]) {
      const sx = cx < w / 2 ? 1 : -1;
      const sy = cy < h / 2 ? 1 : -1;
      c.beginPath();
      c.moveTo(cx - sx * L, cy); c.lineTo(cx, cy);
      c.moveTo(cx, cy - sy * L); c.lineTo(cx, cy);
      c.stroke();
    }
  }

  const px = w * 0.86, py = h * 0.16;
  c.setAttr("lineWidth", 2);
  c.beginPath(); c.arc(px, py, 22, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  c.moveTo(px - 34, py); c.lineTo(px + 34, py);
  c.moveTo(px, py - 34); c.lineTo(px, py + 34);
  c.stroke();
  const r2 = 10 + 2.5 * Math.sin(time / 900);
  c.beginPath(); c.arc(px, py, r2, 0, Math.PI * 2); c.stroke();

  const N = 40;
  for (let i = 0; i <= N; i++) {
    const x = w * 0.06 + w * 0.88 * (i / N);
    const major = i % 5 === 0;
    let len = major ? 16 : 8;
    if (noise(i * 3.1) > 0.92) len = 26;
    c.setAttr("globalAlpha", 0.55 + 0.45 * Math.sin(time / 1000 + i * 0.5));
    c.setAttr("lineWidth", major ? 2 : 1.2);
    c.beginPath(); c.moveTo(x, by); c.lineTo(x, by + len); c.stroke();
  }
  c.setAttr("globalAlpha", 1);
}

/** A mis-registered riso paint block: a crisp red block over a purple ghost,
 *  with a frayed screenprint edge, a halftone foot-bleed and a register tab. */
function misprintPaint(c: Konva.Context, w: number, h: number, time: number, red: string, purple: string, ink: string, seed: number) {
  c.setAttr("shadowBlur", 0);
  c.setAttr("globalAlpha", 1);
  const dx = w * 0.016 + Math.sin(time / 2100) * 2;
  const dy = h * 0.022 + Math.sin(time / 1700 + 1) * 2;

  const steps = 24;
  const blockPath = (ox: number, oy: number) => {
    c.beginPath();
    c.moveTo(ox, oy);
    c.lineTo(ox + w, oy);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bump = (noise(seed + i * 1.7) - 0.5) * w * 0.02;
      c.lineTo(ox + w + bump, oy + h * t);
    }
    c.lineTo(ox, oy + h);
    c.closePath();
  };

  c.setAttr("fillStyle", hexAlpha(purple, 0.5));
  blockPath(dx, dy); c.fill();
  c.setAttr("fillStyle", red);
  blockPath(0, 0); c.fill();

  const s = 12;
  c.setAttr("fillStyle", red);
  for (let i = 0; i * s < w; i++) {
    const cx = i * s + s / 2;
    const g = noise(seed + i * 2.3);
    const rr = s * 0.42 * (0.4 + 0.6 * g);
    c.beginPath(); c.arc(cx, h + s * 0.6, rr, 0, Math.PI * 2); c.fill();
  }

  c.setAttr("fillStyle", ink);
  c.fillRect(0, 0, 12, 12);
}

/** A graduated halftone dot screen: dense at bottom-right, fading to nothing. */
function halftonePaint(c: Konva.Context, w: number, h: number, time: number, col: string) {
  c.setAttr("fillStyle", col);
  c.setAttr("shadowBlur", 0);
  c.setAttr("globalAlpha", 1);
  const s = 24;
  const maxR = s * 0.48;
  for (let j = 0; j * s < h; j++) {
    for (let i = 0; i * s < w; i++) {
      const cx = i * s + s / 2;
      const cy = j * s + s / 2;
      const g = ((cx / w) + (cy / h)) / 2;
      let r = maxR * g * (0.85 + 0.3 * noise(i * 1.7 + j * 3.1));
      r *= 1 + 0.08 * Math.sin(time / 1300 + (i + j) * 0.4);
      if (r < 0.4) continue;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    }
  }
}

/** A soft aurora: overlapping drifting translucent radial fields. `bloom`
 *  scales the internal alpha (the glow family passes a higher bloom). */
function drawAurora(c: Konva.Context, w: number, h: number, time: number, cols: string[], seed: number, bloom = 1) {
  c.save();
  c.beginPath(); c.rect(0, 0, w, h); c.clip();
  const ph = time / 1000;
  const L = 5;
  for (let i = 0; i < L; i++) {
    const s = seed + i * 1.7;
    const bx = w * (0.12 + 0.76 * noise(s));
    const by = h * (0.15 + 0.7 * noise(s + 3.1));
    const dx = Math.sin(ph * (0.11 + 0.05 * noise(s + 1.3)) + i * 0.9) * w * 0.1;
    const dy = Math.cos(ph * (0.09 + 0.04 * noise(s + 2.2)) + i * 1.4) * h * 0.09;
    const cx = bx + dx, cy = by + dy;
    let R = Math.min(w, h) * (0.34 + 0.26 * noise(s + 4.4));
    R *= 1 + 0.06 * Math.sin(ph * 0.5 + i);
    const col = cols[i % cols.length];
    const a = Math.min(0.5, (0.11 + 0.06 * noise(s + 5.5)) * bloom);
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, hexAlpha(col, a));
    g.addColorStop(0.55, hexAlpha(col, a * 0.4));
    g.addColorStop(1, hexAlpha(col, 0));
    c.setAttr("fillStyle", g);
    c.setAttr("globalAlpha", 1);
    c.beginPath(); c.rect(0, 0, w, h); c.fill();
  }
  c.restore();
}

/** A glowing silk ribbon: an undulating constant-thickness band travelling
 *  through a perpendicular sheen, with an accent glow. */
function drawSilk(c: Konva.Context, w: number, h: number, time: number, accent: string, glow: number, seed: number, bloom = 1) {
  c.save();
  const ph = time / 1400;
  const th = h * 0.16 * (1 + 0.1 * Math.sin(time / 1900 + seed));
  const midY = (x: number) => {
    const u = x / w;
    return h * 0.5
      + Math.sin(u * Math.PI * 1.6 + ph + seed * 6) * h * 0.24
      + Math.sin(u * Math.PI * 3.1 - ph * 0.6) * h * 0.07;
  };
  const N = 28;
  c.beginPath();
  for (let k = 0; k <= N; k++) {
    const x = (w * k) / N;
    const y = midY(x) - th / 2;
    if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) {
    const x = (w * k) / N;
    c.lineTo(x, midY(x) + th / 2);
  }
  c.closePath();
  const mid = Math.min(1, 0.5 * bloom);
  const g = c.createLinearGradient(0, h * 0.24, 0, h * 0.76);
  g.addColorStop(0, hexAlpha(accent, 0));
  g.addColorStop(0.5, hexAlpha(accent, mid));
  g.addColorStop(1, hexAlpha(accent, 0));
  c.setAttr("fillStyle", g);
  c.setAttr("shadowColor", accent);
  c.setAttr("shadowBlur", glow);
  c.setAttr("globalAlpha", 1);
  c.fill();
  c.restore();
}

/** A heavy neon bloom veil: three big soft radial glows pooled top and bottom,
 *  leaving the centre darker. */
function drawBloomVeil(c: Konva.Context, w: number, h: number, time: number, hot: string, cool: string, seed: number) {
  c.save();
  c.beginPath(); c.rect(0, 0, w, h); c.clip();
  const ph = time / 1000;
  const spots = [
    { cx: w * 0.5, cy: h * 0.16, col: hot, R: h * 0.95, a: 0.16 },
    { cx: w * 0.22, cy: h * 0.84, col: cool, R: h * 0.85, a: 0.13 },
    { cx: w * 0.8, cy: h * 0.86, col: hot, R: h * 0.85, a: 0.13 },
  ];
  for (let i = 0; i < spots.length; i++) {
    const sp = spots[i];
    const puls = 1 + 0.1 * Math.sin(ph * 0.6 + i + seed * 6);
    const R = sp.R * puls;
    const g = c.createRadialGradient(sp.cx, sp.cy, 0, sp.cx, sp.cy, R);
    g.addColorStop(0, hexAlpha(sp.col, sp.a));
    g.addColorStop(0.6, hexAlpha(sp.col, sp.a * 0.35));
    g.addColorStop(1, hexAlpha(sp.col, 0));
    c.setAttr("fillStyle", g);
    c.setAttr("globalAlpha", 1);
    c.beginPath(); c.rect(0, 0, w, h); c.fill();
  }
  c.restore();
}

/**
 * The lit limb of a moon at `phase` (0 = new, 0.5 = half, 1 = full).
 *
 * Canvas angles run clockwise on screen because y points down, so pi/2 is the
 * bottom and 3pi/2 the top. Sweeping pi/2 -> -pi/2 forwards passes the *left*
 * side — the terminator of a gibbous moon; sweeping backwards passes the right
 * and gives a crescent. Getting that direction backwards collapses the full
 * moon into a zero-area lens.
 */
function moonPath(c: Konva.Context, R: number, phase: number) {
  const k = 2 * phase - 1;
  c.beginPath();
  c.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  c.ellipse(0, 0, R * Math.abs(k), R, 0, Math.PI / 2, -Math.PI / 2, k < 0);
  c.closePath();
}

/**
 * Maria, craters and limb darkening. A crater is a bright rim below-right over
 * a dark floor — lit from the upper left. Drawn the other way round, or as a
 * flat disc, it reads as a bubble sitting on the surface.
 */
function drawCraters(c: Konva.Context, R: number, base: string) {
  const TAU = Math.PI * 2;
  const dark = darken(base, 0.62);

  for (let i = 0; i < 3; i++) {
    const angle = noise(i * 2.3 + 3) * TAU;
    const dist = Math.sqrt(noise(i * 4.1 + 3)) * R * 0.55;
    const radius = R * (0.22 + noise(i * 6.7 + 3) * 0.16);
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, withAlpha(dark, 0.2));
    g.addColorStop(1, withAlpha(dark, 0));
    c.setAttr("fillStyle", g);
    c.beginPath();
    c.arc(cx, cy, radius, 0, TAU, false);
    c.fill();
  }

  for (let i = 0; i < 16; i++) {
    const angle = noise(i * 1.7 + 3) * TAU;
    const rr = Math.sqrt(noise(i * 3.1 + 3));
    const dist = rr * R * 0.86;
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    // Craters foreshorten toward the limb.
    const cr = R * (0.035 + noise(i * 5.3 + 3) * 0.075) * (1 - rr * 0.35);

    c.setAttr("globalAlpha", 0.16 + noise(i * 7.7 + 3) * 0.1);
    c.setAttr("fillStyle", "#ffffff");
    c.beginPath();
    c.arc(cx + cr * 0.2, cy + cr * 0.2, cr, 0, TAU, false);
    c.fill();

    c.setAttr("globalAlpha", 0.2 + noise(i * 9.1 + 3) * 0.12);
    c.setAttr("fillStyle", dark);
    c.beginPath();
    c.arc(cx, cy, cr * 0.92, 0, TAU, false);
    c.fill();
  }
  c.setAttr("globalAlpha", 1);

  const limb = c.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
  limb.addColorStop(0, withAlpha(dark, 0));
  limb.addColorStop(1, withAlpha(dark, 0.3));
  c.setAttr("fillStyle", limb);
  c.beginPath();
  c.arc(0, 0, R, 0, TAU, false);
  c.fill();
}

/**
 * A crescent is the *lune* between two circles, and it cannot be drawn as a
 * disc with a disc subtracted: under the nonzero winding rule the region that
 * lies inside the bite but outside the moon has winding -1, so it fills too —
 * which is what produced a moon on each side with a lens between them.
 *
 * Instead we trace the boundary: the outer circle's major arc, then back along
 * the near edge of the bite. One closed region, no winding tricks.
 */
function crescentPath(c: Konva.Context, w: number, h: number) {
  const R = Math.min(w, h) / 2;
  const d = R * 0.52; // bite offset
  const rb = R * 0.95; // bite radius
  const cx = w / 2;
  const cy = h / 2;

  const a = (d * d - rb * rb + R * R) / (2 * d);
  const half = Math.sqrt(Math.max(0, R * R - a * a));
  const t1 = Math.atan2(half, a);
  const t2 = Math.atan2(half, a - d);
  const TAU = Math.PI * 2;

  // Tilt the whole moon slightly, the way one hangs in a night sky.
  const tilt = -0.35;
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  c.beginPath();
  c.arc(0, 0, R, t1, TAU - t1, false);
  c.arc(d, 0, rb, TAU - t2, t2, true);
  c.closePath();
  c.restore();
}

/**
 * The ornate bracket silhouette used by holo alert plates and stream panels:
 * a rounded rectangle whose left and right edges bow outward into a pair of
 * cusps. Drawn as one path so it can carry a gradient stroke.
 */
function plaquePath(c: CanvasRenderingContext2D | Konva.Context, w: number, h: number) {
  const notch = Math.min(w, h) * 0.18;
  const r = h * 0.28;
  c.beginPath();
  c.moveTo(notch, 0);
  c.lineTo(w - notch, 0);
  c.quadraticCurveTo(w - notch * 0.35, 0, w - notch * 0.2, h * 0.22);
  c.quadraticCurveTo(w, h * 0.5, w - notch * 0.2, h * 0.78);
  c.quadraticCurveTo(w - notch * 0.35, h, w - notch, h);
  c.lineTo(notch, h);
  c.quadraticCurveTo(notch * 0.35, h, notch * 0.2, h * 0.78);
  c.quadraticCurveTo(0, h * 0.5, notch * 0.2, h * 0.22);
  c.quadraticCurveTo(notch * 0.35, 0, notch, 0);
  c.closePath();
  void r;
}

/**
 * A damask lattice: a mirrored ogee (pointed-oval) motif with a quatrefoil
 * heart and a small crown flourish, tiled on a half-drop grid — the repeat that
 * reads as Victorian wallpaper. Purely a function of position, so it survives
 * palette swaps and animates identically in OBS.
 */
function damaskPath(c: Konva.Context, w: number, h: number) {
  const cell = Math.max(130, Math.min(w, h) * 0.17);
  const motif = (cx: number, cy: number, s: number) => {
    const a = s * 0.42;
    const b = s * 0.66;
    // Pointed oval, two mirrored beziers meeting at top and bottom.
    c.moveTo(cx, cy - b);
    c.bezierCurveTo(cx + a, cy - b * 0.42, cx + a, cy + b * 0.42, cx, cy + b);
    c.bezierCurveTo(cx - a, cy + b * 0.42, cx - a, cy - b * 0.42, cx, cy - b);
    // Quatrefoil in the heart.
    const q = s * 0.13;
    for (let k = 0; k < 4; k++) {
      const ang = k * (Math.PI / 2) + Math.PI / 4;
      const px = cx + Math.cos(ang) * q * 1.3;
      const py = cy + Math.sin(ang) * q * 1.3;
      c.moveTo(px + q, py);
      c.arc(px, py, q, 0, Math.PI * 2, false);
    }
    // Crown flourishes topping and tailing the oval.
    c.moveTo(cx - s * 0.12, cy - b);
    c.quadraticCurveTo(cx, cy - b - s * 0.16, cx + s * 0.12, cy - b);
    c.moveTo(cx - s * 0.12, cy + b);
    c.quadraticCurveTo(cx, cy + b + s * 0.16, cx + s * 0.12, cy + b);
  };

  c.beginPath();
  let row = 0;
  for (let cy = 0; cy <= h + cell; cy += cell) {
    const offset = (row % 2) * (cell / 2);
    for (let cx = -cell; cx <= w + cell; cx += cell) {
      motif(cx + offset, cy, cell * 0.92);
    }
    row++;
  }
}

/** A harlequin / argyle lattice: a tiled grid of diamonds, stroked. The
    understated Gothic-Rose wallpaper. */
function harlequinPath(c: Konva.Context, w: number, h: number) {
  const cell = Math.max(70, Math.min(w, h) * 0.12);
  const half = cell / 2;
  c.beginPath();
  for (let cy = 0; cy <= h + cell; cy += cell) {
    for (let cx = 0; cx <= w + cell; cx += cell) {
      c.moveTo(cx, cy - half);
      c.lineTo(cx + half, cy);
      c.lineTo(cx, cy + half);
      c.lineTo(cx - half, cy);
      c.closePath();
    }
  }
}

/** Fallback when a flag layer somehow has no stripes: the classic six. */
const CLASSIC_RAINBOW = ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];

function FlagContent({ layer, ctx, glowBoost }: { layer: FlagLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const stripes = layer.stripes.length > 0 ? layer.stripes : CLASSIC_RAINBOW;
  const n = stripes.length;
  const vertical = layer.stackDirection === "vertical";
  const r = Math.min(layer.cornerRadius, w / 2, h / 2);

  return (
    <Group listening={false}>
      {/* Underlay carries glow/shadow — a clipped group cannot. */}
      {(layer.effects.glow.enabled || layer.effects.shadow.enabled) && (
        <Rect
          width={w}
          height={h}
          cornerRadius={r}
          fill={stripes[Math.floor(n / 2)]}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
      <Group
        clipFunc={(c) => {
          c.beginPath();
          c.moveTo(r, 0);
          c.arcTo(w, 0, w, h, r);
          c.arcTo(w, h, 0, h, r);
          c.arcTo(0, h, 0, 0, r);
          c.arcTo(0, 0, w, 0, r);
          c.closePath();
        }}
      >
        {stripes.map((stripe, i) =>
          vertical ? (
            <Rect key={i} x={0} y={(h / n) * i} width={w} height={h / n + 1} fill={stripe} />
          ) : (
            <Rect key={i} x={(w / n) * i} y={0} width={w / n + 1} height={h} fill={stripe} />
          ),
        )}
      </Group>
      {layer.effects.border.enabled && (
        <Rect
          width={w}
          height={h}
          cornerRadius={r}
          stroke={resolveColor(layer.effects.border.color, ctx.theme)}
          strokeWidth={layer.effects.border.width}
        />
      )}
    </Group>
  );
}

/** A catalogue icon, scaled from its 24x24 grid into the layer's box. */
function IconContent({ layer, ctx, glowBoost }: { layer: IconLayer; ctx: RenderContext; glowBoost: number }) {
  const def = ICONS[layer.symbol as IconName] ?? ICONS.star;
  const scale = Math.min(layer.width, layer.height) / 24;
  const dx = (layer.width - 24 * scale) / 2;
  const dy = (layer.height - 24 * scale) / 2;
  const colour = resolveColor(layer.fill, ctx.theme);
  const outlined = "stroke" in def && def.stroke;

  return (
    <Path
      x={dx}
      y={dy}
      scaleX={scale}
      scaleY={scale}
      data={def.d}
      fill={outlined ? undefined : colour}
      stroke={outlined ? colour : undefined}
      strokeWidth={outlined ? layer.strokeWidth * (("strokeScale" in def && def.strokeScale) || 1) : 0}
      lineCap="round"
      lineJoin="round"
      strokeScaleEnabled={false}
      {...shadowProps(layer.effects, ctx.theme, glowBoost)}
    />
  );
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
  const fontSize = resolved.includes("\n")
    ? layer.fontSize
    : fitFontSize(resolved, layer.width, layer.fontSize, layer.fontFamily, layer.fontWeight, layer.letterSpacing);

  // Striped lettering: each character gets the next flag colour, laid out by
  // measured advances. Stripes are pushed through the contrast gate against
  // the theme background so a dark flag blue never disappears into a dark
  // scene — same hue, adjusted lightness.
  if (layer.fillStripes && layer.fillStripes.length > 0 && !resolved.includes("\n")) {
    const stripes = layer.fillStripes.map((stripe) =>
      ensureContrast(stripe, ctx.theme.background, 3),
    );
    const chars = [...visible];
    const advances = chars.map(
      (ch) => measureText(ch, fontSize, layer.fontFamily, layer.fontWeight) + layer.letterSpacing,
    );
    const total = advances.reduce((n, a) => n + a, 0);
    let x = layer.align === "center" ? (layer.width - total) / 2 : layer.align === "right" ? layer.width - total : 0;
    let colorIndex = 0;
    const shadow = shadowProps(layer.effects, ctx.theme, glowBoost);
    const style = fontStyleOf(layer.fontWeight, layer.italic);

    // Per-letter 3D: each letter is extruded in a darker shade of its own
    // colour, so a rainbow headline pops off the screen — the SELF look.
    const td = layer.effects.text3d;
    const ext = !!(td?.enabled && td.depth > 0);
    const steps = ext ? Math.min(48, Math.max(1, Math.round(td!.depth))) : 0;
    const stepLen = ext ? td!.depth / steps : 0;
    const rad = ext ? (td!.angle * Math.PI) / 180 : 0;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);

    return (
      <Group listening={false}>
        {chars.map((ch, i) => {
          const cx = x;
          x += advances[i];
          if (ch.trim() === "") return null; // spaces advance but don't consume a stripe
          const fill = stripes[colorIndex++ % stripes.length];
          const glyph = { text: ch, fontFamily: layer.fontFamily, fontSize, fontStyle: style };
          if (ext) {
            return (
              <Group key={i} x={cx}>
                {Array.from({ length: steps }).map((_, s) => {
                  const k = steps - s;
                  const g = steps > 1 ? (k - 1) / (steps - 1) : 0;
                  const col = mixColors(darken(fill, 0.22), darken(fill, 0.58), g);
                  return <Text key={s} {...glyph} x={ux * k * stepLen} y={uy * k * stepLen} fill={col} {...(s === 0 ? shadow : {})} />;
                })}
                <Text {...glyph} fill={fill} />
              </Group>
            );
          }
          return <Text key={i} x={cx} {...glyph} fill={fill} {...shadow} />;
        })}
      </Group>
    );
  }

  // Curved text: laid along an arc via a text path. Single-line; supports the
  // same 3D extrusion by repeating the path in the side colour.
  if (layer.curve && Math.abs(layer.curve) > 1 && !resolved.includes("\n")) {
    const data = arcPathData(layer.width, layer.height, layer.curve);
    const base = {
      data,
      text: visible,
      fontFamily: layer.fontFamily,
      fontSize,
      fontStyle: fontStyleOf(layer.fontWeight, layer.italic),
      letterSpacing: layer.letterSpacing,
      align: "center" as const,
    };
    const td = layer.effects.text3d;
    const front = { ...base, fill: resolveColor(layer.fill, ctx.theme), ...shadowProps(layer.effects, ctx.theme, glowBoost) };
    if (td?.enabled && td.depth > 0) {
      const steps = Math.min(48, Math.max(1, Math.round(td.depth)));
      const stepLen = td.depth / steps;
      const rad = (td.angle * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const sideFront = resolveColor(td.color, ctx.theme);
      const sideBack = td.colorTo ? resolveColor(td.colorTo, ctx.theme) : darken(sideFront, 0.4);
      return (
        <Group listening={false}>
          {Array.from({ length: steps }).map((_, i) => {
            const k = steps - i;
            const g = steps > 1 ? (k - 1) / (steps - 1) : 0;
            const col = mixColors(sideFront, sideBack, g);
            return <TextPath key={i} {...base} x={ux * k * stepLen} y={uy * k * stepLen} fill={col} {...(i === 0 ? shadowProps(layer.effects, ctx.theme, glowBoost) : {})} />;
          })}
          <TextPath {...front} />
        </Group>
      );
    }
    return <TextPath {...front} />;
  }

  // A border on a text layer is a stencil-cut outline: the stroke is drawn
  // behind the fill (fillAfterStrokeEnabled) so it hugs the glyph edge cleanly.
  const bd = layer.effects.border;
  const outline = bd.enabled
    ? { stroke: resolveColor(bd.color, ctx.theme), strokeWidth: bd.width, fillAfterStrokeEnabled: true }
    : {};

  const common = {
    text: visible,
    width: layer.width,
    height: layer.height,
    fontFamily: layer.fontFamily,
    fontSize,
    fontStyle: fontStyleOf(layer.fontWeight, layer.italic),
    align: layer.align,
    verticalAlign: "top" as const,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
    wrap: "word" as const,
    ...outline,
  };

  // Extruded 3D lettering: the glyphs repeated along a depth vector in the side
  // colour (darker toward the back), the front face on top. Editable — changing
  // the text re-extrudes every face. Cap the copies so a deep extrusion stays
  // cheap; the step length grows to keep the depth.
  const td = layer.effects.text3d;
  if (td?.enabled && td.depth > 0) {
    const steps = Math.min(48, Math.max(1, Math.round(td.depth)));
    const stepLen = td.depth / steps;
    const rad = (td.angle * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const sideFront = resolveColor(td.color, ctx.theme);
    // The back of the extrusion: an explicit second colour (a proper side
    // gradient) or, by default, a modestly darker shade of the side colour.
    const sideBack = td.colorTo ? resolveColor(td.colorTo, ctx.theme) : darken(sideFront, 0.4);
    return (
      <Group listening={false}>
        {Array.from({ length: steps }).map((_, i) => {
          const k = steps - i; // draw back (k = steps) to front (k = 1)
          const g = steps > 1 ? (k - 1) / (steps - 1) : 0; // 0 at front, 1 at back
          const col = mixColors(sideFront, sideBack, g);
          return (
            <Text
              key={i}
              {...common}
              x={ux * k * stepLen}
              y={uy * k * stepLen}
              fill={col}
              {...(i === 0 ? shadowProps(layer.effects, ctx.theme, glowBoost) : {})}
            />
          );
        })}
        <Text {...common} {...fillProps(layer.fill, layer.effects, ctx.theme, layer.width, layer.height)} />
      </Group>
    );
  }

  // Bevelled lettering: a light copy above-left and a dark copy below-right,
  // with the real glyphs on top. Canvas has no emboss filter, and the shadow
  // slot is already spoken for by glow.
  const emboss = layer.effects.emboss;
  if (emboss?.enabled) {
    const d = Math.max(1, emboss.depth);
    return (
      <Group listening={false}>
        <Text {...common} x={-d} y={-d} fill={resolveColor(emboss.light, ctx.theme)} />
        <Text {...common} x={d} y={d} fill={resolveColor(emboss.dark, ctx.theme)} />
        <Text {...common} fill={resolveColor(layer.fill, ctx.theme)} {...shadowProps(layer.effects, ctx.theme, glowBoost)} />
      </Group>
    );
  }

  return (
    <Text
      {...common}
      {...fillProps(layer.fill, layer.effects, ctx.theme, layer.width, layer.height)}
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
    // Only the editor shows the "add an image" placeholder; the gallery preview
    // and the OBS source render nothing for an unset/loading image, so an empty
    // logo never appears as a stray icon.
    if (ctx.mode !== "edit") return null;
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

/** The frame's interior, as a path. Used both to fill it and to punch it out. */
function framePath(c: Konva.Context, layer: FrameLayer, w: number, h: number) {
  c.beginPath();
  if (layer.frameShape === "ellipse") {
    c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2, false);
  } else if (layer.frameShape === "hexagon") {
    const pts = chamferPoints(w, h);
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  } else {
    const r = Math.min(layer.cornerRadius, w / 2, h / 2);
    c.moveTo(r, 0);
    c.arcTo(w, 0, w, h, r);
    c.arcTo(w, h, 0, h, r);
    c.arcTo(0, h, 0, 0, r);
    c.arcTo(0, 0, w, 0, r);
  }
  c.closePath();
}

function FrameContent({ layer, ctx, glowBoost }: { layer: FrameLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const isCamera = layer.type === "camera";
  // A camera outline never carries an interior fill: the hole is punched below,
  // then the studio redraws a flat placeholder on top (no glow). Regular frames
  // keep their fill.
  const fill = isCamera ? undefined : resolveColor(layer.fill, ctx.theme);
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
      {layer.corners && (
        <>
          <Line points={[0, cornerLen, 0, 0, cornerLen, 0]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[w - cornerLen, 0, w, 0, w, cornerLen]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[w, h - cornerLen, w, h, w - cornerLen, h]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
          <Line points={[cornerLen, h, 0, h, 0, h - cornerLen]} stroke={accent} strokeWidth={layer.strokeWidth * 1.6} lineCap="round" />
        </>
      )}
      {/* Punch the interior hole through everything beneath it — the backdrop,
          the fog, and crucially the frame's own glow, which blooms inward off
          the stroke. Done in every mode so the interior is never glow-washed;
          the outward glow, which lands outside this path, is untouched. */}
      {isCamera && (
        <KonvaShape
          listening={false}
          globalCompositeOperation="destination-out"
          fill="#000"
          sceneFunc={(c, shape) => {
            framePath(c, layer, w, h);
            c.fillShape(shape);
          }}
        />
      )}
      {/* Studio placeholder, drawn on top of the now-transparent hole: a flat
          dark fill and label, with no glow. Never in live — OBS shows the
          webcam through the hole. */}
      {ctx.mode !== "live" && isCamera && (
        <>
          <KonvaShape
            listening={false}
            fill={resolveColor("@surface/55", ctx.theme)}
            sceneFunc={(c, shape) => {
              framePath(c, layer, w, h);
              c.fillShape(shape);
            }}
          />
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
        </>
      )}
      {/* A glowing light travels around the camera's edge — the moving line that
          marks a live webcam. A single bright dash marching along the border via
          an animated dashOffset: motion, never a blink. Drawn on top so the
          hole-punch doesn't clip it, in every mode (it's part of the look). */}
      {isCamera && <CameraRunner layer={layer} ctx={ctx} accent={accent} />}
    </Group>
  );
}

function CameraRunner({ layer, ctx, accent }: { layer: FrameLayer; ctx: RenderContext; accent: string }) {
  const { width: w, height: h } = layer;
  const perim = layer.frameShape === "ellipse" ? (Math.PI * (w + h)) / 2 : 2 * (w + h);
  const seg = perim * 0.16;
  const runner = {
    stroke: accent,
    strokeWidth: Math.max(2, layer.strokeWidth * 1.4),
    dash: [seg, perim - seg],
    dashOffset: -(((ctx.time / 1000) * perim * 0.3) % perim),
    lineCap: "round" as const,
    shadowColor: resolveColor("@glow", ctx.theme),
    shadowBlur: 20,
    shadowOpacity: 1,
    listening: false,
  };
  if (layer.frameShape === "ellipse") {
    return <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...runner} />;
  }
  if (layer.frameShape === "hexagon") {
    return <Line closed points={chamferPoints(w, h)} lineJoin="round" {...runner} />;
  }
  return <Rect width={w} height={h} cornerRadius={layer.cornerRadius} {...runner} />;
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

/**
 * Sample chat rows, shared by the chat box and the retro chat window.
 *
 * Studio-only, exactly like the CAMERA label on a camera frame: these names are
 * placeholders, and burning them into an exported PNG — or painting them under
 * the real chat widget in OBS — would be wrong. `live` mode renders the frame
 * empty, ready to be filled.
 */
function ChatRows({
  width: w,
  height: h,
  fontFamily,
  fontSize,
  rows: maxRows,
  usernameColor,
  messageColor,
  ctx,
}: {
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  rows: number;
  usernameColor: string;
  messageColor: string;
  ctx: RenderContext;
}) {
  if (ctx.mode === "live") return null;

  const pad = Math.max(14, fontSize * 0.8);
  const rowHeight = fontSize * 2.4;
  const capacity = Math.max(1, Math.floor((h - pad * 2) / rowHeight));
  const rows = CHAT_SAMPLE.slice(0, Math.min(maxRows, capacity));

  return (
    <>
      {rows.map((row, i) => {
        const y = pad + i * rowHeight;
        const nameWidth = measureText(`${row.user}:`, fontSize, fontFamily, 700);
        const messageX = pad + nameWidth + 8;
        return (
          <Group key={row.user} y={y}>
            <Text
              x={pad}
              text={`${row.user}:`}
              fontFamily={fontFamily}
              fontSize={fontSize}
              fontStyle="700"
              fill={resolveColor(usernameColor, ctx.theme)}
            />
            <Text
              x={messageX}
              width={w - messageX - pad}
              text={row.message}
              fontFamily={fontFamily}
              fontSize={fontSize}
              fill={resolveColor(messageColor, ctx.theme)}
              ellipsis
              wrap="none"
            />
          </Group>
        );
      })}
    </>
  );
}

function ChatBoxContent({ layer, ctx, glowBoost }: { layer: ChatBoxLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const coffin = layer.boxShape === "coffin";
  // A casket narrows at head and foot, so the rows live in the straight middle.
  const inset = coffin ? w * 0.16 : 0;
  const top = coffin ? h * 0.1 : 0;

  return (
    <Group listening={false}>
      {coffin ? (
        <KonvaShape
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme, w, h)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
          sceneFunc={(c, shape) => {
            coffinPath(c, w, h);
            c.fillStrokeShape(shape);
          }}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          cornerRadius={layer.cornerRadius}
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme, w, h)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
      <Group x={inset} y={top}>
        <ChatRows
          width={w - inset * 2}
          height={h - top}
          fontFamily={layer.fontFamily}
          fontSize={layer.fontSize}
          rows={layer.rows}
          usernameColor={layer.usernameColor}
          messageColor={layer.messageColor}
          ctx={ctx}
        />
      </Group>
    </Group>
  );
}

function AlertContent({ layer, ctx, glowBoost }: { layer: AlertLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const coffin = layer.boxShape === "coffin";
  const showAvatar = layer.avatar !== false;
  const avatarSize = h * 0.52;
  // A coffin's pointed head eats the left edge, so the whole row shifts inboard.
  const headInset = coffin ? h * 0.18 : 0;
  // With no avatar disc the text takes the space, centred vertically.
  const left = showAvatar
    ? headInset + h * 0.24 + avatarSize + h * 0.16
    : headInset + h * 0.3;
  const textWidth = w - left - h * 0.2 - headInset;

  const title = resolveText(layer.title, ctx.profile, missingMode(ctx.mode));
  const subtitle = resolveText(layer.subtitle, ctx.profile, missingMode(ctx.mode));
  // "NEW SUBSCRIBER" in a display face overflows its box at the authored size
  // and would wrap onto the subtitle. Fit both to one line.
  const titleSize = fitFontSize(title, textWidth, h * 0.26, layer.fontFamily, 400, 2);
  const subtitleSize = fitFontSize(subtitle, textWidth, h * 0.15, "Inter", 400);

  return (
    <Group listening={false}>
      {coffin ? (
        <KonvaShape
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme, w, h)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
          sceneFunc={(c, shape) => {
            coffinPathH(c, w, h);
            c.fillStrokeShape(shape);
          }}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          cornerRadius={layer.cornerRadius}
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
      {showAvatar && (
        <Circle
          x={headInset + h * 0.24 + avatarSize / 2}
          y={h / 2}
          radius={avatarSize / 2}
          fill={resolveColor("@primary", ctx.theme)}
          stroke={resolveColor("@accent", ctx.theme)}
          strokeWidth={3}
        />
      )}
      <Text
        x={left}
        y={h * 0.26}
        width={textWidth}
        text={title}
        fontFamily={layer.fontFamily}
        fontSize={titleSize}
        letterSpacing={2}
        wrap="none"
        fill={resolveColor(layer.titleColor, ctx.theme)}
      />
      <Text
        x={left}
        y={h * 0.26 + titleSize * 1.25}
        width={textWidth}
        text={subtitle}
        fontFamily="Inter"
        fontSize={subtitleSize}
        wrap="none"
        ellipsis
        fill={resolveColor(layer.subtitleColor, ctx.theme)}
      />
    </Group>
  );
}

function fmtGoal(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function GoalContent({ layer, ctx, glowBoost }: { layer: GoalLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const frac = layer.target > 0 ? Math.max(0, Math.min(1, layer.current / layer.target)) : 0;
  const pct = Math.round(frac * 100);
  const label = resolveText(layer.label, ctx.profile, missingMode(ctx.mode));
  const value = `${fmtGoal(layer.current)} / ${fmtGoal(layer.target)}`;

  const barColor = resolveColor(layer.barColor, ctx.theme);
  const trackColor = resolveColor(layer.trackColor, ctx.theme);
  const labelColor = resolveColor(layer.labelColor, ctx.theme);
  const valueColor = resolveColor(layer.valueColor, ctx.theme);

  if (layer.goalStyle === "ring") {
    const cx = w / 2;
    const cy = h / 2;
    const D = Math.min(w, h);
    const thick = D * 0.11;
    const R = D / 2 - thick / 2 - D * 0.02;
    const start = -Math.PI / 2;
    return (
      <Group listening={false}>
        <KonvaShape
          stroke={trackColor}
          strokeWidth={thick}
          sceneFunc={(c, s) => {
            c.beginPath();
            c.arc(cx, cy, R, 0, Math.PI * 2);
            c.strokeShape(s);
          }}
        />
        <KonvaShape
          stroke={barColor}
          strokeWidth={thick}
          lineCap="round"
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
          sceneFunc={(c, s) => {
            c.beginPath();
            // A full ring has no end cap to round, so close the circle instead
            // of leaving a hairline gap at the top.
            if (frac >= 1) c.arc(cx, cy, R, 0, Math.PI * 2);
            else c.arc(cx, cy, R, start, start + frac * Math.PI * 2, false);
            c.strokeShape(s);
          }}
        />
        <Text
          x={0}
          y={cy - R * 0.42}
          width={w}
          align="center"
          text={`${pct}%`}
          fontFamily={layer.fontFamily}
          fontSize={R * 0.52}
          fill={valueColor}
        />
        <Text
          x={0}
          y={cy + R * 0.06}
          width={w}
          align="center"
          text={value}
          fontFamily="Inter"
          fontSize={R * 0.2}
          fill={labelColor}
        />
        <Text
          x={0}
          y={cy + R * 0.34}
          width={w}
          align="center"
          text={label}
          fontFamily={layer.fontFamily}
          fontSize={R * 0.17}
          letterSpacing={2}
          wrap="none"
          fill={labelColor}
        />
      </Group>
    );
  }

  // Bar style: a plate in the family silhouette, a label + count row, and a
  // rounded track with the filled portion swept to the goal fraction.
  const coffin = layer.barShape === "coffin";
  const plaque = layer.barShape === "plaque";
  const inset = coffin ? w * 0.06 : 0;
  const padX = h * 0.2 + inset;
  const labelSize = fitFontSize(label, w * 0.62 - padX, h * 0.26, layer.fontFamily, 400, 2);
  const valueSize = h * 0.22;
  const barH = h * 0.26;
  const barW = w - padX * 2;
  const barX = padX;
  const barY = h - h * 0.24 - barH;
  const r = barH / 2;
  const fillW = frac <= 0 ? 0 : Math.max(barH, barW * frac);

  return (
    <Group listening={false}>
      {coffin ? (
        <KonvaShape
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme, w, h)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
          sceneFunc={(c, s) => {
            coffinPathH(c, w, h);
            c.fillStrokeShape(s);
          }}
        />
      ) : plaque ? (
        <KonvaShape
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme, w, h)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
          sceneFunc={(c, s) => {
            plaquePath(c, w, h);
            c.fillStrokeShape(s);
          }}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          cornerRadius={layer.cornerRadius}
          {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
          {...borderProps(layer.effects, ctx.theme)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
      <Text
        x={barX}
        y={h * 0.2}
        width={w * 0.62 - padX}
        text={label}
        fontFamily={layer.fontFamily}
        fontSize={labelSize}
        letterSpacing={1.5}
        wrap="none"
        ellipsis
        fill={labelColor}
      />
      <Text
        x={w * 0.5}
        y={h * 0.2 + (labelSize - valueSize) * 0.6}
        width={w * 0.5 - padX}
        align="right"
        text={value}
        fontFamily="Inter"
        fontSize={valueSize}
        wrap="none"
        fill={valueColor}
      />
      <Rect x={barX} y={barY} width={barW} height={barH} cornerRadius={r} fill={trackColor} />
      {fillW > 0 && (
        <Rect
          x={barX}
          y={barY}
          width={fillW}
          height={barH}
          cornerRadius={r}
          fill={barColor}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
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

/**
 * A retro OS window. The title bar and its traffic-light buttons are the whole
 * identity of Y2K packs; the interior is a camera hole in `live` mode so OBS
 * composites the real webcam through it.
 */
function WindowContent({ layer, ctx, glowBoost }: { layer: WindowLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const bar = Math.max(26, Math.min(h * 0.12, layer.fontSize * 2.1));
  const r = layer.cornerRadius;
  const isCamera = layer.content === "camera";
  const body = ctx.mode === "live" && isCamera ? undefined : resolveColor(layer.fill, ctx.theme);
  const barColor = resolveColor(layer.titleBarColor, ctx.theme);
  const ink = resolveColor(layer.textColor, ctx.theme);
  const btn = bar * 0.32;

  const isCameraHole = ctx.mode === "live" && isCamera;

  return (
    <Group listening={false}>
      <Rect
        width={w}
        height={h}
        cornerRadius={r}
        fill={body}
        {...borderProps(layer.effects, ctx.theme, w, h)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />
      {/* Title bar: square at the bottom, rounded at the top. */}
      <Rect width={w} height={bar} cornerRadius={[r, r, 0, 0]} fill={barColor} />
      <Text
        x={bar * 0.45}
        y={0}
        height={bar}
        width={w - bar * 3}
        verticalAlign="middle"
        text={resolveText(layer.title, ctx.profile, missingMode(ctx.mode))}
        fontFamily={layer.fontFamily}
        fontSize={fitFontSize(layer.title, w - bar * 3, layer.fontSize, layer.fontFamily, 400, 1)}
        letterSpacing={1}
        fill={ink}
        wrap="none"
      />
      {layer.buttons &&
        [2.4, 1.6, 0.8].map((slot, i) => (
          <Group key={i} x={w - bar * slot} y={bar / 2}>
            <Circle radius={btn} stroke={ink} strokeWidth={1.5} />
            {i === 2 && (
              <>
                <Line points={[-btn * 0.45, -btn * 0.45, btn * 0.45, btn * 0.45]} stroke={ink} strokeWidth={1.5} />
                <Line points={[btn * 0.45, -btn * 0.45, -btn * 0.45, btn * 0.45]} stroke={ink} strokeWidth={1.5} />
              </>
            )}
            {i === 0 && <Line points={[-btn * 0.45, 0, btn * 0.45, 0]} stroke={ink} strokeWidth={1.5} />}
            {i === 1 && <Rect x={-btn * 0.4} y={-btn * 0.4} width={btn * 0.8} height={btn * 0.8} stroke={ink} strokeWidth={1.5} />}
          </Group>
        ))}
      {layer.gloss && (
        <Group
          clipFunc={(c) => {
            c.rect(0, bar, w, h - bar);
          }}
        >
          {[0.12, 0.34].map((offset, i) => (
            <Line
              key={i}
              closed
              points={[
                w * offset, h * 1.2,
                w * (offset + 0.12), h * 1.2,
                w * (offset + 0.42), -h * 0.2,
                w * (offset + 0.3), -h * 0.2,
              ]}
              fill="rgba(255,255,255,0.10)"
            />
          ))}
        </Group>
      )}
      {layer.content === "chat" && (
        <Group y={bar}>
          <ChatRows
            width={w}
            height={h - bar}
            fontFamily={layer.fontFamily === "Press Start 2P" ? "Space Grotesk" : layer.fontFamily}
            fontSize={layer.chatFontSize}
            rows={layer.rows}
            usernameColor={layer.usernameColor}
            messageColor={layer.messageColor}
            ctx={ctx}
          />
        </Group>
      )}
      {ctx.mode !== "live" && isCamera && (
        <Text
          y={bar}
          width={w}
          height={h - bar}
          align="center"
          verticalAlign="middle"
          text="CAMERA"
          fontFamily="Inter"
          fontSize={Math.max(12, w * 0.035)}
          letterSpacing={4}
          fill={resolveColor("@border", ctx.theme)}
          opacity={0.5}
        />
      )}
      {/* Punch the camera hole LAST — after the body, its inward glow, and the
          gloss — so the interior below the title bar is truly transparent. */}
      {isCameraHole && (
        <Rect
          listening={false}
          globalCompositeOperation="destination-out"
          y={bar}
          width={w}
          height={h - bar}
          cornerRadius={[0, 0, r, r]}
          fill="#000"
        />
      )}
    </Group>
  );
}

const CHIP_ICONS = {
  heart: (s: number, color: string) => (
    <Group>
      <Circle x={-0.5 * s} y={-0.3 * s} radius={0.55 * s} fill={color} />
      <Circle x={0.5 * s} y={-0.3 * s} radius={0.55 * s} fill={color} />
      <Line closed points={[-1.0 * s, -0.05 * s, 1.0 * s, -0.05 * s, 0, 1.15 * s]} fill={color} />
    </Group>
  ),
  star: (s: number, color: string) => (
    <Star numPoints={4} innerRadius={0.35 * s} outerRadius={1.2 * s} fill={color} />
  ),
  none: () => null,
};

/** A compact event badge: icon, label, value. */
function ChipContent({ layer, ctx, glowBoost }: { layer: ChipLayer; ctx: RenderContext; glowBoost: number }) {
  const { width: w, height: h } = layer;
  const pad = h * 0.4;
  const iconSize = h * 0.18;
  const hasIcon = layer.icon !== "none";
  const iconSpace = hasIcon ? iconSize * 2 + pad * 0.5 : 0;

  const label = resolveText(layer.label, ctx.profile, missingMode(ctx.mode)).toUpperCase();
  const value = resolveText(layer.value, ctx.profile, missingMode(ctx.mode));
  const labelWidth = measureText(label, layer.fontSize, layer.fontFamily, 700) + layer.fontSize * 0.3 * label.length;

  // Two-part pill: a rounded icon cap (the accent) beside a dark text block.
  if (layer.split) {
    const capW = h * 1.2;
    const gap = h * 0.14;
    const blockX = capW + gap;
    const blockW = Math.max(1, w - blockX);
    const text = value ? `${label}  ${value}` : label;
    return (
      <Group listening={false}>
        <Rect
          x={0}
          y={0}
          width={capW}
          height={h}
          cornerRadius={h * 0.5}
          fill={resolveColor(layer.labelColor, ctx.theme)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
        {hasIcon && (
          <Group x={capW / 2} y={h / 2}>
            {CHIP_ICONS[layer.icon](h * 0.26, resolveColor("@background", ctx.theme))}
          </Group>
        )}
        <Rect
          x={blockX}
          y={0}
          width={blockW}
          height={h}
          cornerRadius={h * 0.34}
          {...fillProps(layer.fill, layer.effects, ctx.theme, blockW, h)}
          {...borderProps(layer.effects, ctx.theme, blockW, h)}
        />
        <Text
          x={blockX + h * 0.42}
          width={blockW - h * 0.7}
          height={h}
          verticalAlign="middle"
          text={text}
          fontFamily={layer.fontFamily}
          fontSize={layer.fontSize}
          fontStyle="italic 700"
          letterSpacing={1}
          fill={resolveColor(layer.valueColor, ctx.theme)}
          wrap="none"
          ellipsis
        />
      </Group>
    );
  }

  return (
    <Group listening={false}>
      <Rect
        width={w}
        height={h}
        cornerRadius={layer.cornerRadius}
        {...fillProps(layer.fill, layer.effects, ctx.theme, w, h)}
        {...borderProps(layer.effects, ctx.theme, w, h)}
        {...shadowProps(layer.effects, ctx.theme, glowBoost)}
      />
      {hasIcon && (
        <Group x={pad + iconSize} y={h / 2}>
          {CHIP_ICONS[layer.icon](iconSize, resolveColor(layer.labelColor, ctx.theme))}
        </Group>
      )}
      <Text
        x={pad + iconSpace}
        height={h}
        verticalAlign="middle"
        text={label}
        fontFamily={layer.fontFamily}
        fontSize={layer.fontSize}
        fontStyle="700"
        letterSpacing={layer.fontSize * 0.3}
        fill={resolveColor(layer.labelColor, ctx.theme)}
        wrap="none"
      />
      {value && (
        <Text
          x={pad + iconSpace + labelWidth + pad * 0.6}
          width={w - (pad + iconSpace + labelWidth + pad * 0.6) - pad}
          height={h}
          verticalAlign="middle"
          text={value}
          fontFamily={layer.fontFamily}
          fontSize={layer.fontSize}
          fill={resolveColor(layer.valueColor, ctx.theme)}
          wrap="none"
          ellipsis
        />
      )}
    </Group>
  );
}

/**
 * Ambient loops must not *look* like loops.
 *
 * A particle that wraps from one edge to the other at full opacity pops, and
 * the eye reads the pop as "the video restarted". Two rules fix it:
 *  - wrap outside the frame, with a margin at least as large as the sprite;
 *  - fade whatever crosses a visible edge.
 */
function wrapAround(value: number, span: number): number {
  return ((value % span) + span) % span;
}

/** 1 in the middle, easing to 0 within `band` of either edge. */
function edgeFade(value: number, extent: number, band: number): number {
  if (band <= 0) return 1;
  return Math.max(0, Math.min(1, Math.min(value, extent - value) / band));
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
        const margin = size * 6 + 40;
        const span = w + margin * 2;
        const x = wrapAround(seedX * span + t * layer.speed * (60 + seedS * 80), span) - margin;
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
            // Fade in/out at the horizontal edges so the wrap is seamless
            // instead of a bat teleporting from one side to the other.
            opacity={(0.5 + 0.5 * seedS) * edgeFade(x, w, margin)}
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
        const margin = size * 3;
        const y = wrapAround(seedY * h + fall, h + margin * 2) - margin;
        const x = seedX * w + Math.sin(t * (0.5 + seedS) + i) * 70;
        nodes.push(
          <Ellipse
            key={i}
            x={x}
            y={y}
            radiusX={size * 1.4}
            radiusY={size * 0.6}
            rotation={(t * 70 * layer.speed + i * 47) % 360}
            fill={color}
            opacity={opacity * 0.9 * edgeFade(y, h, size * 5)}
          />,
        );
        break;
      }

      case "fog": {
        // Large soft blobs drifting horizontally. The radial fade is what
        // sells it — a hard-edged circle reads as a balloon, not weather.
        const radius = layer.size * (18 + seedS * 22);
        const span = w + radius * 4;
        const x = wrapAround(seedX * span + t * layer.speed * (14 + seedS * 20), span) - radius * 2;
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

      case "clouds": {
        // One path, not a group of circles.
        //
        // Konva applies group opacity to each *child*, so overlapping
        // translucent circles seam along every intersection — which is exactly
        // why the clouds read as a pile of discs. Filling a single path whose
        // subpaths union under the nonzero winding rule gives a clean
        // silhouette: billowed on top, flat on the bottom, one alpha.
        // Evenly spaced along the span (pure noise clumps them), with the flat
        // baseline just past the bottom edge so the cut never shows.
        const scale = layer.size * (0.8 + seedS * 0.7);
        // The wrap margin has to clear the widest cloud, or a big one snaps
        // into view at the edge and gives the loop away.
        const margin = 3.05 * scale + 40;
        const span = w + margin * 2;
        const slot = (i + 0.5) / Math.max(1, count) + seedX * 0.22;
        const x = wrapAround(slot * span + t * layer.speed * (10 + seedS * 18), span) - margin;
        const y = h * 1.0 + (seedY - 0.5) * h * 0.07;
        const bob = Math.sin(t * 0.25 + i) * 3;
        const alpha = 0.55 + seedS * 0.35;
        const cap = lighten(color, 0.2);

        // [offsetX, radius] — each puff's bottom rests on the baseline.
        const puffs: Array<[number, number]> = [
          [-2.35, 0.72],
          [-1.5, 1.12],
          [-0.5, 1.55],
          [0.65, 1.28],
          [1.7, 0.92],
          [2.45, 0.6],
        ];
        const halfWidth = 3.05 * scale;

        const cloudPath = (c: Konva.Context, list: Array<[number, number]>, lift: number, shrink: number) => {
          c.beginPath();
          for (const [px, r] of list) {
            const rr = r * shrink * scale;
            c.moveTo((px - 0.12 * lift) * scale + rr, (-r * scale) - lift * 0.12 * scale);
            c.arc((px - 0.12 * lift) * scale, (-r * scale) - lift * 0.12 * scale, rr, 0, Math.PI * 2, false);
          }
          if (lift === 0) {
            c.moveTo(-halfWidth, -0.62 * scale);
            c.lineTo(halfWidth, -0.62 * scale);
            c.lineTo(halfWidth, 0);
            c.lineTo(-halfWidth, 0);
            c.closePath();
          }
        };

        nodes.push(
          <Group key={i} x={x} y={y + bob}>
            <KonvaShape
              fill={color}
              opacity={alpha}
              sceneFunc={(c, shape) => {
                cloudPath(c, puffs, 0, 1);
                c.fillShape(shape);
              }}
            />
            <KonvaShape
              fill={cap}
              opacity={alpha * 0.55}
              sceneFunc={(c, shape) => {
                cloudPath(c, puffs.slice(0, 4), 1, 0.66);
                c.fillShape(shape);
              }}
            />
          </Group>,
        );
        break;
      }

      case "rain": {
        // Thin near-vertical streaks falling and wrapping, each on its own phase.
        const span = h + 120;
        const y = ((t * 360 * layer.speed + seedY * span) % span) - 60;
        const x = seedX * w;
        const len = 24 + seedS * 30;
        nodes.push(
          <Line
            key={i}
            points={[x, y, x - 7, y - len]}
            stroke={color}
            strokeWidth={Math.max(1, layer.size * 0.42)}
            lineCap="round"
            opacity={0.22 + seedS * 0.4}
          />,
        );
        break;
      }

      case "shootingStars": {
        // Each star has its own slot in a repeating cycle, so they streak one
        // after another instead of all at once.
        const period = 4 + seedS * 5;
        const phase = ((t / period + seedX) % 1 + 1) % 1;
        if (phase > 0.22) break; // dark most of the cycle
        const p = phase / 0.22;
        const startX = seedX * w * 0.8;
        const startY = seedY * h * 0.5;
        const travel = 260 * layer.speed;
        const x = startX + p * travel;
        const y = startY + p * travel * 0.45;
        const tail = 60 + seedS * 60;
        const fade = Math.sin(p * Math.PI);
        nodes.push(
          <Line
            key={i}
            points={[x, y, x - tail, y - tail * 0.45]}
            stroke={color}
            strokeWidth={layer.size * 0.45}
            lineCap="round"
            opacity={fade * 0.9}
          />,
        );
        break;
      }

      case "blobs": {
        // Mesh-gradient orbs: each takes the next brand hue, so a palette swap
        // recolours the whole aurora.
        const tones = [
          resolveColor("@primary", ctx.theme),
          resolveColor("@secondary", ctx.theme),
          resolveColor("@accent", ctx.theme),
          resolveColor("@accentSecondary", ctx.theme),
        ];
        const radius = layer.size * (26 + seedS * 34);
        const x = seedX * w + Math.sin(t * 0.12 * layer.speed + i) * 90;
        const y = seedY * h + Math.cos(t * 0.1 * layer.speed + i * 1.7) * 70;
        const tone = tones[i % tones.length];
        nodes.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={radius}
            opacity={0.16 + seedS * 0.18}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={radius}
            fillRadialGradientColorStops={[0, tone, 1, "rgba(0,0,0,0)"]}
          />,
        );
        break;
      }

      case "ghosts": {
        // A sheeted ghost: domed head, straight shoulders, a scalloped hem.
        // It drifts upward, sways, and fades out before it wraps.
        const rise = t * layer.speed * 26 * (0.5 + seedS);
        const margin = layer.size * 8;
        const y = h - (wrapAround(seedY * h + rise, h + margin * 2) - margin);
        const x = seedX * w + Math.sin(t * (0.35 + seedS * 0.4) + i) * 34;
        const g = layer.size * (1.6 + seedS * 1.1);
        const eye = g * 0.16;
        nodes.push(
          <Group
            key={i}
            x={x}
            y={y}
            rotation={Math.sin(t * 0.5 + i) * 5}
            opacity={(0.35 + seedS * 0.4) * edgeFade(y, h, layer.size * 10)}
          >
            <KonvaShape
              fill={color}
              sceneFunc={(c, shape) => {
                const hem = g * 1.15;
                c.beginPath();
                c.arc(0, 0, g, Math.PI, 0, false);
                c.lineTo(g, hem);
                for (let k = 0; k < 4; k++) {
                  const x0 = g - (k * 2 * g) / 4;
                  const x1 = g - ((k + 1) * 2 * g) / 4;
                  const mid = (x0 + x1) / 2;
                  c.quadraticCurveTo(mid, hem + (k % 2 === 0 ? g * 0.42 : -g * 0.12), x1, hem);
                }
                c.lineTo(-g, 0);
                c.closePath();
                c.fillShape(shape);
              }}
            />
            <Circle x={-g * 0.32} y={-g * 0.1} radius={eye} fill="rgba(0,0,0,0.75)" />
            <Circle x={g * 0.32} y={-g * 0.1} radius={eye} fill="rgba(0,0,0,0.75)" />
            <Ellipse x={0} y={g * 0.42} radiusX={eye * 0.7} radiusY={eye} fill="rgba(0,0,0,0.6)" />
          </Group>,
        );
        break;
      }

      case "bokeh": {
        // Out-of-focus lights: a soft disc with a brighter rim, because a
        // defocused point source concentrates its light at the circle's edge.
        const radius = layer.size * (6 + seedS * 14);
        const x = seedX * w + Math.sin(t * 0.08 * layer.speed + i) * 40;
        const y = seedY * h + Math.cos(t * 0.06 * layer.speed + i * 1.3) * 30;
        nodes.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={radius}
            opacity={0.06 + seedS * 0.14}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={radius}
            fillRadialGradientColorStops={[0, withAlpha(color, 0.55), 0.82, withAlpha(color, 0.75), 1, withAlpha(color, 0)]}
          />,
        );
        break;
      }

      case "confetti": {
        // Multi-tone by design: pieces cycle through the theme's brand tokens,
        // so confetti follows a palette swap like everything else.
        const tones = [
          color,
          resolveColor("@primary", ctx.theme),
          resolveColor("@secondary", ctx.theme),
          resolveColor("@accentSecondary", ctx.theme),
        ];
        const fall = t * layer.speed * 90 * (0.5 + seedS);
        const margin = size * 3;
        const y = wrapAround(seedY * h + fall, h + margin * 2) - margin;
        const x = seedX * w + Math.sin(t * (0.8 + seedS) + i) * 50;
        nodes.push(
          <Rect
            key={i}
            x={x}
            y={y}
            width={size * 1.6}
            height={size * 0.9}
            offsetX={size * 0.8}
            offsetY={size * 0.45}
            rotation={(t * 180 * layer.speed + i * 71) % 360}
            fill={tones[i % tones.length]}
            opacity={opacity * edgeFade(y, h, size * 5)}
          />,
        );
        break;
      }

      case "hearts": {
        // Drift upward with a sway, fading as they rise.
        const rise = t * layer.speed * 45 * (0.5 + seedS);
        const margin = size * 3;
        const y = h - (wrapAround(seedY * h + rise, h + margin * 2) - margin);
        const x = seedX * w + Math.sin(t * (0.6 + seedS) + i) * 40;
        const s = size * (0.8 + seedS);
        // Hearts dim as they rise, and the edge fade closes the wrap.
        const fade = (0.25 + 0.75 * Math.max(0, Math.min(1, y / h))) * edgeFade(y, h, size * 5);
        nodes.push(
          <Group key={i} x={x} y={y} rotation={Math.sin(t + i) * 14} opacity={opacity * fade}>
            <Circle x={-0.52 * s} y={-0.35 * s} radius={0.6 * s} fill={color} />
            <Circle x={0.52 * s} y={-0.35 * s} radius={0.6 * s} fill={color} />
            <Line closed points={[-1.05 * s, -0.08 * s, 1.05 * s, -0.08 * s, 0, 1.25 * s]} fill={color} />
          </Group>,
        );
        break;
      }

      case "rays": {
        // Light beams sweeping slowly from above the top edge.
        const cx = w / 2;
        const angle = (seedX - 0.5) * 110 + Math.sin(t * 0.15 * layer.speed + i) * 14;
        const length = h * 1.5;
        const halfWidth = 20 + seedS * 70;
        nodes.push(
          <Line
            key={i}
            x={cx}
            y={-60}
            closed
            rotation={angle}
            points={[0, 0, -halfWidth, length, halfWidth, length]}
            fill={color}
            opacity={0.035 + seedS * 0.06}
          />,
        );
        break;
      }

      case "stars": {
        const drift = t * layer.speed * 40 * (0.4 + seedS);
        const y = wrapAround(seedY * h + drift, h);
        // No modulo on x: the sway is small, and wrapping it would snap a star
        // across the frame mid-twinkle.
        const x = seedX * w + Math.sin(t * (0.3 + seedS) + i) * 18;
        nodes.push(
          <Star
            key={i}
            x={x}
            y={y}
            numPoints={4}
            innerRadius={size * 0.35}
            outerRadius={size * 1.6}
            fill={color}
            opacity={opacity * (0.6 + 0.4 * Math.sin(t * 2 + i)) * edgeFade(y, h, size * 6)}
          />,
        );
        break;
      }

      default: {
        const drift = t * layer.speed * 40 * (0.4 + seedS);
        const rises = layer.kind === "embers" || layer.kind === "bubbles";
        const y = wrapAround(rises ? seedY * h - drift : seedY * h + drift, h);
        const x = seedX * w + Math.sin(t * (0.3 + seedS) + i) * 18;
        const flicker = layer.kind === "embers" ? 0.5 + 0.5 * Math.sin(t * 3 + i) : 1;
        nodes.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={size}
            fill={color}
            opacity={opacity * flicker * edgeFade(y, h, size * 6)}
          />,
        );
      }
    }
  }

  // A glow effect on a particle layer lights every particle — glowing ghosts,
  // neon bats, embers with a real bloom. Cloned in so each branch above stays
  // simple; the shadow is a pure per-node paint, safe under animation.
  const g = layer.effects.glow;
  if (g.enabled) {
    const glowProps = {
      shadowColor: resolveColor(g.color, ctx.theme),
      shadowBlur: g.strength,
      shadowOpacity: 1,
    };
    return (
      <Group listening={false}>
        {nodes.map((n) => cloneElement(n, glowProps))}
      </Group>
    );
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
    case "flag":
      return <FlagContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "icon":
      return <IconContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "window":
      return <WindowContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
    case "chip":
      return <ChipContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
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
    case "goal":
      return <GoalContent layer={layer} ctx={ctx} glowBoost={glowBoost} />;
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
