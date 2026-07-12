import {
  DEFAULT_ANIMATION,
  DEFAULT_EFFECTS,
  type Animation,
  type Collection,
  type Effects,
  type Layer,
  type LayerBase,
  type ParticleKind,
  type ShapeKind,
  type SocialPlatform,
  type Template,
  type TemplateCategory,
  type StyleTag,
} from "@/lib/types";
import { ABSTRACT_PALETTES, CORE_PALETTES, DEFAULT_PALETTE_ID, GOTHIC_PALETTES, PRIDE_PALETTES, PRISM_PALETTES, paletteTags } from "./palettes";
import { CUSTOM_TEMPLATES } from "./custom-designs";
import type { Palette } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*                              Layer builders                                */
/* -------------------------------------------------------------------------- */

/** A layer as authored in a template — the id is assigned at build time. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type LayerSpec = WithoutId<Layer>;

type BaseOpts = Partial<Pick<LayerBase, "rotation" | "opacity" | "visible" | "locked">> & {
  effects?: DeepPartial<Effects>;
  animation?: Partial<Animation>;
};

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

function mergeEffects(patch?: DeepPartial<Effects>): Effects {
  if (!patch) return DEFAULT_EFFECTS;
  return {
    shadow: { ...DEFAULT_EFFECTS.shadow, ...patch.shadow },
    glow: { ...DEFAULT_EFFECTS.glow, ...patch.glow },
    blur: { ...DEFAULT_EFFECTS.blur, ...patch.blur },
    border: { ...DEFAULT_EFFECTS.border, ...patch.border },
    gradient: { ...DEFAULT_EFFECTS.gradient, ...patch.gradient },
  };
}

function common(name: string, o: BaseOpts): Omit<LayerBase, "id" | "type"> {
  return {
    name,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: o.rotation ?? 0,
    opacity: o.opacity ?? 1,
    visible: o.visible ?? true,
    locked: o.locked ?? false,
    effects: mergeEffects(o.effects),
    animation: { ...DEFAULT_ANIMATION, ...o.animation },
  };
}

type Box = { x: number; y: number; width: number; height: number };

function shape(
  name: string,
  box: Box,
  o: BaseOpts & {
    shape?: ShapeKind;
    fill?: string;
    cornerRadius?: number;
    background?: boolean;
    moonPhase?: number;
    craters?: boolean;
    facetMode?: "sides" | "stripes";
    facetColors?: string[];
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: o.background ? "background" : "shape",
    shape: o.shape ?? "rect",
    fill: o.fill ?? "@primary",
    cornerRadius: o.cornerRadius ?? 0,
    moonPhase: o.moonPhase,
    craters: o.craters,
    facetMode: o.facetMode,
    facetColors: o.facetColors,
  };
}

function text(
  name: string,
  box: Box,
  content: string,
  o: BaseOpts & {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    italic?: boolean;
    align?: "left" | "center" | "right";
    letterSpacing?: number;
    lineHeight?: number;
    fill?: string;
    fillStripes?: string[];
    textTransform?: "none" | "uppercase" | "lowercase";
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "text",
    text: content,
    fontFamily: o.fontFamily ?? "Inter",
    fontSize: o.fontSize ?? 32,
    fontWeight: o.fontWeight ?? 700,
    italic: o.italic ?? false,
    align: o.align ?? "left",
    letterSpacing: o.letterSpacing ?? 0,
    lineHeight: o.lineHeight ?? 1.2,
    fill: o.fill ?? "@text",
    fillStripes: o.fillStripes,
    textTransform: o.textTransform ?? "none",
  };
}

function img(
  name: string,
  box: Box,
  src: string,
  o: BaseOpts & { fit?: "cover" | "contain" | "fill"; cornerRadius?: number; logo?: boolean } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: o.logo ? "logo" : "image",
    src,
    fit: o.fit ?? "contain",
    cornerRadius: o.cornerRadius ?? 0,
  };
}

function frame(
  name: string,
  box: Box,
  o: BaseOpts & {
    camera?: boolean;
    shape?: "rect" | "ellipse" | "hexagon";  // authoring alias for frameShape
    fill?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    corners?: boolean;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: o.camera ? "camera" : "frame",
    frameShape: o.shape ?? "rect",
    fill: o.fill ?? "@surface/60",
    strokeColor: o.strokeColor ?? "@primary",
    strokeWidth: o.strokeWidth ?? 4,
    cornerRadius: o.cornerRadius ?? 16,
    corners: o.corners ?? false,
  };
}

function chatbox(
  name: string,
  box: Box,
  o: BaseOpts & {
    boxShape?: "rect" | "coffin";
    fill?: string;
    cornerRadius?: number;
    fontFamily?: string;
    fontSize?: number;
    usernameColor?: string;
    messageColor?: string;
    rows?: number;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "chatbox",
    boxShape: o.boxShape ?? "rect",
    fill: o.fill ?? "@surface/80",
    cornerRadius: o.cornerRadius ?? 18,
    fontFamily: o.fontFamily ?? "Inter",
    fontSize: o.fontSize ?? 22,
    usernameColor: o.usernameColor ?? "@accent",
    messageColor: o.messageColor ?? "@text",
    rows: o.rows ?? 8,
  };
}

function alert(
  name: string,
  box: Box,
  title: string,
  subtitle: string,
  o: BaseOpts & {
    fill?: string;
    cornerRadius?: number;
    boxShape?: "rect" | "coffin";
    fontFamily?: string;
    titleColor?: string;
    subtitleColor?: string;
    avatar?: boolean;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "alert",
    title,
    subtitle,
    fill: o.fill ?? "@surface/90",
    cornerRadius: o.cornerRadius ?? 20,
    boxShape: o.boxShape ?? "rect",
    fontFamily: o.fontFamily ?? "Bebas Neue",
    titleColor: o.titleColor ?? "@accent",
    subtitleColor: o.subtitleColor ?? "@text",
    avatar: o.avatar ?? false,
  };
}

function goal(
  name: string,
  box: Box,
  label: string,
  current: number,
  target: number,
  o: BaseOpts & {
    goalStyle?: "bar" | "ring";
    barShape?: "rect" | "coffin" | "plaque";
    fill?: string;
    trackColor?: string;
    barColor?: string;
    labelColor?: string;
    valueColor?: string;
    fontFamily?: string;
    cornerRadius?: number;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "goal",
    goalStyle: o.goalStyle ?? "bar",
    label,
    current,
    target,
    barShape: o.barShape ?? "rect",
    fill: o.fill ?? "@surface/90",
    trackColor: o.trackColor ?? "@surface/55",
    barColor: o.barColor ?? "@accent",
    labelColor: o.labelColor ?? "@accent",
    valueColor: o.valueColor ?? "@text",
    fontFamily: o.fontFamily ?? "Inter",
    cornerRadius: o.cornerRadius ?? 16,
  };
}

function social(
  name: string,
  box: Box,
  o: BaseOpts & {
    platforms?: SocialPlatform[];
    direction?: "horizontal" | "vertical";
    gap?: number;
    iconColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
    showHandles?: boolean;
    pill?: boolean;
    pillColor?: string;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "social",
    platforms: o.platforms ?? ["twitch", "youtube", "discord", "instagram"],
    direction: o.direction ?? "horizontal",
    gap: o.gap ?? 24,
    iconColor: o.iconColor ?? "@accent",
    textColor: o.textColor ?? "@text",
    fontFamily: o.fontFamily ?? "Inter",
    fontSize: o.fontSize ?? 24,
    showHandles: o.showHandles ?? true,
    pill: o.pill ?? true,
    pillColor: o.pillColor ?? "@surface/80",
  };
}

function flag(
  name: string,
  box: Box,
  o: BaseOpts & {
    stripes?: string[];
    stackDirection?: "vertical" | "horizontal";
    cornerRadius?: number;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "flag",
    // Classic six as the authored default; the variant builder substitutes the
    // palette's authentic flag at expansion time.
    stripes: o.stripes ?? ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
    stackDirection: o.stackDirection ?? "horizontal",
    cornerRadius: o.cornerRadius ?? 4,
  };
}

function icon(
  name: string,
  box: Box,
  symbol: string,
  o: BaseOpts & { fill?: string; strokeWidth?: number } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "icon",
    symbol,
    fill: o.fill ?? "@accent",
    strokeWidth: o.strokeWidth ?? 2,
  };
}

function windowBox(
  name: string,
  box: Box,
  title: string,
  o: BaseOpts & {
    fill?: string;
    titleBarColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
    cornerRadius?: number;
    buttons?: boolean;
    gloss?: boolean;
    content?: "empty" | "camera" | "chat";
    chatFontSize?: number;
    rows?: number;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "window",
    title,
    fill: o.fill ?? "@surface/85",
    titleBarColor: o.titleBarColor ?? "@primary",
    textColor: o.textColor ?? "@text",
    fontFamily: o.fontFamily ?? "Press Start 2P",
    fontSize: o.fontSize ?? 12,
    cornerRadius: o.cornerRadius ?? 10,
    buttons: o.buttons ?? true,
    gloss: o.gloss ?? true,
    content: o.content ?? "empty",
    chatFontSize: o.chatFontSize ?? 20,
    usernameColor: "@accent",
    messageColor: "@text",
    rows: o.rows ?? 8,
  };
}

function chip(
  name: string,
  box: Box,
  label: string,
  value: string,
  o: BaseOpts & {
    fill?: string;
    labelColor?: string;
    valueColor?: string;
    fontFamily?: string;
    fontSize?: number;
    cornerRadius?: number;
    icon?: "heart" | "star" | "none";
    split?: boolean;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "chip",
    label,
    value,
    fill: o.fill ?? "@surface/90",
    labelColor: o.labelColor ?? "@accent",
    valueColor: o.valueColor ?? "@text",
    fontFamily: o.fontFamily ?? "Inter",
    fontSize: o.fontSize ?? 16,
    cornerRadius: o.cornerRadius ?? 26,
    icon: o.icon ?? "heart",
    split: o.split ?? false,
  };
}

function particles(
  name: string,
  o: BaseOpts & {
    kind?: ParticleKind;
    count?: number;
    color?: string;
    size?: number;
    speed?: number;
    /** Confine the particle field to a box. Defaults to the whole canvas. */
    box?: Box;
  } = {},
): LayerSpec {
  const box = o.box ?? { x: 0, y: 0, width: 1920, height: 1080 };
  return {
    ...common(name, o),
    ...box,
    type: "particle",
    kind: o.kind ?? "dots",
    count: o.count ?? 60,
    color: o.color ?? "@glow",
    size: o.size ?? 4,
    speed: o.speed ?? 1,
  };
}


/* -------------------------------------------------------------------------- */
/*                            Family scene recipes                            */
/* -------------------------------------------------------------------------- */

/**
 * A design family is only a family if its screens share their *ground*.
 *
 * Every full-screen scene in a family opens with the exact same backdrop
 * layers — same token, same alpha, same angle, same decor — so a pack's
 * Starting Soon and its Be Right Back are unmistakably the same design.
 * Letting each screen pick its own gradient token was what made the packs
 * look like eleven unrelated overlays: `@primary` scenes read burgundy while
 * `@secondary` scenes read violet, from one palette.
 */
const FULL: Box = { x: 0, y: 0, width: 1920, height: 1080 };

/**
 * Overlay screens (gameplay, webcam, chat) put the game or camera in the
 * centre. Roaming decor — bats, ghosts, hearts — must stay in the margins
 * where the furniture lives (webcam bottom-left, chat right), never drifting
 * across the play area. These two columns bracket the centre.
 */
const MARGIN_LEFT: Box = { x: 0, y: 120, width: 420, height: 960 };
const MARGIN_RIGHT: Box = { x: 1500, y: 60, width: 420, height: 960 };

/** Gothic ground: burgundy-tinted night, drifting fog, stars, ornament frame. */
function gothicScene(): LayerSpec[] {
  return [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/22", angle: 180 } },
    }),
    particles("Decor — Fog", { kind: "fog", count: 9, size: 5, speed: 0.6, color: "@secondary" }),
    particles("Decor — Stars", { kind: "stars", count: 42, size: 3, speed: 0.25, color: "@accent", opacity: 0.65 }),
    shape("Decor — Outer frame", { x: 70, y: 70, width: 1780, height: 940 }, {
      fill: "transparent",
      opacity: 0.8,
      effects: { border: { enabled: true, color: "@accent", width: 2, radius: 4 } },
    }),
    shape("Decor — Inner frame", { x: 88, y: 88, width: 1744, height: 904 }, {
      fill: "transparent",
      opacity: 0.9,
      effects: { border: { enabled: true, color: "@border", width: 1, radius: 2 } },
    }),
  ];
}

/** Neon Grid ground: cool wash, grid dust, glowing accent rails. */
function neonScene(): LayerSpec[] {
  return [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/22", angle: 170 } },
    }),
    particles("Decor — Grid dust", { kind: "dots", count: 54, size: 3, speed: 0.6, color: "@glow", opacity: 0.6 }),
    // A soft pooled glow low in the frame that breathes.
    shape("Decor — Horizon glow", { x: 260, y: 720, width: 1400, height: 420 }, {
      shape: "ellipse",
      fill: "@accent/10",
      effects: { glow: { enabled: true, color: "@glow", strength: 90 } },
      animation: anim("glow", { duration: 4200, intensity: 0.9 }),
    }),
    shape("Decor — Top rail", { x: 0, y: 0, width: 1920, height: 4 }, {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      animation: anim("shimmer", { duration: 3600 }),
    }),
    shape("Decor — Bottom rail", { x: 0, y: 1076, width: 1920, height: 4 }, {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      animation: anim("shimmer", { duration: 3600, delay: 600 }),
    }),
    shape("Decor — Left rail", { x: 0, y: 0, width: 4, height: 1080 }, {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      animation: anim("shimmer", { duration: 4200, delay: 300 }),
    }),
    shape("Decor — Right rail", { x: 1916, y: 0, width: 4, height: 1080 }, {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      animation: anim("shimmer", { duration: 4200, delay: 900 }),
    }),
  ];
}

/** Pride ground: neutral night under a blurred flag aurora, plus stars. */
function prideScene(washOpacity = 0.15): LayerSpec[] {
  return [
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    flag("Decor — Rainbow wash", { x: -160, y: -160, width: 2240, height: 1400 }, {
      stackDirection: "vertical",
      cornerRadius: 0,
      opacity: washOpacity,
      // Blurred into a soft aurora — hard stripe bands read as a dim flag,
      // not a sky. Static layer, so the blur cache is safe.
      effects: { blur: { enabled: true, amount: 60 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 44, size: 3, speed: 0.3, color: "@accent", opacity: 0.7 }),
  ];
}

/* -------------------------------------------------------------------------- */
/*                              Base templates                                */
/* -------------------------------------------------------------------------- */

interface BaseTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  tags: StyleTag[];
  collection: Collection;
  /**
   * Core design family. Screens of the same family share one visual identity
   * and compose their names as "<family> — <screen>", so searching the family
   * name surfaces the whole matching set. Themed collections don't need this —
   * their pack name is the palette.
   */
  family?: string;
  layers: LayerSpec[];
}

const anim = (preset: Animation["preset"], extra: Partial<Animation> = {}): Partial<Animation> => ({
  preset,
  ...extra,
});

const BASE_TEMPLATES: BaseTemplate[] = [
  /* ------------------------------- Gameplay ------------------------------- */
  {
    id: "neon-grid",
    name: "Gameplay",
    category: "Gameplay",
    tags: ["Esports"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 76 }, {
        fill: "@surface/90",
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      shape("Top accent", { x: 0, y: 76, width: 1920, height: 4 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("shimmer", { duration: 3000 }),
      }),
      shape("Corner slash", { x: 1786, y: -30, width: 90, height: 140 }, {
        fill: "@primary/40",
        rotation: 24,
      }),
      img("Logo", { x: 28, y: 14, width: 48, height: 48 }, "{{LOGO}}", { logo: true, fit: "contain" }),
      text("Channel name", { x: 92, y: 20, width: 520, height: 40 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 30,
        fontWeight: 900,
        fill: "@text",
        letterSpacing: 2,
        textTransform: "uppercase",
      }),
      text("Slogan", { x: 92, y: 52, width: 520, height: 24 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 15,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      frame("Webcam", { x: 40, y: 690, width: 480, height: 270 }, {
        camera: true,
        strokeColor: "@primary",
        strokeWidth: 4,
        cornerRadius: 14,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
        // Persistent widgets animate in place, never fly in — a webcam that
        // slides across the screen at scene start reads as a glitch on stream.
        animation: anim("glow", { duration: 3000 }),
      }),
      chatbox("Chat", { x: 1520, y: 130, width: 360, height: 560 }, { rows: 7 }),
      social("Socials", { x: 640, y: 980, width: 640, height: 56 }, {
        platforms: ["twitch", "discord", "instagram", "x"],
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },

  /* ------------------------ Neon Grid family screens ----------------------- */
  // The rest of the Neon Grid pack: same Orbitron/Inter type, glowing accent
  // hairlines and corner-cut frames as the gameplay screen above, so searching
  // "Neon Grid" surfaces a complete matching set.
  {
    id: "neon-starting",
    name: "Starting Soon",
    category: "Starting Soon",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      shape("Decor — Top line", { x: 360, y: 430, width: 1200, height: 3 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("shimmer", { duration: 3400 }),
      }),
      text("Headline", { x: 210, y: 470, width: 1500, height: 130 }, "STARTING SOON", {
        fontFamily: "Orbitron",
        fontSize: 96,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        letterSpacing: 12,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
      shape("Decor — Bottom line", { x: 360, y: 622, width: 1200, height: 3 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("shimmer", { duration: 3400, delay: 600 }),
      }),
      text("Channel name", { x: 310, y: 660, width: 1300, height: 66 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 46,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 4,
        textTransform: "uppercase",
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
      text("Slogan", { x: 360, y: 750, width: 1200, height: 38 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 24,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
      social("Socials", { x: 460, y: 900, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram"],
        animation: anim("slide", { direction: "up", duration: 800, delay: 900 }),
      }),
    ],
  },
  {
    id: "neon-brb",
    name: "Be Right Back",
    category: "BRB",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      frame("Decor — Frame", { x: 560, y: 380, width: 800, height: 320 }, {
        fill: "@surface/60",
        strokeColor: "@accent",
        strokeWidth: 3,
        cornerRadius: 6,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
        animation: anim("glow", { duration: 3600 }),
      }),
      text("Headline", { x: 560, y: 450, width: 800, height: 90 }, "BE RIGHT BACK", {
        fontFamily: "Orbitron",
        fontSize: 60,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        letterSpacing: 6,
        animation: anim("fade", { duration: 1000 }),
      }),
      text("Sub", { x: 560, y: 560, width: 800, height: 36 }, "{{CHANNEL_NAME}} · hold the line", {
        fontFamily: "Inter",
        fontSize: 22,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1000, delay: 400 }),
      }),
      social("Socials", { x: 560, y: 880, width: 800, height: 56 }, {
        platforms: ["twitch", "discord", "x"],
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
    ],
  },
  {
    id: "neon-ending",
    name: "Stream Ending",
    category: "Stream Ending",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      text("Headline", { x: 210, y: 430, width: 1500, height: 130 }, "THANKS FOR WATCHING", {
        fontFamily: "Orbitron",
        fontSize: 88,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        letterSpacing: 8,
        effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
        animation: anim("slide", { direction: "up", duration: 900, delay: 200 }),
      }),
      text("Channel name", { x: 310, y: 590, width: 1300, height: 64 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 42,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 4,
        textTransform: "uppercase",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
      social("Socials", { x: 310, y: 760, width: 1300, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        animation: anim("slide", { direction: "up", duration: 900, delay: 800 }),
      }),
    ],
  },
  {
    id: "neon-offline",
    name: "Offline",
    category: "Offline",
    tags: ["Esports", "Minimal"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      frame("Card", { x: 660, y: 330, width: 600, height: 420 }, {
        fill: "@surface/80",
        strokeColor: "@border",
        strokeWidth: 1,
        cornerRadius: 8,
        corners: true,
        animation: anim("glow", { duration: 4200 }),
        effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
      }),
      img("Logo", { x: 880, y: 370, width: 160, height: 160 }, "{{LOGO}}", {
        logo: true,
        animation: anim("fade", { duration: 900, delay: 200 }),
      }),
      text("Headline", { x: 660, y: 560, width: 600, height: 60 }, "OFFLINE", {
        fontFamily: "Orbitron",
        fontSize: 44,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        letterSpacing: 10,
        animation: anim("fade", { duration: 900, delay: 350 }),
      }),
      text("Sub", { x: 660, y: 640, width: 600, height: 36 }, "{{CHANNEL_NAME}} is recharging", {
        fontFamily: "Inter",
        fontSize: 20,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
      social("Socials", { x: 660, y: 690, width: 600, height: 44 }, {
        platforms: ["twitch", "discord", "x"],
        fontSize: 18,
        animation: anim("fade", { duration: 900, delay: 650 }),
      }),
    ],
  },
  {
    id: "neon-chatting",
    name: "Just Chatting",
    category: "Just Chatting",
    tags: ["Esports"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      frame("Webcam", { x: 90, y: 140, width: 1020, height: 574 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 4,
        cornerRadius: 8,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      shape("Name plate", { x: 90, y: 760, width: 640, height: 84 }, {
        fill: "@surface/90",
        cornerRadius: 6,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 6 } },
      }),
      text("Display name", { x: 130, y: 780, width: 560, height: 48 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 36,
        fontWeight: 700,
        fill: "@text",
        letterSpacing: 2,
      }),
      text("Slogan", { x: 92, y: 870, width: 900, height: 36 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 24,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      chatbox("Chat", { x: 1180, y: 140, width: 650, height: 740 }, {
        cornerRadius: 8,
        rows: 9,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 8 } },
      }),
      social("Socials", { x: 90, y: 950, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "instagram", "discord"],
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
    ],
  },
  {
    id: "neon-webcam",
    name: "Webcam Frame",
    category: "Webcam Frames",
    tags: ["Esports"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 4,
        cornerRadius: 8,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      shape("Name plate", { x: 660, y: 880, width: 600, height: 70 }, {
        fill: "@surface/90",
        cornerRadius: 6,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 6 } },
      }),
      text("Display name", { x: 660, y: 898, width: 600, height: 40 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 30,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 3,
        textTransform: "uppercase",
      }),
    ],
  },
  {
    id: "neon-chatbox",
    name: "Chat Box",
    category: "Chat Boxes",
    tags: ["Esports", "Minimal"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      text("Chat title", { x: 1400, y: 58, width: 460, height: 42 }, "LIVE CHAT", {
        fontFamily: "Orbitron",
        fontSize: 24,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 8,
        animation: anim("fade", { duration: 800 }),
      }),
      shape("Decor — Line", { x: 1430, y: 106, width: 400, height: 2 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
        animation: anim("shimmer", { duration: 4200 }),
      }),
      chatbox("Chat", { x: 1400, y: 126, width: 460, height: 834 }, {
        cornerRadius: 8,
        rows: 10,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 8 } },
      }),
    ],
  },
  {
    id: "neon-follower",
    name: "Follower Alert",
    category: "Alerts",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      alert("Follower alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW FOLLOWER", "AwesomeViewer", {
        fontFamily: "Orbitron",
        cornerRadius: 8,
        titleColor: "@accent",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 36 },
          border: { enabled: true, color: "@border", width: 1, radius: 8 },
        },
        animation: anim("elastic", { duration: 1500 }),
      }),
    ],
  },
  {
    id: "neon-subscriber",
    name: "Subscriber Alert",
    category: "Alerts",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      alert("Subscriber alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW SUBSCRIBER", "Tier 1 · welcome aboard", {
        fontFamily: "Orbitron",
        cornerRadius: 8,
        avatar: false,
        fill: "@surface/95",
        titleColor: "@accent",
        subtitleColor: "@text",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 46 },
          border: { enabled: true, color: "@accent", width: 2, radius: 8 },
        },
        animation: anim("bounce", { duration: 1400 }),
      }),
    ],
  },
  {
    id: "neon-goals",
    name: "Goals",
    category: "Goals",
    tags: ["Esports", "Neon"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      goal("Follower ring", { x: 150, y: 380, width: 360, height: 360 }, "FOLLOWERS", 847, 1000, {
        goalStyle: "ring",
        fontFamily: "Orbitron",
        barColor: "@accent",
        trackColor: "@surface/60",
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
      goal("Sub goal", { x: 560, y: 430, width: 760, height: 150 }, "SUB GOAL", 62, 100, {
        goalStyle: "bar",
        fill: "@surface/88",
        fontFamily: "Orbitron",
        barColor: "@accent",
        cornerRadius: 8,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 24 },
          border: { enabled: true, color: "@border", width: 1, radius: 8 },
        },
        animation: anim("slide", { direction: "right", duration: 700 }),
      }),
      goal("Donation goal", { x: 560, y: 610, width: 760, height: 150 }, "DONATION GOAL", 340, 500, {
        goalStyle: "bar",
        fill: "@surface/88",
        fontFamily: "Orbitron",
        barColor: "@primary",
        cornerRadius: 8,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 24 },
          border: { enabled: true, color: "@border", width: 1, radius: 8 },
        },
        animation: anim("slide", { direction: "right", duration: 700, delay: 160 }),
      }),
    ],
  },
  {
    id: "neon-socialbar",
    name: "Social Bar",
    category: "Social Bars",
    tags: ["Esports", "Minimal"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      shape("Decor — Line", { x: 460, y: 946, width: 1000, height: 2 }, {
        fill: "@accent/70",
        effects: { glow: { enabled: true, color: "@glow", strength: 10 } },
        animation: anim("shimmer", { duration: 4600 }),
      }),
      social("Socials", { x: 460, y: 962, width: 1000, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        pill: true,
        pillColor: "@surface/90",
        gap: 20,
        fontSize: 22,
        animation: anim("fade", { duration: 900 }),
      }),
    ],
  },
  {
    id: "neon-pause",
    name: "Pause",
    category: "Pause",
    tags: ["Esports", "Minimal"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      text("Headline", { x: 460, y: 470, width: 1000, height: 60 }, "PAUSED", {
        fontFamily: "Orbitron",
        fontSize: 60,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        letterSpacing: 12,
        effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
        animation: anim("fade", { duration: 900 }),
      }),
      text("Sub", { x: 460, y: 570, width: 1000, height: 36 }, "Back in a moment", {
        fontFamily: "Inter",
        fontSize: 22,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 350 }),
      }),
      social("Socials", { x: 660, y: 700, width: 600, height: 44 }, {
        platforms: ["twitch", "discord", "x"],
        fontSize: 18,
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },
  {
    id: "neon-intermission",
    name: "Intermission",
    category: "Intermission",
    tags: ["Esports"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...neonScene(),
      text("Label", { x: 120, y: 108, width: 700, height: 50 }, "INTERMISSION", {
        fontFamily: "Orbitron",
        fontSize: 30,
        fontWeight: 900,
        fill: "@accent",
        letterSpacing: 8,
        animation: anim("fade", { duration: 900 }),
      }),
      frame("Webcam", { x: 120, y: 190, width: 1080, height: 600 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 3,
        cornerRadius: 8,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      chatbox("Chat", { x: 1260, y: 190, width: 540, height: 600 }, {
        cornerRadius: 8,
        rows: 8,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 8 } },
      }),
      social("Socials", { x: 120, y: 862, width: 1000, height: 56 }, {
        platforms: ["twitch", "discord", "instagram"],
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },
  {
    id: "neon-events",
    name: "Event Badges",
    category: "Social Bars",
    tags: ["Esports"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...["Recent sub", "Top donator", "Recent donator", "Recent follower"].map((label, i) =>
        chip(label, { x: 60, y: 300 + i * 76, width: 420, height: 52 }, label, "pixel_wren", {
          fontFamily: "Inter",
          cornerRadius: 6,
          effects: { border: { enabled: true, color: "@border", width: 1, radius: 6 } },
          animation: anim("slide", { direction: "left", duration: 700, delay: i * 120 }),
        }),
      ),
    ],
  },
  {
    id: "neon-panels",
    name: "Stream Panels",
    category: "Stream Panels",
    tags: ["Esports", "Minimal"],
    collection: "core",
    family: "Neon Grid",
    layers: [
      ...["ABOUT ME", "COMMANDS", "DONATE", "DISCORD", "LINKS", "MERCH"].flatMap((label, i) => {
        const x = 160 + (i % 3) * 560;
        const y = 260 + Math.floor(i / 3) * 300;
        return [
          shape(`Panel ${i + 1}`, { x, y, width: 480, height: 160 }, {
            fill: "@surface/92",
            cornerRadius: 8,
            effects: {
              border: { enabled: true, color: "@accent/60", width: 1, radius: 8 },
              glow: { enabled: true, color: "@glow", strength: 12 },
            },
          }),
          text(`Panel label ${i + 1}`, { x, y: y + 56, width: 480, height: 56 }, label, {
            fontFamily: "Orbitron",
            fontSize: 30,
            fontWeight: 900,
            align: "center",
            fill: "@text",
            letterSpacing: 3,
          }),
        ];
      }),
    ],
  },
  {
    id: "minimal-play",
    name: "Minimal Play",
    category: "Gameplay",
    tags: ["Minimal"],
    collection: "core",
    layers: [
      shape("Name pill", { x: 40, y: 40, width: 380, height: 64 }, {
        fill: "@surface/85",
        cornerRadius: 32,
      }),
      img("Logo", { x: 56, y: 52, width: 40, height: 40 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 112, y: 56, width: 290, height: 34 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Space Grotesk",
        fontSize: 26,
        fontWeight: 700,
        fill: "@text",
      }),
      frame("Webcam", { x: 40, y: 700, width: 440, height: 248 }, {
        camera: true,
        strokeColor: "@border",
        strokeWidth: 2,
        cornerRadius: 20,
        // Every template supports motion; minimal designs just keep it subtle.
        effects: { glow: { enabled: true, color: "@glow", strength: 10 } },
        animation: anim("glow", { duration: 5200, intensity: 0.5 }),
      }),
      social("Socials", { x: 40, y: 976, width: 440, height: 44 }, {
        platforms: ["twitch", "instagram"],
        pill: false,
        fontSize: 20,
        gap: 32,
      }),
    ],
  },
  {
    id: "esports-hud",
    name: "Esports HUD",
    category: "Gameplay",
    tags: ["Esports", "RGB"],
    collection: "core",
    layers: [
      shape("Left rail", { x: 0, y: 0, width: 12, height: 1080 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("glow", { duration: 2400 }),
      }),
      shape("Header", { x: 60, y: 36, width: 620, height: 88 }, {
        fill: "@surface/90",
        cornerRadius: 8,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 8 } },
        animation: anim("slide", { direction: "left", duration: 600 }),
      }),
      shape("Header notch", { x: 60, y: 36, width: 8, height: 88 }, { fill: "@primary" }),
      text("Channel name", { x: 92, y: 50, width: 560, height: 42 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Chakra Petch",
        fontSize: 34,
        fontWeight: 700,
        fill: "@text",
        textTransform: "uppercase",
        letterSpacing: 3,
      }),
      text("Slogan", { x: 92, y: 90, width: 560, height: 24 }, "{{SLOGAN}}", {
        fontFamily: "Rajdhani",
        fontSize: 18,
        fill: "@accent",
        textTransform: "uppercase",
        letterSpacing: 4,
      }),
      frame("Webcam", { x: 1400, y: 60, width: 460, height: 259 }, {
        camera: true,
        shape: "rect",
        strokeColor: "@accent",
        strokeWidth: 3,
        cornerRadius: 4,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("glow", { duration: 2800 }),
      }),
      chatbox("Chat", { x: 1400, y: 360, width: 460, height: 480 }, {
        fontFamily: "Rajdhani",
        cornerRadius: 6,
        rows: 7,
      }),
      shape("Bottom bar", { x: 0, y: 1010, width: 1920, height: 70 }, {
        fill: "@surface/85",
        animation: anim("slide", { direction: "down", duration: 700, delay: 200 }),
      }),
      social("Socials", { x: 60, y: 1024, width: 800, height: 44 }, {
        platforms: ["twitch", "youtube", "discord", "x", "instagram"],
        pill: false,
        fontFamily: "Rajdhani",
        fontSize: 22,
        iconColor: "@accent",
      }),
    ],
  },

  /* ---------------------------- Just Chatting ----------------------------- */
  {
    id: "chat-lounge",
    name: "Chat Lounge",
    category: "Just Chatting",
    tags: ["Cozy"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@primary/25", angle: 135 } },
      }),
      particles("Dust", { kind: "dots", count: 40, size: 3, speed: 0.4, opacity: 0.5 }),
      frame("Webcam", { x: 90, y: 150, width: 1000, height: 563 }, {
        camera: true,
        strokeColor: "@primary",
        strokeWidth: 6,
        cornerRadius: 28,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 48, offsetY: 18, opacity: 0.7 } },
      }),
      text("Channel name", { x: 90, y: 760, width: 1000, height: 70 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Playfair Display",
        fontSize: 60,
        fontWeight: 900,
        fill: "@text",
        animation: anim("fade", { duration: 900, delay: 300 }),
      }),
      text("Slogan", { x: 92, y: 840, width: 1000, height: 40 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: 400,
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
      chatbox("Chat", { x: 1180, y: 150, width: 640, height: 730 }, {
        cornerRadius: 28,
        rows: 9,
      }),
      social("Socials", { x: 90, y: 930, width: 900, height: 56 }, {
        platforms: ["twitch", "youtube", "instagram", "tiktok"],
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
    ],
  },

  /* ---------------------------- Starting Soon ----------------------------- */
  {
    id: "starting-pulse",
    name: "Starting Soon — Pulse",
    category: "Starting Soon",
    tags: ["Neon"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@primary/35", angle: 160 } },
      }),
      particles("Particles", { kind: "stars", count: 90, size: 4, speed: 0.6, color: "@glow" }),
      shape("Halo", { x: 710, y: 170, width: 500, height: 500 }, {
        shape: "ellipse",
        fill: "@primary/15",
        effects: { glow: { enabled: true, color: "@glow", strength: 90 } },
        animation: anim("pulse", { duration: 3200, intensity: 1.6 }),
      }),
      img("Logo", { x: 830, y: 250, width: 260, height: 260 }, "{{LOGO}}", {
        logo: true,
        animation: anim("float", { duration: 4000 }),
      }),
      text("Headline", { x: 260, y: 600, width: 1400, height: 150 }, "STARTING SOON", {
        fontFamily: "Bebas Neue",
        fontSize: 130,
        align: "center",
        fill: "@text",
        letterSpacing: 14,
        effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
        animation: anim("zoom", { duration: 1000, easing: "backOut" }),
      }),
      text("Channel name", { x: 260, y: 752, width: 1400, height: 70 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 52,
        fontWeight: 900,
        align: "center",
        fill: "@accent",
        letterSpacing: 6,
        textTransform: "uppercase",
        animation: anim("fade", { duration: 1000, delay: 500 }),
      }),
      text("Slogan", { x: 260, y: 838, width: 1400, height: 40 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1000, delay: 800 }),
      }),
      social("Socials", { x: 460, y: 940, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        animation: anim("slide", { direction: "up", duration: 900, delay: 1000 }),
      }),
    ],
  },
  {
    id: "starting-cyber",
    name: "Starting Soon — Cyber",
    category: "Starting Soon",
    tags: ["Cyberpunk", "Sci-Fi"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
      }),
      shape("Grid glow", { x: -200, y: 700, width: 2320, height: 600 }, {
        fill: "@primary/20",
        rotation: -4,
        effects: { glow: { enabled: true, color: "@glow", strength: 60 } },
      }),
      particles("Embers", { kind: "embers", count: 70, size: 5, speed: 1.2, color: "@accent" }),
      shape("Frame line", { x: 300, y: 330, width: 1320, height: 420 }, {
        fill: "transparent",
        cornerRadius: 4,
        effects: { border: { enabled: true, color: "@accent", width: 3, radius: 4 } },
        animation: anim("flicker", { duration: 1800 }),
      }),
      text("Headline", { x: 300, y: 380, width: 1320, height: 160 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Audiowide",
        fontSize: 96,
        align: "center",
        fill: "@text",
        textTransform: "uppercase",
        effects: { glow: { enabled: true, color: "@glow", strength: 40 } },
        animation: anim("typewriter", { duration: 1600 }),
      }),
      text("Sub", { x: 300, y: 560, width: 1320, height: 60 }, "STREAM STARTS IN A MOMENT", {
        fontFamily: "Chakra Petch",
        fontSize: 34,
        align: "center",
        fill: "@accent",
        letterSpacing: 8,
        animation: anim("fade", { duration: 900, delay: 1400 }),
      }),
      text("Slogan", { x: 300, y: 650, width: 1320, height: 44 }, "{{SLOGAN}}", {
        fontFamily: "Rajdhani",
        fontSize: 26,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 1700 }),
      }),
      social("Socials", { x: 460, y: 880, width: 1000, height: 56 }, {
        platforms: ["twitch", "discord", "x", "tiktok"],
        fontFamily: "Rajdhani",
        animation: anim("slide", { direction: "up", duration: 900, delay: 1900 }),
      }),
    ],
  },

  /* --------------------------------- BRB ---------------------------------- */
  {
    id: "brb-cozy",
    name: "Be Right Back — Cozy",
    category: "BRB",
    tags: ["Cozy", "Minimal"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@secondary/25", angle: 200 } },
      }),
      particles("Snow", { kind: "snow", count: 60, size: 5, speed: 0.5, opacity: 0.7 }),
      img("Profile", { x: 830, y: 260, width: 260, height: 260 }, "{{PROFILE_IMAGE}}", {
        fit: "cover",
        cornerRadius: 130,
        effects: { border: { enabled: true, color: "@primary", width: 6, radius: 130 } },
        animation: anim("float", { duration: 5000 }),
      }),
      text("Headline", { x: 260, y: 580, width: 1400, height: 130 }, "BE RIGHT BACK", {
        fontFamily: "Playfair Display",
        fontSize: 104,
        fontWeight: 900,
        align: "center",
        fill: "@text",
        animation: anim("fade", { duration: 1200 }),
      }),
      text("Sub", { x: 260, y: 730, width: 1400, height: 50 }, "{{CHANNEL_NAME}} will be back shortly", {
        fontFamily: "Inter",
        fontSize: 30,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1200, delay: 400 }),
      }),
      social("Socials", { x: 560, y: 900, width: 800, height: 56 }, {
        platforms: ["twitch", "instagram", "discord"],
        animation: anim("fade", { duration: 1000, delay: 700 }),
      }),
    ],
  },
  {
    id: "brb-horror",
    name: "Be Right Back — Dread",
    category: "BRB",
    tags: ["Horror", "Dark"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
      }),
      shape("Vignette", { x: 260, y: 60, width: 1400, height: 960 }, {
        shape: "ellipse",
        fill: "@primary/10",
        effects: { glow: { enabled: true, color: "@glow", strength: 120 } },
        animation: anim("flicker", { duration: 2200 }),
      }),
      particles("Embers", { kind: "embers", count: 40, size: 3, speed: 0.8, color: "@primary" }),
      text("Headline", { x: 260, y: 420, width: 1400, height: 200 }, "BE RIGHT BACK", {
        fontFamily: "Creepster",
        fontSize: 140,
        align: "center",
        fill: "@primary",
        effects: { glow: { enabled: true, color: "@glow", strength: 46 } },
        animation: anim("flicker", { duration: 1400 }),
      }),
      text("Sub", { x: 260, y: 640, width: 1400, height: 50 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 28,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1600, delay: 600 }),
      }),
    ],
  },

  /* ----------------------------- Stream Ending ---------------------------- */
  {
    id: "ending-thanks",
    name: "Stream Ending — Thank You",
    category: "Stream Ending",
    tags: ["Neon", "Dark"],
    collection: "core",
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@accent/20", angle: 45 } },
      }),
      particles("Stars", { kind: "stars", count: 80, size: 4, speed: 0.5 }),
      text("Headline", { x: 210, y: 410, width: 1500, height: 140 }, "THANKS FOR WATCHING", {
        fontFamily: "Bebas Neue",
        fontSize: 116,
        align: "center",
        fill: "@text",
        letterSpacing: 10,
        effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
        animation: anim("slide", { direction: "up", duration: 900, delay: 200 }),
      }),
      text("Channel name", { x: 210, y: 560, width: 1500, height: 70 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 46,
        fontWeight: 900,
        align: "center",
        fill: "@accent",
        letterSpacing: 6,
        textTransform: "uppercase",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
      text("Follow", { x: 210, y: 680, width: 1500, height: 44 }, "FOLLOW ME EVERYWHERE", {
        fontFamily: "Inter",
        fontSize: 22,
        fontWeight: 600,
        align: "center",
        fill: "@secondary",
        letterSpacing: 6,
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
      social("Socials", { x: 260, y: 760, width: 1400, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "tiktok", "x"],
        direction: "horizontal",
        fontSize: 22,
        animation: anim("slide", { direction: "up", duration: 900, delay: 900 }),
      }),
    ],
  },

  /* ----------------------------- Webcam Frames ---------------------------- */
  {
    id: "cam-hex",
    name: "Webcam — Hex Cut",
    category: "Webcam Frames",
    tags: ["Sci-Fi", "Esports"],
    collection: "core",
    layers: [
      frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
        camera: true,
        shape: "hexagon",
        strokeColor: "@accent",
        strokeWidth: 6,
        effects: { glow: { enabled: true, color: "@glow", strength: 40 } },
        animation: anim("glow", { duration: 2600 }),
      }),
      shape("Name plate", { x: 660, y: 850, width: 600, height: 70 }, {
        fill: "@surface/90",
        cornerRadius: 35,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 35 } },
        animation: anim("slide", { direction: "up", duration: 700, delay: 200 }),
      }),
      text("Channel name", { x: 660, y: 868, width: 600, height: 40 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Chakra Petch",
        fontSize: 30,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 3,
        textTransform: "uppercase",
        animation: anim("fade", { duration: 700, delay: 400 }),
      }),
    ],
  },
  {
    id: "cam-circle",
    name: "Webcam — Soft Circle",
    category: "Webcam Frames",
    tags: ["Minimal", "Cozy"],
    collection: "core",
    layers: [
      frame("Camera", { x: 610, y: 90, width: 700, height: 700 }, {
        camera: true,
        shape: "ellipse",
        strokeColor: "@primary",
        strokeWidth: 8,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 60, offsetY: 20, opacity: 0.6 } },
        animation: anim("float", { duration: 6000, intensity: 0.35 }),
      }),
      text("Channel name", { x: 460, y: 830, width: 1000, height: 60 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Space Grotesk",
        fontSize: 44,
        fontWeight: 700,
        align: "center",
        fill: "@text",
      }),
      text("Slogan", { x: 460, y: 900, width: 1000, height: 40 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 24,
        fontWeight: 400,
        align: "center",
        fill: "@secondary",
      }),
    ],
  },

  /* -------------------------------- Alerts -------------------------------- */
  {
    id: "alert-follow",
    name: "Alert — New Follower",
    category: "Alerts",
    tags: ["Neon"],
    collection: "core",
    layers: [
      alert("Follower alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW FOLLOWER", "AwesomeViewer", {
        effects: { glow: { enabled: true, color: "@glow", strength: 40 } },
        animation: anim("elastic", { duration: 1500 }),
      }),
    ],
  },
  {
    id: "alert-sub",
    name: "Alert — Subscriber",
    category: "Alerts",
    tags: ["Esports", "RGB"],
    collection: "core",
    layers: [
      alert("Sub alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW SUB", "Tier 1 · Thank you!", {
        fill: "@accent/95",
        cornerRadius: 8,
        titleColor: "@background",
        subtitleColor: "@background/85",
        effects: { glow: { enabled: true, color: "@glow", strength: 50 } },
        animation: anim("bounce", { duration: 1400 }),
      }),
    ],
  },

  /* ------------------------------- Chat Boxes ----------------------------- */
  {
    id: "chatbox-glass",
    name: "Chat Box — Glass",
    category: "Chat Boxes",
    tags: ["Minimal", "Dark"],
    collection: "core",
    layers: [
      chatbox("Chat", { x: 1400, y: 120, width: 460, height: 840 }, {
        cornerRadius: 24,
        rows: 11,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 24 } },
      }),
      text("Chat title", { x: 1400, y: 60, width: 460, height: 44 }, "LIVE CHAT", {
        fontFamily: "Space Grotesk",
        fontSize: 26,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 6,
        animation: anim("fade", { duration: 700, delay: 300 }),
      }),
    ],
  },

  /* ------------------------------ Social Bars ----------------------------- */
  {
    id: "social-pill",
    name: "Social Bar — Pill",
    category: "Social Bars",
    tags: ["Minimal"],
    collection: "core",
    layers: [
      social("Socials", { x: 360, y: 960, width: 1200, height: 64 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "tiktok"],
        pill: true,
        gap: 20,
        fontSize: 22,
        animation: anim("slide", { direction: "up", duration: 800 }),
      }),
    ],
  },
  {
    id: "social-rail",
    name: "Social Bar — Side Rail",
    category: "Social Bars",
    tags: ["Neon", "Dark"],
    collection: "core",
    layers: [
      shape("Rail", { x: 40, y: 300, width: 72, height: 480 }, {
        fill: "@surface/85",
        cornerRadius: 36,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 36 } },
        animation: anim("slide", { direction: "left", duration: 700 }),
      }),
      social("Socials", { x: 40, y: 330, width: 72, height: 420 }, {
        direction: "vertical",
        platforms: ["twitch", "youtube", "discord", "instagram"],
        showHandles: false,
        pill: false,
        gap: 40,
        animation: anim("fade", { duration: 800, delay: 300 }),
      }),
    ],
  },

  /* --------------------------- Stinger Transitions ------------------------ */
  {
    id: "stinger-sweep",
    name: "Stinger — Diagonal Sweep",
    category: "Stinger Transitions",
    tags: ["Neon", "Esports"],
    collection: "core",
    // A real cover→reveal wipe: skewed strips sweep off one edge → full cover at
    // the mid peak (the OBS transition point) → off the other edge. The name
    // reads only at the peak. See STINGER_FORMS for the family variants.
    layers: [
      shape("Cover", { x: -520, y: -520, width: 2960, height: 2120 }, {
        fill: "@primary",
        rotation: 12,
        effects: { gradient: { enabled: true, from: "@primary", to: "@background", angle: 90 } },
        animation: anim("sweep", { direction: "right", duration: 1700, easing: "linear" }),
      }),
      shape("Blade — accent", { x: -600, y: -540, width: 900, height: 2160 }, {
        fill: "@accent",
        rotation: 12,
        opacity: 0.92,
        effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
        animation: anim("sweep", { direction: "right", duration: 1700, delay: 60, easing: "linear" }),
      }),
      shape("Blade — light", { x: 520, y: -540, width: 300, height: 2160 }, {
        fill: "@surface",
        rotation: 12,
        opacity: 0.96,
        effects: { border: { enabled: true, color: "@accent", width: 2, radius: 0 } },
        animation: anim("sweep", { direction: "right", duration: 1700, delay: 120, easing: "linear" }),
      }),
    ],
  },

  /* ------------------------ Complete Stream Package ----------------------- */
  {
    id: "package-signature",
    name: "Signature Package",
    category: "Complete Stream Package",
    tags: ["Esports", "Neon"],
    collection: "core",
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 84 }, {
        fill: "@surface/92",
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      shape("Top accent", { x: 0, y: 84, width: 1920, height: 3 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      }),
      img("Logo", { x: 30, y: 16, width: 52, height: 52 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 100, y: 20, width: 600, height: 40 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Orbitron",
        fontSize: 30,
        fontWeight: 900,
        fill: "@text",
        letterSpacing: 2,
        textTransform: "uppercase",
      }),
      text("Slogan", { x: 100, y: 56, width: 600, height: 24 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 15,
        fill: "@textSecondary",
      }),
      shape("Live pill", { x: 1740, y: 22, width: 140, height: 40 }, {
        fill: "@accent",
        cornerRadius: 20,
        animation: anim("pulse", { duration: 2000 }),
      }),
      text("Live", { x: 1740, y: 30, width: 140, height: 26 }, "● LIVE", {
        fontFamily: "Inter",
        fontSize: 18,
        fontWeight: 800,
        align: "center",
        fill: "@background",
      }),
      frame("Webcam", { x: 44, y: 660, width: 500, height: 281 }, {
        camera: true,
        strokeColor: "@primary",
        strokeWidth: 4,
        cornerRadius: 16,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("glow", { duration: 3200 }),
      }),
      chatbox("Chat", { x: 1496, y: 140, width: 384, height: 600 }, { rows: 8 }),
      alert("Alert", { x: 660, y: 120, width: 600, height: 180 }, "NEW FOLLOWER", "AwesomeViewer", {
        opacity: 0.96,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("elastic", { duration: 1500, delay: 900 }),
      }),
      shape("Bottom bar", { x: 0, y: 1012, width: 1920, height: 68 }, {
        fill: "@surface/90",
        animation: anim("slide", { direction: "down", duration: 700, delay: 200 }),
      }),
      social("Socials", { x: 44, y: 1026, width: 900, height: 44 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        pill: false,
        fontSize: 21,
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },
];



/* -------------------------------------------------------------------------- */
/*                            Family generator                                */
/* -------------------------------------------------------------------------- */

/**
 * A design family is a *style*, not fourteen hand-written screens.
 *
 * Hand-authoring each screen is exactly what let Midnight Cathedral's Starting
 * Soon drift away from its Stream Ending. Here a family declares its type,
 * geometry, ground and ornament once; every screen is generated from that
 * declaration, so coherence is structural rather than a thing to remember.
 */
interface FamilyStyle {
  id: string;
  name: string;
  tags: StyleTag[];
  /** Which collection the family files under. Defaults to "core". */
  collection?: Collection;
  /** Display face for headlines. */
  display: string;
  /** Headline fill token. Defaults to "@text"; set to "@background" for a
      hollow outlined headline (paired with a border in headlineEffects). */
  displayFill?: string;
  displayWeight: number;
  displayTracking: number;
  displayTransform: "none" | "uppercase";
  /** Slant the headline and channel name — the esports look. */
  displayItalic?: boolean;
  /** Body/UI face. */
  body: string;
  /** Panel and plate radius. */
  radius: number;
  /** Camera and frame radius. */
  frameRadius: number;
  /** Esports-style corner brackets on frames. */
  corners: boolean;
  strokeWidth: number;
  /** Camera/frame silhouette. "hexagon" cuts the four corners (mecha chamfer). */
  frameShape?: "rect" | "ellipse" | "hexagon";
  /** Effects applied to every framed element. */
  frameEffects: DeepPartial<Effects>;
  /** Headline treatment. */
  headlineEffects: DeepPartial<Effects>;
  /** The shared ground of every full-screen scene. */
  scene: () => LayerSpec[];
  /** Ambient decor layered over overlays (gameplay, webcam, chat). */
  overlayDecor?: () => LayerSpec[];
  /** Alert and panel silhouette. */
  plateShape: "rect" | "plaque" | "chamfer" | "scroll";
  /** Frosted-glass panels: translucent fill, light hairline border and a gloss
      sweep, so the colourful backdrop shows through the plates and boxes. */
  glass?: boolean;
  /** Glass highlight: "frost" (default) a soft top sheen, "reflection" diagonal
      light glints across the pane, "liquid" a drifting lens caustic with a
      specular rim and chromatic edge — the Apple liquid-glass look. */
  glassStyle?: "frost" | "reflection" | "liquid";
  /** How a pride flag is laid on the glass sheet: "sides" a few thicker
      horizontal lines beside the copy (default), or "stripes" a full field of
      diagonal pinstripes. */
  facetMode?: "sides" | "stripes";
  /** Social-bar pill colour. Defaults to "@surface/90"; near-black families
      set a light translucent pill so the icons read. */
  socialPill?: string;
  /** Panels use windows instead of plates. */
  windowChrome?: boolean;
  /** Chat panel silhouette. */
  chatShape?: "rect" | "coffin";
  /** Event badges render as two-part pills (icon cap + text block). */
  chipSplit?: boolean;
  /** Alert plate silhouette. A sideways coffin for gothic families. */
  alertShape?: "rect" | "coffin";
  /**
   * Lift scene copy clear of a busy lower third. Cloud families own their
   * bottom half; the answer is to move the words, not to crop the sky.
   */
  contentOffsetY?: number;
}

const HEADLINE_BOX: Box = { x: 210, y: 430, width: 1500, height: 140 };

/* -------------------------------------------------------------------------- */
/*                           Stinger transitions                              */
/* -------------------------------------------------------------------------- */

/**
 * Every pack ships a scene-cut transition, but no two share a silhouette. A
 * family is mapped to one of ten *forms* — a gothic curtain, an angular shard
 * burst, a cyber glitch, a pride ribbon, a crystal facet, and so on — and each
 * form reads differently at rest and enters on its own motion. Families that
 * fall on the same form are tilted to a different angle, so even those don't
 * match. Colour always follows the palette through the theme tokens.
 */
type StingerKind =
  | "veil"    // dark curtains, moon + bats — gothic / fantasy-horror
  | "shards"  // angular blades converge — esports / mecha / hex
  | "glitch"  // RGB slice bars + scanlines — cyber
  | "ribbon"  // soft flag ribbon — pride
  | "prism"   // gem facets + a refraction streak — crystal / glass
  | "bars"    // offset colour columns + halftone — riso / pixel
  | "burst"   // radial rays from a hot core — plasma / overdrive
  | "liquid"  // organic blobs bloom — liquid / splash
  | "wave"    // silk bands drift + stars — aurora / silk / cosmic
  | "iris";   // circular bloom + bokeh — cozy / clouds

/** Oversized so a rotated fill still covers the 1920×1080 frame at rest. */
const STINGER_FULL: Box = { x: -520, y: -520, width: 2960, height: 2120 };

/** The channel name, centred, in the family's own display identity. */
/** The whole wipe runs this long; full cover (the OBS transition point) lands
    at STINGER_PEAK of it. Every stinger layer shares the duration so their
    peaks line up on one frame. */
const ST_MS = 1700;
/** A full-frame band travels off one edge → dead-centre (covering) → off the
    opposite edge; `direction` is the exit side. Ends off-canvas (revealed). */
const stSweep = (direction: Animation["direction"], delay = 0, k = 1) =>
  anim("sweep", { direction, duration: ST_MS, delay, intensity: k, easing: "linear" });
/** Grows to fully cover at the peak, then shrinks away to nothing. */
const stScale = (delay = 0, k = 1) => anim("sweepScale", { duration: ST_MS, delay, intensity: k, easing: "linear" });
/** Fades/pops in for the cover peak, then fades out — for the wordmark, a hot
    core, rays or particles that should only read at the transition point. */
const stFlash = (delay = 0) => anim("flash", { duration: ST_MS, delay, easing: "linear" });

function stingerName(f: FamilyStyle, dy: number, plate = false): LayerSpec[] {
  const name = text("Channel name", { x: 210, y: 470 + dy, width: 1500, height: 130 }, "{{CHANNEL_NAME}}", {
    fontFamily: f.display,
    fontSize: 94,
    fontWeight: f.displayWeight,
    italic: f.displayItalic,
    align: "center",
    fill: f.displayFill ?? "@text",
    letterSpacing: f.displayTracking,
    textTransform: f.displayTransform,
    effects: f.headlineEffects,
    animation: stFlash(),
  });
  if (!plate) return [name];
  return [
    shape("Name plate", { x: 360, y: 462 + dy, width: 1200, height: 150 }, {
      fill: "@background",
      opacity: 0.6,
      cornerRadius: 16,
      animation: stFlash(),
    }),
    name,
  ];
}

/**
 * A stinger is a themed motif over a TRANSPARENT background: it comes in small,
 * grows to its peak (the OBS transition point) — some swelling to fully cover
 * the frame, some only to about half — then shrinks away and vanishes so the
 * next scene shows through. No colour cover and no text: just the motif and a
 * little decor, the way stinger clips usually look.
 */
function stingerZoom(o: {
  motif: ShapeKind;
  motifFill?: string;
  borderColor?: string;
  grow?: number;
  glow?: number;
  decor?: ParticleKind;
  decorColor?: string;
}): LayerSpec[] {
  return [
    shape("Motif", { x: 610, y: 190, width: 700, height: 700 }, {
      shape: o.motif,
      fill: o.motifFill ?? "@accent",
      effects: {
        glow: { enabled: true, color: "@glow", strength: o.glow ?? 46 },
        border: { enabled: true, color: o.borderColor ?? "@text", width: 4, radius: 0 },
      },
      animation: stScale(0, o.grow ?? 3),
    }),
    ...(o.decor
      ? [particles("Decor", { kind: o.decor, count: 16, size: 7, speed: 1, color: o.decorColor ?? "@accent", opacity: 0.85, animation: stFlash() })]
      : []),
  ];
}

const STINGER_FORMS: Record<StingerKind, (f: FamilyStyle, dy: number) => LayerSpec[]> = {
  // A themed ghost swells in, whole silhouette on show, then vanishes.
  veil: () => stingerZoom({ motif: "ghost", motifFill: "@accent", borderColor: "@text", grow: 2.4, glow: 40 }),
  // Half cover: a tech hexagon punches in.
  shards: () => stingerZoom({ motif: "hexagon", motifFill: "@accent", grow: 1.8, glow: 44, decor: "embers" }),
  // Half cover: a glitched diamond slams in.
  glitch: () => stingerZoom({ motif: "diamond", motifFill: "@accent", grow: 1.8, glow: 44, decor: "dots", decorColor: "@glow" }),
  // Full cover: a heart blooms over the frame.
  ribbon: () => stingerZoom({ motif: "heart", motifFill: "@accent", grow: 3, glow: 40, decor: "confetti" }),
  // Half cover: a cut gem blooms in.
  prism: () => stingerZoom({ motif: "gem", motifFill: "@accent", grow: 1.9, glow: 40, decor: "stars" }),
  // Full cover: a riso ink blot floods.
  bars: () => stingerZoom({ motif: "ellipse", motifFill: "@accent", grow: 3, glow: 30, decor: "dots" }),
  // Half cover: a lightning bolt cracks in.
  burst: () => stingerZoom({ motif: "bolt", motifFill: "@accent", grow: 1.9, glow: 50, decor: "embers" }),
  // Full cover: an ink drop floods up.
  liquid: () => stingerZoom({ motif: "ellipse", motifFill: "@accent", grow: 3.2, glow: 40, decor: "bubbles" }),
  // Full cover: a star blooms across.
  wave: () => stingerZoom({ motif: "star", motifFill: "@accent", grow: 3, glow: 40, decor: "stars" }),
  // Full cover: a moon irises up.
  iris: () => stingerZoom({ motif: "moon", motifFill: "@accent", grow: 3, glow: 40, decor: "bokeh", decorColor: "@glow" }),
};

/** Which form each family wears, and the tilt that keeps same-form families
    from matching. Grouped by theme, not by form. */
const FAMILY_STINGER: Record<string, [StingerKind, number]> = {
  // Gothic / fantasy-horror — curtains.
  hallowed: ["veil", 8],
  witch: ["veil", -6],
  gothicrose: ["veil", 4],
  spectral: ["veil", 12],
  // Angular esports / sci-fi — shards.
  astral: ["shards", -12],
  hexstorm: ["shards", 16],
  mecha: ["shards", 6],
  // Cyber — glitch.
  cyberpill: ["glitch", 0],
  vanguard: ["shards", 0],
  vanguardglow: ["shards", 0],
  vanguardwave: ["shards", 0],
  radar: ["iris", 0],
  contour: ["wave", 0],
  chevron: ["shards", 0],
  circuit: ["glitch", 0],
  // Crystal / glass — facets.
  holo: ["prism", 8],
  frost: ["prism", -6],
  prism: ["prism", 18],
  crystal: ["prism", -14],
  // Riso / pixel — offset columns.
  pixelwin: ["bars", 0],
  riso: ["bars", -8],
  // Energy — radial burst.
  overdrive: ["burst", 0],
  plasma: ["burst", 20],
  // Liquid / paint — blobs.
  liquidneon: ["liquid", 0],
  liquidglass: ["liquid", 12],
  splash: ["liquid", -12],
  // Silk / aurora / cosmic — drifting bands.
  starlit: ["wave", 6],
  grove: ["wave", -8],
  aurora: ["wave", 0],
  silk: ["wave", 12],
  "aurora-silk": ["wave", -4],
  "aurora-neon": ["wave", 8],
  // Cosmic bloom.
  nebula: ["iris", 18],
  // Cozy / clouds — soft bloom.
  cozyclouds: ["iris", 0],
  // Pride flags — ribbon.
  "prism-flag": ["ribbon", 6],
  "frost-flag": ["ribbon", -6],
  "prism-stripes": ["ribbon", 0],
  "frost-stripes": ["ribbon", 10],
  "plasma-flag": ["ribbon", -10],
};

/** Build a family's stinger transition screen in its own identity. */
function stingerScreen(f: FamilyStyle, dy: number): LayerSpec[] {
  const [kind] = FAMILY_STINGER[f.id] ?? ["veil", 0];
  return STINGER_FORMS[kind](f, dy);
}

function familyScreens(f: FamilyStyle): BaseTemplate[] {
  const base = (id: string, name: string, category: TemplateCategory, layers: LayerSpec[]): BaseTemplate => ({
    id: `${f.id}-${id}`,
    name,
    category,
    tags: f.tags,
    collection: f.collection ?? "core",
    family: f.name,
    layers,
  });

  const dy = f.contentOffsetY ?? 0;

  const headline = (copy: string, y = 430) =>
    text("Headline", { ...HEADLINE_BOX, y: y + dy }, copy, {
      fontFamily: f.display,
      fontSize: 96,
      fontWeight: f.displayWeight,
      italic: f.displayItalic,
      align: "center",
      fill: f.displayFill ?? "@text",
      letterSpacing: f.displayTracking,
      textTransform: f.displayTransform,
      effects: f.headlineEffects,
      // No entrance on the copy — in the finished designs the motion lives on
      // the scene and frames around it, not on the text.
    });

  const channelName = (y: number) =>
    text("Channel name", { x: 310, y: y + dy, width: 1300, height: 76 }, "{{CHANNEL_NAME}}", {
      fontFamily: f.display,
      fontSize: 48,
      fontWeight: f.displayWeight,
      italic: f.displayItalic,
      align: "center",
      fill: "@accent",
      letterSpacing: Math.max(2, f.displayTracking * 0.5),
      textTransform: f.displayTransform,
    });

  const slogan = (y: number) =>
    text("Slogan", { x: 360, y: y + dy, width: 1200, height: 40 }, "{{SLOGAN}}", {
      fontFamily: f.body,
      fontSize: 24,
      fontWeight: 400,
      align: "center",
      fill: "@textSecondary",
    });

  // Social bars stay still — no entrance, no motion.
  const socials = (y: number, platforms?: SocialPlatform[]) =>
    social("Socials", { x: 460, y: y + dy, width: 1000, height: 56 }, {
      platforms: platforms ?? ["twitch", "youtube", "discord", "instagram"],
      fontFamily: f.body,
      pillColor: f.socialPill ?? "@surface/90",
    });

  /** The camera hole: a chrome window for Y2K, a bracketed frame elsewhere. */
  const camera = (name: string, box: Box, title = "CAM.EXE") =>
    f.windowChrome
      ? windowBox(name, box, title, {
          content: "camera",
          // Gloss over a camera window is the reference look, but it paints 10%
          // white across the webcam. The transparency promise wins; users can
          // switch it back on per layer.
          gloss: false,
          fontFamily: f.body,
          fontSize: 13,
          cornerRadius: f.frameRadius,
          effects: f.frameEffects,
          animation: anim("glow", { duration: 4200 }),
        })
      : frame(name, box, {
          camera: true,
          shape: f.frameShape ?? "rect",
          strokeColor: "@accent",
          strokeWidth: f.strokeWidth,
          cornerRadius: f.frameRadius,
          corners: f.corners,
          effects: f.frameEffects,
          animation: anim("glow", { duration: 4200 }),
        });

  const chat = (name: string, box: Box, rows: number) =>
    f.windowChrome
      ? windowBox(name, box, "CHAT.EXE", {
          content: "chat",
          rows,
          chatFontSize: 20,
          gloss: false,
          fontFamily: f.body,
          fontSize: 13,
          cornerRadius: f.radius,
          effects: f.frameEffects,
        })
      : chatbox(name, box, {
          boxShape: f.chatShape,
          cornerRadius: f.radius,
          rows,
          fontFamily: f.body,
          fill: f.glass ? "@text/10" : undefined,
          effects: { border: { enabled: true, color: f.glass ? "@text/35" : "@border", width: 1, radius: f.radius } },
        });

  const plate = (name: string, box: Box, o: Parameters<typeof shape>[2] = {}) =>
    shape(name, box, {
      shape: f.plateShape,
      fill: f.glass ? "@text/10" : "@surface/90",
      cornerRadius: f.radius,
      effects: {
        border: { enabled: true, color: f.glass ? "@text/35" : "@border", width: 1, radius: f.radius },
        ...(f.glass
          ? { gloss: { enabled: true, strength: 0.55, style: f.glassStyle === "liquid" ? "liquid" : f.glassStyle === "reflection" ? "streak" : "sheen" } }
          : {}),
        ...o.effects,
      },
      ...o,
    });

  // Pride flag families carry their flag onto every screen — a striped flag bar
  // (buildVariant substitutes palette.flag) — so alerts and goals read as the
  // flag pack too, not just the scenes.
  const isFlagPack = f.collection === "pride";
  const flagBar = (box: Box): LayerSpec[] =>
    isFlagPack
      ? [
          flag("Pride flag", box, {
            cornerRadius: 6,
            effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
            animation: anim("shimmer", { duration: 3600 }),
          }),
        ]
      : [];

  const alertScreen = (id: string, name: string, title: string, subtitle: string, hero: boolean) =>
    base(id, name, "Alerts", [
      ...(f.overlayDecor?.() ?? []),
      ...flagBar({ x: 560, y: 366, width: 800, height: 18 }),
      ...flagBar({ x: 560, y: 656, width: 800, height: 18 }),
      alert("Alert", { x: 560, y: 400, width: 800, height: 240 }, title, subtitle, {
        fontFamily: f.display,
        cornerRadius: f.radius,
        boxShape: f.alertShape ?? "rect",
        // No viewer-avatar disc on either alert — cleaner as a plain plate.
        // Both alerts sit on the family's dark plate so they read as part of the
        // overlay, not a bright slab pasted over it. The hero (subscriber) is
        // set apart by an accent border and a stronger glow, not by inverting
        // to a near-white fill.
        fill: f.glass ? "@text/12" : hero ? "@surface/95" : "@surface/92",
        titleColor: "@accent",
        subtitleColor: "@text",
        effects: {
          glow: { enabled: true, color: "@glow", strength: hero ? 46 : 34 },
          border: {
            enabled: true,
            color: f.glass ? "@text/40" : hero ? "@accent" : "@border",
            width: hero ? 2 : 1,
            radius: f.radius,
          },
        },
        animation: anim(hero ? "bounce" : "elastic", { duration: 1450 }),
      }),
    ]);

  // A full sheet of glass laid over the whole message scene — a facet pattern,
  // prismatic colour spots and diagonal reflections. It sits ON TOP of the copy
  // so the scene reads as being behind a pane of glass, over the solid backdrop.
  // Reflection families catch more light; frost stays softer.
  const glassSheet = (): LayerSpec[] =>
    f.glass
      ? [
          shape("Glass sheet", FULL, {
            shape: "glasssheet",
            fill: "@text/6",
            facetMode: f.facetMode ?? "sides",
            effects: {
              gloss: {
                enabled: true,
                strength: f.glassStyle === "reflection" ? 1 : 0.72,
                // Glossy (shiny) glass for reflection families; matte frosted for frost.
                style: f.glassStyle === "liquid" ? "liquid" : f.glassStyle === "reflection" ? "streak" : "sheen",
              },
            },
          }),
        ]
      : [];

  /** A full-screen message scene: ground, headline, name, slogan, socials. */
  // A full-field stripe glass sheet over the copy would veil the text; for
  // "stripes" families the sheet sits behind the words so they read on top.
  // The "sides" glass (a light sheen) stays over the copy — the behind-glass look.
  const stripesBehind = f.facetMode === "stripes";
  const scene = (id: string, name: string, category: TemplateCategory, copy: string, extra: LayerSpec[] = []) =>
    base(id, name, category, [
      ...f.scene(),
      ...(stripesBehind ? glassSheet() : []),
      ...extra,
      headline(copy),
      channelName(600),
      slogan(700),
      socials(880),
      ...(stripesBehind ? [] : glassSheet()),
    ]);

  const PANELS = ["ABOUT ME", "COMMANDS", "DONATE", "DISCORD", "LINKS", "MERCH"];

  // Goal bars take the family silhouette so they sit with the rest of the pack.
  const goalShape: "rect" | "coffin" | "plaque" =
    f.alertShape === "coffin" ? "coffin" : f.plateShape === "plaque" ? "plaque" : "rect";

  // Followers as a hero ring, subs and donations as bars beside it — the
  // standard goals widget, rendered in this family's identity. No ambient
  // decor: a goals overlay sits over live gameplay, so it stays clean. Each
  // goal is its own layer, free to rearrange into a row or a stack.
  const goalsScreen = base("goals", "Goals", "Goals", [
    ...flagBar({ x: 150, y: 300, width: 1170, height: 20 }),
    goal("Follower goal", { x: 150, y: 380, width: 360, height: 360 }, "FOLLOWERS", 847, 1000, {
      goalStyle: "ring",
      fontFamily: f.display,
      barColor: "@accent",
      trackColor: "@surface/60",
      valueColor: "@text",
      labelColor: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
      animation: anim("zoom", { duration: 900, easing: "backOut" }),
    }),
    goal("Sub goal", { x: 560, y: 430, width: 760, height: 150 }, "SUB GOAL", 62, 100, {
      goalStyle: "bar",
      barShape: goalShape,
      fill: "@surface/88",
      fontFamily: f.display,
      barColor: "@accent",
      labelColor: "@accent",
      cornerRadius: f.radius,
      effects: {
        glow: { enabled: true, color: "@glow", strength: 22 },
        border: { enabled: true, color: "@border", width: 1, radius: f.radius },
      },
      animation: anim("slide", { direction: "right", duration: 700 }),
    }),
    goal("Donation goal", { x: 560, y: 610, width: 760, height: 150 }, "DONATION GOAL", 340, 500, {
      goalStyle: "bar",
      barShape: goalShape,
      fill: "@surface/88",
      fontFamily: f.display,
      barColor: "@primary",
      labelColor: "@accent",
      cornerRadius: f.radius,
      effects: {
        glow: { enabled: true, color: "@glow", strength: 22 },
        border: { enabled: true, color: "@border", width: 1, radius: f.radius },
      },
      animation: anim("slide", { direction: "right", duration: 700, delay: 160 }),
    }),
  ]);

  return [
    scene("starting", "Starting Soon", "Starting Soon", "STARTING SOON"),
    scene("brb", "Be Right Back", "BRB", "BE RIGHT BACK"),
    // No logo by default — add your picture from the Add panel if you want one.
    scene("ending", "Stream Ending", "Stream Ending", "THANKS FOR WATCHING"),
    scene("pause", "Pause", "Pause", "STREAM ON PAUSE"),
    scene("offline", "Offline", "Offline", "OFFLINE"),

    // Intermission: camera and chat side by side over the family ground.
    base("intermission", "Intermission", "Intermission", [
      ...f.scene(),
      ...flagBar({ x: 120, y: 168, width: 1680, height: 12 }),
      text("Label", { x: 120, y: 110, width: 700, height: 50 }, "INTERMISSION", {
        fontFamily: f.display,
        fontSize: 34,
        fontWeight: f.displayWeight,
        fill: "@accent",
        letterSpacing: Math.max(4, f.displayTracking),
      }),
      camera("Webcam", { x: 120, y: 190, width: 1080, height: 608 }),
      chat("Chat", { x: 1260, y: 190, width: 540, height: 608 }, 8),
      socials(880, ["twitch", "discord", "instagram"]),
    ]),

    base("gameplay", "Gameplay", "Gameplay", [
      ...(f.overlayDecor?.() ?? []),
      ...flagBar({ x: 40, y: 96, width: 1840, height: 9 }),
      plate("Top bar", { x: 40, y: 28, width: 1840, height: 66 }, {
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      img("Logo", { x: 64, y: 41, width: 40, height: 40 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 120, y: 42, width: 600, height: 36 }, "{{CHANNEL_NAME}}", {
        fontFamily: f.display,
        fontSize: 26,
        fontWeight: f.displayWeight,
        fill: "@text",
        letterSpacing: Math.max(1, f.displayTracking * 0.3),
        textTransform: f.displayTransform,
      }),
      text("Slogan", { x: 122, y: 72, width: 600, height: 18 }, "{{SLOGAN}}", {
        fontFamily: f.body,
        fontSize: 13,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      // No webcam or chat here — those are their own screens/exports; the
      // gameplay overlay is just the branding bar and socials over the game.
      social("Socials", { x: 620, y: 984, width: 680, height: 52 }, {
        platforms: ["twitch", "discord", "instagram", "x"],
        fontFamily: f.body,
        pillColor: "@surface/90",
      }),
    ]),

    base("chatting", "Just Chatting", "Just Chatting", [
      ...f.scene(),
      ...flagBar({ x: 90, y: 118, width: 1020, height: 12 }),
      camera("Webcam", { x: 90, y: 140, width: 1020, height: 574 }),
      plate("Name plate", { x: 90, y: 760, width: 640, height: 84 }),
      text("Display name", { x: 130, y: 780, width: 560, height: 48 }, "{{DISPLAY_NAME}}", {
        fontFamily: f.display,
        fontSize: 38,
        fontWeight: f.displayWeight,
        fill: "@text",
        textTransform: f.displayTransform,
      }),
      text("Slogan", { x: 92, y: 872, width: 900, height: 36 }, "{{SLOGAN}}", {
        fontFamily: f.body,
        fontSize: 24,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      chat("Chat", { x: 1180, y: 140, width: 650, height: 740 }, 9),
      social("Socials", { x: 90, y: 950, width: 1000, height: 56 }, {
        platforms: ["twitch", "tiktok", "instagram", "discord"],
        fontFamily: f.body,
        pillColor: "@surface/90",
      }),
    ]),

    base("webcam", "Webcam Frame", "Webcam Frames", [
      ...(f.overlayDecor?.() ?? []),
      camera("Camera", { x: 320, y: 120, width: 1280, height: 720 }),
      ...flagBar({ x: 660, y: 862, width: 600, height: 12 }),
      plate("Name plate", { x: 660, y: 880, width: 600, height: 72 }),
      text("Display name", { x: 660, y: 898, width: 600, height: 42 }, "{{DISPLAY_NAME}}", {
        fontFamily: f.display,
        fontSize: 32,
        fontWeight: f.displayWeight,
        align: "center",
        fill: "@text",
        textTransform: f.displayTransform,
      }),
    ]),

    base("chatbox", "Chat Box", "Chat Boxes", [
      ...(f.overlayDecor?.() ?? []),
      ...flagBar({ x: 1400, y: 96, width: 460, height: 14 }),
      chat("Chat", { x: 1400, y: 120, width: 460, height: 840 }, 10),
    ]),

    // Stinger transition — a full-frame wipe in the pack's own form and colours
    // (see FAMILY_STINGER); no two families share a silhouette or angle.
    base("stinger", "Stinger Transition", "Stinger Transitions", stingerScreen(f, dy)),

    alertScreen("follower", "Follower Alert", "NEW FOLLOWER", "AwesomeViewer", false),
    alertScreen("subscriber", "Subscriber Alert", "NEW SUBSCRIBER", "Tier 1 · welcome aboard", true),

    goalsScreen,

    base("socialbar", "Social Bar", "Social Bars", [
      ...flagBar({ x: 460, y: 924, width: 1000, height: 14 }),
      social("Socials", { x: 460, y: 962, width: 1000, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        pill: true,
        pillColor: "@surface/90",
        gap: 20,
        fontSize: 22,
        fontFamily: f.body,
      }),
    ]),

    // Event badges: the "recent sub / top donator" stack from the references.
    base("events", "Event Badges", "Social Bars", [
      ...flagBar({ x: 60, y: 250, width: 420, height: 14 }),
      ...["Recent sub", "Top donator", "Recent donator", "Recent follower"].map((label, i) =>
        chip(label, { x: 60, y: 300 + i * 76, width: 420, height: 52 }, label, "pixel_wren", {
          fontFamily: f.body,
          cornerRadius: f.radius,
          split: f.chipSplit,
          effects: { border: { enabled: true, color: "@border", width: 1, radius: f.radius } },
        }),
      ),
    ]),

    // Panels export one PNG each through Export -> All elements as PNGs.
    base("panels", "Stream Panels", "Stream Panels", [
      ...PANELS.map((label, i) =>
        shape(`Panel ${i + 1}`, {
          x: 160 + (i % 3) * 560,
          y: 260 + Math.floor(i / 3) * 300,
          width: 480,
          height: 160,
        }, {
          shape: f.plateShape,
          fill: f.glass ? "@text/10" : "@surface/92",
          cornerRadius: f.radius,
          effects: {
            border: { enabled: true, color: f.glass ? "@text/35" : "@border", width: 1, radius: f.radius },
            glow: { enabled: true, color: "@glow", strength: 14 },
            ...(f.glass
              ? {
                  gloss: {
                    enabled: true,
                    strength: 0.55,
                    style: f.glassStyle === "liquid" ? "liquid" : f.glassStyle === "reflection" ? "streak" : "sheen",
                  },
                }
              : {}),
          },
        }),
      ),
      // A pride flag stripe across the top of each panel, per flag.
      ...(isFlagPack
        ? PANELS.flatMap((label, i) =>
            flagBar({
              x: 160 + (i % 3) * 560,
              y: 260 + Math.floor(i / 3) * 300 - 2,
              width: 480,
              height: 14,
            }),
          )
        : []),
      ...PANELS.map((label, i) =>
        text(`Panel label ${i + 1}`, {
          x: 160 + (i % 3) * 560,
          y: 315 + Math.floor(i / 3) * 300,
          width: 480,
          height: 56,
        }, label, {
          fontFamily: f.display,
          fontSize: 36,
          fontWeight: f.displayWeight,
          align: "center",
          fill: "@text",
          letterSpacing: Math.max(1, f.displayTracking * 0.4),
        }),
      ),
    ]),
  ];
}


/* -------------------------------------------------------------------------- */
/*                          The five new families                             */
/* -------------------------------------------------------------------------- */

/** Sci-fi HUD: cyan brackets over scanlines and a distant planet. */
const ASTRAL_DECK: FamilyStyle = {
  id: "astral",
  name: "Astral Deck",
  tags: ["Sci-Fi", "Esports"],
  display: "Chakra Petch",
  displayWeight: 700,
  displayTracking: 8,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 4,
  frameRadius: 4,
  corners: true,
  strokeWidth: 3,
  frameEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 30 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/26", angle: 170 } },
    }),
    // A planet on the horizon, rendered rather than painted: a disc with a
    // limb-lit gradient and a ring, which survives any palette swap.
    shape("Decor — Planet", { x: 560, y: 620, width: 800, height: 800 }, {
      shape: "ellipse",
      fill: "@primary",
      opacity: 0.5,
      effects: {
        gradient: { enabled: true, from: "@secondary", to: "@background", angle: 300 },
        glow: { enabled: true, color: "@glow", strength: 70 },
      },
      animation: anim("float", { duration: 9000, intensity: 0.3 }),
    }),
    particles("Decor — Stars", { kind: "stars", count: 46, size: 3, speed: 0.2, color: "@accent", opacity: 0.7 }),
    shape("Decor — Scanlines", FULL, {
      shape: "scanlines",
      fill: "@accent",
      cornerRadius: 4,
      opacity: 0.05,
    }),
  ],
  overlayDecor: () => [
    shape("Decor — Scanlines", FULL, { shape: "scanlines", fill: "@accent", cornerRadius: 4, opacity: 0.04 }),
  ],
};

/** Y2K: chrome-bevel windows, glass gloss, pixel type, hearts. */
const PIXEL_WINDOWS: FamilyStyle = {
  id: "pixelwin",
  name: "Pixel Windows",
  tags: ["Pink", "Anime", "Cozy"],
  display: "Press Start 2P",
  displayWeight: 400,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Space Grotesk",
  radius: 10,
  frameRadius: 10,
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    gradientStroke: { enabled: true, from: "@accent", to: "@text", angle: 135, width: 4 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  headlineEffects: {
    emboss: { enabled: true, light: "@text", dark: "@primary", depth: 3 },
  },
  plateShape: "rect",
  windowChrome: true,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/30", angle: 200 } },
    }),
    particles("Decor — Starfield", { kind: "stars", count: 70, size: 3, speed: 0.25, color: "@text", opacity: 0.75 }),
    particles("Decor — Hearts", { kind: "hearts", count: 9, size: 5, speed: 0.5, color: "@accent", opacity: 0.6 }),
  ],
  overlayDecor: () => [
    particles("Decor — Hearts left", { kind: "hearts", count: 3, size: 4, speed: 0.45, color: "@accent", opacity: 0.5, box: MARGIN_LEFT }),
    particles("Decor — Hearts right", { kind: "hearts", count: 3, size: 4, speed: 0.45, color: "@accent", opacity: 0.5, box: MARGIN_RIGHT }),
  ],
};

/** Cozy Clouds: a painted-looking cloud horizon under a violet night. */
const COZY_CLOUDS: FamilyStyle = {
  id: "cozyclouds",
  name: "Cozy Clouds",
  tags: ["Cozy", "Purple", "Minimal"],
  display: "Poppins",
  displayWeight: 600,
  displayTracking: 10,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 22,
  frameRadius: 24,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 24 },
    glow: { enabled: true, color: "@glow", strength: 16 },
  },
  // A shadow, not a glow: the headline sits above a bright cloud bank, and a
  // glow of the same family would vanish into it.
  headlineEffects: { shadow: { enabled: true, color: "@shadow", blur: 22, offsetY: 6, opacity: 0.85 } },
  plateShape: "rect",
  // The cloud bank owns the bottom 40%; the copy sits clear above it.
  contentOffsetY: -220,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/30", angle: 180 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 60, size: 2.5, speed: 0.15, color: "@text", opacity: 0.7 }),
    particles("Decor — Clouds far", { kind: "clouds", count: 6, size: 95, speed: 0.35, color: "@secondary", opacity: 0.45 }),
    particles("Decor — Clouds near", { kind: "clouds", count: 4, size: 135, speed: 0.7, color: "@accent", opacity: 0.6 }),
  ],
  overlayDecor: () => [
    particles("Decor — Stars", { kind: "stars", count: 24, size: 2.5, speed: 0.15, color: "@text", opacity: 0.5 }),
  ],
};

/** Holo Glass: blurred mesh orbs, four-point sparkles, bevelled chrome type. */
const HOLO_GLASS: FamilyStyle = {
  id: "holo",
  name: "Holo Glass",
  tags: ["Purple", "Minimal", "Sci-Fi"],
  display: "Montserrat",
  displayWeight: 900,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 18,
  frameRadius: 18,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    gradientStroke: { enabled: true, from: "@primary", to: "@secondary", angle: 120, width: 3 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: {
    emboss: { enabled: true, light: "@text", dark: "@background", depth: 2 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  plateShape: "plaque",
  scene: () => [
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    particles("Decor — Holo orbs", { kind: "blobs", count: 8, size: 5, speed: 0.6, color: "@primary" }),
    particles("Decor — Sparkles", { kind: "stars", count: 20, size: 7, speed: 0.15, color: "@text", opacity: 0.85 }),
  ],
  overlayDecor: () => [
    particles("Decor — Sparkles", { kind: "stars", count: 12, size: 6, speed: 0.15, color: "@text", opacity: 0.6 }),
  ],
};

/** Starlit Serenity: indigo night, crescent moon, shooting stars. */
const STARLIT_SERENITY: FamilyStyle = {
  id: "starlit",
  name: "Starlit Serenity",
  tags: ["Blue", "Cozy", "Minimal"],
  display: "Poppins",
  displayWeight: 700,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 20,
  frameRadius: 22,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@text", width: 2, radius: 22 },
    glow: { enabled: true, color: "@glow", strength: 14 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 20 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/24", angle: 190 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 80, size: 2.5, speed: 0.12, color: "@text", opacity: 0.8 }),
    particles("Decor — Shooting stars", { kind: "shootingStars", count: 5, size: 6, speed: 1, color: "@text" }),
    shape("Decor — Moon", { x: 1580, y: 110, width: 170, height: 170 }, {
      shape: "crescent",
      fill: "@text",
      effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
      animation: anim("float", { duration: 7000, intensity: 0.4 }),
    }),
    particles("Decor — Clouds", { kind: "clouds", count: 5, size: 105, speed: 0.3, color: "@secondary", opacity: 0.4 }),
  ],
  overlayDecor: () => [
    particles("Decor — Stars", { kind: "stars", count: 26, size: 2.5, speed: 0.12, color: "@text", opacity: 0.55 }),
  ],
  contentOffsetY: -130,
};


/** Hallowed Night: near-black graveyard, cratered moon, white bats and ghosts. */
const HALLOWED_NIGHT: FamilyStyle = {
  id: "hallowed",
  name: "Hallowed Night",
  collection: "gothic",
  tags: ["Horror", "Dark", "Fantasy"],
  display: "Cinzel Decorative",
  displayWeight: 700,
  displayTracking: 6,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 12,
  frameRadius: 12,
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@border", width: 2, radius: 12 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  chatShape: "coffin",
  alertShape: "coffin",
  // The graveyard owns the bottom third; the copy clears its fence line.
  contentOffsetY: -175,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@secondary/26", angle: 190 } },
    }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 12, size: 5, speed: 0.5, color: "@primary" }),
    particles("Decor — Stars", { kind: "stars", count: 54, size: 2.5, speed: 0.14, color: "@accent", opacity: 0.7 }),
    // The moon is the light source, so it hangs opposite the graveyard's crosses.
    shape("Decor — Moon", { x: 1520, y: 90, width: 210, height: 210 }, {
      shape: "moon",
      moonPhase: 1,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 60 } },
      animation: anim("float", { duration: 7000, intensity: 0.4 }),
    }),
    particles("Decor — Fog", { kind: "fog", count: 8, size: 5, speed: 0.5, color: "@secondary" }),
    // A silhouette must be darker than the light behind it. The sky's gradient
    // lifts toward @secondary at the bottom, so plain @background reads as the
    // shape of a hill rather than a flat band laid over it.
    shape("Decor — Graveyard", { x: 0, y: 720, width: 1920, height: 360 }, {
      shape: "graveyard",
      fill: "@background",
    }),
    particles("Decor — Bats", { kind: "bats", count: 9, size: 6, speed: 0.8, color: "@accent", opacity: 0.85 }),
    particles("Decor — Ghosts", { kind: "ghosts", count: 4, size: 14, speed: 0.6, color: "@accent" }),
    shape("Decor — Web left", { x: 0, y: 0, width: 300, height: 260 }, {
      shape: "web",
      fill: "@accent/55",
      cornerRadius: 1.6,
    }),
    shape("Decor — Web right", { x: 1620, y: 0, width: 300, height: 260 }, {
      shape: "web",
      fill: "@accent/55",
      cornerRadius: 1.6,
      rotation: 90,
    }),
    // One chain, on the far side from the moon: nothing should cross it.
    shape("Decor — Chain", { x: 322, y: 0, width: 30, height: 300 }, {
      shape: "chain",
      fill: "@accent/80",
      animation: anim("wave", { duration: 6000, intensity: 0.5 }),
    }),
    icon("Decor — Skull", { x: 118, y: 862, width: 74, height: 74 }, "skull", {
      fill: "@accent/70",
      animation: anim("float", { duration: 6400, intensity: 0.4 }),
    }),
    icon("Decor — Candle", { x: 1740, y: 852, width: 66, height: 66 }, "candle", {
      fill: "@accent/70",
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      animation: anim("flicker", { duration: 2200 }),
    }),
  ],
  overlayDecor: () => [
    shape("Decor — Web left", { x: 0, y: 0, width: 260, height: 220 }, {
      shape: "web",
      fill: "@accent/45",
      cornerRadius: 1.4,
    }),
    shape("Decor — Web right", { x: 1660, y: 0, width: 260, height: 220 }, {
      shape: "web",
      fill: "@accent/40",
      cornerRadius: 1.4,
      rotation: 90,
    }),
    // Confined to the side margins so they hover near the webcam and chat,
    // never across the gameplay in the centre.
    particles("Decor — Bats left", { kind: "bats", count: 3, size: 5, speed: 0.7, color: "@accent", opacity: 0.7, box: MARGIN_LEFT }),
    particles("Decor — Bats right", { kind: "bats", count: 3, size: 5, speed: 0.7, color: "@accent", opacity: 0.6, box: MARGIN_RIGHT }),
    particles("Decor — Ghost left", { kind: "ghosts", count: 1, size: 11, speed: 0.5, color: "@accent", box: MARGIN_LEFT }),
    particles("Decor — Ghost right", { kind: "ghosts", count: 1, size: 11, speed: 0.5, color: "@accent", box: MARGIN_RIGHT }),
  ],
};

/** Overdrive: angular esports — diagonal shards, hex mesh, bracket frames,
    slanted display. Neon on near-black; colour comes from the palette. */
const OVERDRIVE: FamilyStyle = {
  id: "overdrive",
  name: "Overdrive",
  tags: ["Esports", "Neon", "Dark"],
  display: "Kanit",
  displayWeight: 700,
  displayTracking: 1,
  displayTransform: "uppercase",
  displayItalic: true,
  body: "Rajdhani",
  radius: 4,
  frameRadius: 6,
  corners: true,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 6 },
    glow: { enabled: true, color: "@glow", strength: 22 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 28 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 135 } },
    }),
    shape("Shard — back", { x: 1080, y: -80, width: 900, height: 1240 }, {
      shape: "shard",
      fill: "@surface",
      opacity: 0.85,
    }),
    shape("Shard — mid", { x: 1320, y: -80, width: 620, height: 1240 }, {
      shape: "shard",
      fill: "@primary/30",
    }),
    shape("Shard — left", { x: -280, y: -80, width: 540, height: 1240 }, {
      shape: "shard",
      fill: "@surface",
      opacity: 0.6,
    }),
    shape("Hex mesh — TL", { x: -40, y: -40, width: 480, height: 320 }, {
      shape: "hexmesh",
      fill: "@primary/22",
    }),
    shape("Hex mesh — BR", { x: 1500, y: 800, width: 480, height: 340 }, {
      shape: "hexmesh",
      fill: "@primary/22",
    }),
    particles("Decor — Sparks", { kind: "embers", count: 24, size: 3, speed: 0.5, color: "@accent", opacity: 0.5 }),
  ],
  overlayDecor: () => [
    shape("Hex mesh — corner", { x: 1580, y: -30, width: 380, height: 250 }, {
      shape: "hexmesh",
      fill: "@primary/20",
    }),
  ],
  contentOffsetY: 0,
};

/** Liquid Neon: soft organic blobs of neon on near-black, pill panels and
    rounded frames — the friendlier gamer look. */
const LIQUID_NEON: FamilyStyle = {
  id: "liquidneon",
  name: "Liquid Neon",
  tags: ["Neon", "RGB", "Dark"],
  display: "Righteous",
  displayWeight: 700,
  displayTracking: 1,
  displayTransform: "uppercase",
  body: "Poppins",
  radius: 40,
  frameRadius: 36,
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 3, radius: 36 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 160 } },
    }),
    shape("Blob — TL", { x: -260, y: -240, width: 760, height: 720 }, {
      shape: "ellipse",
      fill: "@primary/32",
      effects: { glow: { enabled: true, color: "@glow", strength: 44 } },
    }),
    shape("Blob — BR", { x: 1380, y: 540, width: 840, height: 780 }, {
      shape: "ellipse",
      fill: "@secondary/32",
      effects: { glow: { enabled: true, color: "@glow", strength: 44 } },
    }),
    shape("Blob — accent", { x: 1200, y: -280, width: 520, height: 520 }, {
      shape: "ellipse",
      fill: "@accent/16",
    }),
    particles("Decor — Blobs", { kind: "blobs", count: 5, size: 120, speed: 0.35, color: "@primary", opacity: 0.5 }),
    particles("Decor — Bubbles", { kind: "bubbles", count: 20, size: 8, speed: 0.5, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: -60,
};

/** Hex Storm: a honeycomb field under sharp lightning cuts on near-black,
    electric azure/cyan. Spec theme E. Colour follows the palette. */
const HEX_STORM: FamilyStyle = {
  id: "hexstorm",
  name: "Hex Storm",
  tags: ["Esports", "Neon", "Sci-Fi"],
  display: "Rajdhani",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "uppercase",
  displayItalic: true,
  body: "Rajdhani",
  radius: 2,
  frameRadius: 2,
  corners: true,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 2 },
    glow: { enabled: true, color: "@glow", strength: 32 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 32 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 135 } },
    }),
    // Honeycomb field across the whole frame, brighter in opposite corners.
    shape("Hex field", FULL, { shape: "hexmesh", fill: "@primary/14" }),
    shape("Hex glow — TL", { x: -80, y: -80, width: 660, height: 480 }, {
      shape: "hexmesh",
      fill: "@primary/26",
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
    }),
    shape("Hex glow — BR", { x: 1340, y: 620, width: 660, height: 520 }, {
      shape: "hexmesh",
      fill: "@primary/26",
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
    }),
    // A dark angled panel on the right, then bright cyan lightning cuts.
    shape("Shard — panel", { x: 1160, y: -80, width: 960, height: 1240 }, {
      shape: "shard",
      fill: "@surface",
      opacity: 0.72,
    }),
    // Two accent lines, mirrored to the same inset and the same width on each
    // side — different colours, matched geometry.
    shape("Bolt — left", { x: 150, y: -10, width: 40, height: 1100 }, {
      shape: "rect",
      fill: "@accent",
      opacity: 0.9,
      effects: { glow: { enabled: true, color: "@glow", strength: 38 } },
    }),
    shape("Bolt — right", { x: 1730, y: -10, width: 40, height: 1100 }, {
      shape: "rect",
      fill: "@glow",
      opacity: 0.9,
      effects: { glow: { enabled: true, color: "@glow", strength: 38 } },
    }),
    particles("Decor — Sparks", { kind: "embers", count: 30, size: 2.5, speed: 0.6, color: "@accent", opacity: 0.6 }),
  ],
  overlayDecor: () => [
    shape("Hex corner", { x: 1560, y: -30, width: 400, height: 280 }, {
      shape: "hexmesh",
      fill: "@primary/20",
    }),
  ],
  contentOffsetY: 0,
};

/** Moonlit Grove: a cozy anime night — full moon, drifting cherry blossoms,
    soft blossom glow and stars, in an elegant serif. Spec theme F. */
const MOONLIT_GROVE: FamilyStyle = {
  id: "grove",
  name: "Moonlit Grove",
  tags: ["Fantasy", "Cozy", "Anime"],
  display: "Playfair Display",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "none",
  body: "Inter",
  radius: 18,
  frameRadius: 20,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 20 },
    glow: { enabled: true, color: "@glow", strength: 16 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 24 } },
  // Arched bracket plaques for alerts, panels and name plates — the romantic
  // reference look, softer than a plain rectangle.
  plateShape: "plaque",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@secondary/30", angle: 195 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 72, size: 2.4, speed: 0.12, color: "@accent", opacity: 0.8 }),
    shape("Decor — Moon", { x: 1470, y: 110, width: 190, height: 190 }, {
      shape: "moon",
      moonPhase: 1,
      craters: false,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 36 } },
      animation: anim("float", { duration: 8000, intensity: 0.4 }),
    }),
    // Soft blossom masses tucked into the lower corners.
    shape("Blossom — left", { x: -160, y: 720, width: 520, height: 460 }, {
      shape: "ellipse",
      fill: "@primary/30",
      effects: { glow: { enabled: true, color: "@glow", strength: 46 } },
    }),
    shape("Blossom — left small", { x: 200, y: 860, width: 260, height: 240 }, {
      shape: "ellipse",
      fill: "@primary/26",
      effects: { glow: { enabled: true, color: "@glow", strength: 40 } },
    }),
    shape("Blossom — right", { x: 1520, y: 760, width: 560, height: 460 }, {
      shape: "ellipse",
      fill: "@secondary/32",
      effects: { glow: { enabled: true, color: "@glow", strength: 46 } },
    }),
    particles("Decor — Petals", { kind: "petals", count: 24, size: 7, speed: 1.0, color: "@primary", opacity: 0.7 }),
    // Glowing butterflies drifting through the grove — the signature ornament of
    // the violet-night reference packs.
    particles("Decor — Butterflies", {
      kind: "moths",
      count: 7,
      size: 9,
      speed: 0.6,
      color: "@accent",
      opacity: 0.85,
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
    }),
    // Clouds stay up in the sky so they never drift over the blossom masses
    // along the bottom.
    particles("Decor — Clouds", { kind: "clouds", count: 4, size: 100, speed: 0.26, color: "@secondary", opacity: 0.32, box: { x: 0, y: 0, width: 1920, height: 520 } }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.4, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [
    particles("Decor — Petals left", { kind: "petals", count: 5, size: 6, speed: 1.0, color: "@primary", opacity: 0.6, box: MARGIN_LEFT }),
    particles("Decor — Petals right", { kind: "petals", count: 5, size: 6, speed: 1.0, color: "@primary", opacity: 0.6, box: MARGIN_RIGHT }),
    // A butterfly or two hovering by the webcam and chat, kept to the margins.
    particles("Decor — Butterflies left", {
      kind: "moths",
      count: 2,
      size: 8,
      speed: 0.55,
      color: "@accent",
      opacity: 0.7,
      box: MARGIN_LEFT,
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
    }),
    particles("Decor — Butterflies right", {
      kind: "moths",
      count: 2,
      size: 8,
      speed: 0.55,
      color: "@accent",
      opacity: 0.7,
      box: MARGIN_RIGHT,
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
    }),
  ],
  contentOffsetY: -70,
};

/** Witching Hour (spec theme G): a Victorian-witch parlour — damask wallpaper,
    a ritual moon and a great faint pentacle, purple altar smoke, cauldron and
    candles, and parchment-scroll plates. Gothic like Hallowed Night, but ornate
    and occult rather than a graveyard. */
const WITCHING_HOUR: FamilyStyle = {
  id: "witch",
  name: "Witching Hour",
  collection: "gothic",
  tags: ["Fantasy", "Horror", "Purple"],
  display: "Grenze Gotisch",
  displayWeight: 700,
  displayTracking: 3,
  displayTransform: "none",
  body: "Cinzel",
  radius: 12,
  frameRadius: 14,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 14 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  // The signature: every plate and panel is a rolled parchment scroll.
  plateShape: "scroll",
  chatShape: "rect",
  contentOffsetY: -30,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@secondary/24", angle: 195 } },
    }),
    // Damask wallpaper: the Victorian parlour behind everything.
    shape("Decor — Damask", FULL, { shape: "damask", fill: "@primary/14" }),
    particles("Decor — Stars", { kind: "stars", count: 38, size: 2.4, speed: 0.12, color: "@accent", opacity: 0.6 }),
    // A pale ritual moon, top-right.
    shape("Decor — Moon", { x: 1500, y: 96, width: 190, height: 190 }, {
      shape: "moon",
      moonPhase: 1,
      craters: false,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 42 } },
      animation: anim("float", { duration: 8000, intensity: 0.4 }),
    }),
    // A great pentacle turning over the sky — slow and ritual, but clearly in
    // motion, with a breathing glow.
    icon("Decor — Pentacle", { x: 700, y: 30, width: 520, height: 520 }, "pentagram", {
      fill: "@accent/16",
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
      animation: anim("rotate", { duration: 26000, loop: true }),
    }),
    particles("Decor — Smoke", { kind: "fog", count: 8, size: 5, speed: 0.45, color: "@secondary" }),
    // The witch's altar, tucked into the lower corners.
    icon("Decor — Cauldron", { x: 96, y: 820, width: 150, height: 150 }, "cauldron", {
      fill: "@accent/75",
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      animation: anim("float", { duration: 6400, intensity: 0.3 }),
    }),
    icon("Decor — Raven", { x: 150, y: 150, width: 120, height: 120 }, "raven", {
      fill: "@accent/70",
      animation: anim("float", { duration: 7200, intensity: 0.4 }),
    }),
    icon("Decor — Crystal", { x: 1690, y: 840, width: 110, height: 110 }, "crystal", {
      fill: "@accent/70",
      effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
      animation: anim("pulse", { duration: 4200 }),
    }),
    icon("Decor — Candle left", { x: 300, y: 858, width: 70, height: 70 }, "candle", {
      fill: "@accent/70",
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      animation: anim("flicker", { duration: 2200 }),
    }),
    icon("Decor — Candle right", { x: 1560, y: 856, width: 70, height: 70 }, "candle", {
      fill: "@accent/70",
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      animation: anim("flicker", { duration: 2600 }),
    }),
    icon("Decor — Rose", { x: 1744, y: 150, width: 96, height: 96 }, "rose", {
      fill: "@primary/70",
      animation: anim("float", { duration: 6800, intensity: 0.3 }),
    }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.4, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [
    shape("Decor — Damask", FULL, { shape: "damask", fill: "@primary/10" }),
    icon("Decor — Candle left", { x: 60, y: 150, width: 56, height: 56 }, "candle", {
      fill: "@accent/60",
      effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
      animation: anim("flicker", { duration: 2400 }),
    }),
    icon("Decor — Candle right", { x: 1804, y: 150, width: 56, height: 56 }, "candle", {
      fill: "@accent/60",
      effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
      animation: anim("flicker", { duration: 2000 }),
    }),
  ],
};

/** Gothic Rose: an opulent red-and-near-black romance — a harlequin lattice
    behind light from above, a diamond plate carrying the headline, faceted red
    gems, red roses and drifting petals. */
const GOTHIC_ROSE: FamilyStyle = {
  id: "gothicrose",
  name: "Gothic Rose",
  collection: "gothic",
  tags: ["Fantasy", "Dark", "Red"],
  display: "Playfair Display",
  displayWeight: 700,
  displayTracking: 1,
  displayTransform: "none",
  body: "Inter",
  radius: 16,
  frameRadius: 16,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 16 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 24 } },
  // Arched plaques behind the diamond, matching the reference.
  plateShape: "plaque",
  chatShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@secondary/22", angle: 180 } },
    }),
    // Harlequin lattice wallpaper.
    shape("Decor — Harlequin", FULL, { shape: "harlequin", fill: "@primary/12" }),
    // Light pouring from above.
    shape("Decor — Light", { x: 360, y: -320, width: 1200, height: 720 }, {
      shape: "ellipse",
      fill: "@accent/12",
      effects: { glow: { enabled: true, color: "@glow", strength: 90 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 34, size: 2.2, speed: 0.12, color: "@accent", opacity: 0.55 }),
    // The diamond plate the headline sits inside.
    shape("Decor — Diamond", { x: 610, y: 150, width: 700, height: 700 }, {
      shape: "diamond",
      fill: "@surface/92",
      effects: {
        border: { enabled: true, color: "@accent", width: 3, radius: 0 },
        glow: { enabled: true, color: "@glow", strength: 30 },
      },
    }),
    // Faceted red gems in the corners.
    shape("Gem — top left", { x: 120, y: 170, width: 96, height: 96 }, {
      shape: "gem",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
      animation: anim("float", { duration: 6400, intensity: 0.4 }),
    }),
    shape("Gem — top right", { x: 1704, y: 170, width: 96, height: 96 }, {
      shape: "gem",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
      animation: anim("float", { duration: 7000, intensity: 0.4 }),
    }),
    shape("Gem — mid left", { x: 220, y: 620, width: 70, height: 70 }, {
      shape: "gem",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
      animation: anim("pulse", { duration: 4200 }),
    }),
    shape("Gem — mid right", { x: 1630, y: 640, width: 70, height: 70 }, {
      shape: "gem",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
      animation: anim("pulse", { duration: 4600 }),
    }),
    // Hanging garlands from the top edge.
    shape("Decor — Garland left", { x: 320, y: 0, width: 22, height: 210 }, {
      shape: "chain",
      fill: "@accent/70",
      animation: anim("wave", { duration: 6000, intensity: 0.4 }),
    }),
    shape("Decor — Garland right", { x: 1580, y: 0, width: 22, height: 210 }, {
      shape: "chain",
      fill: "@accent/70",
      animation: anim("wave", { duration: 6600, intensity: 0.4 }),
    }),
    // Roses tucked into the lower corners.
    icon("Rose — left", { x: 90, y: 850, width: 160, height: 160 }, "rose", {
      fill: "@accent/85",
      effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
      animation: anim("float", { duration: 6800, intensity: 0.3 }),
    }),
    icon("Rose — left small", { x: 250, y: 910, width: 96, height: 96 }, "rose", {
      fill: "@primary/80",
      animation: anim("float", { duration: 7200, intensity: 0.3 }),
    }),
    icon("Rose — right", { x: 1680, y: 858, width: 170, height: 170 }, "rose", {
      fill: "@accent/85",
      effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
      animation: anim("float", { duration: 7000, intensity: 0.3 }),
    }),
    particles("Decor — Petals", { kind: "petals", count: 22, size: 8, speed: 1.0, color: "@accent", opacity: 0.7 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 7, size: 6, speed: 0.4, color: "@accent", opacity: 0.35 }),
  ],
  overlayDecor: () => [
    shape("Decor — Harlequin", FULL, { shape: "harlequin", fill: "@primary/9" }),
    particles("Decor — Petals left", { kind: "petals", count: 4, size: 7, speed: 1.0, color: "@accent", opacity: 0.6, box: MARGIN_LEFT }),
    particles("Decor — Petals right", { kind: "petals", count: 4, size: 7, speed: 1.0, color: "@accent", opacity: 0.6, box: MARGIN_RIGHT }),
    icon("Rose — left", { x: 40, y: 150, width: 90, height: 90 }, "rose", {
      fill: "@accent/70",
      animation: anim("float", { duration: 6800, intensity: 0.3 }),
    }),
    icon("Rose — right", { x: 1790, y: 150, width: 90, height: 90 }, "rose", {
      fill: "@accent/70",
      animation: anim("float", { duration: 7200, intensity: 0.3 }),
    }),
  ],
};

/** Red Plasma (spec theme A): flowing energy — glowing plasma waves crossing
    diagonally, glossy chrome ribbons, a metallic headline with a light-reflection
    band, and rising sparks. Red in a red palette; colour follows the palette. */
const PLASMA: FamilyStyle = {
  id: "plasma",
  name: "Plasma",
  tags: ["Neon", "Dark", "Sci-Fi"],
  display: "Orbitron",
  displayWeight: 800,
  displayTracking: 3,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 6,
  frameRadius: 8,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 30 },
  },
  // Metallic lettering: dark → bright band → dark, the plasma-pack light
  // reflection. Chrome is colourless, so these are literal greys.
  headlineEffects: {
    gradient: { enabled: true, from: "#c4c4c4", via: "#ffffff", to: "#6b6b6b", angle: 90 },
    glow: { enabled: true, color: "@glow", strength: 24 },
  },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 130 } },
    }),
    // Deep red pooling behind everything.
    shape("Glow — pool", { x: 240, y: 220, width: 1100, height: 760 }, {
      shape: "ellipse",
      fill: "@primary/20",
      effects: { glow: { enabled: true, color: "@glow", strength: 120 } },
    }),
    // Plasma energy: glowing red waves crossing the frame, each flowing on its
    // own rhythm so the energy is always in motion.
    shape("Wave — plasma back", { x: -120, y: 120, width: 2160, height: 420 }, {
      shape: "wave",
      fill: "@primary/70",
      opacity: 0.85,
      effects: { glow: { enabled: true, color: "@glow", strength: 66 } },
      animation: anim("wave", { duration: 6400, intensity: 1.3 }),
    }),
    shape("Wave — plasma bright", { x: -120, y: 300, width: 2160, height: 300 }, {
      shape: "wave",
      fill: "@glow",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 80 } },
      animation: anim("float", { duration: 5200, intensity: 1.6, delay: 300 }),
    }),
    // A deeper red wave low in the frame, keeping the energy flowing under the
    // copy without a dull metal ribbon.
    shape("Wave — plasma low", { x: -140, y: 620, width: 2200, height: 340 }, {
      shape: "wave",
      fill: "@primary/55",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 58 } },
      animation: anim("sway", { duration: 7600, intensity: 0.8, delay: 600 }),
    }),
    // 40–60 sparks rising through the scene.
    particles("Decor — Sparks", { kind: "embers", count: 52, size: 3, speed: 0.7, color: "@glow", opacity: 0.7 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.4, color: "@text", opacity: 0.35 }),
  ],
  // No ambient decor over gameplay — a plasma wave across the play area would
  // cover what the stream is showing.
  overlayDecor: () => [],
  contentOffsetY: -30,
};

/** Aurora: the flowing-wave style, softer — ethereal northern-lights curtains
    of glowing colour over a starfield. Same engine as Plasma, calmer mood. */
const AURORA: FamilyStyle = {
  id: "aurora",
  name: "Aurora",
  tags: ["Sci-Fi", "Fantasy", "Cozy"],
  display: "Poppins",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 16,
  frameRadius: 18,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 18 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 30 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 165 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 84, size: 2.2, speed: 0.12, color: "@text", opacity: 0.75 }),
    // The aurora curtains drift and undulate — each on its own slow rhythm so
    // the sky flows rather than sitting still.
    shape("Aurora — accent", { x: -180, y: 60, width: 2280, height: 460 }, {
      shape: "wave",
      fill: "@accent/26",
      opacity: 0.6,
      effects: { glow: { enabled: true, color: "@glow", strength: 66 } },
      animation: anim("wave", { duration: 7000, intensity: 1.2 }),
    }),
    shape("Aurora — primary", { x: -180, y: 150, width: 2280, height: 540 }, {
      shape: "wave",
      fill: "@primary/40",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 82 } },
      animation: anim("float", { duration: 8600, intensity: 1.4, delay: 400 }),
    }),
    shape("Aurora — secondary", { x: -180, y: 300, width: 2280, height: 480 }, {
      shape: "wave",
      fill: "@secondary/36",
      opacity: 0.72,
      effects: { glow: { enabled: true, color: "@glow", strength: 74 } },
      animation: anim("sway", { duration: 9200, intensity: 0.7, delay: 800 }),
    }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.32, color: "@accent", opacity: 0.32 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 40,
};

/** Nebula: the flowing-wave style, cosmic — glowing gas clouds, a dense
    starfield, shooting stars and a small planet, with one energy sweep. */
const NEBULA: FamilyStyle = {
  id: "nebula",
  name: "Nebula",
  tags: ["Sci-Fi", "Neon", "Dark"],
  display: "Exo 2",
  displayWeight: 800,
  displayTracking: 3,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 8,
  frameRadius: 10,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 10 },
    glow: { enabled: true, color: "@glow", strength: 26 },
  },
  headlineEffects: {
    gradient: { enabled: true, from: "#e6e6ff", via: "#ffffff", to: "#8a8ab0", angle: 90 },
    glow: { enabled: true, color: "@glow", strength: 26 },
  },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 150 } },
    }),
    // Nebula gas: soft organic orbs, low and diffuse — no hard-edged discs.
    particles("Decor — Nebula A", { kind: "blobs", count: 4, size: 150, speed: 0.22, color: "@primary", opacity: 0.42 }),
    particles("Decor — Nebula B", { kind: "blobs", count: 3, size: 128, speed: 0.26, color: "@secondary", opacity: 0.36 }),
    particles("Decor — Stars", { kind: "stars", count: 140, size: 2, speed: 0.1, color: "@text", opacity: 0.85 }),
    particles("Decor — Shooting", { kind: "shootingStars", count: 4, size: 6, speed: 1, color: "@text" }),
    shape("Flow", { x: -160, y: 250, width: 2240, height: 300 }, {
      shape: "wave",
      fill: "@glow",
      opacity: 0.4,
      effects: { glow: { enabled: true, color: "@glow", strength: 70 } },
      animation: anim("wave", { duration: 7200, intensity: 1.5 }),
    }),
    shape("Planet", { x: 1500, y: 120, width: 190, height: 190 }, {
      shape: "moon",
      moonPhase: 1,
      craters: false,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 40 } },
      animation: anim("float", { duration: 8000, intensity: 0.4 }),
    }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 10, size: 6, speed: 0.3, color: "@accent", opacity: 0.34 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Silk: the flowing-wave style, elegant — flowing satin ribbons with a
    colour-graded sheen and scattered sparkles, over a soft dark ground. */
const SILK: FamilyStyle = {
  id: "silk",
  name: "Silk",
  tags: ["Cozy", "Fantasy", "Minimal"],
  display: "Playfair Display",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "none",
  body: "Inter",
  radius: 20,
  frameRadius: 22,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 22 },
    glow: { enabled: true, color: "@glow", strength: 16 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 22 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 155 } },
    }),
    shape("Silk — one", { x: -200, y: 280, width: 2320, height: 440 }, {
      shape: "wave",
      opacity: 0.9,
      effects: {
        gradientStroke: { enabled: true, from: "@primary", to: "@accent", angle: 90, width: 30 },
        glow: { enabled: true, color: "@glow", strength: 22 },
      },
      // The silk drifts — a slow float and gentle sway so the ribbon reads as
      // flowing fabric rather than a static band.
      animation: anim("float", { duration: 6400, intensity: 1.1 }),
    }),
    shape("Silk — two", { x: -200, y: 520, width: 2320, height: 380 }, {
      shape: "wave",
      opacity: 0.85,
      effects: {
        gradientStroke: { enabled: true, from: "@secondary", to: "@accent", angle: 90, width: 30 },
        glow: { enabled: true, color: "@glow", strength: 18 },
      },
      animation: anim("sway", { duration: 8200, intensity: 0.6, delay: 500 }),
    }),
    particles("Decor — Sparkle", { kind: "stars", count: 44, size: 2.4, speed: 0.15, color: "@accent", opacity: 0.7 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 7, speed: 0.3, color: "@accent", opacity: 0.3 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: -40,
};

/** Frost: glassmorphism — soft colourful blurred orbs behind frosted-glass
    panels (translucent fill, hairline border, gloss). On overlays the glass
    plates sit over the gameplay itself. */
const FROST: FamilyStyle = {
  id: "frost",
  name: "Frost",
  tags: ["Minimal", "Sci-Fi", "Cozy"],
  display: "Poppins",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 22,
  frameRadius: 22,
  corners: false,
  strokeWidth: 2,
  glass: true,
  frameEffects: {
    border: { enabled: true, color: "@text/45", width: 2, radius: 22 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 24 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 135 } },
    }),
    // Soft colourful orbs — the frosted glass shows these through the panels.
    particles("Decor — Orbs A", { kind: "blobs", count: 5, size: 160, speed: 0.28, color: "@primary", opacity: 0.55 }),
    particles("Decor — Orbs B", { kind: "blobs", count: 4, size: 138, speed: 0.32, color: "@secondary", opacity: 0.5 }),
    particles("Decor — Orbs C", { kind: "blobs", count: 3, size: 120, speed: 0.3, color: "@accent", opacity: 0.4 }),
    particles("Decor — Sparkle", { kind: "stars", count: 24, size: 2, speed: 0.1, color: "@text", opacity: 0.5 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Liquid Glass: the Apple-style pane. Panels carry a drifting lens caustic
    with a specular rim and a faint chromatic edge, floating over vivid orbs. */
const LIQUID_GLASS: FamilyStyle = {
  id: "liquidglass",
  name: "Liquid Glass",
  tags: ["Minimal", "Sci-Fi", "Purple"],
  display: "Poppins",
  displayWeight: 700,
  displayTracking: 1,
  displayTransform: "none",
  body: "Inter",
  radius: 28,
  frameRadius: 28,
  corners: false,
  strokeWidth: 2,
  glass: true,
  glassStyle: "liquid",
  socialPill: "@text/16",
  frameEffects: {
    border: { enabled: true, color: "@text/40", width: 2, radius: 28 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/38", angle: 150 } },
    }),
    // Vivid orbs for the liquid glass to catch and refract.
    particles("Decor — Orbs A", { kind: "blobs", count: 5, size: 200, speed: 0.26, color: "@primary", opacity: 0.6 }),
    particles("Decor — Orbs B", { kind: "blobs", count: 4, size: 172, speed: 0.3, color: "@accent", opacity: 0.55 }),
    particles("Decor — Orbs C", { kind: "blobs", count: 3, size: 150, speed: 0.34, color: "@secondary", opacity: 0.5 }),
    particles("Decor — Sparkle", { kind: "stars", count: 22, size: 2, speed: 0.1, color: "@text", opacity: 0.5 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Prism: glassmorphism with a reflection finish — diagonal light glints sweep
    the panels over vivid multi-colour orbs. Bolder than Frost. */
const PRISM: FamilyStyle = {
  id: "prism",
  name: "Prism",
  tags: ["Neon", "Sci-Fi", "Minimal"],
  display: "Montserrat",
  displayWeight: 800,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 20,
  frameRadius: 20,
  corners: false,
  strokeWidth: 2,
  glass: true,
  glassStyle: "reflection",
  frameEffects: {
    border: { enabled: true, color: "@text/50", width: 2, radius: 20 },
    glow: { enabled: true, color: "@glow", strength: 20 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 130 } },
    }),
    particles("Decor — Orbs A", { kind: "blobs", count: 4, size: 165, speed: 0.3, color: "@primary", opacity: 0.58 }),
    particles("Decor — Orbs B", { kind: "blobs", count: 4, size: 142, speed: 0.34, color: "@secondary", opacity: 0.52 }),
    particles("Decor — Orbs C", { kind: "blobs", count: 3, size: 122, speed: 0.32, color: "@accent", opacity: 0.46 }),
    particles("Decor — Sparkle", { kind: "stars", count: 26, size: 2, speed: 0.1, color: "@text", opacity: 0.55 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Crystal: glassmorphism with a reflection finish — cooler and icier, fewer
    soft orbs and a scatter of bright glints, in a lighter display. */
const CRYSTAL: FamilyStyle = {
  id: "crystal",
  name: "Crystal",
  tags: ["Nordic", "Minimal", "Cozy"],
  display: "Poppins",
  displayWeight: 600,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 20,
  frameRadius: 20,
  corners: false,
  strokeWidth: 2,
  glass: true,
  glassStyle: "reflection",
  frameEffects: {
    border: { enabled: true, color: "@text/45", width: 2, radius: 20 },
    glow: { enabled: true, color: "@glow", strength: 16 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 22 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 150 } },
    }),
    particles("Decor — Orbs A", { kind: "blobs", count: 3, size: 185, speed: 0.24, color: "@primary", opacity: 0.42 }),
    particles("Decor — Orbs B", { kind: "blobs", count: 3, size: 150, speed: 0.28, color: "@accent", opacity: 0.36 }),
    particles("Decor — Glints", { kind: "stars", count: 44, size: 2.2, speed: 0.12, color: "@text", opacity: 0.7 }),
    particles("Decor — Big glints", { kind: "stars", count: 14, size: 6, speed: 0.1, color: "@accent", opacity: 0.7 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** The neutral glass ground shared by the pride prism families: a calm gradient
    and soft neutral orbs, so the flag lines in the glass sheet carry the
    identity rather than the backdrop tinting everything. */
const prismFlagGround = (): LayerSpec[] => [
  shape("Backdrop", FULL, {
    background: true,
    fill: "@background",
    effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 130 } },
  }),
  particles("Decor — Orbs A", { kind: "blobs", count: 4, size: 168, speed: 0.28, color: "@text", opacity: 0.07 }),
  particles("Decor — Orbs B", { kind: "blobs", count: 3, size: 140, speed: 0.32, color: "@border", opacity: 0.22 }),
  particles("Decor — Sparkle", { kind: "stars", count: 26, size: 2, speed: 0.12, color: "@text", opacity: 0.45 }),
];

/** Prism Flag: the glossy-glass look flying a pride flag. A few thicker pride
    lines run down each side of the glass, with a wet reflection over the top,
    over a neutral glass ground so the flag reads. Pride collection, so it
    expands across the prism palettes (rainbow / lesbian, each light and dark)
    and the flag colours arrive per palette. Everything animates. */
const PRISM_FLAG: FamilyStyle = {
  id: "prism-flag",
  name: "Prism Flag",
  collection: "pride",
  tags: ["RGB", "Neon", "Minimal"],
  display: "Montserrat",
  displayWeight: 800,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 20,
  frameRadius: 20,
  corners: false,
  strokeWidth: 2,
  glass: true,
  glassStyle: "reflection",
  frameEffects: {
    border: { enabled: true, color: "@text/50", width: 2, radius: 20 },
    glow: { enabled: true, color: "@glow", strength: 22 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  scene: prismFlagGround,
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Frost Flag: the same pride prism, but matte frosted glass — a soft, even
    sheen instead of the glossy glint, so the flag reads through diffused rather
    than polished. The matte counterpart to Prism Flag; both expand across the
    prism palettes so every flag comes in a glossy and a matte finish. */
const FROST_FLAG: FamilyStyle = {
  id: "frost-flag",
  name: "Frost Flag",
  collection: "pride",
  tags: ["RGB", "Minimal", "Cozy"],
  display: "Poppins",
  displayWeight: 600,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 22,
  frameRadius: 22,
  corners: false,
  strokeWidth: 2,
  glass: true,
  // No glassStyle → frost: a matte, diffused sheen.
  frameEffects: {
    border: { enabled: true, color: "@text/45", width: 2, radius: 22 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 22 } },
  plateShape: "rect",
  scene: prismFlagGround,
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Prism Stripes: the glossy pride prism with the flag laid on as a full field
    of diagonal pinstripes across the glass — the busier look, kept alongside
    the calmer Prism Flag for those who prefer it. */
const PRISM_STRIPES: FamilyStyle = {
  ...PRISM_FLAG,
  id: "prism-stripes",
  name: "Prism Stripes",
  facetMode: "stripes",
};

/** Frost Stripes: the matte counterpart — full diagonal pinstripes through
    frosted glass. */
const FROST_STRIPES: FamilyStyle = {
  ...FROST_FLAG,
  id: "frost-stripes",
  name: "Frost Stripes",
  facetMode: "stripes",
};

/** Plasma Flag: the Plasma pack flying a pride flag. A river of flowing, glowing
    plasma ribbons — one per flag colour — undulates across the frame, in the
    Orbitron/Rajdhani plasma type. Pride collection; the flag arrives per palette
    (rainbow / lesbian, light and dark). */
const PLASMA_FLAG: FamilyStyle = {
  id: "plasma-flag",
  name: "Plasma Flag",
  collection: "pride",
  tags: ["Neon", "RGB", "Dark"],
  display: "Orbitron",
  displayWeight: 800,
  displayTracking: 3,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 6,
  frameRadius: 8,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 28 },
  },
  headlineEffects: {
    glow: { enabled: true, color: "@glow", strength: 34 },
    // A dark halo keeps the letters legible over the bright rainbow flow.
    shadow: { enabled: true, color: "@shadow", blur: 22, offsetY: 4, opacity: 0.85 },
  },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 130 } },
    }),
    // The rainbow plasma river — flowing glowing ribbons in the flag's colours.
    shape("Plasma flag", { x: -140, y: 220, width: 2200, height: 600 }, { shape: "flagwaves" }),
    // Rising sparks and soft bokeh for depth.
    particles("Decor — Sparks", { kind: "embers", count: 46, size: 3, speed: 0.7, color: "@glow", opacity: 0.55 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.4, color: "@text", opacity: 0.28 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Mecha (spec theme B): industrial military-tech — carbon-fibre bands, toxic
    green accent lines with intense glow, 45° chamfered frames and panels, and a
    compact tall display. Green in a green palette; colour follows the palette. */
const MECHA: FamilyStyle = {
  id: "mecha",
  name: "Mecha",
  tags: ["Esports", "Neon", "Sci-Fi"],
  display: "Bebas Neue",
  displayWeight: 400,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 2,
  frameRadius: 4,
  frameShape: "hexagon",
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 3, radius: 4 },
    glow: { enabled: true, color: "@glow", strength: 42 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 40 } },
  plateShape: "chamfer",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 135 } },
    }),
    // Carbon-fibre header and footer bands.
    shape("Carbon — top", { x: 0, y: 0, width: 1920, height: 150 }, { shape: "carbon", fill: "@surface" }),
    shape("Carbon — bottom", { x: 0, y: 930, width: 1920, height: 150 }, { shape: "carbon", fill: "@surface" }),
    // Toxic green accent lines with intense glow along the band edges.
    shape("Line — top", { x: 0, y: 150, width: 1920, height: 5 }, {
      shape: "rect",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
    }),
    shape("Line — bottom", { x: 0, y: 925, width: 1920, height: 5 }, {
      shape: "rect",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
    }),
    // Chamfered HUD accents angled into opposite corners.
    shape("Chamfer — left", { x: -70, y: 300, width: 380, height: 240 }, {
      shape: "chamfer",
      fill: "@surface/70",
      effects: {
        border: { enabled: true, color: "@accent", width: 2 },
        glow: { enabled: true, color: "@glow", strength: 16 },
      },
    }),
    shape("Chamfer — right", { x: 1610, y: 540, width: 380, height: 240 }, {
      shape: "chamfer",
      fill: "@surface/70",
      effects: {
        border: { enabled: true, color: "@accent", width: 2 },
        glow: { enabled: true, color: "@glow", strength: 16 },
      },
    }),
    particles("Decor — Sparks", { kind: "embers", count: 22, size: 2.5, speed: 0.5, color: "@accent", opacity: 0.5 }),
  ],
  overlayDecor: () => [
    shape("Carbon — corner", { x: 1540, y: 0, width: 380, height: 96 }, { shape: "carbon", fill: "@surface" }),
  ],
  contentOffsetY: 0,
};

/** Cyber Pill (spec theme C): streamlined sci-fi — a dark teal ground, neon
    accents, panels with a green-to-blue gradient edge, and two-part pill
    infobars (icon cap + italic text block). Colour follows the palette. */
const CYBER_PILL: FamilyStyle = {
  id: "cyberpill",
  name: "Cyber Pill",
  tags: ["Neon", "Sci-Fi", "Dark"],
  display: "Exo 2",
  displayWeight: 700,
  displayTracking: 2,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 26,
  frameRadius: 26,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    gradientStroke: { enabled: true, from: "@accent", to: "@secondary", angle: 30, width: 3 },
    glow: { enabled: true, color: "@glow", strength: 28 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  chipSplit: true,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 150 } },
    }),
    // A faint droplet / noise texture across the teal ground.
    particles("Decor — Droplets", { kind: "bokeh", count: 26, size: 4, speed: 0.22, color: "@accent", opacity: 0.18 }),
    // A soft teal wash along the floor for depth — wide and low so it reads as
    // a gradient rise, not a blob.
    shape("Glow — floor", { x: 120, y: 980, width: 1680, height: 320 }, {
      shape: "ellipse",
      fill: "@accent/12",
      effects: { glow: { enabled: true, color: "@glow", strength: 90 } },
    }),
    // Streamlined neon HUD frame with a green-to-blue gradient edge — its glow
    // breathes so the frame pulses like a live HUD.
    shape("HUD frame", { x: 54, y: 54, width: 1812, height: 972 }, {
      shape: "rect",
      fill: "@surface/0",
      cornerRadius: 44,
      effects: {
        gradientStroke: { enabled: true, from: "@accent", to: "@secondary", angle: 35, width: 3 },
        glow: { enabled: true, color: "@glow", strength: 22 },
      },
      animation: anim("glow", { duration: 3800, intensity: 0.9 }),
    }),
    // The pack's signature capsule — just the round cap in the corner.
    shape("Pill — cap", { x: 96, y: 96, width: 46, height: 46 }, {
      shape: "rect",
      cornerRadius: 23,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
      animation: anim("pulse", { duration: 2600, intensity: 1.2 }),
    }),
    // Slim neon accent bar framing the headline — a glint sweeps along it.
    shape("Accent — top", { x: 710, y: 392, width: 500, height: 6 }, {
      shape: "rect",
      cornerRadius: 3,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
      animation: anim("shimmer", { duration: 3200 }),
    }),
    particles("Decor — Sparks", { kind: "embers", count: 16, size: 2, speed: 0.5, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Spectral Glow: the Hallowed Night haunt turned neon. The same graveyard,
    ghosts, bats, moon, webs and chains, but every element blooms — a glowing
    silhouette rim, luminous spectres, neon bats and a hot moon over a rising
    ground glow. Gothic collection; colour follows the palette. */
const SPECTRAL_GLOW: FamilyStyle = {
  id: "spectral",
  name: "Spectral Glow",
  collection: "gothic",
  tags: ["Horror", "Neon", "Dark"],
  display: "Cinzel Decorative",
  displayWeight: 700,
  displayTracking: 6,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 12,
  frameRadius: 12,
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 12 },
    glow: { enabled: true, color: "@glow", strength: 34 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 44 } },
  plateShape: "rect",
  chatShape: "coffin",
  alertShape: "coffin",
  contentOffsetY: -175,
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/22", angle: 190 } },
    }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 14, size: 6, speed: 0.5, color: "@glow", effects: { glow: { enabled: true, color: "@glow", strength: 18 } } }),
    particles("Decor — Stars", { kind: "stars", count: 60, size: 2.6, speed: 0.14, color: "@accent", opacity: 0.8, effects: { glow: { enabled: true, color: "@accent", strength: 10 } } }),
    // A hot neon moon.
    shape("Decor — Moon", { x: 1520, y: 90, width: 210, height: 210 }, {
      shape: "moon",
      moonPhase: 1,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 100 } },
      animation: anim("float", { duration: 7000, intensity: 0.4 }),
    }),
    particles("Decor — Fog", { kind: "fog", count: 8, size: 5, speed: 0.5, color: "@secondary" }),
    // A soft ground glow rising behind the graveyard.
    shape("Glow — ground", { x: 160, y: 840, width: 1600, height: 320 }, {
      shape: "ellipse",
      fill: "@accent/14",
      effects: { glow: { enabled: true, color: "@glow", strength: 110 } },
    }),
    // The silhouette, now with a neon rim blooming off its edges.
    shape("Decor — Graveyard", { x: 0, y: 720, width: 1920, height: 360 }, {
      shape: "graveyard",
      fill: "@background",
      effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
    }),
    // Luminous bats and spectres.
    particles("Decor — Bats", { kind: "bats", count: 9, size: 6, speed: 0.8, color: "@accent", opacity: 0.9, effects: { glow: { enabled: true, color: "@glow", strength: 16 } } }),
    particles("Decor — Ghosts", { kind: "ghosts", count: 4, size: 14, speed: 0.6, color: "@accent", effects: { glow: { enabled: true, color: "@glow", strength: 26 } } }),
    shape("Decor — Web left", { x: 0, y: 0, width: 300, height: 260 }, {
      shape: "web",
      fill: "@accent/60",
      cornerRadius: 1.6,
      effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
    }),
    shape("Decor — Web right", { x: 1620, y: 0, width: 300, height: 260 }, {
      shape: "web",
      fill: "@accent/60",
      cornerRadius: 1.6,
      rotation: 90,
      effects: { glow: { enabled: true, color: "@glow", strength: 14 } },
    }),
    shape("Decor — Chain", { x: 322, y: 0, width: 30, height: 300 }, {
      shape: "chain",
      fill: "@accent/85",
      effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
      animation: anim("wave", { duration: 6000, intensity: 0.5 }),
    }),
    icon("Decor — Skull", { x: 118, y: 862, width: 74, height: 74 }, "skull", {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
      animation: anim("float", { duration: 6400, intensity: 0.4 }),
    }),
    icon("Decor — Candle", { x: 1740, y: 852, width: 66, height: 66 }, "candle", {
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
      animation: anim("flicker", { duration: 2200 }),
    }),
  ],
  overlayDecor: () => [
    shape("Decor — Web left", { x: 0, y: 0, width: 260, height: 220 }, {
      shape: "web",
      fill: "@accent/45",
      cornerRadius: 1.4,
      effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
    }),
    shape("Decor — Web right", { x: 1660, y: 0, width: 260, height: 220 }, {
      shape: "web",
      fill: "@accent/40",
      cornerRadius: 1.4,
      rotation: 90,
      effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
    }),
    particles("Decor — Bats left", { kind: "bats", count: 3, size: 5, speed: 0.7, color: "@accent", opacity: 0.8, box: MARGIN_LEFT, effects: { glow: { enabled: true, color: "@glow", strength: 14 } } }),
    particles("Decor — Bats right", { kind: "bats", count: 3, size: 5, speed: 0.7, color: "@accent", opacity: 0.7, box: MARGIN_RIGHT, effects: { glow: { enabled: true, color: "@glow", strength: 14 } } }),
    particles("Decor — Ghost left", { kind: "ghosts", count: 1, size: 11, speed: 0.5, color: "@accent", box: MARGIN_LEFT, effects: { glow: { enabled: true, color: "@glow", strength: 22 } } }),
    particles("Decor — Ghost right", { kind: "ghosts", count: 1, size: 11, speed: 0.5, color: "@accent", box: MARGIN_RIGHT, effects: { glow: { enabled: true, color: "@glow", strength: 22 } } }),
  ],
};

/** Splash: thrown paint. Hard-edged paint splatters — an irregular blob with
    radiating tendrils, flung droplets and speckle — over a matte aerosol haze,
    each splat lit with the Plasma neon glow so the paint reads as wet and lit,
    not a bloomy orb. Marker-hand headline. Colour follows the palette. */
const SPLASH: FamilyStyle = {
  id: "splash",
  name: "Splash",
  tags: ["Neon", "Anime", "RGB"],
  display: "Permanent Marker",
  displayWeight: 400,
  displayTracking: 1,
  displayTransform: "uppercase",
  body: "Poppins",
  radius: 20,
  frameRadius: 20,
  corners: false,
  strokeWidth: 3,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 3, radius: 20 },
    glow: { enabled: true, color: "@glow", strength: 30 },
  },
  // Neon bloom + a stencil outline so the letters cut cleanly over the splats.
  headlineEffects: {
    border: { enabled: true, color: "@background", width: 3 },
    glow: { enabled: true, color: "@glow", strength: 28 },
  },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 135 } },
    }),
    // Matte aerosol haze behind the paint.
    // The aerosol haze breathes; the splats bloom and pulse with the glow so
    // the whole backdrop is alive rather than a frozen splatter.
    shape("Spray — A", { x: 80, y: 60, width: 1000, height: 900 }, { shape: "paintSpray", fill: "@primary", opacity: 0.18, animation: anim("breathe", { duration: 6800 }) }),
    shape("Spray — B", { x: 900, y: 280, width: 1000, height: 820 }, { shape: "paintSpray", fill: "@secondary", opacity: 0.16, animation: anim("breathe", { duration: 7600, delay: 600 }) }),
    // Four hard-edged paint splats hugging the corners, thin tendrils inward,
    // each blooming with the Plasma glow. Centre lane stays clear for the copy.
    shape("Splat A", { x: -40, y: -80, width: 860, height: 800 }, {
      shape: "paintSplat",
      fill: "@primary/85",
      effects: { glow: { enabled: true, color: "@primary", strength: 54 } },
      animation: anim("pulse", { duration: 5200, intensity: 0.7 }),
    }),
    shape("Splat B", { x: 1120, y: 400, width: 900, height: 820 }, {
      shape: "paintSplat",
      fill: "@secondary/82",
      effects: { glow: { enabled: true, color: "@secondary", strength: 50 } },
      animation: anim("pulse", { duration: 6000, intensity: 0.7, delay: 700 }),
    }),
    shape("Splat C", { x: 1360, y: -60, width: 560, height: 520 }, {
      shape: "paintSplat",
      fill: "@accent/85",
      effects: { glow: { enabled: true, color: "@accent", strength: 44 } },
      animation: anim("pulse", { duration: 4600, intensity: 0.8, delay: 300 }),
    }),
    shape("Splat D", { x: 60, y: 640, width: 560, height: 520 }, {
      shape: "paintSplat",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@accent", strength: 44 } },
      animation: anim("pulse", { duration: 5600, intensity: 0.8, delay: 1000 }),
    }),
    // Sparse flung droplets.
    particles("Decor — Flecks", { kind: "confetti", count: 22, size: 5, speed: 0.6, color: "@accent", opacity: 0.7 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

/** Riso Concrete: brutalist print-shop. A flat near-black page ruled like a
    proof sheet (heavy rules, crop marks, a breathing registration crosshair,
    a tick ruler) holding ONE mis-registered red block with a purple ghost and
    a halftone foot-bleed, under a giant hollow outlined headline. Matte, no
    glow. Near-black + off-white + one red. Expands across the abstract palettes. */
const RISO_CONCRETE: FamilyStyle = {
  id: "riso",
  name: "Riso Concrete",
  collection: "core",
  tags: ["Minimal", "Dark", "Red"],
  display: "Anton",
  displayFill: "@background",
  displayWeight: 400,
  displayTracking: 0,
  displayTransform: "uppercase",
  body: "Space Grotesk",
  radius: 0,
  frameRadius: 0,
  corners: false,
  strokeWidth: 3,
  frameEffects: { border: { enabled: true, color: "@text", width: 3, radius: 0 } },
  headlineEffects: { border: { enabled: true, color: "@text", width: 3 } },
  plateShape: "rect",
  socialPill: "@text/90",
  contentOffsetY: -40,
  scene: () => [
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    // A big colour halftone bleeding off the right edge — the riso ink wash,
    // now in the theme's accent so it carries real colour.
    shape("Halftone — accent", { x: 1180, y: 220, width: 820, height: 900 }, { shape: "halftoneField", fill: "@accent", opacity: 0.55 }),
    shape("Halftone — foot", { x: 120, y: 800, width: 460, height: 320 }, { shape: "halftoneField", fill: "@text", opacity: 0.12 }),
    shape("Scaffold — Rules", FULL, { shape: "printRules", fill: "@text", opacity: 0.5 }),
    // Overprinted colour blocks, slightly misregistered — the riso tell.
    shape("Block — accent", { x: 210, y: 150, width: 380, height: 220 }, { shape: "misprintBlock", fill: "@accent" }),
    shape("Block — ghost", { x: 250, y: 186, width: 380, height: 220 }, { shape: "misprintBlock", fill: "@secondary", opacity: 0.45 }),
    // Solid structural bars anchor the copy so it doesn't float in empty space.
    shape("Bar — top", { x: 210, y: 452, width: 900, height: 16 }, { fill: "@accent" }),
    shape("Bar — thin", { x: 210, y: 720, width: 560, height: 8 }, { fill: "@text/70" }),
    text("Index", { x: 150, y: 150, width: 40, height: 760 }, "NO.01 — LIVE FEED / {{CHANNEL_NAME}}", {
      fontFamily: "Space Grotesk",
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: 5,
      textTransform: "uppercase",
      fill: "@textSecondary",
      rotation: 90,
    }),
    text("Footer", { x: 210, y: 1000, width: 900, height: 30 }, "RISO / CONCRETE — PROOF SHEET", {
      fontFamily: "Space Grotesk",
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: 6,
      textTransform: "uppercase",
      fill: "@textSecondary",
    }),
    particles("Grain — Dots", { kind: "dots", count: 9, size: 2, color: "@text", opacity: 0.22, box: MARGIN_LEFT }),
  ],
  overlayDecor: () => [],
};

/** Aurora Silk: soft premium abstraction. Two large drifting aurora colour
    fields (violet/magenta) over a near-black ground, crossed by hot red silk
    ribbons that glow, with margin bokeh. Quiet, elegant. Near-black + off-white
    + rationed red. */
const AURORA_SILK: FamilyStyle = {
  id: "aurora-silk",
  name: "Aurora Silk",
  collection: "core",
  tags: ["Minimal", "Purple", "Dark"],
  display: "Space Grotesk",
  displayWeight: 500,
  displayTracking: 10,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 24,
  frameRadius: 24,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@text/30", width: 1, radius: 24 },
    glow: { enabled: true, color: "@glow", strength: 18 },
  },
  headlineEffects: {
    glow: { enabled: true, color: "@glow", strength: 18 },
    border: { enabled: true, color: "@text/30", width: 1 },
  },
  plateShape: "rect",
  socialPill: "@text/16",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/16", angle: 160 } },
    }),
    shape("Aurora Top", { x: 0, y: -200, width: 1920, height: 560 }, {
      shape: "auroraField",
      fill: "@primary",
      facetColors: ["@primary", "@secondary", "@accent"],
      opacity: 0.9,
      animation: anim("float", { duration: 14000, intensity: 0.2 }),
    }),
    shape("Aurora Bottom", { x: 0, y: 620, width: 1920, height: 600 }, {
      shape: "auroraField",
      fill: "@secondary",
      facetColors: ["@secondary", "@primary", "@accent"],
      opacity: 0.85,
    }),
    shape("Silk Hi", { x: -40, y: 120, width: 2000, height: 300 }, {
      shape: "silkRibbon",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
      opacity: 0.6,
    }),
    shape("Silk Lo", { x: -40, y: 720, width: 2000, height: 300 }, {
      shape: "silkRibbon",
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
      opacity: 0.5,
    }),
    particles("Bokeh L", { kind: "bokeh", count: 18, size: 5, speed: 0.15, color: "@accent", opacity: 0.35, box: MARGIN_LEFT }),
    particles("Bokeh R", { kind: "bokeh", count: 18, size: 5, speed: 0.15, color: "@accent", opacity: 0.35, box: MARGIN_RIGHT }),
    shape("Grain", FULL, { shape: "scanlines", fill: "@accent", opacity: 0.03 }),
  ],
  overlayDecor: () => [],
};

/** Aurora Silk — Neon: the glow variant. A heavy bloom veil, brighter aurora
    (bloom 2.3) and hot wide-glow silk ribbons — the same look, turned up. */
const AURORA_SILK_NEON: FamilyStyle = {
  ...AURORA_SILK,
  id: "aurora-neon",
  name: "Aurora Silk Neon",
  headlineEffects: {
    glow: { enabled: true, color: "@glow", strength: 40 },
    border: { enabled: true, color: "@text/40", width: 1.2 },
  },
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/22", angle: 160 } },
    }),
    shape("Neon Veil", FULL, { shape: "bloomVeil", fill: "@accent", facetColors: ["@accent", "@secondary"], opacity: 0.9 }),
    shape("Aurora Top", { x: 0, y: -200, width: 1920, height: 560 }, {
      shape: "auroraField",
      fill: "@primary",
      facetColors: ["@primary", "@secondary", "@accent", "@accent"],
      cornerRadius: 130,
      opacity: 1,
      animation: anim("float", { duration: 14000, intensity: 0.2 }),
    }),
    shape("Aurora Bottom", { x: 0, y: 620, width: 1920, height: 600 }, {
      shape: "auroraField",
      fill: "@secondary",
      facetColors: ["@secondary", "@primary", "@accent", "@accent"],
      cornerRadius: 130,
      opacity: 0.95,
    }),
    shape("Silk Hi", { x: -40, y: 120, width: 2000, height: 300 }, {
      shape: "silkRibbon",
      fill: "@accent",
      cornerRadius: 120,
      effects: { glow: { enabled: true, color: "@glow", strength: 64 } },
      opacity: 0.85,
    }),
    shape("Silk Lo", { x: -40, y: 720, width: 2000, height: 300 }, {
      shape: "silkRibbon",
      fill: "@accent",
      cornerRadius: 120,
      effects: { glow: { enabled: true, color: "@glow", strength: 55 } },
      opacity: 0.8,
    }),
    particles("Embers L", { kind: "bokeh", count: 20, size: 6, speed: 0.18, color: "@accent", opacity: 0.5, box: MARGIN_LEFT }),
    particles("Embers R", { kind: "bokeh", count: 20, size: 6, speed: 0.18, color: "@accent", opacity: 0.5, box: MARGIN_RIGHT }),
    shape("Grain", FULL, { shape: "scanlines", fill: "@accent", opacity: 0.04 }),
  ],
};

/** Three skewed diagonal strips (white / accent / white) crossing a corner,
    each with a soft drop shadow for the layered look. The top-left and
    bottom-right groups mirror so the two slants lean toward each other. */
function skewStrips(corner: "tl" | "br", glow = false): LayerSpec[] {
  const angle = -34;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = -dy;
  const py = dx;
  const bx = corner === "tl" ? 250 : 1670;
  const by = corner === "tl" ? 150 : 930;
  const dir = corner === "tl" ? 1 : -1;
  // Three equally-thick strips, white / accent / white, flush against each other.
  const cols = ["@text", "@accent", "@text"];
  const thick = 88;
  const len = 1800;
  const strips: LayerSpec[] = [];
  // The flat pack casts a soft drop shadow; the glow pack blooms instead. One
  // shadow-caster the size of the whole group, drawn behind the strips and
  // filled in the ground colour so it's invisible — only its drop shadow shows,
  // giving BOTH corners the same soft shadow.
  if (!glow) {
    const groupThick = cols.length * thick;
    const gPerp = (groupThick / 2) * dir;
    strips.push(shape(`Strip ${corner} shadow`, { x: bx + px * gPerp - len / 2, y: by + py * gPerp - groupThick / 2, width: len, height: groupThick }, {
      shape: "rect",
      fill: "@background",
      rotation: angle,
      effects: { shadow: { enabled: true, color: "#000000", blur: 42, opacity: 0.6, offsetX: 16, offsetY: 26 } },
    }));
  }
  for (let i = 0; i < cols.length; i++) {
    // Flush: each strip's centre is one full thickness from the last.
    const perp = (i * thick + thick / 2) * dir;
    const cx = bx + px * perp;
    const cy = by + py * perp;
    strips.push(shape(`Strip ${corner} ${i}`, { x: cx - len / 2, y: cy - thick / 2, width: len, height: thick }, {
      shape: "rect",
      fill: cols[i],
      rotation: angle,
      // Each strip glows in its own colour — white glows white, red glows red.
      // Strong for the neon pack, a faint edge sheen for the flat pack.
      effects: { glow: { enabled: true, color: cols[i], strength: glow ? 30 : 9 } },
      // Motion lives on the strips: the glow breathes, staggered so a soft wave
      // of light travels across the group.
      animation: anim("glow", { duration: 3200, delay: i * 420, intensity: glow ? 1 : 0.7 }),
    }));
  }
  return strips;
}

/** Vanguard: a clean broadcast look — a charcoal ground with three skewed
    diagonal strips (white / accent / white) crossing the top-left and
    bottom-right corners, leaning toward each other, and a big bordered box in
    the middle that holds the copy. Colour follows the palette. */
const VANGUARD: FamilyStyle = {
  id: "vanguard",
  name: "Vanguard",
  tags: ["Esports", "Minimal", "Red"],
  display: "Bebas Neue",
  displayWeight: 400,
  displayTracking: 5,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 6,
  frameRadius: 8,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 12 },
  },
  headlineEffects: { shadow: { enabled: true, color: "#000000", blur: 18, opacity: 0.5, offsetX: 0, offsetY: 6 } },
  plateShape: "rect",
  // A light social pill so the icons read on the charcoal ground.
  socialPill: "@text/18",
  scene: () => [
    // A flat charcoal ground (#353535 on the Vanguard palette) — not near-black.
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    ...skewStrips("tl"),
    ...skewStrips("br"),
  ],
  overlayDecor: () => [...skewStrips("tl"), ...skewStrips("br")],
  contentOffsetY: 0,
};

/** Vanguard Glow: the same strips, but each blooms in neon instead of casting a
    drop shadow, with a glowing headline. */
const VANGUARD_GLOW: FamilyStyle = {
  ...VANGUARD,
  id: "vanguardglow",
  name: "Vanguard Glow",
  tags: ["Esports", "Neon", "Red"],
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 24 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  scene: () => [
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    ...skewStrips("tl", true),
    ...skewStrips("br", true),
  ],
  overlayDecor: () => [...skewStrips("tl", true), ...skewStrips("br", true)],
};

/** The Vanguard strips as flowing waves: three flush parallel S-curve ribbons
    (white / accent / white) crossing a corner, each casting a soft drop shadow
    (or blooming, in the glow pack). Same two-corner, lean-toward-each-other. */
function waveStrips(corner: "tl" | "br", glow = false): LayerSpec[] {
  const angle = -30;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = -dy;
  const py = dx;
  const bx = corner === "tl" ? 250 : 1670;
  const by = corner === "tl" ? 180 : 900;
  const dir = corner === "tl" ? 1 : -1;
  const cols = ["@text", "@accent", "@text"];
  const thick = 82;
  const waveH = thick / 0.34; // the wave stroke is 0.34× the box height
  const len = 2100;
  const strips: LayerSpec[] = [];
  for (let i = 0; i < cols.length; i++) {
    const perp = (i * thick + thick / 2) * dir;
    const cx = bx + px * perp;
    const cy = by + py * perp;
    strips.push(shape(`Wave ${corner} ${i}`, { x: cx - len / 2, y: cy - waveH / 2, width: len, height: waveH }, {
      shape: "wave",
      fill: cols[i],
      rotation: angle,
      // A clean edge sheen (strong in the glow pack, faint in the flat one) —
      // the heavy drop shadow just muddied the waves.
      effects: { glow: { enabled: true, color: glow ? cols[i] : "@glow", strength: glow ? 30 : 10 } },
      animation: anim("glow", { duration: 3200, delay: i * 420, intensity: glow ? 1 : 0.7 }),
    }));
  }
  return strips;
}

/** Vanguard Wave: the same charcoal broadcast look, but the corner strips flow
    as waves instead of straight diagonals. */
const VANGUARD_WAVE: FamilyStyle = {
  ...VANGUARD,
  id: "vanguardwave",
  name: "Vanguard Wave",
  scene: () => [
    shape("Backdrop", FULL, { background: true, fill: "@background" }),
    ...waveStrips("tl"),
    ...waveStrips("br"),
  ],
  overlayDecor: () => [...waveStrips("tl"), ...waveStrips("br")],
};

/** Concentric ring outlines centred on a corner, so only the in-frame quarter
    shows — radar arcs radiating from the corner. A staggered glow pulse sends a
    wave of light sweeping outward. */
function radarArcs(corner: "tl" | "br", color: string): LayerSpec[] {
  const cx = corner === "tl" ? 0 : 1920;
  const cy = corner === "tl" ? 0 : 1080;
  const N = 6;
  const arcs: LayerSpec[] = [];
  for (let i = 0; i < N; i++) {
    const r = 240 + i * 190;
    arcs.push(shape(`Arc ${corner} ${i}`, { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }, {
      shape: "ellipse",
      fill: "transparent",
      effects: {
        border: { enabled: true, color, width: i % 2 === 0 ? 5 : 2, radius: r },
        glow: { enabled: true, color: "@glow", strength: 16 },
      },
      animation: anim("glow", { duration: 3000, delay: i * 260, intensity: 1 }),
    }));
  }
  return arcs;
}

/** Radar: concentric neon arcs sweep out of two opposite corners over a dark
    ground — a radar / sound-wave pulse. Colour follows the palette. */
const RADAR: FamilyStyle = {
  id: "radar",
  name: "Radar",
  tags: ["Esports", "Sci-Fi", "Neon"],
  display: "Exo 2",
  displayWeight: 800,
  displayTracking: 3,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 8,
  frameRadius: 10,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 10 },
    glow: { enabled: true, color: "@glow", strength: 22 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 28 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/18", angle: 150 } },
    }),
    ...radarArcs("tl", "@secondary"),
    ...radarArcs("br", "@accent"),
    // A dark pool keeps the centre lane legible for the copy.
    shape("Centre dim", { x: 360, y: 320, width: 1200, height: 460 }, {
      shape: "ellipse",
      fill: "@background",
      opacity: 0.6,
      effects: { blur: { enabled: true, amount: 70 } },
    }),
    particles("Decor — Dust", { kind: "dots", count: 36, size: 2.4, speed: 0.4, color: "@glow", opacity: 0.4 }),
  ],
  overlayDecor: () => [...radarArcs("tl", "@secondary").slice(0, 4), ...radarArcs("br", "@accent").slice(0, 4)],
  contentOffsetY: 0,
};

/** A field of parallel wavy lines — topographic contours flowing across the
    frame. Most are a quiet secondary; every fourth is a brighter accent. Each
    undulates on its own rhythm. */
function contourLines(): LayerSpec[] {
  const lines: LayerSpec[] = [];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const y = -30 + i * 100;
    const accent = i % 4 === 0;
    lines.push(shape(`Contour ${i}`, { x: -120, y, width: 2160, height: 46 }, {
      shape: "wave",
      fill: accent ? "@accent" : "@secondary/70",
      opacity: accent ? 0.85 : 0.45,
      effects: { glow: { enabled: true, color: "@glow", strength: accent ? 16 : 7 } },
      animation: anim("wave", { duration: 6000 + i * 280, intensity: 0.9 }),
    }));
  }
  return lines;
}

/** Contour: a calm field of flowing topographic lines over a soft dark ground.
    Colour follows the palette. */
const CONTOUR: FamilyStyle = {
  id: "contour",
  name: "Contour",
  tags: ["Minimal", "Sci-Fi", "Dark"],
  display: "Poppins",
  displayWeight: 600,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Inter",
  radius: 14,
  frameRadius: 16,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 16 },
    glow: { enabled: true, color: "@glow", strength: 16 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 22 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@surface", angle: 160 } },
    }),
    ...contourLines(),
    // A dark pool behind the copy keeps it legible where lines cross.
    shape("Centre dim", { x: 320, y: 320, width: 1280, height: 460 }, {
      shape: "ellipse",
      fill: "@background",
      opacity: 0.68,
      effects: { blur: { enabled: true, amount: 80 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 30, size: 2, speed: 0.12, color: "@accent", opacity: 0.5 }),
  ],
  overlayDecor: () => contourLines(),
  contentOffsetY: 0,
};

/** A single chevron ("&gt;" or "&lt;") — two capsule arms meeting at a vertex. */
function chevron(prefix: string, px: number, py: number, L: number, thick: number, color: string, pointRight: boolean, delay: number): LayerSpec[] {
  const rad = Math.PI / 180;
  const angs = pointRight ? [220, 140] : [320, 40];
  return angs.map((deg, k) => {
    const a = deg * rad;
    const cx = px + Math.cos(a) * (L / 2);
    const cy = py + Math.sin(a) * (L / 2);
    return shape(`${prefix} ${k}`, { x: cx - L / 2, y: cy - thick / 2, width: L, height: thick }, {
      shape: "rect",
      fill: color,
      rotation: deg,
      cornerRadius: thick / 2,
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      animation: anim("glow", { duration: 2400, delay, intensity: 1 }),
    });
  });
}

/** A vertical stack of chevrons pointing toward the centre — the two columns
    lean in from opposite sides. A sequential glow pulse reads as speed. */
function chevronColumn(side: "L" | "R", color: string): LayerSpec[] {
  const pointRight = side === "L";
  const px = side === "L" ? 360 : 1560;
  const out: LayerSpec[] = [];
  const N = 6;
  for (let i = 0; i < N; i++) {
    const py = 175 + i * 148;
    const thick = i % 2 ? 24 : 44;
    out.push(...chevron(`Chev ${side} ${i}`, px, py, 210, thick, color, pointRight, i * 170));
  }
  return out;
}

/** Chevron: two columns of neon chevrons race in from the sides toward the copy
    over a dark ground. Colour follows the palette. */
const CHEVRON: FamilyStyle = {
  id: "chevron",
  name: "Chevron",
  tags: ["Esports", "Neon", "Dark"],
  display: "Orbitron",
  displayWeight: 800,
  displayTracking: 3,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 6,
  frameRadius: 8,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 22 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 28 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/18", angle: 90 } },
    }),
    ...chevronColumn("L", "@secondary"),
    ...chevronColumn("R", "@accent"),
    particles("Decor — Sparks", { kind: "embers", count: 16, size: 2, speed: 0.6, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [...chevronColumn("L", "@secondary"), ...chevronColumn("R", "@accent")],
  contentOffsetY: 0,
};

/** A circuit trace: right-angle segments through a list of points, with a
    glowing node at every vertex that pulses like data on the line. */
function circuitTrace(prefix: string, pts: [number, number][], color: string, delay: number): LayerSpec[] {
  const thick = 5;
  const out: LayerSpec[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (y0 === y1) {
      out.push(shape(`${prefix} s${i}`, { x: Math.min(x0, x1), y: y0 - thick / 2, width: Math.abs(x1 - x0), height: thick }, {
        shape: "rect",
        fill: color,
        effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
      }));
    } else {
      out.push(shape(`${prefix} s${i}`, { x: x0 - thick / 2, y: Math.min(y0, y1), width: thick, height: Math.abs(y1 - y0) }, {
        shape: "rect",
        fill: color,
        effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
      }));
    }
  }
  pts.forEach(([x, y], j) => {
    out.push(shape(`${prefix} n${j}`, { x: x - 10, y: y - 10, width: 20, height: 20 }, {
      shape: "ellipse",
      fill: color,
      effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
      animation: anim("glow", { duration: 2600, delay: delay + j * 220, intensity: 1 }),
    }));
  });
  return out;
}

/** Circuit traces routed around the edges, centre left clear for the copy. */
function circuitField(): LayerSpec[] {
  const traces: Array<{ pts: [number, number][]; color: string }> = [
    { pts: [[0, 180], [300, 180], [300, 60]], color: "@secondary" },
    { pts: [[0, 330], [200, 330], [200, 520], [430, 520]], color: "@accent" },
    { pts: [[80, 1080], [80, 820], [380, 820]], color: "@secondary" },
    { pts: [[1920, 900], [1620, 900], [1620, 1020]], color: "@secondary" },
    { pts: [[1920, 760], [1720, 760], [1720, 560], [1490, 560]], color: "@accent" },
    { pts: [[1840, 120], [1840, 360], [1560, 360]], color: "@accent" },
  ];
  return traces.flatMap((t, i) => circuitTrace(`Trace ${i}`, t.pts, t.color, i * 260));
}

/** Circuit: glowing right-angle traces and pulsing nodes route around the edges
    like a circuit board. Colour follows the palette. */
const CIRCUIT: FamilyStyle = {
  id: "circuit",
  name: "Circuit",
  tags: ["Sci-Fi", "Neon", "Esports"],
  display: "Rajdhani",
  displayWeight: 700,
  displayTracking: 4,
  displayTransform: "uppercase",
  body: "Rajdhani",
  radius: 6,
  frameRadius: 8,
  corners: false,
  strokeWidth: 2,
  frameEffects: {
    border: { enabled: true, color: "@accent", width: 2, radius: 8 },
    glow: { enabled: true, color: "@glow", strength: 22 },
  },
  headlineEffects: { glow: { enabled: true, color: "@glow", strength: 26 } },
  plateShape: "rect",
  scene: () => [
    shape("Backdrop", FULL, {
      background: true,
      fill: "@background",
      effects: { gradient: { enabled: true, from: "@background", to: "@primary/16", angle: 135 } },
    }),
    shape("Decor — Hex mesh", FULL, { shape: "hexmesh", fill: "@secondary/10" }),
    ...circuitField(),
    particles("Decor — Dust", { kind: "dots", count: 30, size: 2, speed: 0.4, color: "@glow", opacity: 0.35 }),
  ],
  overlayDecor: () => circuitField(),
  contentOffsetY: 0,
};

const NEW_FAMILIES: FamilyStyle[] = [
  RADAR,
  CONTOUR,
  CHEVRON,
  CIRCUIT,
  HALLOWED_NIGHT,
  ASTRAL_DECK,
  PIXEL_WINDOWS,
  COZY_CLOUDS,
  HOLO_GLASS,
  STARLIT_SERENITY,
  OVERDRIVE,
  LIQUID_NEON,
  HEX_STORM,
  MOONLIT_GROVE,
  WITCHING_HOUR,
  GOTHIC_ROSE,
  PLASMA,
  AURORA,
  NEBULA,
  SILK,
  FROST,
  LIQUID_GLASS,
  PRISM,
  CRYSTAL,
  MECHA,
  CYBER_PILL,
  SPLASH,
  SPECTRAL_GLOW,
];

const GENERATED_FAMILY_TEMPLATES: BaseTemplate[] = NEW_FAMILIES.flatMap(familyScreens);

// Abstract families expand across their own near-black identity palettes: Riso
// Concrete flies the red proof-sheet palette, the Aurora Silk pair the violet one.
const RISO_PALETTES = ABSTRACT_PALETTES.filter((p) => p.id.includes("riso"));
const AURORA_PALETTES = ABSTRACT_PALETTES.filter((p) => p.id.includes("aurora"));
// Aurora Silk is drawn entirely from theme tokens, so it works in any palette —
// expand it across the full core set (plus its own signature aurora palette) so
// it comes in every colour like the other families, not just one.
const AURORA_SILK_PALETTES = [...CORE_PALETTES, ...AURORA_PALETTES];
const RISO_CONCRETE_PALETTES = [...CORE_PALETTES, ...RISO_PALETTES];
// Vanguard comes in every colour like the rest — the full core set plus its own
// signature charcoal palettes (Vanguard Red is the reference). Those signature
// palettes are also pickable for any other design from the palette menu.
const VANGUARD_PALETTES = [
  ...CORE_PALETTES,
  ...ABSTRACT_PALETTES.filter((p) => p.id.includes("vanguard")),
];
const ABSTRACT_TEMPLATES: Template[] = [
  ...expand([...familyScreens(VANGUARD), ...familyScreens(VANGUARD_GLOW), ...familyScreens(VANGUARD_WAVE)], VANGUARD_PALETTES),
  ...expand(familyScreens(RISO_CONCRETE), RISO_CONCRETE_PALETTES),
  ...expand([...familyScreens(AURORA_SILK), ...familyScreens(AURORA_SILK_NEON)], AURORA_SILK_PALETTES),
];

// The pride glass families — glossy Prism Flag and matte Frost Flag — expanded
// (below) across the prism palettes only, so every flag comes in both finishes.
const PRISM_PRIDE_TEMPLATES: BaseTemplate[] = [
  ...familyScreens(PRISM_FLAG),
  ...familyScreens(FROST_FLAG),
  ...familyScreens(PRISM_STRIPES),
  ...familyScreens(FROST_STRIPES),
  ...familyScreens(PLASMA_FLAG),
];

/* -------------------------------------------------------------------------- */
/*                            Gothic design family                            */
/* -------------------------------------------------------------------------- */

/**
 * One design language, eleven screens. Expanding the family across the ten
 * gothic palettes yields ten complete packs — pick "Midnight Cathedral" and
 * every screen from Starting Soon to the subscriber alert exists in that
 * identity.
 *
 * Family rules (why packs read as one series):
 *  - Type: Cinzel Decorative for display, UnifrakturMaguntia for the channel
 *    mark on scenes, IM Fell English SC for flavour lines, Inter for UI text.
 *  - Shape: square-ish corners (4–12px), ornament hairlines under bars.
 *  - Motion: persistent widgets glow/float in place; alerts enter.
 *  - Decor layers are named "Decor — …" so they toggle in the Layers panel.
 */
const GOTHIC_TEMPLATES: BaseTemplate[] = [
  {
    id: "gothic-starting-soon",
    name: "Starting Soon",
    category: "Starting Soon",
    tags: ["Fantasy"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      shape("Decor — Moon", { x: 830, y: 150, width: 220, height: 220 }, {
        shape: "moon",
        moonPhase: 1,
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 80 } },
        animation: anim("float", { duration: 6000, intensity: 0.6 }),
      }),
      particles("Decor — Bats", { kind: "bats", count: 9, size: 6, speed: 0.8, color: "@secondary", opacity: 0.7 }),
      text("Headline", { x: 260, y: 520, width: 1400, height: 130 }, "STARTING SOON", {
        fontFamily: "Cinzel Decorative",
        fontSize: 96,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 10,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("fade", { duration: 1400 }),
      }),
      text("Channel name", { x: 360, y: 680, width: 1200, height: 90 }, "{{CHANNEL_NAME}}", {
        fontFamily: "UnifrakturMaguntia",
        fontSize: 68,
        fontWeight: 400,
        align: "center",
        fill: "@accent",
        animation: anim("fade", { duration: 1200, delay: 500 }),
      }),
      text("Slogan", { x: 360, y: 800, width: 1200, height: 44 }, "{{SLOGAN}}", {
        fontFamily: "IM Fell English SC",
        fontSize: 28,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1200, delay: 800 }),
      }),
      social("Socials", { x: 460, y: 930, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 1100 }),
      }),
    ],
  },

  {
    id: "gothic-brb",
    name: "Be Right Back",
    category: "BRB",
    tags: ["Fantasy", "Purple"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      shape("Decor — Phase 1", { x: 580, y: 245, width: 50, height: 50 }, {
        shape: "moon", moonPhase: 0.14, craters: false, fill: "@accent/70",
      }),
      shape("Decor — Phase 2", { x: 700, y: 235, width: 70, height: 70 }, {
        shape: "moon", moonPhase: 0.4, craters: false, fill: "@accent/85",
      }),
      shape("Decor — Full moon", { x: 840, y: 200, width: 140, height: 140 }, {
        shape: "moon",
        moonPhase: 1,
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 70 } },
        animation: anim("pulse", { duration: 5200, intensity: 0.7 }),
      }),
      shape("Decor — Phase 4", { x: 1150, y: 235, width: 70, height: 70 }, {
        shape: "moon", moonPhase: 0.6, craters: false, fill: "@accent/85",
      }),
      shape("Decor — Phase 5", { x: 1290, y: 245, width: 50, height: 50 }, {
        shape: "moon", moonPhase: 0.86, craters: false, fill: "@accent/70",
      }),
      text("Headline", { x: 260, y: 520, width: 1400, height: 120 }, "BE RIGHT BACK", {
        fontFamily: "Cinzel Decorative",
        fontSize: 92,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 8,
        effects: { glow: { enabled: true, color: "@glow", strength: 26 } },
        animation: anim("fade", { duration: 1400 }),
      }),
      text("Sub", { x: 360, y: 670, width: 1200, height: 44 }, "{{CHANNEL_NAME}} is brewing something", {
        fontFamily: "IM Fell English SC",
        fontSize: 30,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1200, delay: 500 }),
      }),
      social("Socials", { x: 560, y: 880, width: 800, height: 56 }, {
        platforms: ["twitch", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 900 }),
      }),
    ],
  },

  {
    id: "gothic-ending",
    name: "Stream Ending",
    category: "Stream Ending",
    tags: ["Fantasy", "Dark"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      particles("Decor — Petals", { kind: "petals", count: 20, size: 6, speed: 0.5, color: "@primary", opacity: 0.7 }),
      particles("Decor — Candlelight", { kind: "embers", count: 16, size: 3, speed: 0.4, color: "@accent", opacity: 0.6 }),
      text("Headline", { x: 260, y: 380, width: 1400, height: 120 }, "THANK YOU FOR WATCHING", {
        fontFamily: "Cinzel Decorative",
        fontSize: 76,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 6,
        effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
        animation: anim("fade", { duration: 1500 }),
      }),
      text("Channel name", { x: 360, y: 540, width: 1200, height: 90 }, "{{CHANNEL_NAME}}", {
        fontFamily: "UnifrakturMaguntia",
        fontSize: 64,
        fontWeight: 400,
        align: "center",
        fill: "@accent",
        animation: anim("fade", { duration: 1300, delay: 500 }),
      }),
      social("Socials", { x: 460, y: 740, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "instagram", "discord", "x"],
        animation: anim("fade", { duration: 1100, delay: 900 }),
      }),
    ],
  },

  {
    id: "gothic-offline",
    name: "Offline",
    category: "Offline",
    tags: ["Dark", "Minimal"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      img("Logo", { x: 860, y: 250, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("float", { duration: 6000, intensity: 0.5 }),
      }),
      text("Headline", { x: 310, y: 520, width: 1300, height: 130 }, "OFFLINE", {
        fontFamily: "Cinzel Decorative",
        fontSize: 104,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 16,
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("fade", { duration: 1600 }),
      }),
      text("Sub", { x: 360, y: 690, width: 1200, height: 44 }, "{{CHANNEL_NAME}} shall return after dark", {
        fontFamily: "IM Fell English SC",
        fontSize: 28,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1300, delay: 400 }),
      }),
      social("Socials", { x: 510, y: 880, width: 900, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 800 }),
      }),
    ],
  },

  {
    id: "gothic-gameplay",
    name: "Gameplay",
    category: "Gameplay",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 78 }, {
        fill: "@surface/90",
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      shape("Ornament line", { x: 0, y: 78, width: 1920, height: 3 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 20 } },
        animation: anim("shimmer", { duration: 4200 }),
      }),
      img("Logo", { x: 30, y: 15, width: 48, height: 48 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 94, y: 18, width: 600, height: 42 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Cinzel Decorative",
        fontSize: 30,
        fontWeight: 700,
        fill: "@text",
        letterSpacing: 3,
        textTransform: "uppercase",
      }),
      text("Slogan", { x: 96, y: 54, width: 600, height: 22 }, "{{SLOGAN}}", {
        fontFamily: "IM Fell English SC",
        fontSize: 15,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      particles("Decor — Bats", { kind: "bats", count: 7, size: 5, speed: 0.7, color: "@primary", opacity: 0.55 }),
      particles("Decor — Petals", { kind: "petals", count: 14, size: 5, speed: 0.6, color: "@accent", opacity: 0.5 }),
      frame("Webcam", { x: 40, y: 660, width: 480, height: 270 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 4,
        cornerRadius: 10,
        effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
        animation: anim("glow", { duration: 3600 }),
      }),
      chatbox("Chat", { x: 1510, y: 130, width: 370, height: 590 }, {
        cornerRadius: 12,
        rows: 7,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 12 } },
      }),
      social("Socials", { x: 620, y: 984, width: 680, height: 52 }, {
        platforms: ["twitch", "discord", "instagram", "x"],
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
    ],
  },

  {
    id: "gothic-chatting",
    name: "Just Chatting",
    category: "Just Chatting",
    tags: ["Cozy"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      particles("Decor — Moths", { kind: "moths", count: 8, size: 5, speed: 0.8, color: "@primary", opacity: 0.75 }),
      frame("Webcam", { x: 90, y: 140, width: 1020, height: 574 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 6,
        cornerRadius: 12,
        effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      shape("Name plate", { x: 90, y: 760, width: 640, height: 84 }, {
        fill: "@surface/85",
        cornerRadius: 8,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 8 } },
      }),
      text("Display name", { x: 130, y: 778, width: 560, height: 50 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Cinzel Decorative",
        fontSize: 40,
        fontWeight: 700,
        fill: "@text",
      }),
      text("Slogan", { x: 92, y: 870, width: 900, height: 36 }, "{{SLOGAN}}", {
        fontFamily: "IM Fell English SC",
        fontSize: 24,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      chatbox("Chat", { x: 1180, y: 140, width: 650, height: 740 }, {
        cornerRadius: 12,
        rows: 9,
        usernameColor: "@accent",
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 12 } },
      }),
      social("Socials", { x: 90, y: 950, width: 1000, height: 56 }, {
        platforms: ["twitch", "tiktok", "instagram", "discord"],
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
    ],
  },

  {
    id: "gothic-webcam",
    name: "Webcam Frame",
    category: "Webcam Frames",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      particles("Decor — Petals", { kind: "petals", count: 16, size: 6, speed: 0.6, color: "@primary", opacity: 0.65 }),
      frame("Decor — Outer lace", { x: 300, y: 100, width: 1320, height: 760 }, {
        fill: "transparent",
        strokeColor: "@border",
        strokeWidth: 1,
        cornerRadius: 14,
      }),
      frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 5,
        cornerRadius: 10,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      shape("Name plate", { x: 660, y: 880, width: 600, height: 72 }, {
        fill: "@surface/90",
        cornerRadius: 8,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 8 } },
      }),
      text("Display name", { x: 660, y: 896, width: 600, height: 44 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Cinzel Decorative",
        fontSize: 34,
        fontWeight: 700,
        align: "center",
        fill: "@text",
      }),
    ],
  },

  {
    id: "gothic-chatbox",
    name: "Chat Box",
    category: "Chat Boxes",
    tags: ["Dark", "Minimal"],
    collection: "gothic",
    layers: [
      particles("Decor — Moths", { kind: "moths", count: 4, size: 4, speed: 0.6, color: "@accent", opacity: 0.5 }),
      text("Chat title", { x: 1400, y: 58, width: 460, height: 46 }, "CHAT", {
        fontFamily: "Cinzel Decorative",
        fontSize: 28,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 10,
        animation: anim("fade", { duration: 800 }),
      }),
      shape("Ornament line", { x: 1430, y: 108, width: 400, height: 2 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 12 } },
        animation: anim("shimmer", { duration: 4600 }),
      }),
      chatbox("Chat", { x: 1400, y: 130, width: 460, height: 830 }, {
        cornerRadius: 12,
        rows: 10,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 12 } },
      }),
    ],
  },

  {
    id: "gothic-follower",
    name: "Follower Alert",
    category: "Alerts",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      particles("Decor — Ravens", { kind: "bats", count: 10, size: 6, speed: 1.0, color: "@primary", opacity: 0.65 }),
      alert("Follower alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW FOLLOWER", "AwesomeViewer", {
        fontFamily: "Cinzel Decorative",
        cornerRadius: 10,
        boxShape: "coffin",
        titleColor: "@accent",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 36 },
          border: { enabled: true, color: "@border", width: 1, radius: 10 },
        },
        animation: anim("bounce", { duration: 1400 }),
      }),
    ],
  },

  {
    id: "gothic-subscriber",
    name: "Subscriber Alert",
    category: "Alerts",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      particles("Decor — Petals", { kind: "petals", count: 18, size: 6, speed: 1.2, color: "@accent", opacity: 0.7 }),
      alert("Subscriber alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW SUBSCRIBER", "Welcome to the coven", {
        fontFamily: "Cinzel Decorative",
        cornerRadius: 10,
        boxShape: "coffin",
        avatar: false,
        // Stays on the dark plate so it reads as gothic, not a bright slab.
        // Accent title is contrast-gated against the background, and surface
        // tracks the background's darkness, so it's readable in every palette.
        fill: "@surface/95",
        titleColor: "@accent",
        subtitleColor: "@text",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 46 },
          border: { enabled: true, color: "@accent", width: 2, radius: 10 },
        },
        animation: anim("elastic", { duration: 1500 }),
      }),
    ],
  },

  {
    id: "gothic-goals",
    name: "Goals",
    category: "Goals",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      goal("Follower ring", { x: 150, y: 380, width: 360, height: 360 }, "FOLLOWERS", 847, 1000, {
        goalStyle: "ring",
        fontFamily: "Cinzel Decorative",
        barColor: "@accent",
        trackColor: "@surface/60",
        effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
      goal("Sub goal", { x: 560, y: 430, width: 760, height: 150 }, "SUB GOAL", 62, 100, {
        goalStyle: "bar",
        barShape: "coffin",
        fill: "@surface/88",
        fontFamily: "Cinzel Decorative",
        barColor: "@accent",
        cornerRadius: 10,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 22 },
          border: { enabled: true, color: "@border", width: 1, radius: 10 },
        },
        animation: anim("slide", { direction: "right", duration: 700 }),
      }),
      goal("Donation goal", { x: 560, y: 610, width: 760, height: 150 }, "DONATION GOAL", 340, 500, {
        goalStyle: "bar",
        barShape: "coffin",
        fill: "@surface/88",
        fontFamily: "Cinzel Decorative",
        barColor: "@primary",
        cornerRadius: 10,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 22 },
          border: { enabled: true, color: "@border", width: 1, radius: 10 },
        },
        animation: anim("slide", { direction: "right", duration: 700, delay: 160 }),
      }),
    ],
  },

  {
    id: "gothic-socialbar",
    name: "Social Bar",
    category: "Social Bars",
    tags: ["Dark", "Minimal"],
    collection: "gothic",
    layers: [
      shape("Ornament line", { x: 460, y: 948, width: 1000, height: 2 }, {
        fill: "@accent/60",
        animation: anim("shimmer", { duration: 5200 }),
      }),
      social("Socials", { x: 460, y: 964, width: 1000, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        pill: true,
        pillColor: "@surface/90",
        gap: 20,
        fontSize: 22,
        animation: anim("fade", { duration: 900 }),
      }),
    ],
  },
  {
    id: "gothic-pause",
    name: "Pause",
    category: "Pause",
    tags: ["Dark", "Minimal"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      text("Headline", { x: 310, y: 460, width: 1300, height: 130 }, "STREAM ON PAUSE", {
        fontFamily: "Cinzel Decorative",
        fontSize: 92,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 12,
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("fade", { duration: 1600 }),
      }),
      text("Sub", { x: 360, y: 620, width: 1200, height: 44 }, "The ritual pauses — back shortly", {
        fontFamily: "IM Fell English SC",
        fontSize: 28,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1300, delay: 400 }),
      }),
      social("Socials", { x: 510, y: 800, width: 900, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 800 }),
      }),
    ],
  },
  {
    id: "gothic-intermission",
    name: "Intermission",
    category: "Intermission",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      ...gothicScene(),
      text("Label", { x: 120, y: 110, width: 700, height: 50 }, "INTERMISSION", {
        fontFamily: "Cinzel Decorative",
        fontSize: 34,
        fontWeight: 700,
        fill: "@accent",
        letterSpacing: 8,
        animation: anim("fade", { duration: 900 }),
      }),
      frame("Webcam", { x: 120, y: 190, width: 1080, height: 608 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 4,
        cornerRadius: 10,
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      chatbox("Chat", { x: 1260, y: 190, width: 540, height: 608 }, {
        boxShape: "coffin",
        cornerRadius: 12,
        rows: 8,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 12 } },
      }),
      social("Socials", { x: 120, y: 862, width: 1000, height: 56 }, {
        platforms: ["twitch", "discord", "instagram"],
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },
  {
    id: "gothic-events",
    name: "Event Badges",
    category: "Social Bars",
    tags: ["Dark"],
    collection: "gothic",
    layers: [
      ...["Recent sub", "Top donator", "Recent donator", "Recent follower"].map((label, i) =>
        chip(label, { x: 60, y: 300 + i * 76, width: 420, height: 52 }, label, "pixel_wren", {
          fontFamily: "Inter",
          cornerRadius: 10,
          effects: { border: { enabled: true, color: "@border", width: 1, radius: 10 } },
          animation: anim("slide", { direction: "left", duration: 700, delay: i * 120 }),
        }),
      ),
    ],
  },
  {
    id: "gothic-panels",
    name: "Stream Panels",
    category: "Stream Panels",
    tags: ["Dark", "Minimal"],
    collection: "gothic",
    layers: [
      ...["ABOUT ME", "COMMANDS", "DONATE", "DISCORD", "LINKS", "MERCH"].flatMap((label, i) => {
        const x = 160 + (i % 3) * 560;
        const y = 260 + Math.floor(i / 3) * 300;
        return [
          shape(`Panel ${i + 1}`, { x, y, width: 480, height: 160 }, {
            fill: "@surface/92",
            cornerRadius: 12,
            effects: {
              border: { enabled: true, color: "@border", width: 1, radius: 12 },
              glow: { enabled: true, color: "@glow", strength: 14 },
            },
          }),
          text(`Panel label ${i + 1}`, { x, y: y + 55, width: 480, height: 56 }, label, {
            fontFamily: "Cinzel Decorative",
            fontSize: 34,
            fontWeight: 700,
            align: "center",
            fill: "@text",
            letterSpacing: 4,
          }),
        ];
      }),
    ],
  },

  {
    id: "gothic-stinger",
    name: "Stinger — Gothic Ghost",
    category: "Stinger Transitions",
    tags: ["Fantasy", "Dark"],
    collection: "gothic",
    // Over a transparent background a ghost comes in small, swells to fill the
    // frame at the mid peak (the OBS transition point), then shrinks away and
    // vanishes so the next scene shows through. No cover, no text.
    layers: [
      shape("Ghost", { x: 610, y: 190, width: 700, height: 700 }, {
        shape: "ghost",
        fill: "@accent",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 40 },
          border: { enabled: true, color: "@text", width: 4, radius: 0 },
        },
        animation: anim("sweepScale", { duration: 1700, intensity: 2.4, easing: "linear" }),
      }),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                             Pride design family                            */
/* -------------------------------------------------------------------------- */

/**
 * Modern, soft, celebratory. Family rules: rounded glass panels (radius
 * 20–28, `@surface` fills with hairline borders), a gradient ribbon as the
 * signature ornament, Poppins display over Inter body, and decor drawn from
 * confetti/hearts/rays/stars particles. Not limited to rainbow colours — the
 * palette carries the flag identity.
 */
const PRIDE_TEMPLATES: BaseTemplate[] = [
  {
    id: "pride-starting-soon",
    name: "Starting Soon",
    category: "Starting Soon",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      particles("Decor — Light rays", { kind: "rays", count: 7, size: 5, speed: 1, color: "@glow" }),
      particles("Decor — Confetti", { kind: "confetti", count: 24, size: 5, speed: 0.5, color: "@accent", opacity: 0.75 }),
      text("Headline", { x: 210, y: 430, width: 1500, height: 140 }, "STARTING SOON", {
        fontFamily: "Poppins",
        fontSize: 110,
        fontWeight: 800,
        align: "center",
        fill: "@text",
        fillStripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
        letterSpacing: 4,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 18, offsetY: 6, opacity: 0.8 } },
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
      flag("Decor — Pride flag", { x: 610, y: 592, width: 700, height: 16 }, {
        cornerRadius: 8,
        effects: { glow: { enabled: true, color: "@glow", strength: 16 } },
        animation: anim("shimmer", { duration: 3600 }),
      }),
      text("Channel name", { x: 310, y: 650, width: 1300, height: 76 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Poppins",
        fontSize: 54,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
      text("Slogan", { x: 360, y: 750, width: 1200, height: 40 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
      social("Socials", { x: 460, y: 900, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "tiktok"],
        animation: anim("slide", { direction: "up", duration: 800, delay: 900 }),
      }),
    ],
  },

  {
    id: "pride-brb",
    name: "Be Right Back",
    category: "BRB",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      particles("Decor — Clouds", { kind: "fog", count: 8, size: 5, speed: 0.8, color: "@accentSecondary" }),
      particles("Decor — Hearts", { kind: "hearts", count: 12, size: 6, speed: 0.6, color: "@primary", opacity: 0.7 }),
      img("Profile", { x: 830, y: 240, width: 260, height: 260 }, "{{PROFILE_IMAGE}}", {
        fit: "cover",
        cornerRadius: 130,
        effects: {
          border: { enabled: true, color: "@accent", width: 6, radius: 130 },
          glow: { enabled: true, color: "@glow", strength: 30 },
        },
        animation: anim("float", { duration: 5000 }),
      }),
      text("Headline", { x: 260, y: 570, width: 1400, height: 120 }, "BE RIGHT BACK", {
        fontFamily: "Poppins",
        fontSize: 96,
        fontWeight: 800,
        align: "center",
        fill: "@text",
        fillStripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
        letterSpacing: 3,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 16, offsetY: 5, opacity: 0.8 } },
        animation: anim("fade", { duration: 1100 }),
      }),
      text("Sub", { x: 360, y: 720, width: 1200, height: 44 }, "{{CHANNEL_NAME}} will be back shortly", {
        fontFamily: "Inter",
        fontSize: 28,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 1100, delay: 400 }),
      }),
      social("Socials", { x: 560, y: 890, width: 800, height: 56 }, {
        platforms: ["twitch", "instagram", "discord"],
        animation: anim("fade", { duration: 1000, delay: 700 }),
      }),
    ],
  },

  {
    id: "pride-ending",
    name: "Stream Ending",
    category: "Stream Ending",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      particles("Decor — Confetti", { kind: "confetti", count: 50, size: 6, speed: 1, color: "@accent" }),
      text("Headline", { x: 210, y: 430, width: 1500, height: 130 }, "THANKS FOR WATCHING", {
        fontFamily: "Poppins",
        fontSize: 92,
        fontWeight: 800,
        align: "center",
        fill: "@text",
        fillStripes: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
        letterSpacing: 3,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 18, offsetY: 6, opacity: 0.8 } },
        animation: anim("slide", { direction: "up", duration: 900, delay: 200 }),
      }),
      flag("Decor — Pride flag", { x: 610, y: 582, width: 700, height: 16 }, {
        cornerRadius: 8,
        animation: anim("shimmer", { duration: 3600 }),
      }),
      text("Channel name", { x: 310, y: 630, width: 1300, height: 70 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Poppins",
        fontSize: 48,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
      social("Socials", { x: 310, y: 780, width: 1300, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "tiktok", "x"],
        animation: anim("slide", { direction: "up", duration: 900, delay: 800 }),
      }),
    ],
  },

  {
    id: "pride-offline",
    name: "Offline",
    category: "Offline",
    tags: ["Minimal", "Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      shape("Card", { x: 610, y: 290, width: 700, height: 500 }, {
        fill: "@surface/90",
        cornerRadius: 28,
        effects: {
          border: { enabled: true, color: "@border", width: 1, radius: 28 },
          shadow: { enabled: true, color: "@shadow", blur: 60, offsetY: 20, opacity: 0.5 },
        },
        animation: anim("scale", { duration: 900 }),
      }),
      img("Logo", { x: 870, y: 340, width: 180, height: 180 }, "{{LOGO}}", {
        logo: true,
        animation: anim("fade", { duration: 900, delay: 300 }),
      }),
      text("Headline", { x: 660, y: 560, width: 600, height: 64 }, "OFFLINE", {
        fontFamily: "Poppins",
        fontSize: 48,
        fontWeight: 800,
        align: "center",
        fill: "@text",
        letterSpacing: 8,
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
      text("Sub", { x: 660, y: 640, width: 600, height: 40 }, "{{CHANNEL_NAME}} is resting — back soon", {
        fontFamily: "Inter",
        fontSize: 22,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 550 }),
      }),
      flag("Decor — Pride flag", { x: 760, y: 756, width: 400, height: 10 }, {
        cornerRadius: 5,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      social("Socials", { x: 660, y: 700, width: 600, height: 48 }, {
        platforms: ["twitch", "discord", "instagram"],
        fontSize: 20,
        animation: anim("fade", { duration: 900, delay: 700 }),
      }),
    ],
  },

  {
    id: "pride-gameplay",
    name: "Gameplay",
    category: "Gameplay",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      shape("Top bar", { x: 40, y: 28, width: 1840, height: 64 }, {
        fill: "@surface/85",
        cornerRadius: 18,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 18 } },
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      flag("Decor — Pride flag", { x: 40, y: 98, width: 1840, height: 8 }, {
        cornerRadius: 4,
        animation: anim("shimmer", { duration: 4200 }),
      }),
      flag("Decor — Rainbow rail", { x: 0, y: 0, width: 10, height: 1080 }, {
        stackDirection: "vertical",
        cornerRadius: 0,
        opacity: 0.9,
        animation: anim("shimmer", { duration: 5200 }),
      }),
      img("Logo", { x: 62, y: 40, width: 40, height: 40 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 118, y: 42, width: 600, height: 36 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Poppins",
        fontSize: 26,
        fontWeight: 700,
        fill: "@text",
      }),
      text("Slogan", { x: 120, y: 72, width: 600, height: 18 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      particles("Decor — Stars", { kind: "stars", count: 24, size: 3, speed: 0.3, color: "@accent", opacity: 0.5 }),
      frame("Webcam", { x: 40, y: 660, width: 480, height: 270 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 4,
        cornerRadius: 20,
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      chatbox("Chat", { x: 1500, y: 140, width: 380, height: 580 }, {
        cornerRadius: 20,
        rows: 7,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 20 } },
      }),
      social("Socials", { x: 620, y: 984, width: 680, height: 52 }, {
        platforms: ["twitch", "discord", "instagram", "tiktok"],
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
    ],
  },

  {
    id: "pride-chatting",
    name: "Just Chatting",
    category: "Just Chatting",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      particles("Decor — Hearts", { kind: "hearts", count: 10, size: 5, speed: 0.5, color: "@primary", opacity: 0.6 }),
      frame("Webcam", { x: 90, y: 140, width: 1020, height: 574 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 5,
        cornerRadius: 28,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      shape("Name plate", { x: 90, y: 760, width: 640, height: 84 }, {
        fill: "@surface/85",
        cornerRadius: 42,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 42 } },
      }),
      text("Display name", { x: 134, y: 780, width: 560, height: 48 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Poppins",
        fontSize: 38,
        fontWeight: 700,
        fill: "@text",
      }),
      flag("Decor — Pride flag", { x: 90, y: 856, width: 640, height: 10 }, {
        cornerRadius: 5,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      text("Slogan", { x: 92, y: 880, width: 900, height: 36 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 24,
        fontWeight: 400,
        fill: "@textSecondary",
      }),
      chatbox("Chat", { x: 1180, y: 140, width: 650, height: 740 }, {
        cornerRadius: 28,
        rows: 9,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 28 } },
      }),
      social("Socials", { x: 90, y: 950, width: 1000, height: 56 }, {
        platforms: ["twitch", "tiktok", "instagram", "discord"],
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
    ],
  },

  {
    id: "pride-webcam",
    name: "Webcam Frame",
    category: "Webcam Frames",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      particles("Decor — Hearts", { kind: "hearts", count: 10, size: 5, speed: 0.5, color: "@primary", opacity: 0.6 }),
      // A full rainbow border built from four flag bars — stripes run along
      // each edge, framing the camera in the pack's actual flag.
      flag("Decor — Flag top", { x: 308, y: 104, width: 1304, height: 10 }, { cornerRadius: 5 }),
      flag("Decor — Flag bottom", { x: 308, y: 846, width: 1304, height: 10 }, { cornerRadius: 5 }),
      flag("Decor — Flag left", { x: 304, y: 118, width: 10, height: 724 }, {
        stackDirection: "vertical",
        cornerRadius: 5,
      }),
      flag("Decor — Flag right", { x: 1606, y: 118, width: 10, height: 724 }, {
        stackDirection: "vertical",
        cornerRadius: 5,
      }),
      frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 5,
        cornerRadius: 24,
        effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      shape("Name plate", { x: 660, y: 880, width: 600, height: 72 }, {
        fill: "@surface/90",
        cornerRadius: 36,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 36 } },
      }),
      text("Display name", { x: 660, y: 898, width: 600, height: 42 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Poppins",
        fontSize: 32,
        fontWeight: 700,
        align: "center",
        fill: "@text",
      }),
      flag("Decor — Pride flag", { x: 810, y: 964, width: 300, height: 8 }, {
        cornerRadius: 4,
        animation: anim("shimmer", { duration: 4600 }),
      }),
    ],
  },

  {
    id: "pride-chatbox",
    name: "Chat Box",
    category: "Chat Boxes",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      particles("Decor — Stars", { kind: "stars", count: 16, size: 3, speed: 0.3, color: "@accent", opacity: 0.5 }),
      shape("Title pill", { x: 1560, y: 58, width: 140, height: 44 }, {
        fill: "@surface/90",
        cornerRadius: 22,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 22 } },
        animation: anim("fade", { duration: 800 }),
      }),
      text("Chat title", { x: 1560, y: 68, width: 140, height: 28 }, "CHAT", {
        fontFamily: "Poppins",
        fontSize: 20,
        fontWeight: 700,
        align: "center",
        fill: "@accent",
        letterSpacing: 4,
      }),
      flag("Decor — Pride flag", { x: 1400, y: 108, width: 460, height: 8 }, {
        cornerRadius: 4,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      chatbox("Chat", { x: 1400, y: 120, width: 460, height: 840 }, {
        cornerRadius: 24,
        rows: 10,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 24 } },
      }),
    ],
  },

  {
    id: "pride-follower",
    name: "Follower Alert",
    category: "Alerts",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      particles("Decor — Confetti", { kind: "confetti", count: 36, size: 5, speed: 1.4, color: "@accent" }),
      alert("Follower alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW FOLLOWER", "Welcome to the family", {
        fontFamily: "Poppins",
        cornerRadius: 28,
        titleColor: "@accent",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 34 },
          border: { enabled: true, color: "@border", width: 1, radius: 28 },
        },
        animation: anim("elastic", { duration: 1500 }),
      }),
      flag("Decor — Pride flag", { x: 620, y: 648, width: 680, height: 10 }, {
        cornerRadius: 5,
        animation: anim("elastic", { duration: 1500, delay: 150 }),
      }),
    ],
  },

  {
    id: "pride-subscriber",
    name: "Subscriber Alert",
    category: "Alerts",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      particles("Decor — Hearts", { kind: "hearts", count: 16, size: 6, speed: 1.2, color: "@primary", opacity: 0.8 }),
      alert("Subscriber alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW SUBSCRIBER", "You're amazing — thank you!", {
        fontFamily: "Poppins",
        cornerRadius: 28,
        avatar: false,
        fill: "@surface/95",
        titleColor: "@accent",
        subtitleColor: "@text",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 46 },
          border: { enabled: true, color: "@accent", width: 2, radius: 28 },
        },
        animation: anim("bounce", { duration: 1400 }),
      }),
    ],
  },

  {
    id: "pride-goals",
    name: "Goals",
    category: "Goals",
    tags: ["Cozy"],
    collection: "pride",
    layers: [
      goal("Follower ring", { x: 150, y: 380, width: 360, height: 360 }, "FOLLOWERS", 847, 1000, {
        goalStyle: "ring",
        fontFamily: "Poppins",
        barColor: "@primary",
        trackColor: "@surface/55",
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
      goal("Sub goal", { x: 560, y: 430, width: 760, height: 150 }, "SUB GOAL", 62, 100, {
        goalStyle: "bar",
        fill: "@surface/88",
        fontFamily: "Poppins",
        barColor: "@primary",
        cornerRadius: 26,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 20 },
          border: { enabled: true, color: "@border", width: 1, radius: 26 },
        },
        animation: anim("slide", { direction: "right", duration: 700 }),
      }),
      goal("Donation goal", { x: 560, y: 610, width: 760, height: 150 }, "DONATION GOAL", 340, 500, {
        goalStyle: "bar",
        fill: "@surface/88",
        fontFamily: "Poppins",
        barColor: "@secondary",
        cornerRadius: 26,
        effects: {
          glow: { enabled: true, color: "@glow", strength: 20 },
          border: { enabled: true, color: "@border", width: 1, radius: 26 },
        },
        animation: anim("slide", { direction: "right", duration: 700, delay: 160 }),
      }),
    ],
  },

  {
    id: "pride-socialbar",
    name: "Social Bar",
    category: "Social Bars",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      flag("Decor — Pride flag", { x: 460, y: 946, width: 1000, height: 6 }, {
        cornerRadius: 3,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      social("Socials", { x: 460, y: 966, width: 1000, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "tiktok"],
        pill: true,
        pillColor: "@surface/90",
        gap: 20,
        fontSize: 22,
        animation: anim("fade", { duration: 900 }),
      }),
    ],
  },
  {
    id: "pride-pause",
    name: "Pause",
    category: "Pause",
    tags: ["Minimal", "Cozy"],
    collection: "pride",
    layers: [
      ...prideScene(),
      shape("Card", { x: 610, y: 340, width: 700, height: 400 }, {
        fill: "@surface/90",
        cornerRadius: 28,
        effects: {
          border: { enabled: true, color: "@border", width: 1, radius: 28 },
          shadow: { enabled: true, color: "@shadow", blur: 60, offsetY: 20, opacity: 0.5 },
        },
        animation: anim("scale", { duration: 900 }),
      }),
      text("Headline", { x: 660, y: 470, width: 600, height: 64 }, "PAUSED", {
        fontFamily: "Poppins",
        fontSize: 48,
        fontWeight: 800,
        align: "center",
        fill: "@text",
        letterSpacing: 8,
        animation: anim("fade", { duration: 900, delay: 300 }),
      }),
      text("Sub", { x: 660, y: 552, width: 600, height: 40 }, "Back in a moment", {
        fontFamily: "Inter",
        fontSize: 22,
        fontWeight: 400,
        align: "center",
        fill: "@textSecondary",
        animation: anim("fade", { duration: 900, delay: 450 }),
      }),
      flag("Decor — Pride flag", { x: 760, y: 660, width: 400, height: 10 }, {
        cornerRadius: 5,
        animation: anim("shimmer", { duration: 4600 }),
      }),
    ],
  },
  {
    id: "pride-intermission",
    name: "Intermission",
    category: "Intermission",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      ...prideScene(),
      text("Label", { x: 120, y: 108, width: 700, height: 50 }, "INTERMISSION", {
        fontFamily: "Poppins",
        fontSize: 32,
        fontWeight: 800,
        fill: "@accent",
        letterSpacing: 6,
        animation: anim("fade", { duration: 900 }),
      }),
      flag("Decor — Pride flag", { x: 120, y: 170, width: 1680, height: 8 }, {
        cornerRadius: 4,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      frame("Webcam", { x: 120, y: 200, width: 1080, height: 600 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 3,
        cornerRadius: 20,
        effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      chatbox("Chat", { x: 1260, y: 200, width: 540, height: 600 }, {
        cornerRadius: 20,
        rows: 8,
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 20 } },
      }),
      social("Socials", { x: 120, y: 862, width: 1000, height: 56 }, {
        platforms: ["twitch", "discord", "instagram"],
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },
  {
    id: "pride-events",
    name: "Event Badges",
    category: "Social Bars",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      flag("Decor — Pride flag", { x: 60, y: 262, width: 420, height: 8 }, {
        cornerRadius: 4,
        animation: anim("shimmer", { duration: 4600 }),
      }),
      ...["Recent sub", "Top donator", "Recent donator", "Recent follower"].map((label, i) =>
        chip(label, { x: 60, y: 300 + i * 76, width: 420, height: 52 }, label, "pixel_wren", {
          fontFamily: "Inter",
          cornerRadius: 14,
          effects: { border: { enabled: true, color: "@border", width: 1, radius: 14 } },
          animation: anim("slide", { direction: "left", duration: 700, delay: i * 120 }),
        }),
      ),
    ],
  },
  {
    id: "pride-panels",
    name: "Stream Panels",
    category: "Stream Panels",
    tags: ["Minimal"],
    collection: "pride",
    layers: [
      ...["ABOUT ME", "COMMANDS", "DONATE", "DISCORD", "LINKS", "MERCH"].flatMap((label, i) => {
        const x = 160 + (i % 3) * 560;
        const y = 260 + Math.floor(i / 3) * 300;
        return [
          shape(`Panel ${i + 1}`, { x, y, width: 480, height: 160 }, {
            fill: "@surface/92",
            cornerRadius: 22,
            effects: {
              border: { enabled: true, color: "@border", width: 1, radius: 22 },
              glow: { enabled: true, color: "@glow", strength: 12 },
            },
          }),
          flag("Pride bar", { x, y: y - 2, width: 480, height: 12 }, { cornerRadius: 6 }),
          text(`Panel label ${i + 1}`, { x, y: y + 55, width: 480, height: 56 }, label, {
            fontFamily: "Poppins",
            fontSize: 34,
            fontWeight: 800,
            align: "center",
            fill: "@text",
            letterSpacing: 2,
          }),
        ];
      }),
    ],
  },

  {
    id: "pride-stinger",
    name: "Stinger — Pride Heart",
    category: "Stinger Transitions",
    tags: ["Cozy", "RGB"],
    collection: "pride",
    // Over a transparent background a heart comes in small, swells to fill the
    // frame at the mid peak, then shrinks away and vanishes. No cover, no text.
    layers: [
      shape("Heart", { x: 610, y: 190, width: 700, height: 700 }, {
        shape: "heart",
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 40 }, border: { enabled: true, color: "@text", width: 5, radius: 0 } },
        animation: anim("sweepScale", { duration: 1700, intensity: 3, easing: "linear" }),
      }),
      particles("Decor — Confetti", { kind: "confetti", count: 46, size: 6, speed: 1, color: "@accent", animation: anim("flash", { duration: 1700, easing: "linear" }) }),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                          Variant expansion                                 */
/* -------------------------------------------------------------------------- */

/**
 * Every base template is published once per palette. Because templates hold
 * theme *tokens* rather than colours, a variant is the base layer list plus a
 * different `paletteId` — no per-variant artwork, and adding a palette adds a
 * full set of templates for free.
 */
function buildVariant(base: BaseTemplate, palette: Palette): Template {
  const tags = new Set<StyleTag>([...base.tags, ...paletteTags(palette.id)]);
  // Pack naming: themed collections compose the palette in ("Midnight
  // Cathedral — Gameplay"); core families compose their family name in
  // ("Neon Grid — Starting Soon"); one-off core designs keep their own name.
  const name = base.family
    ? `${base.family} — ${base.name}`
    : base.collection !== "core"
      ? `${palette.name} — ${base.name}`
      : base.name;
  return {
    id: `${base.id}--${palette.id}`,
    name,
    category: base.category,
    tags: [...tags],
    collection: base.collection,
    family: base.family ?? (base.collection !== "core" ? base.collection : undefined),
    subStyle: palette.subStyle,
    paletteId: palette.id,
    layers: base.layers.map((spec, i) => {
      const layer = { ...spec, id: `${base.id}-l${i}` } as Layer;
      // In the finished designs the text and social bars hold still — the motion
      // belongs to the scene, the frames and the decor around them. Strip any
      // entrance/loop from copy and social layers everywhere, in one place.
      if ((layer.type === "text" || layer.type === "social") && layer.animation) {
        layer.animation = { ...layer.animation, preset: "none" };
      }
      // Flags fly the palette's authentic stripes, not the authored default.
      if (layer.type === "flag" && palette.flag) layer.stripes = palette.flag;
      if (layer.type === "text" && layer.fillStripes && palette.flag) {
        layer.fillStripes = palette.flag;
      }
      // A glass sheet / plasma waves take the palette's flag colours.
      if (
        layer.type === "shape" &&
        (layer.shape === "glasssheet" || layer.shape === "flagwaves") &&
        palette.flag
      ) {
        layer.facetColors = palette.flag;
      }
      return layer;
    }),
  };
}

/**
 * Palette-major order within each collection: the first screen of the gallery
 * shows every design once, not one design in fifteen colours. Collections pair
 * with their own palettes — a neon esports palette on a Victorian mourning
 * frame helps nobody.
 */
function expand(bases: BaseTemplate[], palettes: Palette[]): Template[] {
  return palettes.flatMap((palette) => bases.map((base) => buildVariant(base, palette)));
}

export const TEMPLATES: Template[] = [
  ...expand(BASE_TEMPLATES, CORE_PALETTES),
  ...expand(GENERATED_FAMILY_TEMPLATES, CORE_PALETTES),
  ...expand(GOTHIC_TEMPLATES, GOTHIC_PALETTES),
  ...expand(PRIDE_TEMPLATES, PRIDE_PALETTES),
  ...expand(PRISM_PRIDE_TEMPLATES, PRISM_PALETTES),
  ...ABSTRACT_TEMPLATES,
  ...CUSTOM_TEMPLATES,
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

/** An empty overlay to build from scratch. Not published to the gallery grid —
    reached through the "Start from scratch" action — so opening it drops you on
    a transparent canvas with the full Add / Decor palette at hand. */
export const BLANK_TEMPLATE: Template = {
  id: "blank",
  name: "Blank Canvas",
  category: "Complete Stream Package",
  tags: ["Minimal"],
  collection: "core",
  paletteId: DEFAULT_PALETTE_ID,
  layers: [],
};

/**
 * Starter scaffolds for "start from scratch". Scenes like Starting Soon are
 * easy to build on a blank canvas, but the fiddly overlay pieces — a webcam
 * frame, a panel set, a chat box, a social bar — are tedious from nothing, so
 * we hand a neutral, palette-driven starting point to customise. Webcam frames
 * are rectangular (round frames don't suit a 16:9 camera) in a range of styles.
 */
function starter(id: string, name: string, category: TemplateCategory, layers: LayerSpec[]): Template {
  return {
    id,
    name,
    category,
    tags: ["Minimal"],
    collection: "core",
    paletteId: DEFAULT_PALETTE_ID,
    layers: layers.map((l, i) => ({ ...l, id: `${id}-l${i}` }) as Layer),
  };
}

function webcamStarter(
  id: string,
  name: string,
  frameOpts: Parameters<typeof frame>[2],
  extra: LayerSpec[] = [],
): Template {
  return starter(`starter-webcam-${id}`, name, "Webcam Frames", [
    frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
      camera: true,
      strokeColor: "@accent",
      strokeWidth: 4,
      effects: { glow: { enabled: true, color: "@glow", strength: 18 } },
      ...frameOpts,
    }),
    ...extra,
    shape("Name plate", { x: 760, y: 858, width: 400, height: 66 }, {
      fill: "@surface/88",
      cornerRadius: 14,
      effects: { border: { enabled: true, color: "@border", width: 1, radius: 14 } },
    }),
    text("Display name", { x: 760, y: 877, width: 400, height: 40 }, "{{DISPLAY_NAME}}", {
      fontFamily: "Inter",
      fontSize: 26,
      fontWeight: 700,
      align: "center",
      fill: "@text",
    }),
  ]);
}

export const STARTERS: Template[] = [
  webcamStarter("sharp", "Webcam — Sharp", { cornerRadius: 0, strokeWidth: 3 }),
  webcamStarter("rounded", "Webcam — Rounded", { cornerRadius: 32 }),
  webcamStarter("brackets", "Webcam — Brackets", { cornerRadius: 8, corners: true, strokeWidth: 2 }),
  webcamStarter("hexcut", "Webcam — Hex Cut", { shape: "hexagon" }),
  webcamStarter("double", "Webcam — Double Frame", { cornerRadius: 12 }, [
    shape("Inner line", { x: 338, y: 138, width: 1244, height: 684 }, {
      fill: "transparent",
      effects: { border: { enabled: true, color: "@secondary", width: 2, radius: 8 } },
    }),
  ]),
  starter(
    "starter-panels",
    "Panels — 6-up",
    "Stream Panels",
    ["ABOUT ME", "COMMANDS", "DONATE", "DISCORD", "LINKS", "MERCH"].flatMap((label, i) => {
      const x = 160 + (i % 3) * 560;
      const y = 300 + Math.floor(i / 3) * 260;
      return [
        shape(`Panel ${i + 1}`, { x, y, width: 480, height: 150 }, {
          fill: "@surface/88",
          cornerRadius: 16,
          effects: {
            border: { enabled: true, color: "@accent", width: 1.5, radius: 16 },
            glow: { enabled: true, color: "@glow", strength: 10 },
          },
        }),
        text(`Panel label ${i + 1}`, { x, y: y + 52, width: 480, height: 50 }, label, {
          fontFamily: "Inter",
          fontSize: 30,
          fontWeight: 800,
          align: "center",
          fill: "@text",
          letterSpacing: 3,
        }),
      ];
    }),
  ),
  starter("starter-chatbox", "Chat Box", "Chat Boxes", [
    chatbox("Chat", { x: 1380, y: 120, width: 470, height: 840 }, { rows: 10 }),
  ]),
  starter("starter-socialbar", "Social Bar", "Social Bars", [
    social("Socials", { x: 460, y: 500, width: 1000, height: 64 }, {
      platforms: ["twitch", "youtube", "discord", "instagram", "x"],
      pill: true,
      pillColor: "@surface/88",
      gap: 22,
    }),
  ]),
];

const STARTER_BY_ID = new Map(STARTERS.map((s) => [s.id, s]));

export function getTemplate(id: string): Template | undefined {
  if (id === BLANK_TEMPLATE.id) return BLANK_TEMPLATE;
  return TEMPLATE_BY_ID.get(id) ?? STARTER_BY_ID.get(id);
}

/**
 * Every screen in the same pack as `templateId`: the same design family in the
 * same palette (Starting Soon, BRB, Gameplay, chat, alerts…), in the authored
 * screen order. Empty for one-off core designs that aren't part of a family —
 * those have no siblings to bundle.
 */
export function packScreens(templateId: string): Template[] {
  const anchor = TEMPLATE_BY_ID.get(templateId);
  if (!anchor?.family) return [];
  return TEMPLATES.filter(
    (t) => t.family === anchor.family && t.paletteId === anchor.paletteId,
  );
}

export function templateCount(): number {
  return TEMPLATES.length;
}

/** Deep clone so an opened project never aliases the shared template data. */
export function cloneLayers(layers: Layer[]): Layer[] {
  return structuredClone(layers);
}
