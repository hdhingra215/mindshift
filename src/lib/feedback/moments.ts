import type { CueName } from '@/lib/audio'
import type { HapticPattern } from '@/lib/haptics'

/**
 * The moment map — what each meaningful act in MindShift is made of.
 *
 * This is the seam the whole feedback system turns on. Components name a
 * *moment* (`'choice.select'`), never a sound and never a vibration. Which
 * material it strikes and which pattern it fires is a design decision, and
 * design decisions belong in one table rather than in ninety call sites.
 *
 * ── Reading the table ───────────────────────────────────────────────────────
 * Follow the pipeline down the list: **interaction → decision → commitment →
 * reveal → consequence.** Weight increases as you go, and the early rows are
 * mostly silent. That gradient *is* the interaction language:
 *
 *   - traversal (hovering, navigating, clicking a control that only changes
 *     what is on screen) makes **no sound**, and at most the lightest touch;
 *   - taking a decision is a small wooden contact;
 *   - committing to it is the one two-stage mechanism in the product;
 *   - a reveal is air moving, not a fanfare;
 *   - a milestone rings, and nothing else does.
 *
 * ── The parity rules ────────────────────────────────────────────────────────
 * `outcome.miss` is not a lesser `outcome.correct`, `wager.loss` is not a lesser
 * `wager.win`, and `twin.miss` is not a lesser `twin.hit`. Each pair carries
 * the same weight in both channels, differing only in colour. The unit suite
 * asserts it, because "make the failure feel worse" is the single most natural
 * edit anyone will ever make to this file — and it would contradict every word
 * of copy on the same screen (§12.20).
 */

export type Moment = {
  /** The material struck, if this moment makes a sound at all. */
  cue?: CueName
  /** The pattern fired, if this moment is physical at all. */
  haptic?: HapticPattern
  /**
   * Minimum gap before this moment may repeat, ms. Only for moments a player
   * can produce continuously — a torch moving, a scroll notch passing.
   */
  throttleMs?: number
}

export const MOMENTS = {
  /* ── Interaction ────────────────────────────────────────────────────────
   * Almost all silent. Hovering a control is not an event.
   */

  /**
   * Hovering something that is itself a decision.
   *
   * Throttled hard: moving a cursor down a list of options crosses several in a
   * second, and the point is to feel the interface *notice* you, not to be
   * tapped once per pixel of travel.
   */
  'choice.hover': { cue: 'graze', haptic: 'brush', throttleMs: 320 },

  /**
   * The torch crossing the hero line. The most frequent moment in the product,
   * so it is the quietest and the most heavily throttled: a sound that fires
   * every time a cursor moves is the definition of annoying, and the throttle
   * is what turns it into an occasional sense of the light catching something.
   */
  'torch.sweep': { cue: 'veil', haptic: 'brush', throttleMs: 1600 },

  /** Turning the torch on deliberately, via the control. Its own small event. */
  'torch.toggle': { cue: 'air', haptic: 'reveal' },

  /* ── Decision ───────────────────────────────────────────────────────────── */

  /** A choice takes: an answer, a supplier, a stake. One act, one material. */
  'choice.select': { cue: 'wood', haptic: 'select' },

  /** Setting a stake on the dial. The same act, so the same material. */
  'wager.select': { cue: 'wood', haptic: 'select' },

  /* ── Commitment ─────────────────────────────────────────────────────────── */

  /** The answer goes in. The heaviest moment in the product. */
  'answer.commit': { cue: 'seat', haptic: 'commit' },

  /** Insight goes on the line. Same weight — it is the same kind of act. */
  'wager.commit': { cue: 'seat', haptic: 'commit' },

  /* ── Reveal ─────────────────────────────────────────────────────────────── */

  /** Caught it. */
  'outcome.correct': { cue: 'bloom', haptic: 'affirm' },

  /** Walked into it. Same size of event, different colour. */
  'outcome.miss': { cue: 'shade', haptic: 'discover' },

  /** The Twin has something on file. It arrived; the player did not do it. */
  'twin.speak': { cue: 'air', haptic: 'reveal' },

  /** It read you correctly. */
  'twin.hit': { cue: 'bloom', haptic: 'affirm' },

  /** You broke your own pattern. Identical weight — this is a good moment. */
  'twin.miss': { cue: 'shade', haptic: 'discover' },

  /** A section of the page resolving into view. */
  'surface.reveal': { cue: 'air', haptic: 'reveal' },

  /* ── Consequence ────────────────────────────────────────────────────────── */

  /** The stake held. */
  'wager.win': { cue: 'bloom', haptic: 'affirm' },

  /** The stake fell short. Nothing went wrong; a number moved. */
  'wager.loss': { cue: 'shade', haptic: 'discover' },

  /** XP. The quietest consequence, because it is the least important one. */
  'reward.xp': { cue: 'tick', haptic: 'hairline' },

  /** The metric the player is actually here for. */
  'reward.mastery': { cue: 'ring', haptic: 'mark' },

  /** The only genuine milestone in the product. */
  'reward.achievement': { cue: 'ring', haptic: 'milestone' },

  /** A run continuing. Air, once, on arrival. No counter, no fanfare. */
  'reward.momentum': { cue: 'air', haptic: 'reveal' },

  /* ── Movement ───────────────────────────────────────────────────────────── */

  /**
   * Passing a stop on the loop rail. **Sound is deliberately absent**: a page
   * that ticks while you scroll is unbearable, but a rail you can feel moving
   * under your thumb is exactly what this moment is for.
   */
  'rail.notch': { haptic: 'hairline', throttleMs: 260 },

  /**
   * Arriving in a new room.
   *
   * **Haptic only — the audio is deliberately unchanged.** Navigation still
   * makes no sound, because each room already sounds different and the retune
   * is the feedback. But a room change is a real event, and on a device that
   * can express it the arrival is worth a light double.
   */
  'route.change': { haptic: 'reveal' },
} as const satisfies Record<string, Moment>

/*
 * ── What is deliberately not in this table ──────────────────────────────────
 *
 * **A generic button press.** `Button` is silent and still unless the thing it
 * does is an act on this list. Marking clickability is what makes an interface
 * chatter.
 *
 * **Hover in general.** Only `choice.hover` — hovering a *decision*, not
 * hovering a control.
 *
 * ── Sound and touch are not the same channel ────────────────────────────────
 * Several moments here are felt but not heard (`rail.notch`, `route.change`),
 * and one is heard but barely felt (`choice.hover`). That is deliberate: a
 * pulse costs nothing in a quiet room and a sound costs nothing in a pocket, so
 * each channel is allowed to mark what it is good at. **Phase 8.10 changed only
 * the `haptic` column** — every `cue` is exactly as it was.
 */

export type MomentName = keyof typeof MOMENTS
