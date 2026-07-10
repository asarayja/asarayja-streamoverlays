import { TEMPLATES } from "@/data/templates";
import { getPalette } from "@/data/palettes";
import type { Collection, Template } from "@/lib/types";

/**
 * A "design" is one coherent look — a family pack (Hallowed Night, Neon Grid…)
 * or a standalone core piece. The designs page lists these once each; opening
 * one shows that single design in every colour it ships in.
 *
 * Grouping key: the family for pack screens, or `core:<name>` for the one-off
 * core designs that have no family.
 */
export interface Design {
  /** URL-safe id. */
  key: string;
  /** Internal grouping key (family name or `core:<name>`). */
  groupKey: string;
  name: string;
  collection: Collection;
  /** The screen shown on the card, in `coverPalette`. */
  cover: Template;
  coverPalette: string;
  /** Every palette this design is published in. */
  palettes: string[];
  /** Distinct screens in the design (Starting Soon, BRB, …). */
  screenCount: number;
}

function groupKeyOf(t: Template): string {
  return t.family ?? `core:${t.name}`;
}

const PRETTY: Record<string, string> = { gothic: "Gothic", pride: "Pride" };

function displayName(t: Template): string {
  if (!t.family) return t.name;
  return PRETTY[t.family] ?? t.family;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Relative luminance, to pick the darkest palette as the cover — night and
// gothic designs read wrong on a light ground, and everything else survives it.
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// The screen a design leads with, most-representative first.
const COVER_ORDER = [
  "Starting Soon",
  "BRB",
  "Gameplay",
  "Just Chatting",
  "Stream Ending",
  "Goals",
  "Webcam Frames",
  "Pause",
  "Offline",
  "Intermission",
];

function pickCover(screens: Template[]): Template {
  const rank = (t: Template) => {
    const i = COVER_ORDER.indexOf(t.category);
    return i === -1 ? COVER_ORDER.length : i;
  };
  return [...screens].sort((a, b) => rank(a) - rank(b))[0];
}

function build(): Design[] {
  const groups = new Map<string, Template[]>();
  for (const t of TEMPLATES) {
    const k = groupKeyOf(t);
    const list = groups.get(k);
    if (list) list.push(t);
    else groups.set(k, [t]);
  }

  const designs: Design[] = [];
  for (const [groupKey, all] of groups) {
    const palettes = [...new Set(all.map((t) => t.paletteId))];

    // The design's identity tags are the ones shared by every colour variant
    // (family tags), in authored order; the first is its defining vibe. The
    // cover palette is the one whose own tags best match that identity, so a
    // Horror family leads in a red/gothic palette, not whichever bg is darkest
    // (which for the core set is a cold blue). Tie-break on the darkest bg.
    const identity = all[0].tags.filter((tag) => all.every((t) => t.tags.includes(tag)));
    const primary = identity[0];
    const affinity = (id: string) => {
      const tags = getPalette(id).tags ?? [];
      let s = identity.reduce((n, tag) => n + (tags.includes(tag) ? 1 : 0), 0);
      if (primary && tags.includes(primary)) s += 4;
      return s;
    };
    const coverPalette = [...palettes].sort(
      (a, b) =>
        affinity(b) - affinity(a) ||
        luminance(getPalette(a).theme.background) - luminance(getPalette(b).theme.background),
    )[0];
    const inCover = all.filter((t) => t.paletteId === coverPalette);
    const cover = pickCover(inCover);
    designs.push({
      key: slug(groupKey),
      groupKey,
      name: displayName(all[0]),
      collection: all[0].collection,
      cover,
      coverPalette,
      palettes,
      screenCount: inCover.length,
    });
  }

  // Packs (many screens) first, then standalone pieces; alphabetical within.
  return designs.sort(
    (a, b) => b.screenCount - a.screenCount || a.name.localeCompare(b.name),
  );
}

export const DESIGNS: Design[] = build();

const BY_KEY = new Map(DESIGNS.map((d) => [d.key, d]));

export function getDesign(key: string): Design | undefined {
  return BY_KEY.get(key);
}

/** Every screen of a design, in one palette, in a sensible reading order. */
export function designScreens(design: Design, paletteId: string): Template[] {
  const order = (t: Template) => {
    const i = COVER_ORDER.indexOf(t.category);
    return i === -1 ? COVER_ORDER.length + t.category.charCodeAt(0) : i;
  };
  return TEMPLATES.filter((t) => groupKeyOf(t) === design.groupKey && t.paletteId === paletteId).sort(
    (a, b) => order(a) - order(b),
  );
}
