"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Group, Layer as KonvaLayer, Line, Rect, Stage, Transformer } from "react-konva";
import { LayerNode } from "@/components/overlay/LayerNode";
import { useFontsReady } from "@/components/overlay/OverlayStage";
import { resolveColor } from "@/lib/theme";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/types";
import type { ChannelProfile, LayerPatch } from "@/lib/types";
import { useElementSize } from "@/lib/useElementSize";
import { useEditorStore } from "@/store/editor";

const SNAP_THRESHOLD = 8;
const GRID_STEP = 60;

interface Guide {
  axis: "x" | "y";
  position: number;
}

export function EditorCanvas({ profile, panTool }: { profile: ChannelProfile; panTool: boolean }) {
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
  const beginGesture = useEditorStore((s) => s.beginGesture);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const zoomToFit = useEditorStore((s) => s.zoomToFit);

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
          draggable={panTool}
          x={panTool ? panX : 0}
          y={panTool ? panY : 0}
          onDragEnd={(e) => panTool && setPan(e.target.x(), e.target.y())}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) select([]);
          }}
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

              {project.layers.map((layer) => (
                <LayerNode
                  key={layer.id}
                  layer={layer}
                  ctx={ctx}
                  draggable={!panTool}
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
