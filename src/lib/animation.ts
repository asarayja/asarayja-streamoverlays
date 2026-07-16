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

/**
 * Where a stinger reaches 100% coverage — the OBS "transition point". The
 * `sweep`/`sweepScale`/`flash` presets peak here, and stinger thumbnails are
 * sampled at `duration * STINGER_PEAK` so the gallery shows the covered frame.
 */
export const STINGER_PEAK = 0.45;
/** Total run of a stinger wipe (ms). Kept in sync with the templates. */
export const STINGER_MS = 1700;

/**
 * The frame a gallery card shows at rest. Normal screens hold their finished
 * entry pose (`fallback`, ~6000ms). A stinger's finished pose is CLEARED, so
 * showing it there renders a blank card — instead show its covered peak (the
 * transition point), which is the recognisable branded frame.
 */
export function settledTime(category: string, fallback: number): number {
  return category === "Stinger Transitions" ? Math.round(STINGER_MS * STINGER_PEAK) : fallback;
}

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
  "blink",
  "neon",
  "heartbeat",
  "spin",
  "sway",
  "wobble",
  "orbit",
  "drift",
  "convey",
  "breathe",
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

  if (anim.preset === "fill") {
    // Cumulative progress: the element switches on once the shared cycle passes
    // its threshold (`delay`), and all reset together at the cycle end. Uses the
    // absolute clock (not `elapsed`) so a row of blocks with staggered delays
    // fills one-by-one, left to right, then starts over — a Win95 progress bar.
    const within = ((t % duration) + duration) % duration;
    return { ...IDENTITY, opacity: within >= anim.delay ? 1 : 0 };
  }

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
      case "blink": {
        // A neon sign switching on and off: the glow snaps fully on for the
        // first ~60% of the cycle, dark for the rest, with the text dimming to
        // match. Needs the layer's Glow effect enabled to light up.
        const on = phase < 0.6;
        return { ...IDENTITY, glowBoost: on ? 55 * k : 0, opacity: on ? 1 : 0.5 };
      }
      case "neon": {
        // A live neon tube: a steady bright glow that hums and, now and then,
        // flickers dark for a beat.
        const bucket = Math.floor(elapsed / 70);
        const n = noise(bucket);
        const dropout = n > 0.9;
        const hum = 0.85 + 0.15 * Math.sin(elapsed / 30);
        return {
          ...IDENTITY,
          glowBoost: (dropout ? 6 : 46 * hum) * k,
          opacity: dropout ? 0.6 : 1,
        };
      }
      case "heartbeat": {
        // Lub-dub: two quick swells then a rest.
        const beat =
          phase < 0.14
            ? Math.sin((phase / 0.14) * Math.PI)
            : phase < 0.32
              ? Math.sin(((phase - 0.18) / 0.14) * Math.PI) * 0.7
              : 0;
        const s = 1 + Math.max(0, beat) * 0.13 * k;
        return { ...IDENTITY, scaleX: s, scaleY: s };
      }
      case "spin":
        return { ...IDENTITY, rotation: phase * 360 };
      case "sway":
        return { ...IDENTITY, rotation: Math.sin(phase * tau) * 6 * k };
      case "wobble": {
        // Squash and stretch: width and height breathe out of phase.
        const a = Math.sin(phase * tau);
        return { ...IDENTITY, scaleX: 1 + a * 0.06 * k, scaleY: 1 - a * 0.06 * k };
      }
      case "orbit": {
        const r = 9 * k;
        return { ...IDENTITY, dx: Math.cos(phase * tau) * r, dy: Math.sin(phase * tau) * r };
      }
      case "drift":
        // A slow sideways glide with a gentle vertical bob — seamless (pure
        // sine, no reset), so decor "moves along" without ever snapping back to
        // a start pose. Distance scales with intensity, pace with duration.
        return {
          ...IDENTITY,
          dx: Math.sin(phase * tau) * 60 * k,
          dy: Math.sin(phase * tau * 0.5 + 1) * 10 * k,
        };
      case "convey": {
        // A one-way glide: travel left→right over the cycle, fading in at the
        // start and out at the end so the snap-back to the start is invisible.
        // Like the Win95 copy dialog's sheet flying between folders, forever.
        const inF = Math.min(1, phase / 0.14);
        const outF = Math.min(1, (1 - phase) / 0.14);
        return { ...IDENTITY, dx: phase * 240 * k, opacity: Math.max(0, Math.min(inF, outF)) };
      }
      case "breathe":
        // A slow fade in and out — calmer than flicker, no motion.
        return { ...IDENTITY, opacity: 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(phase * tau)) };
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
    case "flip": {
      // Open from an edge: horizontal scale from nothing to full.
      return { ...IDENTITY, scaleX: Math.max(0.02, p), opacity: Math.min(1, raw * 2) };
    }
    case "pop": {
      // A punchy scale that overshoots past full, then settles.
      const b = EASING_FNS.backOut(raw);
      const s = 0.4 + 0.6 * b;
      return { ...IDENTITY, scaleX: s, scaleY: s, opacity: Math.min(1, raw * 3) };
    }
    case "drop": {
      // Falls from higher up and squashes on each impact — heavier and
      // squishier than `bounce`, which is a clean vertical settle.
      const b = EASING_FNS.bounceOut(raw);
      const impact = Math.max(0, Math.sin(b * Math.PI * 4));
      return {
        ...IDENTITY,
        dy: -260 * k * (1 - b),
        scaleX: 1 + impact * 0.14 * k,
        scaleY: 1 - impact * 0.14 * k,
        opacity: Math.min(1, raw * 4),
      };
    }
    case "swing": {
      // Swings in on a hinge and settles with an elastic wobble.
      const e = EASING_FNS.elasticOut(raw);
      return { ...IDENTITY, rotation: -38 * k * (1 - e), opacity: Math.min(1, raw * 4) };
    }
    case "glitch": {
      // Jitters and flashes while arriving, snapping clean at the end.
      if (raw >= 1) return IDENTITY;
      const s = Math.floor(raw * 60);
      const jitter = 1 - raw;
      return {
        ...IDENTITY,
        dx: (noise(s) - 0.5) * 26 * k * jitter,
        dy: (noise(s + 7) - 0.5) * 12 * k * jitter,
        opacity: noise(s + 3) > 0.28 ? 1 : 0.3,
      };
    }
    case "tada": {
      // A celebratory bump: scales up with a few rotational wiggles, then
      // settles back to rest.
      const s = 1 + Math.sin(Math.min(1, raw) * Math.PI) * 0.16 * k;
      const wiggle = Math.sin(raw * Math.PI * 6) * (1 - raw) * 9 * k;
      return { ...IDENTITY, scaleX: s, scaleY: s, rotation: wiggle, opacity: Math.min(1, raw * 4) };
    }
    case "rubberBand": {
      // Stretches wide then tall then settles — an elastic snap, no rotation.
      const decay = 1 - raw;
      const a = Math.sin(raw * Math.PI * 2) * 0.26 * k * decay;
      return { ...IDENTITY, scaleX: 1 + a, scaleY: 1 - a, opacity: Math.min(1, raw * 4) };
    }
    case "roll": {
      // Rolls in from the left: travels sideways while turning upright.
      return {
        ...IDENTITY,
        dx: -240 * k * (1 - p),
        rotation: -360 * (1 - p),
        opacity: Math.min(1, raw * 2),
      };
    }

    /* ----------------------- stinger cover → reveal ----------------------- */
    // A stinger must go transparent → 100% cover at the peak (where OBS cuts the
    // scene) → transparent again, and HOLD the cleared state. These three do
    // that; the peak sits at STINGER_PEAK of the timeline.
    case "sweep": {
      // A full-frame band travels off the enter edge → dead-centre (covering) →
      // off the opposite edge. `direction` is the exit direction.
      const [vx, vy] = SLIDE_VECTORS[anim.direction];
      const span = 2800 * (k || 1);
      const phase =
        raw <= STINGER_PEAK
          ? EASING_FNS.easeOut(raw / STINGER_PEAK) - 1 // -1 → 0
          : EASING_FNS.easeIn((raw - STINGER_PEAK) / (1 - STINGER_PEAK)); // 0 → +1
      return { ...IDENTITY, dx: vx * span * phase, dy: vy * span * phase };
    }
    case "sweepScale": {
      // Comes in small and accelerates to fully cover at the peak (rushing at
      // the camera), then shrinks away fast. Opacity stays solid the whole way,
      // only fading at the very start and end so it pops in and clears cleanly.
      const s =
        raw <= STINGER_PEAK
          ? EASING_FNS.easeIn(raw / STINGER_PEAK)
          : 1 - EASING_FNS.easeIn((raw - STINGER_PEAK) / (1 - STINGER_PEAK));
      const scale = Math.max(0.02, s * (k || 1));
      const opacity = Math.min(1, Math.min(raw, 1 - raw) * 12);
      return { ...IDENTITY, scaleX: scale, scaleY: scale, opacity };
    }
    case "flash": {
      // Fades/pops in for the cover peak, then fades out — for the wordmark or
      // logo that reads at the transition point.
      const w =
        raw <= STINGER_PEAK ? raw / STINGER_PEAK : Math.max(0, 1 - (raw - STINGER_PEAK) / (1 - STINGER_PEAK));
      const e = EASING_FNS.easeOut(w);
      return { ...IDENTITY, opacity: e, scaleX: 0.9 + 0.1 * e, scaleY: 0.9 + 0.1 * e };
    }
    default:
      return IDENTITY;
  }
}

/**
 * Map a monotonic clock to a *preview* time that loops smoothly for any
 * animation, so a designer never has to think about loop points.
 *
 * `period <= 0` → pass the clock straight through (unbounded). Use this when a
 * design has continuous ambient motion: it is already periodic, and wrapping it
 * would make particles jump.
 *
 * `period > 0` → ping-pong: play forward 0→period, hold at the settled pose,
 * play back period→0, hold at the start, repeat. Any one-shot (a fade/slide-in,
 * or a stinger) then loops seamlessly — it eases in, rests, eases back out —
 * instead of hard-cutting from its end pose to its start.
 */
/** The cover→reveal presets a stinger is built from. Only these should drive a
    ping-pong preview loop; a normal scene plays its entrance once and lets its
    ambient motion carry the loop, so headline text never blinks in and out. */
const STINGER_PRESETS = new Set<Animation["preset"]>(["sweep", "sweepScale", "flash"]);

export function isStingerMotion(anims: Animation[]): boolean {
  return anims.some((a) => STINGER_PRESETS.has(a.preset));
}

export function previewClock(elapsed: number, period: number): number {
  if (period <= 0) return elapsed;
  const hold = 450;
  const seg = period + hold;
  const c = elapsed % (2 * seg);
  if (c < period) return c; // forward
  if (c < seg) return period; // hold at the settled pose
  if (c < seg + period) return period - (c - seg); // reverse
  return 0; // hold at the start
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
