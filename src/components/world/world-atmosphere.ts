import { useEffect } from 'react'

/**
 * The world's atmosphere, as a single value the whole environment reads.
 *
 * `WorldCanvas` is mounted once in the app shell and has no idea what route is
 * showing or what the player has done. Rather than thread progression state up
 * through the layout — or duplicate the canvas per screen — a screen *declares*
 * how warm the world should be and the canvas simply reflects it.
 *
 * ── Why a CSS variable and not context ──────────────────────────────────────
 * Context would re-render `WorldCanvas` and everything beneath it on every
 * change. A custom property on the document element is read directly by the
 * gradients in CSS, so warming the world costs one style write and zero React
 * renders — the same technique the pointer engine already uses for cursor light.
 *
 * The value survives navigation on purpose. Momentum is a property of the player,
 * not of a page, so the world should not go cold on the way to the next screen.
 */

const WARMTH_PROPERTY = '--world-warmth'

/** Clamp to the design range. A screen cannot over-drive the environment. */
function clampWarmth(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function setWorldWarmth(value: number): void {
  document.documentElement.style.setProperty(WARMTH_PROPERTY, clampWarmth(value).toFixed(3))
}

export function resetWorldWarmth(): void {
  document.documentElement.style.removeProperty(WARMTH_PROPERTY)
}

/**
 * Declare the world's warmth for as long as this component is mounted.
 *
 * Pass `null` while the value is still unknown — the world stays at its resting
 * temperature rather than flashing cold and then warming, which would read as a
 * glitch rather than as momentum.
 */
export function useWorldWarmth(warmth: number | null): void {
  useEffect(() => {
    if (warmth === null) return
    setWorldWarmth(warmth)
    return resetWorldWarmth
  }, [warmth])
}
