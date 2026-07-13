"use client";

import { forwardRef, useEffect, useState } from "react";
import type Konva from "konva";
import { Layer as KonvaLayer, Stage } from "react-konva";
import { waitForFonts } from "@/data/fonts";
import { clearTextCache } from "@/lib/measure";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/types";
import type { ChannelProfile, Layer, Theme } from "@/lib/types";
import { LayerNode, type RenderMode } from "./LayerNode";

interface OverlayStageProps {
  layers: Layer[];
  theme: Theme;
  profile: ChannelProfile;
  time: number;
  mode: RenderMode;
  /** Rendered width in CSS px; height follows the artboard aspect. */
  width: number;
  /** Artboard size the layers are laid out on. Defaults to 1920×1080. */
  canvasWidth?: number;
  canvasHeight?: number;
  listening?: boolean;
}

/**
 * A non-interactive render of an overlay. Used by the gallery, the OBS browser
 * source and the export pipeline — the editor has its own interactive canvas
 * built on the same `LayerNode`.
 */
export const OverlayStage = forwardRef<Konva.Stage, OverlayStageProps>(function OverlayStage(
  { layers, theme, profile, time, mode, width, canvasWidth, canvasHeight, listening = false },
  ref,
) {
  const cw = canvasWidth ?? CANVAS_WIDTH;
  const ch = canvasHeight ?? CANVAS_HEIGHT;
  const scale = width / cw;
  const height = ch * scale;
  const fontsReady = useFontsReady();
  const ctx = { theme, profile, time, mode };

  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
      listening={listening}
      // Remount once webfonts land: Konva measures text against the fonts that
      // were loaded when the node was drawn.
      key={fontsReady ? "fonts" : "fallback"}
    >
      <KonvaLayer listening={listening}>
        {layers.map((layer) => (
          <LayerNode key={layer.id} layer={layer} ctx={ctx} />
        ))}
      </KonvaLayer>
    </Stage>
  );
});

let fontsResolved = false;

export function useFontsReady(): boolean {
  const [ready, setReady] = useState(fontsResolved);
  useEffect(() => {
    if (fontsResolved) return;
    let cancelled = false;
    void waitForFonts().then(() => {
      if (cancelled) return;
      fontsResolved = true;
      clearTextCache();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
