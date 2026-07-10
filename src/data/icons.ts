/**
 * The icon catalogue.
 *
 * Every icon is original path data on a 24×24 grid, drawn for this project.
 * Two reasons it isn't a package:
 *
 *  - Konva paints on a canvas, so it needs `d` strings, not React components.
 *    Icon libraries ship components; extracting their paths at build time
 *    couples us to their internals.
 *  - An icon layer takes its colour from a theme token like everything else.
 *    That means the artwork must be a plain path we fill ourselves, never a
 *    baked-in `fill` or a multi-colour sprite.
 *
 * `stroke: true` icons are drawn as outlines at `strokeScale` × the layer's
 * stroke width; the rest are filled.
 */
export interface IconDef {
  /** Path data on a 24×24 viewBox. */
  d: string;
  stroke?: boolean;
  strokeScale?: number;
  group: "Gothic" | "Occult" | "Nature" | "Objects" | "Generic";
}

export const ICONS = {
  /* ------------------------------- gothic -------------------------------- */
  bat: {
    group: "Gothic",
    d: "M12 8.2c-1 0-1.8.7-2.1 1.7-.9-1.4-2.3-2.6-4-3-.5-.1-.9.4-.7.9.4.9.5 1.9.2 2.9-.2.6.3 1.2.9 1.1 1.4-.2 2.6.5 3.2 1.7l.7 1.4c.3.6.6 1 1.8 1s1.5-.4 1.8-1l.7-1.4c.6-1.2 1.8-1.9 3.2-1.7.6.1 1.1-.5.9-1.1-.3-1-.2-2 .2-2.9.2-.5-.2-1-.7-.9-1.7.4-3.1 1.6-4 3-.3-1-1.1-1.7-2.1-1.7z",
  },
  skull: {
    group: "Gothic",
    d: "M12 2.5c-4.4 0-7.5 3-7.5 7 0 2.3 1 4 2.5 5.1V17c0 .8.7 1.5 1.5 1.5h.8V20c0 .8.7 1.5 1.5 1.5h2.4c.8 0 1.5-.7 1.5-1.5v-1.5h.8c.8 0 1.5-.7 1.5-1.5v-2.4c1.5-1.1 2.5-2.8 2.5-5.1 0-4-3.1-7-7.5-7zM9.2 11.6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zm5.6 0a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z",
  },
  cross: {
    group: "Gothic",
    d: "M10.4 2h3.2v5.2H19v3.2h-5.4v6.3l-1.6 5.3-1.6-5.3v-6.3H5V7.2h5.4z",
  },
  coffin: {
    group: "Gothic",
    d: "M8.6 2h6.8L20 8.4 17.6 22H6.4L4 8.4z",
    stroke: true,
    strokeScale: 1.6,
  },
  spider: {
    group: "Gothic",
    // Round body, small head, eight legs that bow up to a knee then out to a
    // foot. Kept simple and well-separated so it never blobs into a crown.
    d: "M12 10.8a2.1 2.6 0 1 0 0 5.2 2.1 2.6 0 0 0 0-5.2zM12 8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM10 12.6Q8.8 8.9 6.3 11.6M10 12.6Q7.7 10.2 4.2 13.9M10 12.6Q7.6 11.7 4.1 16.7M10 12.6Q8.6 12.9 5.8 18.9M14 12.6Q15.2 8.9 17.7 11.6M14 12.6Q16.3 10.2 19.8 13.9M14 12.6Q16.4 11.7 19.9 16.7M14 12.6Q15.4 12.9 18.2 18.9",
    stroke: true,
    strokeScale: 0.75,
  },
  web: {
    group: "Gothic",
    // Five spokes from the corner, four rings of threads sagging between them.
    // Computed rather than eyeballed, so the rings stay concentric.
    d: "M2 2L23.5 2.0M2 2L21.9 10.2M2 2L17.2 17.2M2 2L10.2 21.9M2 2L2.0 23.5M8.5 2.0Q7.1 3.0 8.0 4.5M8.0 4.5Q6.3 4.9 6.6 6.6M6.6 6.6Q4.9 6.3 4.5 8.0M4.5 8.0Q3.0 7.1 2.0 8.5M13.5 2.0Q11.0 3.8 12.6 6.4M12.6 6.4Q9.6 7.1 10.1 10.1M10.1 10.1Q7.1 9.6 6.4 12.6M6.4 12.6Q3.8 11.0 2.0 13.5M18.5 2.0Q14.9 4.6 17.2 8.3M17.2 8.3Q13.0 9.3 13.7 13.7M13.7 13.7Q9.3 13.0 8.3 17.2M8.3 17.2Q4.6 14.9 2.0 18.5M23.0 2.0Q18.5 5.3 21.4 10.0M21.4 10.0Q16.0 11.3 16.8 16.8M16.8 16.8Q11.3 16.0 10.0 21.4M10.0 21.4Q5.3 18.5 2.0 23.0",
    stroke: true,
    strokeScale: 0.7,
  },
  moon: {
    group: "Nature",
    d: "M20.4 14.6A9 9 0 0 1 9.4 3.6a9 9 0 1 0 11 11z",
  },
  candle: {
    group: "Objects",
    d: "M12 2c1.4 1.7 2.2 3 2.2 4.1a2.2 2.2 0 0 1-4.4 0C9.8 5 10.6 3.7 12 2zM8.6 9.4h6.8V21c0 .6-.4 1-1 1h-4.8c-.6 0-1-.4-1-1z",
  },
  potion: {
    group: "Occult",
    d: "M9.6 2h4.8v2.6l3.2 6.2c1.7 3.3-.7 7.2-4.4 7.2h-1.6c-3.7 0-6.1-3.9-4.4-7.2l3.2-6.2zM7.7 13.4h8.6",
    stroke: true,
    strokeScale: 1.5,
  },
  crystal: {
    group: "Occult",
    d: "M12 2 5 9.2 12 22l7-12.8zM5 9.2h14M12 2v20",
    stroke: true,
    strokeScale: 1.4,
  },
  rose: {
    group: "Nature",
    // Bloom, stem, two leaves. The old path spiralled into a numeral nine.
    d: "M12 2.4a4.8 4.8 0 0 1 4.8 4.8A4.8 4.8 0 0 1 12 12a4.8 4.8 0 0 1-4.8-4.8A4.8 4.8 0 0 1 12 2.4zm0 2.4a2.4 2.4 0 0 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM10.9 12.4h2.2V22h-2.2zM13.4 15.2c2.2-1.7 4.5-1.7 6.8 0-2.3 1.7-4.6 1.7-6.8 0zM10.6 18c-2.2-1.7-4.5-1.7-6.8 0 2.3 1.7 4.6 1.7 6.8 0z",
  },
  ghost: {
    group: "Gothic",
    d: "M12 2a7 7 0 0 0-7 7v12.2l2.4-1.8 2.3 1.8L12 19.4l2.3 1.8 2.3-1.8 2.4 1.8V9a7 7 0 0 0-7-7zM9.6 9.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8zm4.8 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8z",
  },
  key: {
    group: "Objects",
    d: "M15.6 2a6.4 6.4 0 0 0-6 8.7L2 18.3V22h3.7l1.4-1.4v-2h2v-2h2l1.2-1.2A6.4 6.4 0 1 0 15.6 2zm1.6 5.6a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z",
  },
  chalice: {
    group: "Objects",
    d: "M6 2h12l-1 5.6a5 5 0 0 1-4 4V18h3v2H8v-2h3v-6.4a5 5 0 0 1-4-4z",
  },

  /* -------------------------------- generic ------------------------------ */
  heart: {
    group: "Generic",
    d: "M12 21 3.6 12.6a5.4 5.4 0 1 1 7.6-7.6l.8.8.8-.8a5.4 5.4 0 1 1 7.6 7.6z",
  },
  star: {
    group: "Generic",
    d: "M12 2 9.6 9.6 2 12l7.6 2.4L12 22l2.4-7.6L22 12l-7.6-2.4z",
  },
  sparkle: {
    group: "Generic",
    d: "M12 2c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8z",
  },
  flame: {
    group: "Nature",
    d: "M12 2c.5 3.4-1.6 4.6-3 6.4-1.7 2.2-2 3.7-2 5.2a7 7 0 0 0 14 0c0-3-1.6-5.4-3.6-7.2.2 1.6-.4 2.6-1.4 3-.6-2.9-2-5.2-4-7.4z",
  },
  bell: {
    group: "Generic",
    d: "M12 2a1.6 1.6 0 0 1 1.6 1.6v.7A6.4 6.4 0 0 1 18 10.4v4l2 2.6v1H4v-1l2-2.6v-4a6.4 6.4 0 0 1 4.4-6.1v-.7A1.6 1.6 0 0 1 12 2zM9.6 19.4h4.8a2.4 2.4 0 0 1-4.8 0z",
  },
  crown: {
    group: "Generic",
    d: "M3 7.6 6.6 12 12 4.4 17.4 12 21 7.6V19H3z",
  },

  /* ------------------------------ more gothic ---------------------------- */
  tombstone: {
    group: "Gothic",
    d: "M12 2a6 6 0 0 0-6 6v14h12V8a6 6 0 0 0-6-6zm-1.4 6h2.8v2.6H16v2.8h-2.6V20h-2.8v-6.6H8v-2.8h2.6z",
  },
  bones: {
    group: "Gothic",
    // Two crossed bones with knobbed ends, not one diagonal.
    d: "M4.2 2.6a1.8 1.8 0 0 1 2.7 1.9l10 10a1.8 1.8 0 1 1 1.9 2.7 1.8 1.8 0 1 1-2.7 1.9l-10-10a1.8 1.8 0 1 1-1.9-2.7 1.8 1.8 0 0 1 0-3.7zM19.8 2.6a1.8 1.8 0 0 0-2.7 1.9l-10 10a1.8 1.8 0 1 0-1.9 2.7 1.8 1.8 0 1 0 2.7 1.9l10-10a1.8 1.8 0 1 0 1.9-2.7 1.8 1.8 0 0 0 0-3.7z",
  },
  wing: {
    group: "Gothic",
    // Three overlapping feather lobes, so the edge is scalloped rather than
    // smooth. A single lobe reads as a leaf.
    d: "M1.6 3.6c6 .4 10.2 2.8 12.6 7 1 1.7 2.6 2.7 4.6 2.9l3.6.3c-1.8 3.4-5.2 5.6-9.2 5.6-1.6 0-3-.3-4.4-.9 1.8-.6 3-1.5 3.7-2.7-3.1.7-5.8-.1-8-2.2 2-.2 3.4-.9 4.2-2C6.4 10.6 3.6 7.8 1.6 3.6zM8 15.4c-1.6 1.6-3.6 2.6-6 3 1.4-1.8 2.2-3.4 2.4-4.8z",
  },
  dagger: {
    group: "Gothic",
    d: "M12 1.6 14 8v6.6h-4V8zM7.6 15.6h8.8v2.2h-3.2V22h-2.4v-4.2H7.6z",
  },
  raven: {
    group: "Gothic",
    // A perched crow in profile, facing left: round head, straight beak, body
    // curving to a long tail, folded wing, two legs. One filled silhouette
    // reads far more reliably than a symmetric flying pose.
    d: "M1.6 8.4 6 7.2a3.4 3.4 0 0 1 6.6.8L22 11.8l-7.6 1.6 5.4 1.6-7 1 2.6 2.2-4.8-.8v1.4h-1v-1.6l-1 1.2-.2-1.8c-1.9-.7-3.2-2.4-3.4-4.4l-1.6.2.4-1.6-2-.4zM8.8 6.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },
  cat: {
    group: "Gothic",
    d: "M5 3l2.6 3.4A8 8 0 0 1 12 5c1.6 0 3.1.4 4.4 1.4L19 3v6.4a7.4 7.4 0 0 1-1.6 8.9V22h-2.6v-2.2h-5.6V22H6.6v-3.7A7.4 7.4 0 0 1 5 9.4zm3.8 8.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm6.4 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  },
  snake: {
    group: "Nature",
    d: "M18.4 2c2 0 3.6 1.6 3.6 3.6S20.4 9.2 18.4 9.2h-9c-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6h5.2c2.3 0 4.2 1.9 4.2 4.2S16.9 20.8 14.6 20.8H4v-2.6h10.6c.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6H9.4c-2.3 0-4.2-1.9-4.2-4.2s1.9-4.2 4.2-4.2h9c.6 0 1-.4 1-1s-.4-1-1-1H12V2z",
  },
  thorns: {
    group: "Nature",
    // A briar stem with paired spikes. The old path read as a flame.
    d: "M3 21.4C7.6 16.6 12.4 10.4 21.4 3.4M8.8 15.8 5.2 14.2M8.8 15.8l1.6-3.6M13.2 10.8 9.6 9.8M13.2 10.8l.8-3.6M17.4 6.6l-3.4-.6M17.4 6.6l.4-3.4",
    stroke: true,
    strokeScale: 1.1,
  },

  /* -------------------------------- occult ------------------------------- */
  pentagram: {
    group: "Occult",
    d: "M12 2 14.6 9.6H22l-6 4.6 2.3 7.2-6.3-4.6-6.3 4.6 2.3-7.2-6-4.6h7.4z",
    stroke: true,
    strokeScale: 1.4,
  },
  eye: {
    group: "Occult",
    d: "M12 5c-5 0-9 4.4-10 7 1 2.6 5 7 10 7s9-4.4 10-7c-1-2.6-5-7-10-7zm0 3.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z",
  },
  hourglass: {
    group: "Occult",
    d: "M5 2h14v2.4l-4.6 7.6 4.6 7.6V22H5v-2.4l4.6-7.6L5 4.4z",
    stroke: true,
    strokeScale: 1.5,
  },
  cauldron: {
    group: "Occult",
    d: "M9 2.6l1.6 2.6h2.8L15 2.6l1.8 1.2-1.2 2.2H19v2.4h-1.2a6 6 0 0 1-1.6 11.2V22h-8.4v-2.4A6 6 0 0 1 6.2 8.4H5V6h3.4L7.2 3.8z",
  },
  tarot: {
    group: "Occult",
    d: "M6 2h12v20H6zm6 3.4-1.6 4.2H6l3.4 2.8-1.4 4.6 4-2.8 4 2.8-1.4-4.6L18 9.6h-4.4z",
    stroke: true,
    strokeScale: 1.4,
  },
  medallion: {
    group: "Objects",
    d: "M9 2h6l-1.4 4.6a7 7 0 1 1-3.2 0zM12 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2.6 1 2.4 2.6.2-2 1.8.6 2.6-2.2-1.4-2.2 1.4.6-2.6-2-1.8 2.6-.2z",
  },
  lantern: {
    group: "Objects",
    d: "M9 1.4h6v1.8h1.6v2.4H15v1.4l2.4 3.4V21h-2v1.4h-2V21h-2.8v1.4h-2V21H6.6V10.4L9 7V5.6H7.4V3.2H9zm-.4 10.2v6.8h6.8v-6.8z",
  },
  mirror: {
    group: "Objects",
    d: "M12 1.6c3.9 0 7 3.4 7 7.6s-3.1 7.6-7 7.6-7-3.4-7-7.6 3.1-7.6 7-7.6zm0 2.6c-2.4 0-4.4 2.2-4.4 5s2 5 4.4 5 4.4-2.2 4.4-5-2-5-4.4-5zM10.6 17.6h2.8v2.2h2.4V22H8.2v-2.2h2.4z",
  },
  chainLink: {
    group: "Objects",
    d: "M9.4 6.6a4.6 4.6 0 0 1 0 9.2H6.6a4.6 4.6 0 0 1 0-9.2zm0 2.4H6.6a2.2 2.2 0 0 0 0 4.4h2.8a2.2 2.2 0 0 0 0-4.4zM17.4 6.6a4.6 4.6 0 0 1 0 9.2h-2.8a4.6 4.6 0 0 1 0-9.2zm0 2.4h-2.8a2.2 2.2 0 0 0 0 4.4h2.8a2.2 2.2 0 0 0 0-4.4z",
  },
  pumpkin: {
    group: "Nature",
    d: "M12 5.4c.6-1.6.4-2.8-.6-3.8 2 .2 3.2 1.4 3.6 3.6a6 6 0 0 1 4.6 5.8c0 4.6-3.4 9-7.6 9s-7.6-4.4-7.6-9a6 6 0 0 1 4.6-5.8zM9.6 10 8 12.6h3.2zm4.8 0-1.6 2.6h3.2zM8 15.6c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4z",
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const ICON_GROUPS: Array<{ group: IconDef["group"]; names: IconName[] }> = (
  ["Gothic", "Occult", "Nature", "Objects", "Generic"] as const
).map((group) => ({
  group,
  names: ICON_NAMES.filter((name) => ICONS[name].group === group),
}));

/** Icons whose silhouette suits the gothic families. */
export const GOTHIC_ICONS: IconName[] = [
  "bat",
  "skull",
  "cross",
  "coffin",
  "spider",
  "web",
  "moon",
  "candle",
  "potion",
  "crystal",
  "rose",
  "ghost",
  "key",
  "chalice",
];
