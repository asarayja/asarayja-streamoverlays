"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { hexToRgb, hsvToHex, rgbToHex, rgbToHsv, type HSV } from "@/lib/color";

/** Handy single-colour swatches: neutrals, brand, and the pride-flag hues. */
const SWATCHES = [
  "#FFFFFF", "#C7CDD6", "#8A9099", "#4A4E55", "#1A1A22", "#000000",
  "#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787",
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00A2FF", "#AF52DE",
  "#5BCEFA", "#F5A9B8", "#D52D00", "#D362A4", "#8b5cf6", "#22d3ee",
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * An RGB/HSV colour picker: a saturation–value square, a hue slider, hex and
 * R/G/B inputs, and quick swatches. Emits `#rrggbb` — picking a colour drops any
 * theme-token link, which is the point.
 */
export function ColorPicker({
  onChange,
  onCommit,
  resolved,
  onClose,
  anchorRef,
}: {
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  /** The colour actually painted right now (a resolved hex). */
  resolved: string;
  onClose: () => void;
  /** The trigger the popover floats next to. */
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const start = hexToRgb(resolved) ?? { r: 139, g: 92, b: 246 };
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(start));
  const [hexText, setHexText] = useState(rgbToHex(start.r, start.g, start.b));
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useRef(hexText);

  // Float next to the trigger with fixed positioning, flipping above it when
  // there isn't room below. Rendered in a portal so the scrolling panel can't
  // clip it or grow its scroll height.
  useLayoutEffect(() => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const W = 224;
    const H = 340;
    let left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
    let top = r.bottom + 6;
    if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - 6);
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    // Any scroll or resize closes it — no stale, mis-placed popover.
    const id = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, anchorRef]);

  const apply = (nh: HSV, commit = false) => {
    const hex = hsvToHex(nh);
    latest.current = hex;
    setHsv(nh);
    setHexText(hex);
    onChange(hex);
    if (commit) onCommit?.(hex);
  };

  const drag = (compute: (e: PointerEvent | React.PointerEvent) => HSV) => (e: React.PointerEvent) => {
    e.preventDefault();
    apply(compute(e));
    const move = (ev: PointerEvent) => apply(compute(ev));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit?.(latest.current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const svFromEvent = (e: PointerEvent | React.PointerEvent): HSV => {
    const r = svRef.current!.getBoundingClientRect();
    const x = clamp01((e.clientX - r.left) / r.width);
    const y = clamp01((e.clientY - r.top) / r.height);
    return { h: hsv.h, s: x, v: 1 - y };
  };
  const hueFromEvent = (e: PointerEvent | React.PointerEvent): HSV => {
    const r = hueRef.current!.getBoundingClientRect();
    return { ...hsv, h: clamp01((e.clientX - r.left) / r.width) * 360 };
  };

  const rgb = hexToRgb(latest.current) ?? start;
  const setChannel = (key: "r" | "g" | "b", raw: string) => {
    const v = Math.max(0, Math.min(255, Number(raw) || 0));
    const next = { ...rgb, [key]: v };
    const hex = rgbToHex(next.r, next.g, next.b);
    latest.current = hex;
    setHsv(rgbToHsv(next));
    setHexText(hex);
    onChange(hex);
  };

  const commitHex = (raw: string) => {
    const parsed = hexToRgb(raw);
    if (parsed) {
      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);
      latest.current = hex;
      setHsv(rgbToHsv(parsed));
      setHexText(hex);
      onChange(hex);
      onCommit?.(hex);
    }
  };

  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const num = "w-full rounded border border-white/10 bg-black/40 px-1.5 py-1 text-center font-mono text-[11px] text-zinc-100 focus:border-brand-500/60 focus:outline-none";

  if (!pos) return null;

  return createPortal(
    <div
      ref={rootRef}
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      className="z-[200] w-56 rounded-xl border border-white/10 bg-ink-900 p-3 shadow-2xl"
    >
      {/* Saturation / value square */}
      <div
        ref={svRef}
        onPointerDown={drag(svFromEvent)}
        className="relative h-32 w-full cursor-crosshair rounded-lg"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})` }}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: latest.current }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={drag(hueFromEvent)}
        className="relative mt-2 h-3 w-full cursor-pointer rounded-full"
        style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: hueHex }}
        />
      </div>

      {/* Hex + RGB */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="size-7 shrink-0 rounded border border-white/15" style={{ background: latest.current }} />
        <input
          value={hexText}
          onChange={(e) => {
            setHexText(e.target.value);
            const p = hexToRgb(e.target.value);
            if (p) { latest.current = rgbToHex(p.r, p.g, p.b); setHsv(rgbToHsv(p)); onChange(latest.current); }
          }}
          onBlur={(e) => commitHex(e.target.value)}
          className={`${num} flex-1`}
          spellCheck={false}
        />
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {(["r", "g", "b"] as const).map((k) => (
          <input key={k} type="number" min={0} max={255} value={Math.round(rgb[k])} onChange={(e) => setChannel(k, e.target.value)} onBlur={() => onCommit?.(latest.current)} className={num} aria-label={k.toUpperCase()} />
        ))}
      </div>

      {/* Swatches */}
      <div className="mt-3 grid grid-cols-8 gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => { const p = hexToRgb(c)!; setHsv(rgbToHsv(p)); setHexText(c); latest.current = c; onChange(c); onCommit?.(c); }}
            className="aspect-square rounded border border-white/10 transition-transform hover:scale-110"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
