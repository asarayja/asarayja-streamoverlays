let ctx: CanvasRenderingContext2D | null = null;

function context(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  if (typeof document === "undefined") return null;
  ctx = document.createElement("canvas").getContext("2d");
  return ctx;
}

const cache = new Map<string, number>();

/**
 * Text width in px. Konva lays widgets out imperatively (social bars, chat
 * rows), so we need the width *before* the node exists.
 */
export function measureText(text: string, fontSize: number, fontFamily: string, weight = 400): number {
  const key = `${weight}|${fontSize}|${fontFamily}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const c = context();
  if (!c) return text.length * fontSize * 0.55; // SSR estimate

  c.font = `${weight} ${fontSize}px "${fontFamily}", sans-serif`;
  const width = c.measureText(text).width;
  if (cache.size < 5000) cache.set(key, width);
  return width;
}

/** Webfonts change metrics once they load; drop the cache so layouts reflow. */
export function clearTextCache(): void {
  cache.clear();
}
