/**
 * Motion primitives — the reusable building blocks every screen composes from.
 *
 * These are primitives, not designs. They carry no page-specific layout or
 * copy; they wrap content and give it the product's motion and lighting
 * identity. A screen that needs a new motion behaviour should extend a
 * primitive here rather than hand-rolling an animation locally — that is how
 * the whole product keeps one rhythm.
 *
 *   Motion      AnimatedButton · MagneticButton · GlowButton ·
 *               ParticleButtonWrapper · AnimatedHeading · AnimatedText ·
 *               AnimatedSection · RevealContainer · FadeSequence ·
 *               PageTransition
 *   Lighting    HoverGlow · SpotlightContainer · FloatingBackground
 *   Cursor      MouseFollower (plus useMagnetic / useCursorGlow in @/lib/motion)
 *   Scroll      ParallaxLayer (plus the scroll hooks in @/lib/motion)
 *
 * The engines they sit on live in `@/lib/motion`.
 */

export { AnimatedButton } from './animated-button'
export { AnimatedHeading } from './animated-heading'
export { AnimatedSection } from './animated-section'
export { AnimatedText, type TextRevealUnit } from './animated-text'
export { FadeSequence } from './fade-sequence'
export { FloatingBackground } from './floating-background'
export { GlowButton } from './glow-button'
export { HoverGlow } from './hover-glow'
export { MagneticButton } from './magnetic-button'
export { MouseFollower } from './mouse-follower'
export { PageTransition } from './page-transition'
export { ParallaxLayer } from './parallax-layer'
export { ParticleButtonWrapper } from './particle-button-wrapper'
export { RevealContainer } from './reveal-container'
export { SpotlightContainer } from './spotlight-container'
export { TONE_VARIABLE, type GlowTone } from './tones'
