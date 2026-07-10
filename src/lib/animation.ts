import type { Animation, Easing } from "./types";

/**
 * A deterministic animation engine: `sample(anim, t)` returns the transform to
 * apply at time `t`. No tween objects, no mutation, no scheduler.
 *
 * Being a pure function of time is what lets the same code drive the editor
 * preview, the OBS browser source, and a frame-accurate video export — an
 * exporter just calls `sample` at t = frame / fps.
 */
export interface AnimationSample {
  dx: number;
  dy: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Multiplied onto the layer's own opacity. */
  opacity: number;
  /** Extra shadow blur, in px. Drives `glow` / `shimmer`. */
  glowBoost: number;
  /** 0..1 fraction of the string to reveal. Drives `typewriter`. */
  reveal: number;
}

export const IDENTITY: AnimationSample = {
  dx: 0,
  dy: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  glowBoost: 0,
  reveal: 1,
};

/* --------------------------------- easing --------------------------------- */

const c1 = 1.70158;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;

export const EASING_FNS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  elasticOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** Deterministic pseudo-noise in [0,1). Replaces Math.random so exports repeat. */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/* -------------------------------- presets --------------------------------- */

/** Presets that run forever on a period, rather than playing once on entry. */
const CONTINUOUS = new Set([
  "pulse",
  "glow",
  "float",
  "wave",
  "shimmer",
  "shake",
  "flicker",
]);

export function isContinuous(preset: Animation["preset"]): boolean {
  return CONTINUOUS.has(preset);
}

const SLIDE_VECTORS: Record<Animation["direction"], [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/**
 * @param t elapsed milliseconds since the overlay started playing.
 */
export function sample(anim: Animation, t: number): AnimationSample {
  if (anim.preset === "none") return IDENTITY;

  const duration = Math.max(1, anim.duration);
  const elapsed = t - anim.delay;
  const k = anim.intensity;

  if (isContinuous(anim.preset)) {
    if (elapsed < 0) return IDENTITY;
    // phase in turns, so `Math.sin(phase * TAU)` completes one cycle per duration
    const phase = (elapsed % duration) / duration;
    const tau = Math.PI * 2;
    switch (anim.preset) {
      case "pulse": {
        const s = 1 + Math.sin(phase * tau) * 0.05 * k;
        return { ...IDENTITY, scaleX: s, scaleY: s };
      }
      case "glow":
        return { ...IDENTITY, glowBoost: (0.5 + 0.5 * Math.sin(phase * tau)) * 40 * k };
      case "shimmer":
        return {
          ...IDENTITY,
          glowBoost: Math.pow(Math.max(0, Math.sin(phase * tau)), 6) * 60 * k,
          opacity: 0.9 + 0.1 * Math.sin(phase * tau),
        };
      case "float":
        return { ...IDENTITY, dy: Math.sin(phase * tau) * 12 * k };
      case "wave":
        return {
          ...IDENTITY,
          dy: Math.sin(phase * tau) * 10 * k,
          rotation: Math.sin(phase * tau) * 3 * k,
        };
      case "shake": {
        const s = elapsed / 40;
        return { ...IDENTITY, dx: (noise(s) - 0.5) * 8 * k, dy: (noise(s + 99) - 0.5) * 8 * k };
      }
      case "flicker": {
        const bucket = Math.floor(elapsed / 90);
        const n = noise(bucket);
        return { ...IDENTITY, opacity: n > 0.82 ? 0.35 : 0.85 + n * 0.15 };
      }
    }
  }

  // One-shot entry animations: hold the start pose before `delay`, hold the end
  // pose after `duration` (unless looping).
  if (elapsed <= 0) return atProgress(anim, 0);
  const raw = anim.loop ? (elapsed % duration) / duration : Math.min(1, elapsed / duration);
  return atProgress(anim, raw);
}

function atProgress(anim: Animation, raw: number): AnimationSample {
  const p = EASING_FNS[anim.easing](raw);
  const k = anim.intensity;

  switch (anim.preset) {
    case "fade":
      return { ...IDENTITY, opacity: p };
    case "slide": {
      const [vx, vy] = SLIDE_VECTORS[anim.direction];
      const travel = 240 * k * (1 - p);
      return { ...IDENTITY, dx: vx * travel, dy: vy * travel, opacity: Math.min(1, p * 1.6) };
    }
    case "zoom": {
      const s = 0.6 + 0.4 * p;
      return { ...IDENTITY, scaleX: s, scaleY: s, opacity: p };
    }
    case "scale": {
      const s = 0.85 + 0.15 * p;
      return { ...IDENTITY, scaleX: s, scaleY: s, opacity: Math.min(1, p * 2) };
    }
    case "bounce": {
      const b = EASING_FNS.bounceOut(raw);
      return { ...IDENTITY, dy: -120 * k * (1 - b), opacity: Math.min(1, raw * 3) };
    }
    case "elastic": {
      const e = EASING_FNS.elasticOut(raw);
      const s = 0.5 + 0.5 * e;
      return { ...IDENTITY, scaleX: s, scaleY: s, opacity: Math.min(1, raw * 4) };
    }
    case "rotate":
      return { ...IDENTITY, rotation: 360 * p, opacity: Math.min(1, raw * 3) };
    case "typewriter":
      return { ...IDENTITY, reveal: raw };
    default:
      return IDENTITY;
  }
}

/** Longest time any layer keeps changing — the natural export duration. */
export function timelineDuration(anims: Animation[]): number {
  let max = 1000;
  for (const a of anims) {
    if (a.preset === "none") continue;
    const end = isContinuous(a.preset) || a.loop ? a.delay + a.duration : a.delay + a.duration;
    max = Math.max(max, end);
  }
  return max;
}
