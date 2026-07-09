import { useEffect, useState } from "react";

export const FPS = 8;
const REVEAL_SECONDS = 2;
const BREATHE_SECONDS = 4;

export interface AnimationFrame {
  /** Monotonic frame counter — the single source all effects derive from. */
  tick: number;
  /** 0..1 whole-grid brightness cycle (sine, ~4s period). */
  breathe: number;
}

/**
 * Drives all animation from one interval. When disabled (non-TTY, or before
 * data arrives) it returns a static fully-bright frame and starts no timer,
 * so piped/CI output renders once and exits cleanly.
 */
export function useAnimation(enabled: boolean): AnimationFrame {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / FPS);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return { tick: 0, breathe: 1 };
  return {
    tick,
    breathe:
      0.5 + 0.5 * Math.sin((2 * Math.PI * tick) / (FPS * BREATHE_SECONDS)),
  };
}

/**
 * 0..1 progress of the intro wipe, measured from the tick when the current
 * data arrived — so the grid re-reveals on every refresh, not just at boot.
 */
export function revealProgress(tick: number, sinceTick: number): number {
  return Math.min(1, (tick - sinceTick) / (FPS * REVEAL_SECONDS));
}
