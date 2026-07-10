/**
 * Core data model for Asarayja Stream Overlays.
 *
 * The central idea: a template is *pure data*. It never contains a literal
 * colour or a literal channel name. Instead it contains:
 *
 *   - theme tokens   `@primary`, `@accent`, ...  resolved from the project theme
 *   - placeholders   `{{CHANNEL_NAME}}`, `{{LOGO}}` resolved from the channel profile
 *
 * Rendering is therefore always `template + theme + profile -> resolved layers`.
 * That single rule is what makes "change one colour and the whole overlay
 * updates" and "never type your name twice" fall out for free.
 */

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

/* -------------------------------------------------------------------------- */
/*                                   Theme                                    */
/* -------------------------------------------------------------------------- */

/**
 * The full design-token set. Every colour in every template is one of these —
 * no layer ever stores a hex code of its own.
 *
 * The first eight are the *core* tokens palettes are authored in; the rest can
 * be derived from them by `completeTheme` so a palette author tunes eight
 * values and gets a coherent sixteen-token system, but may also override any
 * derived token by hand where the derivation isn't good enough.
 */
export const THEME_TOKENS = [
  // backgrounds
  "background",
  "backgroundSecondary",
  "surface",
  "surfaceSecondary",
  // brand
  "primary",
  "secondary",
  "accent",
  "accentSecondary",
  // text
  "text",
  "textSecondary",
  // effects
  "border",
  "glow",
  "shadow",
  // status
  "success",
  "warning",
  "error",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

export type Theme = Record<ThemeToken, string>;

/** The tokens a palette must author; everything else is derivable. */
export type CoreTheme = Pick<
  Theme,
  "background" | "primary" | "secondary" | "accent" | "text" | "border" | "glow" | "shadow"
>;

/**
 * Either a literal CSS colour (`#ff0055`, `rgba(0,0,0,.5)`) or a theme
 * reference (`@accent`). Theme references are what templates ship with.
 */
export type ColorValue = string;

export interface Palette {
  id: string;
  name: string;
  tags: string[];
  collection: Collection;
  /**
   * Pack identity within a themed collection (gothic/pride). A collection is
   * one design family; palette × family = a complete, coherent pack, so the
   * sub-style naturally lives on the palette, not the template.
   */
  subStyle?: string;
  /** Authentic flag stripe colours for pride packs; substituted into flag layers. */
  flag?: string[];
  theme: Theme;
}

/* -------------------------------------------------------------------------- */
/*                              Channel profile                               */
/* -------------------------------------------------------------------------- */

export const SOCIAL_PLATFORMS = [
  "twitch",
  "youtube",
  "kick",
  "discord",
  "x",
  "tiktok",
  "instagram",
  "facebook",
  "steam",
  "epic",
  "battlenet",
  "roblox",
  "minecraft",
  "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface ChannelProfile {
  channelName: string;
  displayName: string;
  slogan: string;
  /** Data URL or remote URL. */
  logo: string;
  profileImage: string;
  socials: Record<SocialPlatform, string>;
  /** The user's personal default theme, applied to newly opened templates. */
  theme: Theme;
}

/* -------------------------------------------------------------------------- */
/*                                 Animation                                  */
/* -------------------------------------------------------------------------- */

export const ANIMATION_PRESETS = [
  "none",
  "fade",
  "slide",
  "zoom",
  "bounce",
  "pulse",
  "glow",
  "typewriter",
  "rotate",
  "float",
  "wave",
  "shimmer",
  "shake",
  "flicker",
  "scale",
  "elastic",
] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export const EASINGS = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "backOut",
  "elasticOut",
  "bounceOut",
] as const;

export type Easing = (typeof EASINGS)[number];

export type SlideDirection = "left" | "right" | "up" | "down";

export interface Animation {
  preset: AnimationPreset;
  /** Milliseconds. */
  duration: number;
  delay: number;
  easing: Easing;
  loop: boolean;
  direction: SlideDirection;
  /** Multiplier for the preset's built-in travel/strength. */
  intensity: number;
}

export const DEFAULT_ANIMATION: Animation = {
  preset: "none",
  duration: 800,
  delay: 0,
  easing: "easeOut",
  loop: false,
  direction: "left",
  intensity: 1,
};

/* -------------------------------------------------------------------------- */
/*                                  Effects                                   */
/* -------------------------------------------------------------------------- */

export interface Shadow {
  enabled: boolean;
  color: ColorValue;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface Glow {
  enabled: boolean;
  color: ColorValue;
  strength: number;
}

export interface Blur {
  enabled: boolean;
  amount: number;
}

export interface Border {
  enabled: boolean;
  color: ColorValue;
  width: number;
  radius: number;
}

export interface Gradient {
  enabled: boolean;
  from: ColorValue;
  to: ColorValue;
  /** Degrees, 0 = left-to-right. */
  angle: number;
}

/**
 * A stroke painted with a gradient rather than a flat colour — the holographic
 * and chrome edges that define Y2K and sci-fi HUD packs. Optional: layers saved
 * before this existed simply have no gradient stroke.
 */
export interface GradientStroke {
  enabled: boolean;
  from: ColorValue;
  to: ColorValue;
  angle: number;
  width: number;
}

/** Bevelled/embossed lettering: a light edge above, a dark edge below. */
export interface Emboss {
  enabled: boolean;
  light: ColorValue;
  dark: ColorValue;
  depth: number;
}

export interface Effects {
  shadow: Shadow;
  glow: Glow;
  blur: Blur;
  border: Border;
  gradient: Gradient;
  gradientStroke?: GradientStroke;
  emboss?: Emboss;
}

export const DEFAULT_EFFECTS: Effects = {
  shadow: { enabled: false, color: "@shadow", blur: 24, offsetX: 0, offsetY: 8, opacity: 0.6 },
  glow: { enabled: false, color: "@glow", strength: 24 },
  blur: { enabled: false, amount: 8 },
  border: { enabled: false, color: "@border", width: 2, radius: 12 },
  gradient: { enabled: false, from: "@primary", to: "@accent", angle: 90 },
};

/* -------------------------------------------------------------------------- */
/*                                   Layers                                   */
/* -------------------------------------------------------------------------- */

export const LAYER_TYPES = [
  "background",
  "shape",
  "flag",
  "window",
  "chip",
  "text",
  "image",
  "logo",
  "frame",
  "camera",
  "chatbox",
  "alert",
  "social",
  "particle",
  "video",
] as const;

export type LayerType = (typeof LAYER_TYPES)[number];

export interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** 0..1 */
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Id of the owning group, if any. */
  groupId?: string;
  effects: Effects;
  animation: Animation;
}

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "triangle"
  | "hexagon"
  | "line"
  /** Moon: an outer disc with an offset bite taken out of it. */
  | "crescent"
  /** Ornate bracket plaque — the alert/panel silhouette of holo packs. */
  | "plaque"
  /** Horizontal CRT lines across the box. */
  | "scanlines";

export interface ShapeLayer extends LayerBase {
  type: "shape" | "background";
  shape: ShapeKind;
  fill: ColorValue;
  cornerRadius: number;
}

/**
 * A striped flag bar. Stripes are literal hex colours — deliberately outside
 * the token system, because a pride flag's colours are *the flag's*, not the
 * theme's. Each pride palette carries its authentic stripe set and the
 * variant builder substitutes it in, so the Trans Aurora pack flies the trans
 * flag while the surrounding design stays in the harmonised palette.
 */
export interface FlagLayer extends LayerBase {
  type: "flag";
  stripes: string[];
  /** Axis the stripes are stacked along. */
  stackDirection: "vertical" | "horizontal";
  cornerRadius: number;
}

/** A retro OS window: title bar, traffic-light buttons, glass gloss. */
export interface WindowLayer extends LayerBase {
  type: "window";
  title: string;
  fill: ColorValue;
  titleBarColor: ColorValue;
  textColor: ColorValue;
  fontFamily: string;
  fontSize: number;
  cornerRadius: number;
  buttons: boolean;
  gloss: boolean;
  /**
   * What lives inside the frame. `camera` keeps the interior transparent in
   * `live` mode so OBS composites the webcam through it; `chat` paints the
   * same sample rows a chat box does — an empty CHAT.EXE is not a chat box.
   */
  content: "empty" | "camera" | "chat";
  /** Chat rendering, when `content` is "chat". */
  chatFontSize: number;
  usernameColor: ColorValue;
  messageColor: ColorValue;
  rows: number;
}

/** A compact event badge: "RECENT SUB · pixel_wren". */
export interface ChipLayer extends LayerBase {
  type: "chip";
  label: string;
  value: string;
  fill: ColorValue;
  labelColor: ColorValue;
  valueColor: ColorValue;
  fontFamily: string;
  fontSize: number;
  cornerRadius: number;
  icon: "heart" | "star" | "none";
}

export type TextTransform = "none" | "uppercase" | "lowercase";

export interface TextLayer extends LayerBase {
  type: "text";
  /** May contain `{{PLACEHOLDER}}` tokens. */
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  fill: ColorValue;
  /**
   * Per-character stripe colouring — the "each letter its own flag colour"
   * treatment. Literal hexes like flag layers; pride palettes substitute
   * their authentic stripes in. Single-line text only; `fill` is the
   * fallback when unset.
   */
  fillStripes?: string[];
  textTransform: TextTransform;
}

export type ImageFit = "cover" | "contain" | "fill";

export interface ImageLayer extends LayerBase {
  type: "image" | "logo" | "video";
  /** URL, data URL, or `{{LOGO}}` / `{{PROFILE_IMAGE}}`. */
  src: string;
  fit: ImageFit;
  cornerRadius: number;
}

/** A decorative frame, or a transparent hole for the webcam feed. */
export type FrameShape = "rect" | "ellipse" | "hexagon";

export interface FrameLayer extends LayerBase {
  type: "frame" | "camera";
  /** Named apart from `ShapeLayer.shape`: the two vocabularies differ, and
      merging them would narrow both in `LayerPatch`. */
  frameShape: FrameShape;
  fill: ColorValue;
  strokeColor: ColorValue;
  strokeWidth: number;
  cornerRadius: number;
  /** Small accent notches in the corners — the "esports" look. */
  corners: boolean;
}

export interface ChatBoxLayer extends LayerBase {
  type: "chatbox";
  fill: ColorValue;
  cornerRadius: number;
  fontFamily: string;
  fontSize: number;
  usernameColor: ColorValue;
  messageColor: ColorValue;
  rows: number;
}

export interface AlertLayer extends LayerBase {
  type: "alert";
  fill: ColorValue;
  cornerRadius: number;
  fontFamily: string;
  title: string;
  subtitle: string;
  titleColor: ColorValue;
  subtitleColor: ColorValue;
}

export interface SocialLayer extends LayerBase {
  type: "social";
  platforms: SocialPlatform[];
  direction: "horizontal" | "vertical";
  gap: number;
  iconColor: ColorValue;
  textColor: ColorValue;
  fontFamily: string;
  fontSize: number;
  showHandles: boolean;
  pill: boolean;
  pillColor: ColorValue;
}

export type ParticleKind =
  | "dots"
  | "stars"
  | "embers"
  | "snow"
  | "bubbles"
  // Themed decor. Same deterministic engine — a bat at time t is always the
  // same bat, so exports and OBS agree.
  | "bats"
  | "moths"
  | "petals"
  | "fog"
  // Pride decor.
  | "confetti"
  | "hearts"
  | "rays"
  // Sky decor.
  | "clouds"
  | "shootingStars"
  /** Blurred mesh-gradient orbs cycling through the theme's brand hues. */
  | "blobs";

export interface ParticleLayer extends LayerBase {
  type: "particle";
  kind: ParticleKind;
  count: number;
  color: ColorValue;
  size: number;
  speed: number;
}

export type Layer =
  | ShapeLayer
  | FlagLayer
  | WindowLayer
  | ChipLayer
  | TextLayer
  | ImageLayer
  | FrameLayer
  | ChatBoxLayer
  | AlertLayer
  | SocialLayer
  | ParticleLayer;

/**
 * A patch that may touch any field of any layer kind.
 *
 * The editor's property panel is generic over layer type, so `Partial<Layer>`
 * (a union of partials) would reject `{ fontSize }` unless it could first prove
 * the layer is text. Intersecting the members instead keeps every field name
 * checked while letting a single `updateLayer` serve all of them.
 *
 * `type` is dropped before intersecting: its literal types don't overlap, and
 * TypeScript reduces an intersection with an impossible discriminant to `never`.
 * A layer's kind is fixed at creation anyway.
 */
type Fields<T> = Omit<T, "type">;

export type LayerPatch = Partial<
  Fields<ShapeLayer> &
    Fields<FlagLayer> &
    Fields<WindowLayer> &
    Fields<ChipLayer> &
    Fields<TextLayer> &
    Fields<ImageLayer> &
    Fields<FrameLayer> &
    Fields<ChatBoxLayer> &
    Fields<AlertLayer> &
    Fields<SocialLayer> &
    Fields<ParticleLayer>
>;

/* -------------------------------------------------------------------------- */
/*                          Templates & projects                              */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_CATEGORIES = [
  "Gameplay",
  "Just Chatting",
  "Starting Soon",
  "BRB",
  "Stream Ending",
  "Offline",
  "Pause",
  "Intermission",
  "Stream Panels",
  "Webcam Frames",
  "Alerts",
  "Chat Boxes",
  "Social Bars",
  "Stinger Transitions",
  "Complete Stream Package",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const STYLE_TAGS = [
  "Dark",
  "Light",
  "Cyberpunk",
  "Neon",
  "Fantasy",
  "Cozy",
  "Minimal",
  "RGB",
  "Esports",
  "Anime",
  "Nordic",
  "Horror",
  "Sci-Fi",
  "Purple",
  "Blue",
  "Green",
  "Pink",
  "Orange",
  "Red",
] as const;

export type StyleTag = (typeof STYLE_TAGS)[number];

/**
 * Collections split the library into visual families. Core templates expand
 * across the core palettes, gothic across the gothic ones, pride across the
 * pride ones — a neon esports palette on a Victorian mourning frame helps
 * nobody.
 *
 * Within gothic and pride, every base template is one *screen* of a shared
 * design family (Starting Soon, BRB, Gameplay, alerts, …). Expanding the
 * family across a collection's palettes yields complete packs: every screen
 * of "Midnight Cathedral" exists, in the same visual identity.
 */
export type Collection = "core" | "gothic" | "pride";

export const GOTHIC_STYLES = [
  "Dark Goth",
  "Pastel Goth",
  "Victorian Goth",
  "Romantic Goth",
  "Vampire Goth",
  "Witch Goth",
  "Gothic Fantasy",
  "Cyber Goth",
  "Gothic Horror",
  "Dark Academia",
] as const;

export type GothicStyle = (typeof GOTHIC_STYLES)[number];

export const PRIDE_STYLES = [
  "Classic Pride",
  "Progress Pride",
  "Trans Pride",
  "Bisexual",
  "Pastel Pride",
  "Neon Pride",
  "Crystal Pride",
  "Cosmic Pride",
  "Soft Pride",
  "Dark Pride",
  "Minimal Pride",
  "Luxury Pride",
] as const;

export type PrideStyle = (typeof PRIDE_STYLES)[number];

/**
 * Everything is free and every template works both ways: exported as a still
 * (settled pose) or played animated. There is deliberately no premium flag and
 * no static/animated split — motion is a per-project toggle, not a template
 * property.
 */
export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  tags: StyleTag[];
  collection: Collection;
  /** Design family this screen belongs to; screens of a family share a ground. */
  family?: string;
  /** Pack sub-style, inherited from the variant's palette. */
  subStyle?: string;
  /** Palette this variant ships with; the user can swap it instantly. */
  paletteId: string;
  layers: Layer[];
}

export interface Project {
  id: string;
  name: string;
  templateId: string;
  theme: Theme;
  layers: Layer[];
  /** Short code used for the OBS browser source URL. */
  obsCode: string;
  /**
   * Master motion switch. Off = the overlay renders its settled pose
   * everywhere, including the live OBS view. Absent (older saves) means on.
   */
  animationsEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  folder: string | null;
}
