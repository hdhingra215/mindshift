/**
 * Landing-page domain types.
 *
 * The playable teaser deliberately mirrors the shape of real gameplay
 * (`@/features/game` types) without importing it: the teaser is authored,
 * client-only content that must work with no session, no network and no
 * database. Keeping the types local is what lets the real game evolve its
 * schema without dragging the landing page along.
 */

export type TeaserChoiceId = 'framed-gain' | 'framed-loss' | 'identical'

export type TeaserChoice = {
  id: TeaserChoiceId
  /** The option as the visitor first reads it. */
  label: string
  /**
   * The same option restated in the opposite frame. Revealing this is the whole
   * trick — identical facts, inverted wording.
   */
  rewritten: string
  /** True for the option that recognises the framing rather than falling for it. */
  isCatch: boolean
  /** Reveal copy, specific to the choice actually made. Never generic. */
  verdict: string
}

export type TeaserOutcome = {
  choice: TeaserChoice
  /** Whether the visitor caught the bias rather than being caught by it. */
  caught: boolean
}

/** A point on the blind-spot constellation. */
export type BiasPoint = {
  slug: string
  name: string
  category: string
  /** Position in the field, as a percentage of the container box. */
  x: number
  y: number
}
