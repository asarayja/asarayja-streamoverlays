import {
  DEFAULT_ANIMATION,
  DEFAULT_EFFECTS,
  type Animation,
  type Collection,
  type Effects,
  type GothicStyle,
  type Layer,
  type LayerBase,
  type ParticleKind,
  type SocialPlatform,
  type Template,
  type TemplateCategory,
  type StyleTag,
} from "@/lib/types";
import { CORE_PALETTES, GOTHIC_PALETTES, paletteTags } from "./palettes";
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
    shape?: "rect" | "ellipse" | "triangle" | "hexagon" | "line";
    fill?: string;
    cornerRadius?: number;
    background?: boolean;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: o.background ? "background" : "shape",
    shape: o.shape ?? "rect",
    fill: o.fill ?? "@primary",
    cornerRadius: o.cornerRadius ?? 0,
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
    fill: o.fill ?? "@background/60",
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
    fill: o.fill ?? "@background/70",
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
    fontFamily?: string;
    titleColor?: string;
    subtitleColor?: string;
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    ...box,
    type: "alert",
    title,
    subtitle,
    fill: o.fill ?? "@background/85",
    cornerRadius: o.cornerRadius ?? 20,
    fontFamily: o.fontFamily ?? "Bebas Neue",
    titleColor: o.titleColor ?? "@accent",
    subtitleColor: o.subtitleColor ?? "@text",
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
    pillColor: o.pillColor ?? "@background/70",
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
  } = {},
): LayerSpec {
  return {
    ...common(name, o),
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    type: "particle",
    kind: o.kind ?? "dots",
    count: o.count ?? 60,
    color: o.color ?? "@glow",
    size: o.size ?? 4,
    speed: o.speed ?? 1,
  };
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
  subStyle?: GothicStyle;
  animated: boolean;
  premium: boolean;
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
    name: "Neon Grid",
    category: "Gameplay",
    tags: ["Esports"],
    animated: true,
    premium: false,
    collection: "core",
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 76 }, {
        fill: "@background/85",
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
        fill: "@secondary",
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
  {
    id: "minimal-play",
    name: "Minimal Play",
    category: "Gameplay",
    tags: ["Minimal"],
    animated: false,
    premium: false,
    collection: "core",
    layers: [
      shape("Name pill", { x: 40, y: 40, width: 380, height: 64 }, {
        fill: "@background/75",
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
    animated: true,
    premium: true,
    collection: "core",
    layers: [
      shape("Left rail", { x: 0, y: 0, width: 12, height: 1080 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 24 } },
        animation: anim("glow", { duration: 2400 }),
      }),
      shape("Header", { x: 60, y: 36, width: 620, height: 88 }, {
        fill: "@background/85",
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
        fill: "@background/80",
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
    animated: true,
    premium: false,
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
        fill: "@secondary",
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
    animated: true,
    premium: false,
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
        fill: "@secondary",
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
    animated: true,
    premium: true,
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
        fill: "@secondary",
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
    animated: true,
    premium: false,
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
        fill: "@secondary",
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
    animated: true,
    premium: true,
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
        fill: "@secondary",
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
    animated: true,
    premium: false,
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
    animated: true,
    premium: false,
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
        fill: "@background/85",
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
    animated: false,
    premium: false,
    collection: "core",
    layers: [
      frame("Camera", { x: 610, y: 90, width: 700, height: 700 }, {
        camera: true,
        shape: "ellipse",
        strokeColor: "@primary",
        strokeWidth: 8,
        effects: { shadow: { enabled: true, color: "@shadow", blur: 60, offsetY: 20, opacity: 0.6 } },
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
    animated: true,
    premium: false,
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
    animated: true,
    premium: true,
    collection: "core",
    layers: [
      alert("Sub alert", { x: 560, y: 400, width: 800, height: 240 }, "NEW SUB", "Tier 1 · Thank you!", {
        fill: "@primary/90",
        cornerRadius: 8,
        titleColor: "@text",
        subtitleColor: "@background",
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
    animated: true,
    premium: false,
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
    animated: true,
    premium: false,
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
    animated: true,
    premium: false,
    collection: "core",
    layers: [
      shape("Rail", { x: 40, y: 300, width: 72, height: 480 }, {
        fill: "@background/80",
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
    animated: true,
    premium: true,
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
    animated: true,
    premium: true,
    collection: "core",
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 84 }, {
        fill: "@background/88",
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
        fill: "@secondary",
      }),
      shape("Live pill", { x: 1740, y: 22, width: 140, height: 40 }, {
        fill: "@primary",
        cornerRadius: 20,
        animation: anim("pulse", { duration: 2000 }),
      }),
      text("Live", { x: 1740, y: 30, width: 140, height: 26 }, "● LIVE", {
        fontFamily: "Inter",
        fontSize: 18,
        fontWeight: 800,
        align: "center",
        fill: "@text",
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
        fill: "@background/85",
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
/*                            Gothic base templates                           */
/* -------------------------------------------------------------------------- */

/**
 * Authoring rules for the gothic collection:
 *  - Persistent widgets (camera, chat, social bars) animate in place — glow,
 *    float, flicker. Only transient elements (alerts, scene headlines) enter.
 *  - Blackletter faces are display-only; body text stays in a readable face.
 *  - Decor layers are named "Decor — …" so users can toggle them in Layers.
 */
const GOTHIC_TEMPLATES: BaseTemplate[] = [
  {
    id: "midnight-cathedral-start",
    name: "Midnight Cathedral — Starting Soon",
    category: "Starting Soon",
    tags: ["Fantasy"],
    collection: "gothic",
    subStyle: "Dark Goth",
    animated: true,
    premium: false,
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@primary/30", angle: 180 } },
      }),
      particles("Decor — Fog", { kind: "fog", count: 10, size: 5, speed: 0.6, color: "@secondary" }),
      particles("Decor — Stars", { kind: "stars", count: 40, size: 3, speed: 0.2, color: "@accent", opacity: 0.7 }),
      shape("Decor — Moon", { x: 830, y: 110, width: 260, height: 260 }, {
        shape: "ellipse",
        fill: "@accent/85",
        effects: { glow: { enabled: true, color: "@glow", strength: 80 } },
        animation: anim("float", { duration: 6000, intensity: 0.6 }),
      }),
      shape("Decor — Left column", { x: 150, y: 180, width: 80, height: 900 }, {
        fill: "@background/70",
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 0 } },
        opacity: 0.85,
      }),
      shape("Decor — Right column", { x: 1690, y: 180, width: 80, height: 900 }, {
        fill: "@background/70",
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 0 } },
        opacity: 0.85,
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
        fill: "@secondary",
        animation: anim("fade", { duration: 1200, delay: 800 }),
      }),
      social("Socials", { x: 460, y: 930, width: 1000, height: 56 }, {
        platforms: ["twitch", "youtube", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 1100 }),
      }),
    ],
  },

  {
    id: "crimson-vampire-gameplay",
    name: "Crimson Vampire — Gameplay",
    category: "Gameplay",
    tags: ["Horror", "Dark"],
    collection: "gothic",
    subStyle: "Vampire Goth",
    animated: true,
    premium: false,
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 78 }, {
        fill: "@background/88",
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
        fill: "@secondary",
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
        fontFamily: "Inter",
        animation: anim("fade", { duration: 900, delay: 500 }),
      }),
    ],
  },

  {
    id: "pastel-nightmare-chat",
    name: "Pastel Nightmare — Just Chatting",
    category: "Just Chatting",
    tags: ["Pink", "Cozy"],
    collection: "gothic",
    subStyle: "Pastel Goth",
    animated: true,
    premium: false,
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@primary/20", angle: 135 } },
      }),
      particles("Decor — Stars", { kind: "stars", count: 60, size: 4, speed: 0.4, color: "@accent" }),
      particles("Decor — Moths", { kind: "moths", count: 8, size: 5, speed: 0.8, color: "@primary", opacity: 0.75 }),
      frame("Webcam", { x: 90, y: 140, width: 1020, height: 574 }, {
        camera: true,
        strokeColor: "@primary",
        strokeWidth: 6,
        cornerRadius: 32,
        effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
        animation: anim("glow", { duration: 4200 }),
      }),
      shape("Name plate", { x: 90, y: 760, width: 640, height: 84 }, {
        fill: "@background/80",
        cornerRadius: 42,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 42 } },
      }),
      text("Display name", { x: 130, y: 778, width: 560, height: 50 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Grenze Gotisch",
        fontSize: 42,
        fontWeight: 700,
        fill: "@text",
      }),
      text("Slogan", { x: 92, y: 870, width: 900, height: 36 }, "{{SLOGAN}}", {
        fontFamily: "Inter",
        fontSize: 24,
        fontWeight: 400,
        fill: "@secondary",
      }),
      chatbox("Chat", { x: 1180, y: 140, width: 650, height: 740 }, {
        cornerRadius: 30,
        rows: 9,
        usernameColor: "@primary",
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 30 } },
      }),
      social("Socials", { x: 90, y: 950, width: 1000, height: 56 }, {
        platforms: ["twitch", "tiktok", "instagram", "discord"],
        iconColor: "@primary",
        animation: anim("fade", { duration: 900, delay: 400 }),
      }),
    ],
  },

  {
    id: "moonlit-witch-brb",
    name: "Moonlit Witch — Be Right Back",
    category: "BRB",
    tags: ["Fantasy", "Purple"],
    collection: "gothic",
    subStyle: "Witch Goth",
    animated: true,
    premium: false,
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@primary/25", angle: 200 } },
      }),
      particles("Decor — Fog", { kind: "fog", count: 9, size: 5, speed: 0.7, color: "@primary" }),
      particles("Decor — Stars", { kind: "stars", count: 50, size: 3, speed: 0.3, color: "@accent" }),
      // Moon phases: waxing to full to waning, the full moon glowing.
      shape("Decor — Phase 1", { x: 560, y: 240, width: 60, height: 60 }, { shape: "ellipse", fill: "@accent/30" }),
      shape("Decor — Phase 2", { x: 690, y: 225, width: 90, height: 90 }, { shape: "ellipse", fill: "@accent/55" }),
      shape("Decor — Full moon", { x: 830, y: 190, width: 160, height: 160 }, {
        shape: "ellipse",
        fill: "@accent/95",
        effects: { glow: { enabled: true, color: "@glow", strength: 70 } },
        animation: anim("pulse", { duration: 5200, intensity: 0.7 }),
      }),
      shape("Decor — Phase 4", { x: 1140, y: 225, width: 90, height: 90 }, { shape: "ellipse", fill: "@accent/55" }),
      shape("Decor — Phase 5", { x: 1300, y: 240, width: 60, height: 60 }, { shape: "ellipse", fill: "@accent/30" }),
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
        fill: "@secondary",
        animation: anim("fade", { duration: 1200, delay: 500 }),
      }),
      social("Socials", { x: 560, y: 880, width: 800, height: 56 }, {
        platforms: ["twitch", "discord", "instagram"],
        animation: anim("fade", { duration: 1000, delay: 900 }),
      }),
    ],
  },

  {
    id: "victorian-mourning-ending",
    name: "Victorian Mourning — Stream Ending",
    category: "Stream Ending",
    tags: ["Fantasy", "Dark"],
    collection: "gothic",
    subStyle: "Victorian Goth",
    animated: true,
    premium: true,
    layers: [
      shape("Backdrop", { x: 0, y: 0, width: 1920, height: 1080 }, {
        background: true,
        fill: "@background",
        effects: { gradient: { enabled: true, from: "@background", to: "@secondary/40", angle: 160 } },
      }),
      shape("Decor — Outer frame", { x: 70, y: 70, width: 1780, height: 940 }, {
        fill: "transparent",
        effects: { border: { enabled: true, color: "@accent", width: 3, radius: 4 } },
      }),
      shape("Decor — Inner frame", { x: 92, y: 92, width: 1736, height: 896 }, {
        fill: "transparent",
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 2 } },
      }),
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
    id: "cyber-coven-package",
    name: "Cyber Coven — Complete Package",
    category: "Complete Stream Package",
    tags: ["Cyberpunk", "Neon"],
    collection: "gothic",
    subStyle: "Cyber Goth",
    animated: true,
    premium: true,
    layers: [
      shape("Top bar", { x: 0, y: 0, width: 1920, height: 80 }, {
        fill: "@background/90",
        animation: anim("slide", { direction: "up", duration: 700 }),
      }),
      shape("Glitch line", { x: 0, y: 80, width: 1920, height: 3 }, {
        fill: "@accent",
        effects: { glow: { enabled: true, color: "@glow", strength: 22 } },
        animation: anim("flicker", { duration: 2400 }),
      }),
      img("Logo", { x: 30, y: 16, width: 48, height: 48 }, "{{LOGO}}", { logo: true }),
      text("Channel name", { x: 96, y: 18, width: 620, height: 44 }, "{{CHANNEL_NAME}}", {
        fontFamily: "Grenze Gotisch",
        fontSize: 34,
        fontWeight: 700,
        fill: "@text",
        letterSpacing: 2,
        textTransform: "uppercase",
      }),
      text("Slogan", { x: 98, y: 56, width: 620, height: 22 }, "{{SLOGAN}}", {
        fontFamily: "Rajdhani",
        fontSize: 15,
        fontWeight: 400,
        fill: "@secondary",
        letterSpacing: 3,
      }),
      shape("Live pill", { x: 1744, y: 20, width: 140, height: 40 }, {
        fill: "@primary",
        cornerRadius: 4,
        animation: anim("pulse", { duration: 2200 }),
      }),
      text("Live", { x: 1744, y: 28, width: 140, height: 26 }, "▚ LIVE", {
        fontFamily: "Rajdhani",
        fontSize: 19,
        fontWeight: 700,
        align: "center",
        fill: "@text",
        letterSpacing: 3,
      }),
      particles("Decor — Digital bats", { kind: "bats", count: 8, size: 5, speed: 1.1, color: "@secondary", opacity: 0.6 }),
      frame("Webcam", { x: 44, y: 650, width: 500, height: 281 }, {
        camera: true,
        shape: "hexagon",
        strokeColor: "@accent",
        strokeWidth: 3,
        corners: true,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("glow", { duration: 2600 }),
      }),
      chatbox("Chat", { x: 1496, y: 130, width: 384, height: 610 }, {
        fontFamily: "Rajdhani",
        cornerRadius: 8,
        rows: 8,
        usernameColor: "@secondary",
        effects: { border: { enabled: true, color: "@border", width: 1, radius: 8 } },
      }),
      // Alerts are transient by nature — an entry animation is correct here.
      alert("Alert", { x: 660, y: 120, width: 600, height: 180 }, "NEW FOLLOWER", "AwesomeViewer", {
        fontFamily: "Grenze Gotisch",
        cornerRadius: 8,
        opacity: 0.97,
        effects: { glow: { enabled: true, color: "@glow", strength: 34 } },
        animation: anim("elastic", { duration: 1200, delay: 900 }),
      }),
      shape("Bottom bar", { x: 0, y: 1014, width: 1920, height: 66 }, {
        fill: "@background/88",
        animation: anim("slide", { direction: "down", duration: 700, delay: 200 }),
      }),
      social("Socials", { x: 44, y: 1026, width: 900, height: 44 }, {
        platforms: ["twitch", "youtube", "discord", "x", "tiktok"],
        pill: false,
        fontFamily: "Rajdhani",
        fontSize: 21,
        iconColor: "@secondary",
        animation: anim("fade", { duration: 900, delay: 600 }),
      }),
    ],
  },

  {
    id: "gothic-romance-cam",
    name: "Gothic Romance — Webcam",
    category: "Webcam Frames",
    tags: ["Pink", "Dark"],
    collection: "gothic",
    subStyle: "Romantic Goth",
    animated: true,
    premium: false,
    layers: [
      particles("Decor — Petals", { kind: "petals", count: 16, size: 6, speed: 0.6, color: "@primary", opacity: 0.65 }),
      frame("Decor — Outer lace", { x: 300, y: 100, width: 1320, height: 760 }, {
        fill: "transparent",
        strokeColor: "@border",
        strokeWidth: 1,
        cornerRadius: 30,
      }),
      frame("Camera", { x: 320, y: 120, width: 1280, height: 720 }, {
        camera: true,
        strokeColor: "@accent",
        strokeWidth: 5,
        cornerRadius: 24,
        effects: { glow: { enabled: true, color: "@glow", strength: 30 } },
        animation: anim("glow", { duration: 4600 }),
      }),
      shape("Name plate", { x: 660, y: 880, width: 600, height: 72 }, {
        fill: "@background/85",
        cornerRadius: 36,
        effects: { border: { enabled: true, color: "@border", width: 2, radius: 36 } },
      }),
      text("Display name", { x: 660, y: 894, width: 600, height: 46 }, "{{DISPLAY_NAME}}", {
        fontFamily: "Grenze Gotisch",
        fontSize: 36,
        fontWeight: 700,
        align: "center",
        fill: "@text",
      }),
    ],
  },

  {
    id: "raven-manor-alert",
    name: "Raven Manor — Follower Alert",
    category: "Alerts",
    tags: ["Dark", "Nordic"],
    collection: "gothic",
    subStyle: "Gothic Horror",
    animated: true,
    premium: false,
    layers: [
      particles("Decor — Ravens", { kind: "bats", count: 10, size: 6, speed: 1.0, color: "@primary", opacity: 0.65 }),
      alert("Follower alert", { x: 560, y: 400, width: 800, height: 240 }, "A RAVEN ARRIVES", "New follower · AwesomeViewer", {
        fontFamily: "Cinzel Decorative",
        cornerRadius: 10,
        titleColor: "@accent",
        effects: {
          glow: { enabled: true, color: "@glow", strength: 36 },
          border: { enabled: true, color: "@border", width: 1, radius: 10 },
        },
        animation: anim("bounce", { duration: 1100 }),
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
function buildVariant(base: BaseTemplate, paletteId: string): Template {
  const tags = new Set<StyleTag>([...base.tags, ...paletteTags(paletteId)]);
  return {
    id: `${base.id}--${paletteId}`,
    name: base.name,
    category: base.category,
    tags: [...tags],
    collection: base.collection,
    subStyle: base.subStyle,
    premium: base.premium,
    animated: base.animated,
    paletteId,
    layers: base.layers.map((spec, i) => ({ ...spec, id: `${base.id}-l${i}` }) as Layer),
  };
}

/**
 * Palette-major order within each collection: the first screen of the gallery
 * shows every design once, not one design in fifteen colours. Collections pair
 * with their own palettes — a neon esports palette on a Victorian mourning
 * frame helps nobody.
 */
function expand(bases: BaseTemplate[], palettes: Palette[]): Template[] {
  return palettes.flatMap((palette) => bases.map((base) => buildVariant(base, palette.id)));
}

export const TEMPLATES: Template[] = [
  ...expand(BASE_TEMPLATES, CORE_PALETTES),
  ...expand(GOTHIC_TEMPLATES, GOTHIC_PALETTES),
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return TEMPLATE_BY_ID.get(id);
}

export function templateCount(): number {
  return TEMPLATES.length;
}

/** Deep clone so an opened project never aliases the shared template data. */
export function cloneLayers(layers: Layer[]): Layer[] {
  return structuredClone(layers);
}
