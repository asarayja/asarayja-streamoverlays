/**
 * The big icon libraries (Lucide + Font Awesome), loaded on demand.
 *
 * These are Iconify DATA packages — plain `{ name: { body } }` JSON, no React
 * components — so the raw SVG body survives being stored on a layer and painted
 * on the Konva canvas. `body` uses `currentColor`, which the renderer swaps for
 * the layer's theme colour. The data is ~1MB across the three sets, so it is
 * dynamically imported only when the picker is opened, never in the base bundle.
 */

export type IconSource = "lucide" | "fa-solid" | "fa-brands";

export interface LibIcon {
  /** Stable id, e.g. "lucide:heart". */
  id: string;
  name: string;
  source: IconSource;
  /** SVG inner markup (paths/circles/…), `currentColor` for the tint. */
  body: string;
  /** viewBox size. */
  w: number;
  h: number;
}

export const ICON_SOURCES: Array<{ id: IconSource; label: string }> = [
  { id: "lucide", label: "Lucide" },
  { id: "fa-solid", label: "Font Awesome" },
  { id: "fa-brands", label: "Brands" },
];

interface IconifyJson {
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
}

let cache: Partial<Record<IconSource, LibIcon[]>> = {};

async function loadRaw(source: IconSource): Promise<IconifyJson> {
  switch (source) {
    case "lucide":
      return (await import("@iconify-json/lucide/icons.json")).default as IconifyJson;
    case "fa-solid":
      return (await import("@iconify-json/fa6-solid/icons.json")).default as IconifyJson;
    case "fa-brands":
      return (await import("@iconify-json/fa6-brands/icons.json")).default as IconifyJson;
  }
}

/** All icons of a source, loaded (and cached) on first use. */
export async function loadIconSource(source: IconSource): Promise<LibIcon[]> {
  if (cache[source]) return cache[source]!;
  const raw = await loadRaw(source);
  const dw = raw.width ?? 24;
  const dh = raw.height ?? 24;
  const list: LibIcon[] = Object.entries(raw.icons).map(([name, def]) => ({
    id: `${source}:${name}`,
    name,
    source,
    body: def.body,
    w: def.width ?? dw,
    h: def.height ?? dh,
  }));
  cache[source] = list;
  return list;
}

/** Case-insensitive name match; empty query returns everything. */
export function searchIcons(list: LibIcon[], query: string): LibIcon[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list.filter((ic) => terms.every((tr) => ic.name.includes(tr)));
}
