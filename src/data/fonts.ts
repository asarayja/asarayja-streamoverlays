/**
 * The font catalogue. Every family here is loaded through a single Google Fonts
 * stylesheet in the root layout, because Konva draws text on a canvas and can
 * only use a family that the *document* has already loaded — `next/font` scopes
 * to a CSS variable, which the canvas cannot see.
 */
export interface FontDef {
  family: string;
  /** Weights requested from Google Fonts. */
  weights: number[];
  category: "display" | "sans" | "serif" | "gaming" | "handwriting" | "gothic";
}

export const FONTS: FontDef[] = [
  { family: "Inter", weights: [400, 600, 800], category: "sans" },
  { family: "Space Grotesk", weights: [400, 700], category: "sans" },
  { family: "Poppins", weights: [400, 600, 800], category: "sans" },
  { family: "Montserrat", weights: [400, 700, 900], category: "sans" },
  { family: "Kanit", weights: [400, 700, 900], category: "sans" },
  { family: "Exo 2", weights: [400, 700, 900], category: "sans" },

  { family: "Bebas Neue", weights: [400], category: "display" },
  { family: "Anton", weights: [400], category: "display" },
  { family: "Oswald", weights: [400, 700], category: "display" },
  { family: "Teko", weights: [400, 700], category: "display" },
  { family: "Righteous", weights: [400], category: "display" },
  { family: "Bungee", weights: [400], category: "display" },

  { family: "Orbitron", weights: [400, 700, 900], category: "gaming" },
  { family: "Rajdhani", weights: [400, 700], category: "gaming" },
  { family: "Chakra Petch", weights: [400, 700], category: "gaming" },
  { family: "Audiowide", weights: [400], category: "gaming" },
  { family: "Press Start 2P", weights: [400], category: "gaming" },

  { family: "Playfair Display", weights: [400, 700, 900], category: "serif" },
  { family: "Cinzel", weights: [400, 700, 900], category: "serif" },

  { family: "Creepster", weights: [400], category: "handwriting" },
  { family: "Permanent Marker", weights: [400], category: "handwriting" },

  // Gothic set. Blackletter is decorative — templates use it for short display
  // text only and keep body copy in a readable serif/sans.
  { family: "UnifrakturMaguntia", weights: [400], category: "gothic" },
  { family: "Pirata One", weights: [400], category: "gothic" },
  { family: "Grenze Gotisch", weights: [400, 700], category: "gothic" },
  { family: "MedievalSharp", weights: [400], category: "gothic" },
  { family: "Cinzel Decorative", weights: [400, 700], category: "gothic" },
  { family: "IM Fell English SC", weights: [400], category: "gothic" },
];

export const FONT_FAMILIES = FONTS.map((f) => f.family);

/** `https://fonts.googleapis.com/css2?...` — built once, used in the layout. */
export function googleFontsHref(): string {
  const families = FONTS.map((f) => {
    const name = f.family.replace(/ /g, "+");
    const weights = f.weights.join(";");
    return `family=${name}:wght@${weights}`;
  }).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Konva measures text synchronously against whatever the browser has loaded, so
 * a stage drawn before the webfonts arrive renders in Times New Roman. Callers
 * await this, then force a redraw.
 *
 * `document.fonts.ready` alone is not enough: CSS @font-face loads lazily on
 * first *DOM* use, and canvas text never counts as use. A family only ever
 * drawn on canvas would stay unloaded forever, poisoning the measurement cache
 * with fallback-font metrics — so every catalogued face is loaded explicitly.
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.ready;
    await Promise.all(
      FONTS.flatMap((f) =>
        f.weights.map((w) => document.fonts.load(`${w} 16px "${f.family}"`).catch(() => [])),
      ),
    );
  } catch {
    /* fonts API unavailable — fall back to whatever is loaded */
  }
}
