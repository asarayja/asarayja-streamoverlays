"use client";

import { useEffect, useMemo, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { isContinuous, isStingerMotion, previewClock, timelineDuration } from "@/lib/animation";
import { cx } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useEditorStore } from "@/store/editor";

/**
 * The timeline is a *view* onto the clock, not a keyframe store. Every layer's
 * motion is a pure function of `time`, so scrubbing is just setting a number —
 * which is also what the exporter does, frame by frame.
 */
export function Timeline() {
  const t = useT();
  const project = useEditorStore((s) => s.project);
  const playing = useEditorStore((s) => s.playing);
  const time = useEditorStore((s) => s.time);
  const duration = useEditorStore((s) => s.duration);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setTime = useEditorStore((s) => s.setTime);
  const setDuration = useEditorStore((s) => s.setDuration);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);

  const frameRef = useRef(0);
  const originRef = useRef(0);

  // Play loops smoothly with nothing to set up. A stinger ping-pongs over its
  // timeline (its motif eases in and out); every other design runs UNBOUNDED —
  // the entrance plays once and the ambient motion carries the loop — so
  // headline text never blinks in and out.
  const loopPeriod = useMemo(() => {
    const ls = project?.layers ?? [];
    const anims = ls.map((l) => l.animation);
    const loop = isStingerMotion(anims) || ls.some((l) => l.type === "alert");
    return loop ? timelineDuration(anims) : 0;
  }, [project?.layers]);

  useEffect(() => {
    if (!playing) return;
    originRef.current = performance.now();

    const tick = (now: number) => {
      setTime(previewClock(now - originRef.current, loopPeriod));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, setTime, loopPeriod]);

  if (!project) return null;

  const animated = project.layers.filter((l) => l.animation.preset !== "none");

  return (
    <div className="flex h-[176px] shrink-0 flex-col border-t border-white/[0.06] bg-ink-900">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <button
          onClick={() => setPlaying(!playing)}
          className="grid size-8 place-items-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-400"
          title={playing ? t("Pause") : t("Play")}
        >
          {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        </button>
        <button
          onClick={() => setTime(0)}
          className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title={t("Back to start")}
        >
          <RotateCcw className="size-4" />
        </button>

        <span className="w-24 font-mono text-xs tabular-nums text-zinc-400">
          {(Math.min(time, duration) / 1000).toFixed(2)}s
        </span>

        <input
          type="range"
          min={0}
          max={duration}
          step={10}
          value={Math.min(time, duration)}
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.target.value));
          }}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
        />

        <label className="flex items-center gap-2 text-xs text-zinc-500">
          {t("Duration")}
          <input
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            value={duration / 1000}
            onChange={(e) => setDuration(Number(e.target.value) * 1000)}
            className="w-16 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs text-zinc-200 focus:outline-none"
          />
          s
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {animated.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-600">
            {t("No animated layers yet. Pick a layer and choose a preset in the Animate panel.")}
          </p>
        ) : (
          <ul className="space-y-1">
            {animated.map((layer) => {
              const loops = isContinuous(layer.animation.preset) || layer.animation.loop;
              const start = (layer.animation.delay / duration) * 100;
              const width = loops
                ? 100 - start
                : Math.min(100 - start, (layer.animation.duration / duration) * 100);
              const selected = selectedIds.includes(layer.id);

              return (
                <li key={layer.id} className="flex items-center gap-3">
                  <button
                    onClick={() => select([layer.id])}
                    className={cx(
                      "w-36 shrink-0 truncate rounded px-1.5 py-1 text-left text-[11px] transition-colors",
                      selected ? "bg-brand-500/20 text-brand-400" : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {layer.name}
                  </button>

                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-black/40">
                    <div
                      className={cx(
                        "absolute inset-y-0 flex items-center rounded px-2 text-[9px] font-medium uppercase tracking-wider",
                        selected ? "bg-brand-500 text-white" : "bg-brand-500/35 text-brand-400",
                        loops && "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.12)_4px,rgba(255,255,255,0.12)_8px)]",
                      )}
                      style={{ left: `${Math.max(0, Math.min(100, start))}%`, width: `${Math.max(2, width)}%` }}
                    >
                      <span className="truncate">{layer.animation.preset}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
