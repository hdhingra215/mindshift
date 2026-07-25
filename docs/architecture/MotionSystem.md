# MindShift — Experience & Motion Foundation

**Status:** v1 · **Owner:** Engineering · **Last updated:** 2026-07-25

The architecture reference for how MindShift moves. It implements the behaviour specified in [InteractionPrinciples.md](../design/InteractionPrinciples.md) and the tiers defined in [DesignSystem.md](../design/DesignSystem.md) §7 — those documents own *what should happen*; this one owns *how it is built*.

Nothing here is page-specific. Everything is a primitive that future screens compose.

---

## 1. Engine Architecture

Two animation libraries, one hard boundary.

| Engine | Owns | Why |
|---|---|---|
| **Anime.js 4** (primary) | Timelines, page and section reveals, chained sequences, hover and press micro-interactions, cursor effects, particles, text reveals, counters, celebration beats | Best-in-class imperative timeline model, tiny runtime, no React coupling — the right tool for anything driven by *time* |
| **Motion 12** (secondary) | Scroll linkage, viewport detection, gestures, layout animation | Binds values directly to scroll position without a render per frame; its viewport observer is the standard |

**The rule that keeps this from rotting:**

> If an animation is driven by **time**, it belongs to Anime.js.
> If it is driven by **scroll position, viewport entry, or a gesture**, it belongs to Motion.
> Never implement the same effect in both.

No third animation library may be introduced. GSAP and Framer Motion are no longer part of the stack — `motion` is Framer Motion's current package, so that is a rename rather than a removal; GSAP was replaced by Anime.js as the primary engine.

---

## 2. Module Map

```
src/lib/motion/            the engines
  tokens.ts                durations, easings, springs, stagger, travel, layering
  reduced-motion.ts        the accessibility gate every animation passes through
  engine.ts                Anime.js adapter — reveal, dismiss, timeline, press,
                           countTo, particleBurst, stopMotion
  scroll.ts                Motion adapter — parallax, in-view, scroll progress
  pointer.ts               cursor engine: one rAF loop, shared by every effect
  hooks.ts                 React lifecycle bindings for all of the above
  index.ts                 public API — always import from here

src/components/motion/     the primitives
  animated-button · magnetic-button · glow-button · particle-button-wrapper
  animated-heading · animated-text · animated-section
  reveal-container · fade-sequence · page-transition
  hover-glow · spotlight-container · floating-background
  mouse-follower · parallax-layer
  tones.ts                 the semantic light map

src/components/kokonutui/  migrated third-party components
src/components/charts/     BKLit chart components (token-themed)
src/styles/globals.css     colour, depth and lighting tokens + utilities
```

Import from the barrels (`@/lib/motion`, `@/components/motion`), never from files inside them. The barrel is the seam that lets an engine change without a product-wide refactor.

---

## 3. Motion Tokens

`src/lib/motion/tokens.ts` is the source of truth for JavaScript; `globals.css` mirrors the same values as CSS custom properties so a CSS transition and an Anime.js timeline land on the same rhythm. **Keep the two in sync.**

| Token group | Values |
|---|---|
| `DURATION` | `fast` 140 · `base` 220 · `slow` 340 · `celebrate` 560 (ms) |
| `EASE_CURVE` | `enter` (ease-out) · `exit` (ease-in) · `move` (ease-in-out) · `celebrate` (slight overshoot) |
| `SPRING` | `pointer` · `surface` · `reward` |
| `STAGGER` | `tight` 24 · `base` 45 · `loose` 80 (ms) |
| `TRAVEL` | `xs` 4 · `sm` 8 · `base` 14 · `lg` 24 (px) |
| `Z_LAYER` | `base` 0 → `cursor` 60 |

`celebrate` is reserved exclusively for genuine milestones. If it fires often, it is being misused.

---

## 4. Reduced Motion

Two layers, together forming one guarantee.

1. **CSS** — the `prefers-reduced-motion` block in `globals.css` neutralizes declarative animation and transitions, and disables the spotlight and hover-lift utilities.
2. **JavaScript** — `src/lib/motion/reduced-motion.ts` gates scripted motion, which no media query can stop.

The contract is stronger than "make it faster": under reduced motion **nothing translates, scales, rotates or parallaxes.** Durations collapse to a single frame rather than zero, so completion callbacks still fire and sequenced logic stays intact.

`ambientMotionAllowed()` additionally gates the lowest-priority tier — cursor followers, floating backgrounds, magnetic pull — which also returns false without a fine pointer, since a cursor effect on a touch device has nothing to track.

The preference is **subscribed to, not sampled once**: it can change mid-session, and long-lived effects react without a remount.

**Every one of these degradations is safe because motion never carries meaning.** Remove all animation and the interface still tells the whole story.

---

## 5. Cursor Interaction Engine

`src/lib/motion/pointer.ts`. One rAF loop, one set of listeners, one shared state — regardless of how many magnetic buttons, spotlights or followers are mounted. Each subscribing independently is the standard way a "premium" cursor effect becomes a jank generator.

- **Lazy in both directions.** Starts on the first subscriber, stops on the last, and never starts when ambient motion is disallowed.
- **Rests.** The loop stops scheduling frames once the cursor stops moving, rather than idling at 60fps.
- **Smoothed.** Raw pointer events are noisy; the loop damps toward the raw position each frame, which is what makes attraction feel physical rather than twitchy.
- **Render-free.** Subscribers write transforms or CSS custom properties. React is never involved after mount.

Built on it: `useMagnetic` (attraction), `useCursorGlow` / `bindPointerVariables` (publishes `--pointer-x/y/opacity` for the `.spotlight` utility), `usePointerFollower` (spring-integrated following).

---

## 6. Scroll Experience Engine

`src/lib/motion/scroll.ts`, built on Motion. Returns MotionValues and booleans so consuming components stay declarative — no scroll handler is ever hand-written.

| Hook | Purpose |
|---|---|
| `useParallax` | Layer drift for depth. Positive lags the page (further away), negative leads it (closer) |
| `useRevealInView` | Whether an element has entered far enough to reveal. Returns `true` immediately under reduced motion — content is never gated behind an animation that will not run |
| `useSectionProgress` | 0→1 through a section; the backbone of scroll-driven storytelling |
| `usePageProgress` | Smoothed whole-page progress for reading indicators |
| `useReducedMotion` | Live preference as React state — one definition of "reduced" across all three layers |

---

## 7. Depth & Lighting System

Defined as utilities in `globals.css` so they cost nothing at rest and re-light automatically on a theme swap.

- **Elevation ladder** — `background` → `card` → `elevated`. On a true-black canvas, depth reads as *lighter*, then shadow.
- **`depth-ambient` / `raised` / `overlay` / `modal`** — the shadow ladder.
- **`depth-interactive`** — hover lift via `transform` (never a layout property) plus surface lightening.
- **`glow` / `glow-soft` / `glow-strong`** — lighting, driven by a `--glow-color` custom property. **This is the primary depth cue in dark mode**: a drop shadow against `#050506` is invisible, so a primary action reads as raised because it *emits light*.
- **`sheen-top`** — a hairline of light along the top edge; the "lit from above" read.
- **`glass`** — restrained blur over an already-dark surface, so text contrast survives.
- **`spotlight`** — cursor-aware radial light, fed by the pointer engine's CSS variables.

Tones come from `src/components/motion/tones.ts`, which maps each semantic role to its accent token. Nothing names a colour inline.

---

## 8. Performance Decisions

- **Compositor-only properties.** Transform and opacity throughout; no animation of `width`, `height`, `top` or `left`.
- **One rAF loop** for all cursor work, which rests when idle.
- **Zero render-per-frame.** Effects write to the DOM directly. React owns structure and state; the engines own pixels. `countTo` writes `textContent` rather than calling `setState` sixty times a second.
- **Lazy initialization.** Ambient effects check `ambientMotionAllowed()` at render and return `null` — the node is never created on a device that will not use it.
- **Deterministic teardown.** Every hook reverts its animation and calls `stopMotion` on unmount; `useAnimeScope` wraps an Anime.js scope that reverts everything created inside it in one call. A timeline that outlives its element is a leak.
- **Bounded effects.** Particle bursts are capped at `MAX_PARTICLES_PER_BURST` (12) and a rapid re-press replaces the in-flight burst rather than stacking layers. The ambient field is three nodes driven by one animation.
- **Route-level code splitting** is unchanged; the motion library is small and shared.

---

## 9. Accessibility Decisions

- Motion is never the sole signal of anything. Every outcome is also carried by colour, icon, text and layout.
- Every primitive renders real semantics: `AnimatedHeading` emits a real `h1`/`h2`/`h3`, `AnimatedSection` a real `<section>` with an accessible name, `AvatarPicker` a real radiogroup with roving arrow-key selection.
- Decorative layers are `aria-hidden` and `pointer-events: none`.
- Hover effects fire on `focus-within` too, so keyboard users get identical affordances.
- `AnimatedText` and `MatrixText` keep the real string as the accessible name — a screen reader never hears scrambled or split characters.
- No animation gates content. `PageTransition` deliberately has no exit animation; the player never waits on a flourish.
- No flashing, strobing or rapid oscillation anywhere.

---

## 10. Third-Party Migrations

**KokonutUI** (`src/components/kokonutui/`) — installed, then migrated. Each file documents its own changes: Next.js APIs (`next/image`, `next/link`) removed, Motion particle work handed to Anime.js so only one particle system exists, hardcoded colours replaced by tokens, strict-mode type holes closed, and demo-only branding dropped. `ParticleButtonWrapper` layers MindShift reward semantics on top of the migrated `ParticleButton` rather than reimplementing it.

**BKLit charts** (`src/components/charts/`) — installed with `@visx/*`, `d3-array`, `@base-ui/react` and `@number-flow/react` as transitive dependencies. The registry emits `var(----name)` (a double-prefix bug) into `@theme inline`; corrected to `var(--name)`. All chart surface tokens are defined for both themes in `globals.css` and mapped to the five-accent palette.

---

## 11. How Future Screens Consume This

1. **Never hand-roll an animation in a page component.** Compose a primitive, or extend one here.
2. **Never hardcode a duration, easing, distance or colour.** They are all tokens.
3. **Reveal content with** `RevealContainer` (one thing), `FadeSequence` (peers), or `AnimatedSection` (a scroll-in page section).
4. **Buttons:** `AnimatedButton` by default; `GlowButton` for the one primary action on a screen; `MagneticButton` for a hero action only; `ParticleButtonWrapper` for genuine reward moments.
5. **Surfaces:** `HoverGlow` for interactive cards, `SpotlightContainer` for panels that should feel lit.
6. **Depth:** compose the `depth-*` and `glow-*` utilities rather than writing shadows.
7. **New behaviour** goes into `src/lib/motion` and gets a primitive — so it is available everywhere and reduced-motion-safe once, not per screen.

### Reference consumer

`src/features/marketing/` (the landing page) is the first full consumer of this system and the best worked example of it. Notable patterns to copy: cursor-aware effects built purely from the `--pointer-x/y/opacity` variables with no per-frame JavaScript of their own (`hero-lens`, `perception-field`); a proximity field that derives twelve positions from one container rect per frame (`blindspot-constellation`); and scroll-linked progressive disclosure via `useSectionProgress` + `useTransform` rather than repeated fade-ins (`loop-track`).

**The spending budget still applies.** These primitives make motion cheap to add, which makes restraint the engineer's responsibility: calm by default, one focal point per screen, at most one or two delight moments live at once. A primitive existing is not a reason to use it.
