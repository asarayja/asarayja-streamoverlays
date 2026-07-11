import type { Layer, Project, TemplateCategory, Theme } from "@/lib/types";

/**
 * A self-contained, code-ready export of a whole design pack. Everything needed
 * to rebuild it — every screen's saved layers plus the one shared palette — so
 * it can be re-imported into the gallery AND handed back to be baked in as a
 * permanent built-in design. The channel profile is deliberately excluded: this
 * is a design, not someone's identity.
 */
export interface DesignScreen {
  name: string;
  category: TemplateCategory | null;
  /** Provenance only; may not resolve to a built-in on another build. */
  templateId: string;
  layers: Layer[];
  animationsEnabled: boolean;
  packOrder: number;
}

export interface DesignFile {
  kind: "asarayja-design";
  version: 1;
  name: string;
  theme: Theme;
  screens: DesignScreen[];
}

/** Serialise a pack's screens (any order) into a lossless design file. */
export function packToDesignFile(screens: Project[]): DesignFile {
  const ordered = [...screens].sort((a, b) => a.packOrder - b.packOrder);
  const first = ordered[0];
  return {
    kind: "asarayja-design",
    version: 1,
    name: first?.packName ?? first?.name ?? "Custom design",
    theme: first?.theme ?? ({} as Theme),
    screens: ordered.map((p) => ({
      name: p.name,
      category: p.category,
      templateId: p.templateId,
      layers: p.layers,
      animationsEnabled: p.animationsEnabled ?? true,
      packOrder: p.packOrder,
    })),
  };
}
