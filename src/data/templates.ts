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
import { CORE_PALETTES, GOTHIC_PALETTES, PRIDE_PALETTES, paletteTags } from "./palettes";
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
    particles("Decor — Grid dust", { kind: "dots", count: 44, size: 3, speed: 0.4, color: "@glow", opacity: 0.55 }),
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
      img("Logo", { x: 860, y: 170, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
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
        animation: anim("elastic", { duration: 1200 }),
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
        animation: anim("bounce", { duration: 1100 }),
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
      img("Logo", { x: 860, y: 160, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
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
        animation: anim("elastic", { duration: 1200 }),
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
        animation: anim("bounce", { duration: 1100 }),
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
    layers: [
      shape("Sweep back", { x: -600, y: -200, width: 1400, height: 1600 }, {
        fill: "@primary",
        rotation: 12,
        animation: anim("slide", { direction: "left", duration: 700, intensity: 4, easing: "easeInOut" }),
      }),
      shape("Sweep front", { x: -300, y: -200, width: 1400, height: 1600 }, {
        fill: "@accent",
        rotation: 12,
        opacity: 0.9,
        animation: anim("slide", { direction: "left", duration: 700, delay: 120, intensity: 4, easing: "easeInOut" }),
      }),
      img("Logo", { x: 860, y: 440, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("zoom", { duration: 800, delay: 400, easing: "backOut" }),
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
        animation: anim("elastic", { duration: 1200, delay: 900 }),
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
  plateShape: "rect" | "plaque" | "chamfer";
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
      fill: "@text",
      letterSpacing: f.displayTracking,
      textTransform: f.displayTransform,
      effects: f.headlineEffects,
      animation: anim("fade", { duration: 1100 }),
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
      animation: anim("fade", { duration: 900, delay: 400 }),
    });

  const slogan = (y: number) =>
    text("Slogan", { x: 360, y: y + dy, width: 1200, height: 40 }, "{{SLOGAN}}", {
      fontFamily: f.body,
      fontSize: 24,
      fontWeight: 400,
      align: "center",
      fill: "@textSecondary",
      animation: anim("fade", { duration: 900, delay: 700 }),
    });

  const socials = (y: number, platforms?: SocialPlatform[], delay = 900) =>
    social("Socials", { x: 460, y: y + dy, width: 1000, height: 56 }, {
      platforms: platforms ?? ["twitch", "youtube", "discord", "instagram"],
      fontFamily: f.body,
      pillColor: "@surface/90",
      animation: anim("fade", { duration: 900, delay }),
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
          effects: { border: { enabled: true, color: "@border", width: 1, radius: f.radius } },
        });

  const plate = (name: string, box: Box, o: Parameters<typeof shape>[2] = {}) =>
    shape(name, box, {
      shape: f.plateShape,
      fill: "@surface/90",
      cornerRadius: f.radius,
      effects: { border: { enabled: true, color: "@border", width: 1, radius: f.radius }, ...o.effects },
      ...o,
    });

  const alertScreen = (id: string, name: string, title: string, subtitle: string, hero: boolean) =>
    base(id, name, "Alerts", [
      ...(f.overlayDecor?.() ?? []),
      alert("Alert", { x: 560, y: 400, width: 800, height: 240 }, title, subtitle, {
        fontFamily: f.display,
        cornerRadius: f.radius,
        boxShape: f.alertShape ?? "rect",
        // No viewer-avatar disc on either alert — cleaner as a plain plate.
        // Both alerts sit on the family's dark plate so they read as part of the
        // overlay, not a bright slab pasted over it. The hero (subscriber) is
        // set apart by an accent border and a stronger glow, not by inverting
        // to a near-white fill.
        fill: hero ? "@surface/95" : "@surface/92",
        titleColor: "@accent",
        subtitleColor: "@text",
        effects: {
          glow: { enabled: true, color: "@glow", strength: hero ? 46 : 34 },
          border: {
            enabled: true,
            color: hero ? "@accent" : "@border",
            width: hero ? 2 : 1,
            radius: f.radius,
          },
        },
        animation: anim(hero ? "bounce" : "elastic", { duration: 1150 }),
      }),
    ]);

  /** A full-screen message scene: ground, headline, name, slogan, socials. */
  const scene = (id: string, name: string, category: TemplateCategory, copy: string, extra: LayerSpec[] = []) =>
    base(id, name, category, [
      ...f.scene(),
      ...extra,
      headline(copy),
      channelName(600),
      slogan(700),
      socials(880),
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
    scene("ending", "Stream Ending", "Stream Ending", "THANKS FOR WATCHING", [
      img("Logo", { x: 860, y: 200 + dy, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
    ]),
    scene("pause", "Pause", "Pause", "STREAM ON PAUSE"),
    scene("offline", "Offline", "Offline", "OFFLINE"),

    // Intermission: camera and chat side by side over the family ground.
    base("intermission", "Intermission", "Intermission", [
      ...f.scene(),
      text("Label", { x: 120, y: 110, width: 700, height: 50 }, "INTERMISSION", {
        fontFamily: f.display,
        fontSize: 34,
        fontWeight: f.displayWeight,
        fill: "@accent",
        letterSpacing: Math.max(4, f.displayTracking),
        animation: anim("fade", { duration: 900 }),
      }),
      camera("Webcam", { x: 120, y: 190, width: 1080, height: 608 }),
      chat("Chat", { x: 1260, y: 190, width: 540, height: 608 }, 8),
      socials(880, ["twitch", "discord", "instagram"], 600),
    ]),

    base("gameplay", "Gameplay", "Gameplay", [
      ...(f.overlayDecor?.() ?? []),
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
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
    ]),

    base("chatting", "Just Chatting", "Just Chatting", [
      ...f.scene(),
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
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
    ]),

    base("webcam", "Webcam Frame", "Webcam Frames", [
      ...(f.overlayDecor?.() ?? []),
      camera("Camera", { x: 320, y: 120, width: 1280, height: 720 }),
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
      chat("Chat", { x: 1400, y: 120, width: 460, height: 840 }, 10),
    ]),

    alertScreen("follower", "Follower Alert", "NEW FOLLOWER", "AwesomeViewer", false),
    alertScreen("subscriber", "Subscriber Alert", "NEW SUBSCRIBER", "Tier 1 · welcome aboard", true),

    goalsScreen,

    base("socialbar", "Social Bar", "Social Bars", [
      social("Socials", { x: 460, y: 962, width: 1000, height: 60 }, {
        platforms: ["twitch", "youtube", "discord", "instagram", "x"],
        pill: true,
        pillColor: "@surface/90",
        gap: 20,
        fontSize: 22,
        fontFamily: f.body,
        animation: anim("fade", { duration: 900 }),
      }),
    ]),

    // Event badges: the "recent sub / top donator" stack from the references.
    base("events", "Event Badges", "Social Bars", [
      ...["Recent sub", "Top donator", "Recent donator", "Recent follower"].map((label, i) =>
        chip(label, { x: 60, y: 300 + i * 76, width: 420, height: 52 }, label, "pixel_wren", {
          fontFamily: f.body,
          cornerRadius: f.radius,
          split: f.chipSplit,
          effects: { border: { enabled: true, color: "@border", width: 1, radius: f.radius } },
          animation: anim("slide", { direction: "left", duration: 700, delay: i * 120 }),
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
          fill: "@surface/92",
          cornerRadius: f.radius,
          effects: {
            border: { enabled: true, color: "@border", width: 1, radius: f.radius },
            glow: { enabled: true, color: "@glow", strength: 14 },
          },
        }),
      ),
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
  plateShape: "rect",
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
    particles("Decor — Clouds", { kind: "clouds", count: 4, size: 100, speed: 0.26, color: "@secondary", opacity: 0.32 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 6, speed: 0.4, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [
    particles("Decor — Petals left", { kind: "petals", count: 5, size: 6, speed: 1.0, color: "@primary", opacity: 0.6, box: MARGIN_LEFT }),
    particles("Decor — Petals right", { kind: "petals", count: 5, size: 6, speed: 1.0, color: "@primary", opacity: 0.6, box: MARGIN_RIGHT }),
  ],
  contentOffsetY: -70,
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
    // Plasma energy: glowing red waves crossing the frame.
    shape("Wave — plasma back", { x: -120, y: 120, width: 2160, height: 420 }, {
      shape: "wave",
      fill: "@primary/70",
      opacity: 0.85,
      effects: { glow: { enabled: true, color: "@glow", strength: 66 } },
    }),
    shape("Wave — plasma bright", { x: -120, y: 300, width: 2160, height: 300 }, {
      shape: "wave",
      fill: "@glow",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 80 } },
    }),
    // A deeper red wave low in the frame, keeping the energy flowing under the
    // copy without a dull metal ribbon.
    shape("Wave — plasma low", { x: -140, y: 620, width: 2200, height: 340 }, {
      shape: "wave",
      fill: "@primary/55",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 58 } },
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
    shape("Aurora — accent", { x: -180, y: 60, width: 2280, height: 460 }, {
      shape: "wave",
      fill: "@accent/26",
      opacity: 0.6,
      effects: { glow: { enabled: true, color: "@glow", strength: 66 } },
    }),
    shape("Aurora — primary", { x: -180, y: 150, width: 2280, height: 540 }, {
      shape: "wave",
      fill: "@primary/40",
      opacity: 0.8,
      effects: { glow: { enabled: true, color: "@glow", strength: 82 } },
    }),
    shape("Aurora — secondary", { x: -180, y: 300, width: 2280, height: 480 }, {
      shape: "wave",
      fill: "@secondary/36",
      opacity: 0.72,
      effects: { glow: { enabled: true, color: "@glow", strength: 74 } },
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
    shape("Gas — primary", { x: -120, y: 200, width: 1120, height: 800 }, {
      shape: "ellipse",
      fill: "@primary/18",
      effects: { glow: { enabled: true, color: "@glow", strength: 120 } },
    }),
    shape("Gas — secondary", { x: 980, y: 120, width: 1040, height: 720 }, {
      shape: "ellipse",
      fill: "@secondary/18",
      effects: { glow: { enabled: true, color: "@glow", strength: 108 } },
    }),
    particles("Decor — Stars", { kind: "stars", count: 130, size: 2, speed: 0.1, color: "@text", opacity: 0.85 }),
    particles("Decor — Shooting", { kind: "shootingStars", count: 4, size: 6, speed: 1, color: "@text" }),
    shape("Flow", { x: -160, y: 230, width: 2240, height: 340 }, {
      shape: "wave",
      fill: "@glow",
      opacity: 0.5,
      effects: { glow: { enabled: true, color: "@glow", strength: 74 } },
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
    }),
    shape("Silk — two", { x: -200, y: 520, width: 2320, height: 380 }, {
      shape: "wave",
      opacity: 0.85,
      effects: {
        gradientStroke: { enabled: true, from: "@secondary", to: "@accent", angle: 90, width: 30 },
        glow: { enabled: true, color: "@glow", strength: 18 },
      },
    }),
    particles("Decor — Sparkle", { kind: "stars", count: 44, size: 2.4, speed: 0.15, color: "@accent", opacity: 0.7 }),
    particles("Decor — Bokeh", { kind: "bokeh", count: 8, size: 7, speed: 0.3, color: "@accent", opacity: 0.3 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: -40,
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
    // Streamlined neon HUD frame with a green-to-blue gradient edge.
    shape("HUD frame", { x: 54, y: 54, width: 1812, height: 972 }, {
      shape: "rect",
      fill: "@surface/0",
      cornerRadius: 44,
      effects: {
        gradientStroke: { enabled: true, from: "@accent", to: "@secondary", angle: 35, width: 3 },
        glow: { enabled: true, color: "@glow", strength: 22 },
      },
    }),
    // Decorative pill buttons in a corner — the pack's signature capsule.
    shape("Pill — cap", { x: 96, y: 96, width: 46, height: 46 }, {
      shape: "rect",
      cornerRadius: 23,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
    }),
    shape("Pill — bar", { x: 150, y: 104, width: 210, height: 30 }, {
      shape: "rect",
      cornerRadius: 15,
      fill: "@surface/85",
      effects: { border: { enabled: true, color: "@accent", width: 1.5, radius: 15 } },
    }),
    // Slim neon accent bars framing the headline.
    shape("Accent — top", { x: 710, y: 392, width: 500, height: 6 }, {
      shape: "rect",
      cornerRadius: 3,
      fill: "@accent",
      effects: { glow: { enabled: true, color: "@glow", strength: 28 } },
    }),
    particles("Decor — Sparks", { kind: "embers", count: 16, size: 2, speed: 0.5, color: "@accent", opacity: 0.4 }),
  ],
  overlayDecor: () => [],
  contentOffsetY: 0,
};

const NEW_FAMILIES: FamilyStyle[] = [
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
  PLASMA,
  AURORA,
  NEBULA,
  SILK,
  MECHA,
  CYBER_PILL,
];

const GENERATED_FAMILY_TEMPLATES: BaseTemplate[] = NEW_FAMILIES.flatMap(familyScreens);

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
        animation: anim("bounce", { duration: 1100 }),
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
        animation: anim("elastic", { duration: 1200 }),
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
      img("Logo", { x: 860, y: 170, width: 200, height: 200 }, "{{LOGO}}", {
        logo: true,
        animation: anim("zoom", { duration: 900, easing: "backOut" }),
      }),
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
        animation: anim("elastic", { duration: 1200 }),
      }),
      flag("Decor — Pride flag", { x: 620, y: 648, width: 680, height: 10 }, {
        cornerRadius: 5,
        animation: anim("elastic", { duration: 1200, delay: 150 }),
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
        animation: anim("bounce", { duration: 1100 }),
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
      // Flags fly the palette's authentic stripes, not the authored default.
      if (layer.type === "flag" && palette.flag) layer.stripes = palette.flag;
      if (layer.type === "text" && layer.fillStripes && palette.flag) {
        layer.fillStripes = palette.flag;
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
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return TEMPLATE_BY_ID.get(id);
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
