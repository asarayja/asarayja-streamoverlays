"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Group, Layer as KonvaLayer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { LayerNode } from "@/components/overlay/LayerNode";
import { useFontsReady } from "@/components/overlay/OverlayStage";
import { resolveColor } from "@/lib/theme";
import { CANVAS_HEIGHT, CANVAS_WIDTH, DEFAULT_ANIMATION, DEFAULT_EFFECTS } from "@/lib/types";
import type { ChannelProfile, ImageLayer, LayerPatch, ShapeLayer } from "@/lib/types";
import { uid } from "@/lib/id";
import { getStroke } from "perfect-freehand";
import { useElementSize } from "@/lib/useElementSize";
import { brushStyle, isCameraLayer, useEditorStore } from "@/store/editor";

const SNAP_THRESHOLD = 8;
const GRID_STEP = 60;

interface Guide {
  axis: "x" | "y";
  position: number;
}

/** Photoshop-style readout while dragging: the gap from each edge of the box to
    the matching canvas edge. When a pair is equal (centred on that axis) it
    turns green, so "the same on both sides" is obvious at a glance. */
function MeasureOverlay({
  box,
  cw,
  ch,
  zoom,
}: {
  box: { x: number; y: number; w: number; h: number };
  cw: number;
  ch: number;
  zoom: number;
}) {
  const { x, y, w, h } = box;
  const left = Math.max(0, Math.round(x));
  const right = Math.max(0, Math.round(cw - (x + w)));
  const top = Math.max(0, Math.round(y));
  const bottom = Math.max(0, Math.round(ch - (y + h)));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = 1 / zoom;
  const cX = Math.abs(left - right) <= 1 ? "#22c55e" : "#38bdf8";
  const cY = Math.abs(top - bottom) <= 1 ? "#22c55e" : "#38bdf8";

  const seg = (pts: number[], color: string, key: string) => (
    <Line key={key} points={pts} stroke={color} strokeWidth={s} dash={[5 * s, 4 * s]} listening={false} />
  );
  const label = (text: string, mx: number, my: number, color: string, key: string) => {
    const fs = 12 * s;
    const pad = 4 * s;
    const tw = text.length * fs * 0.64 + pad * 2;
    const th = fs + pad * 1.6;
    return (
      <Group key={key} x={mx - tw / 2} y={my - th / 2} listening={false}>
        <Rect width={tw} height={th} cornerRadius={3 * s} fill={color} />
        <Text
          text={text}
          width={tw}
          height={th}
          align="center"
          verticalAlign="middle"
          fontSize={fs}
          fontStyle="bold"
          fill="#0b1020"
        />
      </Group>
    );
  };

  return (
    <>
      {seg([0, cy, x, cy], cX, "sl")}
      {seg([x + w, cy, cw, cy], cX, "sr")}
      {seg([cx, 0, cx, y], cY, "st")}
      {seg([cx, y + h, cx, ch], cY, "sb")}
      {label(`${left}`, x / 2, cy, cX, "ll")}
      {label(`${right}`, (x + w + cw) / 2, cy, cX, "lr")}
      {label(`${top}`, cx, y / 2, cY, "lt")}
      {label(`${bottom}`, cx, (y + h + ch) / 2, cY, "lb")}
    </>
  );
}

const SPLIT_SHAPES = ["arcsplit", "wavesplit", "diagonalsplit", "zigzagsplit"];

/** Trace a split shape's silhouette in local coords — used as a bucket boundary. */
function splitPath(c: CanvasRenderingContext2D, shape: string, w: number, h: number, cr: number) {
  c.beginPath();
  if (shape === "arcsplit") {
    c.moveTo(0, cr);
    c.quadraticCurveTo(w / 2, -cr, w, cr);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
  } else if (shape === "wavesplit") {
    const amp = cr || 1;
    const steps = 64;
    c.moveTo(0, amp);
    for (let i = 1; i <= steps; i++) c.lineTo((w * i) / steps, amp + Math.sin((i / steps) * Math.PI * 2 * 3) * amp);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
  } else if (shape === "diagonalsplit") {
    const mid = h / 2;
    c.moveTo(0, mid - cr);
    c.lineTo(w, mid + cr);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
  } else if (shape === "zigzagsplit") {
    const amp = cr || 1;
    const teeth = 10;
    c.moveTo(0, amp);
    for (let i = 1; i <= teeth; i++) c.lineTo((w * i) / teeth, i % 2 === 0 ? 2 * amp : 0);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return { r: parseInt(s.slice(0, 2), 16) || 0, g: parseInt(s.slice(2, 4), 16) || 0, b: parseInt(s.slice(4, 6), 16) || 0 };
}

export function EditorCanvas({
  profile,
  panTool,
  drawTool = false,
  bucketTool = false,
}: {
  profile: ChannelProfile;
  panTool: boolean;
  drawTool?: boolean;
  bucketTool?: boolean;
}) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  /** Box (canvas coords) being dragged — drives the distance-to-edge readout. */
  const [measure, setMeasure] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const fontsReady = useFontsReady();
  // While Ctrl/Cmd is held during a resize, lock to a single axis so only one
  // side moves — the rest stays put.
  const axisLockRef = useRef(false);
  useEffect(() => {
    const set = (e: KeyboardEvent) => {
      axisLockRef.current = e.ctrlKey || e.metaKey;
    };
    window.addEventListener("keydown", set);
    window.addEventListener("keyup", set);
    return () => {
      window.removeEventListener("keydown", set);
      window.removeEventListener("keyup", set);
    };
  }, []);

  const project = useEditorStore((s) => s.project);
  const cw = project?.canvasWidth ?? CANVAS_WIDTH;
  const ch = project?.canvasHeight ?? CANVAS_HEIGHT;
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
  const moveSelected = useEditorStore((s) => s.moveSelected);
  const addStroke = useEditorStore((s) => s.addStroke);
  const insertFillLayer = useEditorStore((s) => s.insertFillLayer);
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
    let rainbow = false;
    let glow: number | undefined;

    if (drawBrush === "fill") {
      // Close the hand-drawn boundary down to the canvas floor → a filled region
      // below the curve. Over another colour it's a hand-drawn colour split.
      const lastX = pts[pts.length - 2];
      const firstX = pts[0];
      renderPts = [...pts, lastX, ch, firstX, ch];
      drawStyle = "fill";
    } else if (drawBrush === "ink" || drawBrush === "calligraphy" || drawBrush === "ribbon") {
      // Variable-width filled strokes via perfect-freehand.
      const opts =
        drawBrush === "calligraphy"
          ? { size: drawWidth * 2.6, thinning: 0.85, smoothing: 0.5, streamline: 0.4, simulatePressure: true }
          : drawBrush === "ribbon"
            ? { size: drawWidth * 2.4, thinning: 0, smoothing: 0.6, streamline: 0.5, simulatePressure: false }
            : { size: drawWidth * 2.2, thinning: 0.65, smoothing: 0.55, streamline: 0.5, simulatePressure: true };
      const input: number[][] = [];
      for (let i = 0; i < pts.length; i += 2) input.push([pts[i], pts[i + 1]]);
      renderPts = getStroke(input, opts).flat();
      drawStyle = "fill";
    } else if (drawBrush === "spray" || drawBrush === "crayon") {
      drawStyle = "spray";
      opacity = 0.9;
      strokeWidth = drawBrush === "crayon" ? Math.max(3, drawWidth * 0.6) : drawWidth;
    } else if (drawBrush === "sketch") {
      drawStyle = "sketch";
      strokeWidth = Math.max(2, drawWidth * 0.7);
    } else if (drawBrush === "rainbow") {
      rainbow = true;
      strokeWidth = drawWidth;
    } else {
      const bs = brushStyle(drawBrush, drawWidth);
      strokeWidth = bs.strokeWidth;
      opacity = bs.opacity;
      dash = bs.dash;
      if (bs.glow) glow = bs.glow;
    }
    if (renderPts.length < 4) return;

    // With a webcam frame present, mask the stroke to a band around it — like
    // drawing inside a Photoshop marquee — so paint never spills far outside the
    // frame (and the camera hole below cuts the inside). Absolute coords.
    const MARGIN = 90;
    let clip: ShapeLayer["clip"];
    const cams = (useEditorStore.getState().project?.layers ?? []).filter(isCameraLayer);
    if (cams.length) {
      // Only mask a stroke to the webcam when it actually STARTS on the camera —
      // then paint hugs the frame, the intended look.
      const sx = pts[0], sy = pts[1];
      const cam = cams.find(
        (l) => sx >= l.x - MARGIN && sx <= l.x + l.width + MARGIN && sy >= l.y - MARGIN && sy <= l.y + l.height + MARGIN,
      );
      if (cam) {
        clip = { x: cam.x - MARGIN, y: cam.y - MARGIN, width: cam.width + 2 * MARGIN, height: cam.height + 2 * MARGIN };
      }
    }

    // One stroke, absolute coords, its own style — the store appends it to the
    // active drawing layer (or starts a new one), so many strokes share a layer.
    addStroke({
      points: renderPts,
      color: drawColor,
      width: strokeWidth,
      drawStyle: drawStyle ?? "line",
      dash,
      rainbow,
      glow,
      opacity,
      clip,
    });
  }, [stroke, drawWidth, drawBrush, drawColor, ch, addStroke, eraseStrokes]);

  // Bucket fill: flood the clicked region, bounded by the freehand strokes, and
  // drop it in as an image layer below the lines — fill in the sides you drew.
  const bucketFill = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage || !project) return;
    const ptr = stage.getPointerPosition();
    if (!ptr) return;
    const o = toOverlay(ptr);
    const hex = resolveColor(drawColor, project.theme);

    // If the click lands on an existing fill, recolour that layer instead of
    // stacking a new one — filling the same area again just changes its colour.
    for (let i = project.layers.length - 1; i >= 0; i--) {
      const l = project.layers[i];
      if (l.type !== "image" || l.name !== "Fill" || !l.visible || l.locked || !l.src.startsWith("data:")) continue;
      const img = await new Promise<HTMLImageElement | null>((res) => {
        const im = new window.Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = l.src;
      });
      if (!img) continue;
      const rc = document.createElement("canvas");
      rc.width = img.width;
      rc.height = img.height;
      const rctx2 = rc.getContext("2d", { willReadFrequently: true });
      if (!rctx2) continue;
      rctx2.drawImage(img, 0, 0);
      const px = Math.floor((o.x / cw) * img.width);
      const py = Math.floor((o.y / ch) * img.height);
      if (px < 0 || px >= img.width || py < 0 || py >= img.height) continue;
      const id = rctx2.getImageData(0, 0, img.width, img.height);
      if (id.data[(py * img.width + px) * 4 + 3] <= 40) continue; // clicked a hole — not this fill
      const rgb = hexToRgb(hex);
      for (let p = 0; p < id.data.length; p += 4) {
        if (id.data[p + 3] > 0) {
          id.data[p] = rgb.r;
          id.data[p + 1] = rgb.g;
          id.data[p + 2] = rgb.b;
        }
      }
      rctx2.putImageData(id, 0, 0);
      updateLayer(l.id, { src: rc.toDataURL("image/png") });
      return;
    }

    const SC = 0.5; // half-res for speed/memory; the image scales back up
    const W = Math.round(cw * SC);
    const H = Math.round(ch * SC);
    const sx = Math.round(o.x * SC);
    const sy = Math.round(o.y * SC);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const bctx = off.getContext("2d", { willReadFrequently: true });
    if (!bctx) return;
    bctx.scale(SC, SC); // draw everything in full 1920×1080 coords
    bctx.strokeStyle = "#000";
    bctx.fillStyle = "#000";
    bctx.lineCap = "round";
    bctx.lineJoin = "round";
    for (const l of project.layers) {
      if (l.type !== "shape" || !l.visible) continue;
      // Freehand strokes are boundaries.
      if (l.shape === "freehand" && l.points && (l.drawStyle ?? "line") !== "fill") {
        bctx.lineWidth = Math.max(6, l.strokeWidth ?? 8);
        bctx.beginPath();
        const pts = l.points;
        for (let i = 0; i < pts.length; i += 2) {
          const x = l.x + pts[i];
          const y = l.y + pts[i + 1];
          if (i === 0) bctx.moveTo(x, y);
          else bctx.lineTo(x, y);
        }
        bctx.stroke();
        continue;
      }
      // Split shapes (arc/wave/diagonal/zigzag) are boundaries — fill their
      // silhouette so the flood stops at their curve, honouring the rotation.
      if (SPLIT_SHAPES.includes(l.shape)) {
        bctx.save();
        bctx.translate(l.x + l.width / 2, l.y + l.height / 2);
        bctx.rotate(((l.rotation ?? 0) * Math.PI) / 180);
        bctx.translate(-l.width / 2, -l.height / 2);
        splitPath(bctx, l.shape, l.width, l.height, l.cornerRadius ?? 0);
        bctx.fill();
        bctx.restore();
      }
    }
    const data = bctx.getImageData(0, 0, W, H).data;
    const wall = (idx: number) => data[idx * 4 + 3] > 40;
    if (wall(sy * W + sx)) return;

    const visited = new Uint8Array(W * H);
    const stack = [sy * W + sx];
    const region: number[] = [];
    while (stack.length) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (wall(idx)) continue;
      region.push(idx);
      const x = idx % W;
      const y = (idx - x) / W;
      if (x > 0) stack.push(idx - 1);
      if (x < W - 1) stack.push(idx + 1);
      if (y > 0) stack.push(idx - W);
      if (y < H - 1) stack.push(idx + W);
    }
    if (region.length < 16) return;

    const res = document.createElement("canvas");
    res.width = W;
    res.height = H;
    const rctx = res.getContext("2d");
    if (!rctx) return;
    const out = rctx.createImageData(W, H);
    const rgb = hexToRgb(hex);
    for (const idx of region) {
      const o4 = idx * 4;
      out.data[o4] = rgb.r;
      out.data[o4 + 1] = rgb.g;
      out.data[o4 + 2] = rgb.b;
      out.data[o4 + 3] = 255;
    }
    rctx.putImageData(out, 0, 0);

    const layer: ImageLayer = {
      id: uid(),
      name: "Fill",
      type: "image",
      x: 0,
      y: 0,
      width: cw,
      height: ch,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src: res.toDataURL("image/png"),
      fit: "fill",
      cornerRadius: 0,
      effects: structuredClone(DEFAULT_EFFECTS),
      animation: { ...DEFAULT_ANIMATION },
    };
    insertFillLayer(layer);
  }, [project, toOverlay, drawColor, insertFillLayer, cw, ch, updateLayer]);

  // Fit when first measured, and again whenever the artboard format changes —
  // but not on ordinary container resizes (the key stays the same).
  const fittedFormat = useRef<string | null>(null);
  useEffect(() => {
    if (size.width === 0) return;
    const key = `${cw}x${ch}`;
    if (fittedFormat.current === key) return;
    fittedFormat.current = key;
    zoomToFit(size.width, size.height);
  }, [cw, ch, size, zoomToFit]);

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
      const x = [0, cw / 2, cw];
      const y = [0, ch / 2, ch];
      for (const layer of project?.layers ?? []) {
        if (layer.id === movingId || !layer.visible) continue;
        x.push(layer.x, layer.x + layer.width / 2, layer.x + layer.width);
        y.push(layer.y, layer.y + layer.height / 2, layer.y + layer.height);
      }
      return { x, y };
    },
    [project?.layers, cw, ch],
  );

  const handleDragMove = useCallback(
    (id: string, rawX: number, rawY: number) => {
      const layer = project?.layers.find((l) => l.id === id);
      if (!layer) return;

      // Dragging one of several selected layers (e.g. a group) moves them all by
      // the same delta; a lone layer just moves itself.
      const apply = (fx: number, fy: number) => {
        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          moveSelected(fx - layer.x, fy - layer.y, false);
        } else {
          updateLayer(id, { x: fx, y: fy }, false);
        }
      };

      if (!snap) {
        setMeasure(showGuides ? { x: rawX, y: rawY, w: layer.width, h: layer.height } : null);
        apply(rawX, rawY);
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
      setMeasure(showGuides ? { x, y, w: layer.width, h: layer.height } : null);
      apply(x, y);
    },
    [project?.layers, snap, snapTargets, zoom, updateLayer, showGuides, selectedIds, moveSelected],
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

  const ctx = { theme: project.theme, profile, time, mode: "edit" as const, canvasWidth: cw, canvasHeight: ch };
  const backgroundHint = resolveColor("@background", project.theme);

  return (
    <div ref={containerRef} className="checker relative size-full overflow-hidden">
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          draggable={panTool && !drawTool && !bucketTool}
          x={panTool ? panX : 0}
          y={panTool ? panY : 0}
          onDragEnd={(e) => panTool && setPan(e.target.x(), e.target.y())}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (bucketTool) {
              bucketFill();
              return;
            }
            if (drawTool) {
              startDraw();
              return;
            }
            if (e.target === e.target.getStage()) select([]);
          }}
          onMouseMove={drawTool ? moveDraw : undefined}
          onMouseUp={drawTool ? endDraw : undefined}
          onMouseLeave={drawTool ? endDraw : undefined}
          style={drawTool || bucketTool ? { cursor: "crosshair" } : undefined}
          key={fontsReady ? "fonts" : "fallback"}
        >
          <KonvaLayer>
            <Group x={panTool ? 0 : panX} y={panTool ? 0 : panY} scaleX={zoom} scaleY={zoom}>
              {/* Canvas bounds. Filled only faintly — the checkerboard beneath
                  communicates that unpainted pixels export as transparent. */}
              <Rect
                width={cw}
                height={ch}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={1 / zoom}
                shadowColor="black"
                shadowBlur={40}
                shadowOpacity={0.5}
                listening={false}
              />

              {showGrid && <Grid zoom={zoom} cw={cw} ch={ch} />}

              {/* Layers are clipped to the artboard, matching what export and
                  OBS produce — decor that deliberately overshoots the canvas
                  (blurred washes, off-screen particle entries) would otherwise
                  spill into the workspace. */}
              <Group
                clipFunc={(c) => {
                  c.rect(0, 0, cw, ch);
                }}
              >
                {project.layers.map((layer) => (
                  <LayerNode
                    key={layer.id}
                    layer={layer}
                    ctx={ctx}
                    draggable={!panTool && !drawTool && !bucketTool}
                    onSelect={(id, additive) => toggleSelect(id, additive)}
                    onDragStart={beginGesture}
                    onDragMove={handleDragMove}
                    onDragEnd={(id, x, y) => {
                      setGuides([]);
                      setMeasure(null);
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
                if (drawBrush === "fill") {
                  const lastX = stroke[stroke.length - 2];
                  const firstX = stroke[0];
                  return (
                    <Line
                      points={[...stroke, lastX, ch, firstX, ch]}
                      closed
                      fill={col}
                      opacity={0.75}
                      listening={false}
                    />
                  );
                }
                if (drawBrush === "ink" || drawBrush === "calligraphy" || drawBrush === "ribbon") {
                  const opts =
                    drawBrush === "calligraphy"
                      ? { size: drawWidth * 2.6, thinning: 0.85, smoothing: 0.5, streamline: 0.4, simulatePressure: true }
                      : drawBrush === "ribbon"
                        ? { size: drawWidth * 2.4, thinning: 0, smoothing: 0.6, streamline: 0.5, simulatePressure: false }
                        : { size: drawWidth * 2.2, thinning: 0.65, smoothing: 0.55, streamline: 0.5, simulatePressure: true };
                  const input: number[][] = [];
                  for (let i = 0; i < stroke.length; i += 2) input.push([stroke[i], stroke[i + 1]]);
                  return <Line points={getStroke(input, opts).flat()} closed fill={col} listening={false} />;
                }
                if (drawBrush === "rainbow") {
                  return (
                    <Line
                      points={stroke}
                      strokeLinearGradientStartPoint={{ x: stroke[0], y: 0 }}
                      strokeLinearGradientEndPoint={{ x: stroke[stroke.length - 2], y: 0 }}
                      strokeLinearGradientColorStops={[
                        0, "#ff2d55", 0.17, "#ff8c00", 0.34, "#ffe000", 0.5, "#00c853",
                        0.67, "#00b0ff", 0.84, "#7c4dff", 1, "#ff2d55",
                      ]}
                      strokeWidth={drawWidth}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.4}
                      listening={false}
                    />
                  );
                }
                const bs = brushStyle(drawBrush, drawWidth);
                const opacity = drawBrush === "spray" || drawBrush === "crayon" ? 0.6 : bs.opacity;
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

              {measure && <MeasureOverlay box={measure} cw={cw} ch={ch} zoom={zoom} />}
            </Group>

            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio={false}
              centeredScaling={false}
              ignoreStroke
              borderStroke="#8b5cf6"
              borderStrokeWidth={1.5}
              anchorStroke="#8b5cf6"
              anchorFill="#0a0a11"
              anchorSize={9}
              anchorCornerRadius={3}
              rotateAnchorOffset={26}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 8 || newBox.height < 8) return oldBox;
                // Ctrl/Cmd held: lock to the axis that moved most, so a drag
                // resizes one side and leaves the other exactly where it was.
                if (axisLockRef.current) {
                  const dw = Math.abs(newBox.width - oldBox.width);
                  const dh = Math.abs(newBox.height - oldBox.height);
                  if (dw >= dh) {
                    newBox.height = oldBox.height;
                    newBox.y = oldBox.y;
                  } else {
                    newBox.width = oldBox.width;
                    newBox.x = oldBox.x;
                  }
                }
                return newBox;
              }}
            />
          </KonvaLayer>
        </Stage>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 backdrop-blur">
        <span
          className="size-2.5 rounded-full ring-1 ring-white/20"
          style={{ background: backgroundHint }}
        />
        {cw} × {ch} · {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function Grid({ zoom, cw, ch }: { zoom: number; cw: number; ch: number }) {
  const lines = [];
  const width = 1 / zoom;
  for (let x = GRID_STEP; x < cw; x += GRID_STEP) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, ch]}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={width}
        listening={false}
      />,
    );
  }
  for (let y = GRID_STEP; y < ch; y += GRID_STEP) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[0, y, cw, y]}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={width}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}
