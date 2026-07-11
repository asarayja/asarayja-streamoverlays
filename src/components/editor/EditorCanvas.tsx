"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Group, Layer as KonvaLayer, Line, Rect, Stage, Transformer } from "react-konva";
import { LayerNode } from "@/components/overlay/LayerNode";
import { useFontsReady } from "@/components/overlay/OverlayStage";
import { resolveColor } from "@/lib/theme";
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEFAULT_ANIMATION, DEFAULT_EFFECTS } from "@/lib/types";
import type { ChannelProfile, LayerPatch, ShapeLayer } from "@/lib/types";
import { uid } from "@/lib/id";
import { getStroke } from "perfect-freehand";
import { useElementSize } from "@/lib/useElementSize";
import { brushStyle, useEditorStore } from "@/store/editor";

const SNAP_THRESHOLD = 8;
const GRID_STEP = 60;

interface Guide {
  axis: "x" | "y";
  position: number;
}

export function EditorCanvas({
  profile,
  panTool,
  drawTool = false,
}: {
  profile: ChannelProfile;
  panTool: boolean;
  drawTool?: boolean;
}) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const fontsReady = useFontsReady();

  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showGuides = useEditorStore((s) => s.showGuides);
  const snap = useEditorStore((s) => s.snap);
  const time = useEditorStore((s) => s.time);

  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const insertLayer = useEditorStore((s) => s.insertLayer);
  const eraseStrokes = useEditorStore((s) => s.eraseStrokes);
  const beginGesture = useEditorStore((s) => s.beginGesture);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const zoomToFit = useEditorStore((s) => s.zoomToFit);
  const drawColor = useEditorStore((s) => s.drawColor);
  const drawWidth = useEditorStore((s) => s.drawWidth);
  const drawBrush = useEditorStore((s) => s.drawBrush);

  // Freehand pencil: capture pointer points in overlay (canvas) coordinates,
  // preview live, and on release commit a smoothed stroke as a shape layer.
  const [stroke, setStroke] = useState<number[] | null>(null);
  const drawing = useRef(false);

  const toOverlay = useCallback(
    (p: { x: number; y: number }) => ({ x: (p.x - panX) / zoom, y: (p.y - panY) / zoom }),
    [panX, panY, zoom],
  );

  const startDraw = useCallback(() => {
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    const o = toOverlay(p);
    drawing.current = true;
    setStroke([o.x, o.y]);
  }, [toOverlay]);

  const moveDraw = useCallback(() => {
    if (!drawing.current) return;
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    const o = toOverlay(p);
    setStroke((prev) => (prev ? [...prev, o.x, o.y] : [o.x, o.y]));
  }, [toOverlay]);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const pts = stroke;
    setStroke(null);
    if (!pts || pts.length < 4) return;

    // Eraser removes freehand strokes the path crosses — no new layer.
    if (drawBrush === "eraser") {
      eraseStrokes(pts, Math.max(16, drawWidth * 2.5));
      return;
    }

    let renderPts = pts;
    let drawStyle: ShapeLayer["drawStyle"] = "line";
    let strokeWidth = drawWidth;
    let opacity = 1;
    let dash: number[] | undefined;
    const effects = structuredClone(DEFAULT_EFFECTS);
    let pad = drawWidth;

    if (drawBrush === "ink") {
      // Pressure/velocity-variable ink: a filled outline polygon.
      const input: number[][] = [];
      for (let i = 0; i < pts.length; i += 2) input.push([pts[i], pts[i + 1]]);
      const outline = getStroke(input, {
        size: drawWidth * 2.2,
        thinning: 0.65,
        smoothing: 0.55,
        streamline: 0.5,
        simulatePressure: true,
      });
      renderPts = outline.flat();
      drawStyle = "fill";
      pad = 2;
    } else if (drawBrush === "spray") {
      drawStyle = "spray";
      opacity = 0.9;
      pad = drawWidth * 3;
    } else {
      const bs = brushStyle(drawBrush, drawWidth);
      strokeWidth = bs.strokeWidth;
      opacity = bs.opacity;
      dash = bs.dash;
      pad = bs.strokeWidth + (bs.glow ?? 0);
      if (bs.glow) effects.glow = { ...effects.glow, enabled: true, color: drawColor, strength: bs.glow };
    }
    if (renderPts.length < 4) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < renderPts.length; i += 2) {
      minX = Math.min(minX, renderPts[i]);
      maxX = Math.max(maxX, renderPts[i]);
      minY = Math.min(minY, renderPts[i + 1]);
      maxY = Math.max(maxY, renderPts[i + 1]);
    }
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const local = renderPts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY));
    const layer: ShapeLayer = {
      id: uid(),
      name: "Drawing",
      type: "shape",
      shape: "freehand",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      opacity,
      visible: true,
      locked: false,
      fill: drawColor,
      cornerRadius: 0,
      points: local,
      strokeWidth,
      dash,
      drawStyle,
      effects,
      animation: { ...DEFAULT_ANIMATION },
    };
    insertLayer(layer);
  }, [stroke, drawWidth, drawBrush, drawColor, insertLayer, eraseStrokes]);

  // Fit once, as soon as the container has been measured.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || size.width === 0) return;
    fitted.current = true;
    zoomToFit(size.width, size.height);
  }, [size, zoomToFit]);

  // Keep the transformer bound to whatever is selected.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    const nodes = selectedIds
      .map((id) => stage.findOne<Konva.Group>(`#${id}`))
      .filter((node): node is Konva.Group => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, project?.layers]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      if (e.evt.ctrlKey || e.evt.metaKey) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const next = Math.max(0.05, Math.min(4, zoom * (e.evt.deltaY < 0 ? 1.08 : 0.926)));
        // Keep the point under the cursor pinned while zooming.
        setPan(
          pointer.x - ((pointer.x - panX) / zoom) * next,
          pointer.y - ((pointer.y - panY) / zoom) * next,
        );
        setZoom(next);
      } else {
        setPan(panX - e.evt.deltaX, panY - e.evt.deltaY);
      }
    },
    [zoom, panX, panY, setPan, setZoom],
  );

  /** Canvas edges/centre plus every other layer's edges and centre. */
  const snapTargets = useCallback(
    (movingId: string) => {
      const x = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
      const y = [0, CANVAS_HEIGHT / 2, CANVAS_HEIGHT];
      for (const layer of project?.layers ?? []) {
        if (layer.id === movingId || !layer.visible) continue;
        x.push(layer.x, layer.x + layer.width / 2, layer.x + layer.width);
        y.push(layer.y, layer.y + layer.height / 2, layer.y + layer.height);
      }
      return { x, y };
    },
    [project?.layers],
  );

  const handleDragMove = useCallback(
    (id: string, rawX: number, rawY: number) => {
      const layer = project?.layers.find((l) => l.id === id);
      if (!layer) return;

      if (!snap) {
        updateLayer(id, { x: rawX, y: rawY }, false);
        return;
      }

      const targets = snapTargets(id);
      const tolerance = SNAP_THRESHOLD / zoom;
      const found: Guide[] = [];

      // Snap whichever of the layer's leading edge, centre or trailing edge
      // lands nearest a target line.
      const fit = (value: number, edges: number[], axis: "x" | "y") => {
        const extent = axis === "x" ? layer.width : layer.height;
        const anchors = [0, extent / 2, extent];
        for (const edge of edges) {
          for (const anchor of anchors) {
            if (Math.abs(value + anchor - edge) < tolerance) {
              found.push({ axis, position: edge });
              return edge - anchor;
            }
          }
        }
        return value;
      };

      const x = fit(rawX, targets.x, "x");
      const y = fit(rawY, targets.y, "y");

      setGuides(showGuides ? found : []);
      updateLayer(id, { x, y }, false);
    },
    [project?.layers, snap, snapTargets, zoom, updateLayer, showGuides],
  );

  const handleTransformEnd = useCallback(
    (id: string, node: Konva.Group) => {
      const layer = project?.layers.find((l) => l.id === id);
      if (!layer) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const width = Math.max(8, layer.width * scaleX);
      const height = Math.max(8, layer.height * scaleY);

      // The node's origin sits at its centre (offsetX/offsetY = w/2, h/2).
      const patch: LayerPatch = {
        x: node.x() - width / 2,
        y: node.y() - height / 2,
        width,
        height,
        rotation: node.rotation(),
      };

      // Resizing text should grow the glyphs, not just the text box.
      if (layer.type === "text") {
        patch.fontSize = Math.max(6, layer.fontSize * scaleY);
      }

      node.scaleX(1);
      node.scaleY(1);
      updateLayer(id, patch);
    },
    [project?.layers, updateLayer],
  );

  if (!project) return null;

  const ctx = { theme: project.theme, profile, time, mode: "edit" as const };
  const backgroundHint = resolveColor("@background", project.theme);

  return (
    <div ref={containerRef} className="checker relative size-full overflow-hidden">
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          draggable={panTool && !drawTool}
          x={panTool ? panX : 0}
          y={panTool ? panY : 0}
          onDragEnd={(e) => panTool && setPan(e.target.x(), e.target.y())}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (drawTool) {
              startDraw();
              return;
            }
            if (e.target === e.target.getStage()) select([]);
          }}
          onMouseMove={drawTool ? moveDraw : undefined}
          onMouseUp={drawTool ? endDraw : undefined}
          onMouseLeave={drawTool ? endDraw : undefined}
          style={drawTool ? { cursor: "crosshair" } : undefined}
          key={fontsReady ? "fonts" : "fallback"}
        >
          <KonvaLayer>
            <Group x={panTool ? 0 : panX} y={panTool ? 0 : panY} scaleX={zoom} scaleY={zoom}>
              {/* Canvas bounds. Filled only faintly — the checkerboard beneath
                  communicates that unpainted pixels export as transparent. */}
              <Rect
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={1 / zoom}
                shadowColor="black"
                shadowBlur={40}
                shadowOpacity={0.5}
                listening={false}
              />

              {showGrid && <Grid zoom={zoom} />}

              {/* Layers are clipped to the artboard, matching what export and
                  OBS produce — decor that deliberately overshoots the canvas
                  (blurred washes, off-screen particle entries) would otherwise
                  spill into the workspace. */}
              <Group
                clipFunc={(c) => {
                  c.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }}
              >
                {project.layers.map((layer) => (
                  <LayerNode
                    key={layer.id}
                    layer={layer}
                    ctx={ctx}
                    draggable={!panTool && !drawTool}
                    onSelect={(id, additive) => toggleSelect(id, additive)}
                    onDragStart={beginGesture}
                    onDragMove={handleDragMove}
                    onDragEnd={(id, x, y) => {
                      setGuides([]);
                      updateLayer(id, { x, y }, false);
                    }}
                    onTransformEnd={handleTransformEnd}
                  />
                ))}
              </Group>

              {stroke && stroke.length >= 4 && (() => {
                const col = resolveColor(drawColor, project.theme);
                if (drawBrush === "eraser") {
                  return (
                    <Line
                      points={stroke}
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth={Math.max(16, drawWidth * 2.5)}
                      lineCap="round"
                      lineJoin="round"
                      opacity={0.3}
                      listening={false}
                    />
                  );
                }
                if (drawBrush === "ink") {
                  const input: number[][] = [];
                  for (let i = 0; i < stroke.length; i += 2) input.push([stroke[i], stroke[i + 1]]);
                  const outline = getStroke(input, {
                    size: drawWidth * 2.2,
                    thinning: 0.65,
                    smoothing: 0.55,
                    streamline: 0.5,
                    simulatePressure: true,
                  });
                  return <Line points={outline.flat()} closed fill={col} listening={false} />;
                }
                const bs = brushStyle(drawBrush, drawWidth);
                const opacity = drawBrush === "spray" ? 0.6 : bs.opacity;
                return (
                  <Line
                    points={stroke}
                    stroke={col}
                    strokeWidth={bs.strokeWidth}
                    opacity={opacity}
                    dash={bs.dash}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.4}
                    shadowColor={bs.glow ? col : undefined}
                    shadowBlur={bs.glow}
                    listening={false}
                  />
                );
              })()}

              {guides.map((guide, i) => (
                <Line
                  key={`${guide.axis}-${guide.position}-${i}`}
                  points={
                    guide.axis === "x"
                      ? [guide.position, -4000, guide.position, 4000]
                      : [-4000, guide.position, 4000, guide.position]
                  }
                  stroke="#f43f5e"
                  strokeWidth={1 / zoom}
                  dash={[6 / zoom, 4 / zoom]}
                  listening={false}
                />
              ))}
            </Group>

            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio={false}
              ignoreStroke
              borderStroke="#8b5cf6"
              borderStrokeWidth={1.5}
              anchorStroke="#8b5cf6"
              anchorFill="#0a0a11"
              anchorSize={9}
              anchorCornerRadius={3}
              rotateAnchorOffset={26}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
              }
            />
          </KonvaLayer>
        </Stage>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 backdrop-blur">
        <span
          className="size-2.5 rounded-full ring-1 ring-white/20"
          style={{ background: backgroundHint }}
        />
        1920 × 1080 · {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function Grid({ zoom }: { zoom: number }) {
  const lines = [];
  const width = 1 / zoom;
  for (let x = GRID_STEP; x < CANVAS_WIDTH; x += GRID_STEP) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, CANVAS_HEIGHT]}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={width}
        listening={false}
      />,
    );
  }
  for (let y = GRID_STEP; y < CANVAS_HEIGHT; y += GRID_STEP) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[0, y, CANVAS_WIDTH, y]}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={width}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}
