/**
 * Marketing feature — the pre-account experience.
 *
 * Owns the landing page and anything else a visitor sees before signing in. It
 * depends on the shared motion primitives and on `@/features/auth` for session
 * status, and nothing depends on it — so it can be reshaped freely without
 * touching gameplay.
 *
 * The playable teaser inside it is authored, client-only content: no session,
 * no network, no database. That is deliberate, so the opening experience can
 * never be blocked by a cold start or an outage.
 */

export { LandingPage } from './components/landing-page'
export type { BiasPoint, TeaserChoice, TeaserChoiceId, TeaserOutcome } from './types'
