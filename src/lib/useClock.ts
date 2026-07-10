"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A requestAnimationFrame clock in milliseconds.
 *
 * `loopAfter` wraps the clock so looping overlays (OBS sources, gallery hover
 * previews) replay forever without drift accumulating in a counter.
 */
export function useClock(running: boolean, loopAfter = 0): number {
  const [time, setTime] = useState(0);
  const startRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!running) return;

    startRef.current = performance.now() - time;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setTime(loopAfter > 0 ? elapsed % loopAfter : elapsed);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // `time` is intentionally excluded: including it would restart the clock
    // every frame. It is read once to resume from where we paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, loopAfter]);

  return time;
}
