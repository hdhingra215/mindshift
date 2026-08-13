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
   * A blind spot lighting up under the cursor, a tap or a keyboard focus.
   *
   * Hovering here is not traversal — the constellation is a section you *read
   * with the pointer*, and each point naming itself is the only content it has.
   * So unlike every other hover in the product this one is audible, at the
   * quietest material in the catalogue.
   *
   * Throttled tighter than `choice.hover` because the twelve points sit close
   * together and sweeping the field must not become a stream: at 220 ms a
   * deliberate move from one point to another is marked and a cursor thrown
   * across all twelve produces a handful of glints, not twelve.
   */
  'bias.spark': { cue: 'glint', haptic: 'glint', throttleMs: 220 },

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

  /**
   * Insight goes on the line.
   *
   * The one moment heavier than committing an answer. Both are commitments, but
   * this one has something at risk, and 8.11 gives it its own material and its
   * own pattern rather than reusing the answer's: a player who cannot tell the
   * two apart in the hand is being told the stake was free.
   */
  'wager.commit': { cue: 'stake', haptic: 'stake' },

  /**
   * Entering the product from the landing page.
   *
   * The one navigation in the product that is a *decision*, so the one that is
   * allowed to sound and to be felt like one. Everything else about navigation
   * stays silent (see `route.change`).
   */
  'cta.enter': { cue: 'enter', haptic: 'commit' },

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
   * The loop rail reaching the next stop as the page is scrolled **down**.
   *
   * The rail is the one place on the page where the reader is *moving* something
   * rather than reading it, so it is the one place scroll-linked feedback is
   * earned. It fires on a **threshold crossing**, never per scroll event: three
   * stops across a whole section, which is a handful of marks in a page-length
   * scroll rather than anything resembling a stream.
   *
   * 8.11 gives the forward direction a sound — a reel being wound in, quiet and
   * short — because the rail is visibly *advancing* and a page that ticks
   * unbearably is a page that ticks *continuously*, which the throttle and the
   * stop count make impossible. The 520 ms material throttle underneath is the
   * backstop if a stop count ever grows.
   */
  'rail.advance': { cue: 'reel', haptic: 'hairline', throttleMs: 420 },

  /**
   * The same rail crossing back **up**.
   *
   * Haptic only, and the lightest pattern in the set. Re-reading a section is
   * not progress, so it gets the detent and not the event: enough to feel that
   * the rail is physical in both directions, not enough to reward scrubbing the
   * page up and down.
   */
  'rail.return': { haptic: 'brush', throttleMs: 420 },

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
 * Several moments here are felt but not heard (`rail.return`, `route.change`),
 * and one is heard but barely felt (`choice.hover`). That is deliberate: a
 * pulse costs nothing in a quiet room and a sound costs nothing in a pocket, so
 * each channel is allowed to mark what it is good at.
 *
 * ── What 8.11 changed, and what it did not ──────────────────────────────────
 * **Changed:** every `haptic` was re-scaled to the hardware (see `patterns.ts`);
 * `wager.commit` was given its own heavier material and pattern; four moments
 * were added (`bias.spark`, `cta.enter`, `rail.advance`, `rail.return`).
 *
 * **Not changed:** the environment, the nine synthesised materials, and the cue
 * on every moment that already had one. This was a polish pass on the *physical*
 * channel plus four new marks — not a re-sound of the product.
 */

export type MomentName = keyof typeof MOMENTS
