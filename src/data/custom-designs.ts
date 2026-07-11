import { designFileToPack, type DesignFile } from "@/lib/design-file";
import type { Palette, Template } from "@/lib/types";

/**
 * Permanent, baked-in custom designs.
 *
 * This is the pathway for turning a design a user built and exported from the
 * editor (a `.asarayja-design.json`) into a real, shipped site design:
 *
 *   1. Get the exported design file.
 *   2. Add an entry below: a short unique `key` plus the file's JSON as `file`.
 *   3. That's it — it shows in the gallery and /designs, opens as a pack, and
 *      behaves exactly like the built-in families. No other change needed.
 *
 * The file carries every screen's layers plus the shared palette, so the design
 * rebuilds pixel-for-pixel — including anything drawn with the pencil tools.
 *
 *   export const CUSTOM_DESIGNS = [
 *     { key: "aurora-pack", file: { kind: "asarayja-design", version: 1, … } },
 *   ];
 */
export const CUSTOM_DESIGNS: { key: string; file: DesignFile }[] = [];

const PACKS = CUSTOM_DESIGNS.map(({ key, file }) => designFileToPack(file, key));

/** Synthetic palettes for the custom designs (kept out of the core expansion). */
export const CUSTOM_PALETTES: Palette[] = PACKS.map((p) => p.palette);

/** Every custom design's screens, added directly to TEMPLATES. */
export const CUSTOM_TEMPLATES: Template[] = PACKS.flatMap((p) => p.templates);
