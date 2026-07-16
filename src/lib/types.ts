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
  // Continuous — glow-driven blinkers, motion loops.
  "blink",
  "neon",
  "heartbeat",
  "spin",
  "sway",
  "wobble",
  "orbit",
  "drift",
  "breathe",
  // One-shot entrances / accents.
  "flip",
  "pop",
  "drop",
  "swing",
  "glitch",
  "tada",
  "rubberBand",
  "roll",
  // Stinger cover→reveal: transparent → full cover at the mid peak → transparent.
  // The end pose is the CLEARED state, so a stinger actually wipes through.
  "sweep",
  "sweepScale",
  "flash",
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
  /** Optional middle stop — a bright metallic band / light reflection. */
  via?: ColorValue;
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

/**
 * The moulded-plastic look: a specular sweep across the top of a shape and a
 * darkened lip along the bottom. What makes a candy-gothic pill read as an
 * object rather than a flat rectangle.
 */
export interface Gloss {
  enabled: boolean;
  /** 0..1 — opacity of the highlight. */
  strength: number;
  /** "sheen" (default): a moulded top sweep. "streak": diagonal glass glints.
      "liquid": a drifting lens caustic with a specular rim and chromatic edge. */
  style?: "sheen" | "streak" | "liquid";
}

/** Extruded 3D lettering: the glyphs repeated along a depth vector in a side
    colour, with the front face on top. Editable text re-extrudes automatically. */
export interface Text3D {
  enabled: boolean;
  /** Extrusion length in px. */
  depth: number;
  /** Direction of the extrusion in degrees — 45 is down-right. */
  angle: number;
  /** The side/extrusion colour at the front of the depth (the front face uses
      the layer's own fill, which may itself be a gradient). */
  color: ColorValue;
  /** Optional colour at the *back* of the extrusion — the sides then run as a
      gradient from `color` to `colorTo`. Omitted, the sides just darken. */
  colorTo?: ColorValue;
}

export interface Effects {
  shadow: Shadow;
  glow: Glow;
  blur: Blur;
  border: Border;
  gradient: Gradient;
  gradientStroke?: GradientStroke;
  emboss?: Emboss;
  gloss?: Gloss;
  text3d?: Text3D;
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
  "icon",
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
  "goal",
  "particle",
  "video",
  "sprite",
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
  /** How the layer composites against everything below it. Omitted / "normal"
      is the default source-over. Maps to Konva's globalCompositeOperation. */
  blend?: BlendMode;
  effects: Effects;
  animation: Animation;
}

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "triangle"
  | "hexagon"
  | "line"
  /** A bare crescent: the lune between two circles. */
  | "crescent"
  /** A moon with a phase terminator, craters and limb darkening. */
  | "moon"
  /** Ornate bracket plaque — the alert/panel silhouette of holo packs. */
  | "plaque"
  /** Horizontal CRT lines across the box. */
  | "scanlines"
  /** A corner spiderweb: spokes with sagging catenary threads. */
  | "web"
  /** A panel whose bottom edge melts into hanging drips. */
  | "drip"
  /** Graveyard horizon: hill, fence, crosses, a leaning headstone. */
  | "graveyard"
  /** A hanging chain of links ending in a pendant. */
  | "chain"
  /** A casket silhouette: narrow head, wide shoulders, tapered foot. */
  | "coffin"
  /** A slanted parallelogram — the diagonal esports ribbon. */
  | "shard"
  /** A honeycomb lattice of hexagon outlines — the esports mesh accent. */
  | "hexmesh"
  /** A flowing curved energy ribbon: a thick, round-capped bezier stroke. */
  | "wave"
  /** A full-sheet glass overlay: facet pattern, prismatic colour spots and
      diagonal light reflections, over whatever is beneath it. */
  | "glasssheet"
  /** A stack of flowing, glowing plasma waves — one per flag colour — that
      drift and flow. Carries `facetColors`, substituted per pride palette. */
  | "flagwaves"
  /** A rectangle with its four corners cut at 45° — the mecha panel. */
  | "chamfer"
  /** A woven carbon-fibre texture fill. */
  | "carbon"
  /** A thrown-paint splatter: an irregular blob with radiating tendrils, flung
      satellite droplets and fine speckle. Carries the layer's fill and glow. */
  | "paintSplat"
  /** A matte aerosol haze — a density-graded cloud of fine dots. */
  | "paintSpray"
  /** A spray-can paint mark: a stippled colour field with a hard outline,
      overspray halo and wet drips. Matte. */
  | "spraySplat"
  /** A procedurally lit, mottled, cracked and speckled concrete wall. */
  | "concreteWall"
  /** A freehand stroke drawn with the pencil tool — a smoothed polyline through
      `points` (layer-local coords), stroked in the layer's fill colour. */
  | "freehand"
  /** A curved colour block: fills the area below an arc across the box, so
      layered over another colour it splits the screen along the curve.
      `cornerRadius` sets the arc's bend (0 = a straight edge). */
  | "arcsplit"
  /** A colour block below a multi-peak wave edge — a wavy divider. */
  | "wavesplit"
  /** A colour block below a straight slanted edge — a diagonal divider. */
  | "diagonalsplit"
  /** A colour block below a zigzag edge — a jagged divider. */
  | "zigzagsplit"
  /** A vertical lightning bolt stroked down the box — an esports seam. Thickness
      from cornerRadius; fill is the stroke colour, effects glow the edge. */
  | "bolt"
  /** A colour block filling to the RIGHT of the bolt centreline — its left edge
      is the lightning, so the fill butts against the seam. Pair with `bolt`. */
  | "boltpanel"
  /** Flag stripes bent into parallel arcs — a curved pride band. Colours from
      `facetColors`, arc bend from `cornerRadius`. */
  | "flagarc"
  /** Flag stripes bent into parallel waves — a wavy pride band. */
  | "flagwave"
  /** Flag stripes as concentric rings — a round pride burst. */
  | "flaground"
  /** Flag colours as wedges radiating from the centre — a sunburst/rays. */
  | "flagrays"
  /** Flag stripes bent into parallel zigzags. */
  | "flagzig"
  /** Brutalist print scaffold: heavy rules, crop marks, a registration
      crosshair and a tick ruler. */
  | "printRules"
  /** A mis-registered riso paint block: a red block with a purple ghost, a
      halftone foot-bleed and a frayed screenprint edge. */
  | "misprintBlock"
  /** A graduated halftone dot screen, dense to sparse across the box. */
  | "halftoneField"
  /** A soft aurora: overlapping drifting radial colour fields (uses
      `facetColors`). `cornerRadius` scales the bloom. */
  | "auroraField"
  /** A glowing silk ribbon: an undulating constant-thickness band with a
      travelling perpendicular sheen. */
  | "silkRibbon"
  /** A heavy neon bloom veil: big soft radial glows pooled top and bottom
      (uses `facetColors`). */
  | "bloomVeil"
  /** A tiling damask ornament — mirrored ogee lattice with quatrefoil centres,
      the Victorian-witch wallpaper. Stroked in the layer's fill colour. */
  | "damask"
  /** A parchment scroll plate: a rounded sheet flanked by two rolled rods, the
      witch-grimoire panel/alert silhouette. */
  | "scroll"
  /** A five-pointed star. */
  | "star"
  /** A many-pointed sunburst / seal. */
  | "burst"
  /** A block arrow pointing right (rotate for any direction). */
  | "arrow"
  /** A thick plus/cross (rotate 45° for an X). */
  | "cross"
  /** A cog wheel: toothed rim around a centre hole. */
  | "gear"
  /** A tick / checkmark, drawn as a rounded stroke. */
  | "check"
  /** A ring / annulus — a filled disc with a centre hole (a progress ring). */
  | "ring"
  /** A jack-o'-lantern: a ribbed pumpkin body, a stem and a carved face. */
  | "pumpkin"
  /** A lightning bolt. */
  | "bolt"
  /** A title ribbon/banner with forked ends. */
  | "banner"
  /** A rounded speech bubble with a tail — for callouts. */
  | "bubble"
  /** A plain rhombus (rotated square) — the diamond plate. */
  | "diamond"
  /** A faceted cut gem — a rhombus with cut lines. */
  | "gem"
  /** A tiling harlequin/argyle diamond lattice, stroked in the fill colour. */
  | "harlequin"
  /** A cartoon ghost: a domed body with a scalloped hem and two dark eyes —
      the gothic stinger motif that zooms up to cover the frame. */
  | "ghost"
  /** A heart — the pride stinger motif. */
  | "heart"
  /** A thick strip whose centreline is a gentle sine wave — a wavy version of a
      straight bar. Stroke thickness ≈ half the box height. */
  | "sinestrip";

export interface ShapeLayer extends LayerBase {
  type: "shape" | "background";
  shape: ShapeKind;
  fill: ColorValue;
  cornerRadius: number;
  /** For `shape: "moon"`. 0 = new, 0.5 = half, 1 = full. */
  moonPhase?: number;
  /** For `shape: "moon"`. A full moon without craters reads as a flat disc. */
  craters?: boolean;
  /** For `shape: "glasssheet"`. Literal hex colours the prism disperses the
      light into — a pride flag, substituted per palette like flag stripes.
      Absent → the default cyan/magenta/gold prism tints. */
  facetColors?: string[];
  /** For `shape: "glasssheet"`. How the flag colours are laid on the glass:
      "sides" a few thicker lines hugging each edge (default), or "stripes" a
      full field of thin diagonal pinstripes. */
  facetMode?: "sides" | "stripes";
  /** For `shape: "freehand"`. Smoothed polyline points [x0,y0,x1,y1,…] in
      layer-local coordinates. */
  points?: number[];
  /** For `shape: "freehand"`. Stroke width of the drawn line. */
  strokeWidth?: number;
  /** For `shape: "freehand"`. Dash pattern (marker/dashed/dotted brushes). */
  dash?: number[];
  /** For `shape: "freehand"`. How the points render: "line" a stroked polyline
      (default), "fill" a filled outline polygon (ink/calligraphy brushes),
      "spray" scattered dots along the path (airbrush/crayon), or "sketch" a few
      jittered overlaid strokes (a pencil-sketch look). */
  drawStyle?: "line" | "fill" | "spray" | "sketch";
  /** For `shape: "freehand"`. Stroke the line with a rainbow gradient. */
  rainbow?: boolean;
  /** For `shape: "freehand"`. Clip the stroke to this rect (layer-local coords)
      — used to keep webcam-frame drawings in a band around the frame. */
  clip?: { x: number; y: number; width: number; height: number };
  /** For `shape: "freehand"`. A drawing layer that holds many pen strokes, each
      with its own style (so different brushes/colours mix in one layer). When
      present, this is rendered instead of the single-stroke `points`. Stroke
      points are in absolute canvas coordinates. */
  strokes?: Stroke[];
}

/** One pen stroke inside a multi-stroke drawing layer. Carries its own look so
    a single layer can mix brushes and colours. Points are absolute canvas
    coordinates. */
export interface Stroke {
  points: number[];
  color: ColorValue;
  width: number;
  drawStyle: "line" | "fill" | "spray" | "sketch";
  dash?: number[];
  rainbow?: boolean;
  /** Glow blur in px; the glow colour is the stroke colour. */
  glow?: number;
  opacity?: number;
  /** Mask rect in absolute canvas coordinates (webcam-band drawings). */
  clip?: { x: number; y: number; width: number; height: number };
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

/**
 * A catalogue icon. The artwork is a plain path, so the colour is a theme
 * token like every other fill — recolour the theme, recolour every icon.
 */
export interface IconLayer extends LayerBase {
  type: "icon";
  /** Named apart from `ChipLayer.icon`: the two vocabularies differ, and
      merging them would narrow both in `LayerPatch`. */
  symbol: string;
  fill: ColorValue;
  /** Outline weight for stroke-drawn icons. */
  strokeWidth: number;
  /** A library icon (Lucide / Font Awesome): raw SVG inner markup on an
      `iconW`×`iconH` viewBox, self-contained so it survives export. When set it
      is drawn instead of the built-in `symbol` path; `currentColor` in the body
      is filled/stroked with `fill`. */
  body?: string;
  iconW?: number;
  iconH?: number;
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
  /** Title-bar button style: undefined/"dots" = round traffic-lights (default),
      "win95" = raised grey square minimise/maximise/close buttons. */
  chromeStyle?: "dots" | "win95";
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
  /** Two-part pill: an icon cap on the left, a dark text block on the right. */
  split?: boolean;
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
  /** Bend the text along an arc: 0 straight, positive arches up, negative down
      (roughly -100…100). Rendered along a path, single-line only. */
  curve?: number;
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

/** Directional movement a sprite can carry, on top of its frame animation. */
export const SPRITE_MOTIONS = [
  "none",
  "walk-lr", // paces left/right across the page, facing its direction
  "cross", // marches all the way across and loops back to the start
  "bob", // stays put, bobbing up and down
  "float", // gentle drifting figure-eight in place
  "drift-up", // rises and wraps (bubbles, embers, ghosts)
] as const;
export type SpriteMotion = (typeof SPRITE_MOTIONS)[number];

/**
 * A sprite sheet played frame-by-frame like a game character, optionally
 * roaming the overlay. The sheet is one image laid out in a `cols`×`rows`
 * grid; the frame index is derived from the render clock so playback is
 * deterministic and captured by both video and PNG-sequence export.
 */
export interface SpriteLayer extends LayerBase {
  type: "sprite";
  /** The packed sprite sheet as a data URL. */
  src: string;
  cols: number;
  rows: number;
  /** Frames actually used (the last grid cells may be blank). */
  frameCount: number;
  /** Playback speed in frames per second. */
  fps: number;
  /** Freeze on the first frame (preview/pose) instead of animating. */
  playing: boolean;
  motion: SpriteMotion;
  /** Movement speed multiplier, ~0.25..3. */
  motionSpeed: number;
  /** Mirror the sprite to face its travel direction (walk/cross). */
  faceDirection: boolean;
  /** Knock out a solid background colour (magenta-key sheets, etc.) so the
      sprite is transparent over the stream. */
  removeBg: boolean;
  /** The colour treated as transparent when `removeBg` is on. */
  chromaKey: string;
  /** How close a pixel must be to `chromaKey` to be knocked out (0..100). */
  chromaTolerance: number;
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
  /** A glowing light travels around the frame edge. Always on for cameras;
      opt-in here so a decorative container (e.g. a goals box) can carry the
      same moving line while its contents stay still. */
  runner?: boolean;
  /** Pride palettes colour the runner with the flag instead of a flat accent. */
  runnerColors?: string[];
  /** Edge-light travel speed multiplier (~0.25..3). */
  runnerSpeed?: number;
}

export interface ChatBoxLayer extends LayerBase {
  type: "chatbox";
  /** Panel silhouette. A coffin is the gothic chat box. */
  boxShape?: "rect" | "coffin";
  fill: ColorValue;
  cornerRadius: number;
  fontFamily: string;
  fontSize: number;
  usernameColor: ColorValue;
  messageColor: ColorValue;
  rows: number;
  /** A glowing line travels around the box edge (like the webcam/goal runner). */
  runner?: boolean;
  /** Pride palettes colour that runner with the flag instead of a flat accent. */
  runnerColors?: string[];
  /** Edge-light travel speed multiplier (~0.25..3). */
  runnerSpeed?: number;
}

export interface AlertLayer extends LayerBase {
  type: "alert";
  fill: ColorValue;
  cornerRadius: number;
  /** Plate silhouette. A sideways coffin is the gothic alert. */
  boxShape?: "rect" | "coffin";
  fontFamily: string;
  title: string;
  subtitle: string;
  titleColor: ColorValue;
  subtitleColor: ColorValue;
  /** The viewer-avatar disc. Off for alerts that read cleaner without it. */
  avatar?: boolean;
}

/**
 * A follower / sub / donation goal. Rendered two ways from the same data: a
 * horizontal progress bar (which takes the family's plate silhouette) or a
 * radial ring. The fill fraction is current/target, clamped to [0,1].
 */
export interface GoalLayer extends LayerBase {
  type: "goal";
  goalStyle: "bar" | "ring";
  label: string;
  current: number;
  target: number;
  /** Bar plate silhouette; matches the family (coffin for gothic, etc.). */
  barShape?: "rect" | "coffin" | "plaque";
  /** Plate/panel behind the bar, and the ring's hub. */
  fill: ColorValue;
  /** Unfilled track. */
  trackColor: ColorValue;
  /** Filled portion. */
  barColor: ColorValue;
  labelColor: ColorValue;
  valueColor: ColorValue;
  fontFamily: string;
  cornerRadius: number;
  /** A glowing line travels around this widget's own edge — the moving accent
      that replaces an entrance animation. Each goal runs its own. */
  runner?: boolean;
  /** Pride palettes colour the runner with the flag instead of a flat accent. */
  runnerColors?: string[];
  /** Edge-light travel speed multiplier (~0.25..3). */
  runnerSpeed?: number;
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
  /** Falling rain: many thin near-vertical streaks. */
  | "rain"
  /** Blurred mesh-gradient orbs cycling through the theme's brand hues. */
  | "blobs"
  /** Drifting sheeted ghosts. */
  | "ghosts"
  /** Out-of-focus lights: soft discs with a brighter rim. */
  | "bokeh";

export interface ParticleLayer extends LayerBase {
  type: "particle";
  kind: ParticleKind;
  count: number;
  color: ColorValue;
  size: number;
  speed: number;
  /** Optional per-particle palette — each particle cycles through these instead
      of the single `color`. Pride packs substitute the flag stripes here. */
  facetColors?: ColorValue[];
}

export type Layer =
  | ShapeLayer
  | FlagLayer
  | IconLayer
  | WindowLayer
  | ChipLayer
  | TextLayer
  | ImageLayer
  | SpriteLayer
  | FrameLayer
  | ChatBoxLayer
  | AlertLayer
  | SocialLayer
  | GoalLayer
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
    Fields<IconLayer> &
    Fields<WindowLayer> &
    Fields<ChipLayer> &
    Fields<TextLayer> &
    Fields<ImageLayer> &
    Fields<SpriteLayer> &
    Fields<FrameLayer> &
    Fields<ChatBoxLayer> &
    Fields<AlertLayer> &
    Fields<SocialLayer> &
    Fields<GoalLayer> &
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
  "Goals",
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
  /** Groups linked sibling screens into one pack; null = standalone / legacy. */
  packId: string | null;
  /** Denormalised pack label, identical on every sibling. */
  packName: string | null;
  /** Reading order within the pack. */
  packOrder: number;
  /** Screen role (Starting Soon / BRB / …), captured so the switcher and My
      Designs can label screens even when templateId no longer resolves. */
  category: TemplateCategory | null;
  /** Artboard size. Absent = the classic 1920×1080; set for vertical/square
      formats (TikTok/Shorts). Layers keep their coordinates, so switching format
      may need a reposition. */
  canvasWidth?: number;
  canvasHeight?: number;
}

/** Selectable artboard formats. The first is the default 16:9. */
export const CANVAS_PRESETS: Array<{ id: string; label: string; w: number; h: number }> = [
  { id: "landscape", label: "Landscape · 1920×1080", w: 1920, h: 1080 },
  { id: "vertical", label: "Vertical · 1080×1920", w: 1080, h: 1920 },
  { id: "square", label: "Square · 1080×1080", w: 1080, h: 1080 },
  { id: "landscape-1440", label: "Landscape · 2560×1440", w: 2560, h: 1440 },
];
