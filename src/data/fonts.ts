/**
 * The font catalogue. Every family here is loaded through a single Google Fonts
 * stylesheet in the root layout, because Konva draws text on a canvas and can
 * only use a family that the *document* has already loaded — `next/font` scopes
 * to a CSS variable, which the canvas cannot see.
 */
export interface FontDef {
  family: string;
  /** Weights requested from Google Fonts. Only weights the family actually
      ships — css2 rejects the whole request if a weight doesn't exist. */
  weights: number[];
  category: "display" | "sans" | "serif" | "gaming" | "handwriting" | "gothic" | "mono";
}

export const FONTS: FontDef[] = [
  /* --------------------------------- sans -------------------------------- */
  { family: "Inter", weights: [400, 600, 800], category: "sans" },
  { family: "Space Grotesk", weights: [400, 700], category: "sans" },
  { family: "Poppins", weights: [400, 600, 800], category: "sans" },
  { family: "Montserrat", weights: [400, 700, 900], category: "sans" },
  { family: "Kanit", weights: [400, 700, 900], category: "sans" },
  { family: "Exo 2", weights: [400, 700, 900], category: "sans" },
  { family: "Roboto", weights: [400, 700, 900], category: "sans" },
  { family: "Open Sans", weights: [400, 700, 800], category: "sans" },
  { family: "Lato", weights: [400, 700, 900], category: "sans" },
  { family: "Nunito", weights: [400, 700, 900], category: "sans" },
  { family: "Nunito Sans", weights: [400, 700, 900], category: "sans" },
  { family: "Work Sans", weights: [400, 700, 900], category: "sans" },
  { family: "Raleway", weights: [400, 700, 900], category: "sans" },
  { family: "Rubik", weights: [400, 700, 900], category: "sans" },
  { family: "DM Sans", weights: [400, 700], category: "sans" },
  { family: "Manrope", weights: [400, 700, 800], category: "sans" },
  { family: "Barlow", weights: [400, 700, 900], category: "sans" },
  { family: "Mulish", weights: [400, 700, 900], category: "sans" },
  { family: "Josefin Sans", weights: [400, 700], category: "sans" },
  { family: "Quicksand", weights: [400, 700], category: "sans" },
  { family: "Comfortaa", weights: [400, 700], category: "sans" },
  { family: "Sora", weights: [400, 700, 800], category: "sans" },
  { family: "Outfit", weights: [400, 700, 900], category: "sans" },
  { family: "Figtree", weights: [400, 700, 900], category: "sans" },
  { family: "Archivo", weights: [400, 700, 900], category: "sans" },
  { family: "Saira", weights: [400, 700, 900], category: "sans" },
  { family: "Titillium Web", weights: [400, 700, 900], category: "sans" },
  { family: "Cabin", weights: [400, 700], category: "sans" },
  { family: "Karla", weights: [400, 700, 800], category: "sans" },
  { family: "Jost", weights: [400, 700, 900], category: "sans" },

  /* ------------------------------- display ------------------------------- */
  { family: "Bebas Neue", weights: [400], category: "display" },
  { family: "Anton", weights: [400], category: "display" },
  { family: "Oswald", weights: [400, 700], category: "display" },
  { family: "Teko", weights: [400, 700], category: "display" },
  { family: "Righteous", weights: [400], category: "display" },
  { family: "Bungee", weights: [400], category: "display" },
  { family: "Fredoka", weights: [400, 700], category: "display" },
  { family: "Baloo 2", weights: [400, 700, 800], category: "display" },
  { family: "Lobster", weights: [400], category: "display" },
  { family: "Pacifico", weights: [400], category: "display" },
  { family: "Bangers", weights: [400], category: "display" },
  { family: "Alfa Slab One", weights: [400], category: "display" },
  { family: "Russo One", weights: [400], category: "display" },
  { family: "Staatliches", weights: [400], category: "display" },
  { family: "Monoton", weights: [400], category: "display" },
  { family: "Shrikhand", weights: [400], category: "display" },
  { family: "Luckiest Guy", weights: [400], category: "display" },
  { family: "Fjalla One", weights: [400], category: "display" },
  { family: "Archivo Black", weights: [400], category: "display" },
  { family: "Sigmar One", weights: [400], category: "display" },
  { family: "Black Ops One", weights: [400], category: "display" },
  { family: "Abril Fatface", weights: [400], category: "display" },
  { family: "Passion One", weights: [400, 700, 900], category: "display" },
  { family: "Chewy", weights: [400], category: "display" },

  /* ------------------------------- gaming -------------------------------- */
  { family: "Orbitron", weights: [400, 700, 900], category: "gaming" },
  { family: "Rajdhani", weights: [400, 700], category: "gaming" },
  { family: "Chakra Petch", weights: [400, 700], category: "gaming" },
  { family: "Audiowide", weights: [400], category: "gaming" },
  { family: "Press Start 2P", weights: [400], category: "gaming" },
  { family: "Michroma", weights: [400], category: "gaming" },
  { family: "Iceland", weights: [400], category: "gaming" },
  { family: "Syncopate", weights: [400, 700], category: "gaming" },
  { family: "Wallpoet", weights: [400], category: "gaming" },
  { family: "Zen Dots", weights: [400], category: "gaming" },
  { family: "Turret Road", weights: [400, 700], category: "gaming" },
  { family: "Nova Square", weights: [400], category: "gaming" },

  /* -------------------------------- serif -------------------------------- */
  { family: "Playfair Display", weights: [400, 700, 900], category: "serif" },
  { family: "Cinzel", weights: [400, 700, 900], category: "serif" },
  { family: "Merriweather", weights: [400, 700, 900], category: "serif" },
  { family: "Lora", weights: [400, 700], category: "serif" },
  { family: "PT Serif", weights: [400, 700], category: "serif" },
  { family: "Cormorant Garamond", weights: [400, 700], category: "serif" },
  { family: "EB Garamond", weights: [400, 700], category: "serif" },
  { family: "Bitter", weights: [400, 700, 900], category: "serif" },
  { family: "Libre Baskerville", weights: [400, 700], category: "serif" },
  { family: "Spectral", weights: [400, 700], category: "serif" },
  { family: "DM Serif Display", weights: [400], category: "serif" },
  { family: "Zilla Slab", weights: [400, 700], category: "serif" },

  /* ----------------------------- handwriting ----------------------------- */
  { family: "Creepster", weights: [400], category: "handwriting" },
  { family: "Permanent Marker", weights: [400], category: "handwriting" },
  { family: "Caveat", weights: [400, 700], category: "handwriting" },
  { family: "Dancing Script", weights: [400, 700], category: "handwriting" },
  { family: "Great Vibes", weights: [400], category: "handwriting" },
  { family: "Sacramento", weights: [400], category: "handwriting" },
  { family: "Satisfy", weights: [400], category: "handwriting" },
  { family: "Indie Flower", weights: [400], category: "handwriting" },
  { family: "Shadows Into Light", weights: [400], category: "handwriting" },
  { family: "Amatic SC", weights: [400, 700], category: "handwriting" },
  { family: "Gloria Hallelujah", weights: [400], category: "handwriting" },
  { family: "Patrick Hand", weights: [400], category: "handwriting" },
  { family: "Kalam", weights: [400, 700], category: "handwriting" },
  { family: "Rock Salt", weights: [400], category: "handwriting" },

  /* --------------------------------- mono -------------------------------- */
  { family: "JetBrains Mono", weights: [400, 700], category: "mono" },
  { family: "Space Mono", weights: [400, 700], category: "mono" },
  { family: "Fira Code", weights: [400, 700], category: "mono" },
  { family: "IBM Plex Mono", weights: [400, 700], category: "mono" },

  // Gothic set. Blackletter is decorative — templates use it for short display
  // text only and keep body copy in a readable serif/sans.
  { family: "UnifrakturMaguntia", weights: [400], category: "gothic" },
  { family: "Pirata One", weights: [400], category: "gothic" },
  { family: "Grenze Gotisch", weights: [400, 700], category: "gothic" },
  { family: "MedievalSharp", weights: [400], category: "gothic" },
  { family: "Cinzel Decorative", weights: [400, 700], category: "gothic" },
  { family: "IM Fell English SC", weights: [400], category: "gothic" },

  /* ----------------------------- added batch ----------------------------- */
  // Pixel / retro (grouped under display).
  { family: "VT323", weights: [400], category: "display" },
  { family: "Silkscreen", weights: [400, 700], category: "display" },
  { family: "Pixelify Sans", weights: [400, 700], category: "display" },
  { family: "DotGothic16", weights: [400], category: "display" },
  { family: "Handjet", weights: [400, 700], category: "display" },
  // Bold display / impact.
  { family: "Titan One", weights: [400], category: "display" },
  { family: "Paytone One", weights: [400], category: "display" },
  { family: "Concert One", weights: [400], category: "display" },
  { family: "Rammetto One", weights: [400], category: "display" },
  { family: "Ultra", weights: [400], category: "display" },
  { family: "Modak", weights: [400], category: "display" },
  { family: "Bowlby One", weights: [400], category: "display" },
  { family: "Bungee Inline", weights: [400], category: "display" },
  { family: "Bungee Shade", weights: [400], category: "display" },
  { family: "Bungee Hairline", weights: [400], category: "display" },
  // Rounded / friendly (sans).
  { family: "Varela Round", weights: [400], category: "sans" },
  { family: "M PLUS Rounded 1c", weights: [400, 700], category: "sans" },
  { family: "Sniglet", weights: [400, 800], category: "sans" },
  // Gaming / futuristic.
  { family: "Electrolize", weights: [400], category: "gaming" },
  { family: "Aldrich", weights: [400], category: "gaming" },
  { family: "Quantico", weights: [400, 700], category: "gaming" },
  { family: "Jura", weights: [400, 700], category: "gaming" },
  { family: "Krona One", weights: [400], category: "gaming" },
  { family: "Nova Flat", weights: [400], category: "gaming" },
  { family: "Nova Round", weights: [400], category: "gaming" },
  // Script / elegant (handwriting).
  { family: "Kaushan Script", weights: [400], category: "handwriting" },
  { family: "Yellowtail", weights: [400], category: "handwriting" },
  { family: "Courgette", weights: [400], category: "handwriting" },
  { family: "Cookie", weights: [400], category: "handwriting" },
  { family: "Marck Script", weights: [400], category: "handwriting" },
  { family: "Allura", weights: [400], category: "handwriting" },
  { family: "Tangerine", weights: [400, 700], category: "handwriting" },
  // Marker / hand.
  { family: "Architects Daughter", weights: [400], category: "handwriting" },
  { family: "Reenie Beanie", weights: [400], category: "handwriting" },
  { family: "Covered By Your Grace", weights: [400], category: "handwriting" },
  // Serif.
  { family: "Marcellus", weights: [400], category: "serif" },
  { family: "Cardo", weights: [400, 700], category: "serif" },
  { family: "Fraunces", weights: [400, 700, 900], category: "serif" },
  // Horror + more gothic / blackletter / medieval.
  { family: "Nosifer", weights: [400], category: "gothic" },
  { family: "Butcherman", weights: [400], category: "gothic" },
  { family: "Eater", weights: [400], category: "gothic" },
  { family: "Metal Mania", weights: [400], category: "gothic" },
  { family: "Griffy", weights: [400], category: "gothic" },
  { family: "Special Elite", weights: [400], category: "gothic" },
  { family: "UnifrakturCook", weights: [700], category: "gothic" },
  { family: "Germania One", weights: [400], category: "gothic" },
  { family: "New Rocker", weights: [400], category: "gothic" },
  { family: "Metamorphous", weights: [400], category: "gothic" },
  { family: "Uncial Antiqua", weights: [400], category: "gothic" },
  { family: "Henny Penny", weights: [400], category: "gothic" },
  { family: "Fondamento", weights: [400, 700], category: "gothic" },
  { family: "Caesar Dressing", weights: [400], category: "gothic" },
  { family: "Emblema One", weights: [400], category: "gothic" },
];

export const FONT_FAMILIES = FONTS.map((f) => f.family);

/**
 * The standard set bundled as local woff2 (public/fonts/offline-fonts.css), so
 * these work with no internet — the desktop app's offline baseline. Every other
 * family still streams from Google Fonts and needs a connection. Keep this in
 * sync with the download list in the offline-font step.
 */
// Every catalogue family is now bundled as local woff2, so the whole app works
// offline. (Adding a font means re-running the offline-font download so its
// woff2 land in public/fonts/.)
export const OFFLINE_FONT_FAMILIES = new Set(FONT_FAMILIES);

/** `https://fonts.googleapis.com/css2?...` for any family NOT bundled locally.
    With all families bundled this is empty, so the layout skips the link. */
export function googleFontsHref(): string {
  const families = FONTS.filter((f) => !OFFLINE_FONT_FAMILIES.has(f.family))
    .map((f) => `family=${f.family.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
    .join("&");
  return families ? `https://fonts.googleapis.com/css2?${families}&display=swap` : "";
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
