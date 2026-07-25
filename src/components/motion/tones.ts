/**
 * Lighting tones.
 *
 * Every glow, spotlight and particle burst picks its colour from here rather
 * than naming a token inline, so the accent role map in `globals.css` stays the
 * one place a colour means something. Add a tone only when a genuinely new
 * semantic role exists — not to get a new colour on screen.
 */
export type GlowTone = 'brand' | 'reward' | 'success' | 'warning' | 'destructive'

export const TONE_VARIABLE: Record<GlowTone, string> = {
  /** Purple — brand, primary action, focus. */
  brand: 'var(--brand)',
  /** Orange — XP, rewards, energy, progress. */
  reward: 'var(--reward)',
  /** Blue — correct catches, mastery. */
  success: 'var(--success)',
  /** Yellow — caution, streak at risk. */
  warning: 'var(--warning)',
  /** Red — errors, destructive actions. */
  destructive: 'var(--destructive)',
}
