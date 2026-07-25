/**
 * Reduced-motion gate.
 *
 * The global CSS rule in `globals.css` neutralizes declarative animation, but a
 * media query cannot stop a running Anime.js timeline or a Motion spring. Every
 * scripted animation in MindShift therefore routes through this module, which
 * is the JavaScript half of the same guarantee (InteractionPrinciples §2, §12).
 *
 * The contract is stronger than "make it faster": under reduced motion nothing
 * translates, scales, rotates or parallaxes. Meaning survives because it was
 * never carried by motion in the first place — only sweetened by it.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Single shared MediaQueryList. Created lazily so this module stays safe to
 * import in a non-browser context, and shared so N subscribers cost one
 * listener rather than N.
 */
let mediaQuery: MediaQueryList | null = null

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  mediaQuery ??= window.matchMedia(QUERY)
  return mediaQuery
}

/** Whether the user has asked for reduced motion, right now. */
export function prefersReducedMotion(): boolean {
  return getMediaQuery()?.matches ?? false
}

/**
 * Subscribe to preference changes. Returns an unsubscribe function.
 * The preference can change mid-session (OS setting, accessibility shortcut),
 * so long-lived effects must react rather than sample once at mount.
 */
export function subscribeReducedMotion(onChange: (reduced: boolean) => void): () => void {
  const query = getMediaQuery()
  if (!query) return () => undefined

  const handler = (event: MediaQueryListEvent) => onChange(event.matches)
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

/**
 * Collapse a duration when motion is reduced. Not zero — a single frame — so
 * that completion callbacks still fire and sequenced logic stays intact.
 */
export function resolveDuration(ms: number, reduced = prefersReducedMotion()): number {
  return reduced ? 1 : ms
}

/**
 * Whether an *ambient* effect may run: cursor followers, floating backgrounds,
 * parallax, idle drift. These are the lowest-priority motion tier and the first
 * thing to cut — both under reduced motion and on pointer-less devices, where a
 * cursor effect has nothing to track and would just burn battery.
 */
export function ambientMotionAllowed(): boolean {
  if (prefersReducedMotion()) return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
