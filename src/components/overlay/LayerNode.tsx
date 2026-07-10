"use client";

import { useEffect, useRef } from "react";
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
    fillLinearGradientColorStops: [
      0,
      resolveColor(gradient.from, theme),
      1,
      resolveColor(gradient.to, theme),
    ],
  };
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
            sceneFunc={(c) => drawGloss(c, w, h, Math.min(layer.cornerRadius, w / 2, h / 2), gloss.strength)}
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

  return <Line closed points={polygonPoints(layer.shape, w, h)} {...paint} />;
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

    return (
      <Group listening={false}>
        {chars.map((ch, i) => {
          const cx = x;
          x += advances[i];
          if (ch.trim() === "") return null; // spaces advance but don't consume a stripe
          const fill = stripes[colorIndex++ % stripes.length];
          return (
            <Text
              key={i}
              x={cx}
              text={ch}
              fontFamily={layer.fontFamily}
              fontSize={fontSize}
              fontStyle={fontStyleOf(layer.fontWeight, layer.italic)}
              fill={fill}
              {...shadow}
            />
          );
        })}
      </Group>
    );
  }

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
  };

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
      fill={resolveColor(layer.fill, ctx.theme)}
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
  const isCameraHole = ctx.mode === "live" && layer.type === "camera";
  // In OBS the webcam sits *behind* the browser source, so any fill here would
  // tint the camera. Only the studio draws the placeholder fill.
  const fill = isCameraHole ? undefined : resolveColor(layer.fill, ctx.theme);
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
      {/* Punch the interior hole LAST. A camera window is a hole through
          everything beneath it — the backdrop, the fog, and crucially the
          frame's own glow, which blooms inward off the stroke. Punching after
          the frame is drawn erases that inward bloom so the interior is truly
          transparent (OBS composites the webcam behind it); the outward glow,
          which lands outside this path, is untouched. */}
      {isCameraHole && (
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
  const avatar = fontSize * 0.62;

  return (
    <>
      {rows.map((row, i) => {
        const y = pad + i * rowHeight;
        const nameWidth = measureText(`${row.user}:`, fontSize, fontFamily, 700);
        return (
          <Group key={row.user} y={y}>
            <Circle
              x={pad + avatar}
              y={fontSize * 0.7}
              radius={avatar}
              fill={resolveColor(i % 2 === 0 ? "@primary" : "@secondary", ctx.theme)}
              opacity={0.85}
            />
            <Text
              x={pad + avatar * 2 + 10}
              text={`${row.user}:`}
              fontFamily={fontFamily}
              fontSize={fontSize}
              fontStyle="700"
              fill={resolveColor(usernameColor, ctx.theme)}
            />
            <Text
              x={pad + avatar * 2 + 10 + nameWidth + 8}
              width={w - (pad + avatar * 2 + 10 + nameWidth + 8) - pad}
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
          fill={resolveColor(layer.fill, ctx.theme)}
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
          fill={resolveColor(layer.fill, ctx.theme)}
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
  const avatarSize = h * 0.52;
  // A coffin's pointed head eats the left edge, so the whole row shifts inboard.
  const headInset = coffin ? h * 0.18 : 0;
  const left = headInset + h * 0.24 + avatarSize + h * 0.16;
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
          fill={resolveColor(layer.fill, ctx.theme)}
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
          fill={resolveColor(layer.fill, ctx.theme)}
          {...borderProps(layer.effects, ctx.theme)}
          {...shadowProps(layer.effects, ctx.theme, glowBoost)}
        />
      )}
      <Circle
        x={headInset + h * 0.24 + avatarSize / 2}
        y={h / 2}
        radius={avatarSize / 2}
        fill={resolveColor("@primary", ctx.theme)}
        stroke={resolveColor("@accent", ctx.theme)}
        strokeWidth={3}
      />
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

  return (
    <Group listening={false}>
      <Rect
        width={w}
        height={h}
        cornerRadius={layer.cornerRadius}
        fill={resolveColor(layer.fill, ctx.theme)}
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
