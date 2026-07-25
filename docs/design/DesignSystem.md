# MindShift — Design System Specification

**Status:** Draft v2 · **Owner:** Design · **Last updated:** 2026-07-25

Translates the approved [Brand Guidelines](BrandGuidelines.md) into a production-ready design-system spec. This is the **source of truth** the design tokens will be built from next. No CSS, no TypeScript, no implementation here — specification only.

Dark theme is the **default and primary** experience. Light theme is planned (see §11). The palette is a **true deep black canvas with a five-accent expressive set** — premium, cinematic, and unmistakably a game rather than a dashboard. Depth is built from layered surfaces, light and shadow rather than from hue variety.

> **v2 change.** v1 specified warm charcoal neutrals with a single terracotta accent. That palette is retired. The neutral base moved to true deep black and the accent set widened to five, each owning exactly one semantic role. The discipline is unchanged: a wider palette is only allowed because every colour means something. See §1 "Accent discipline".

---

## 1. Color System

The official color foundation. All values are fixed brand colors; do not introduce new raw colors — extend only through semantic tokens (§2).

### Brand & accents

Each accent owns exactly one job. This is what makes a five-colour palette disciplined rather than decorative.

| Role | Hex | Owns |
|---|---|---|
| Brand / Purple | `#8B5CF6` | Brand identity, focus rings, glow, graphics. The luminous hue. |
| Primary (fill) | `#7C3AED` | Primary action **fills**. A step deeper than Brand so white label text clears AA (≈5.4:1). |
| Reward / Orange | `#FF7A1A` | XP, rewards, energy, progress. |
| Warning / Yellow | `#FFC53D` | Caution, streak at risk, non-blocking alerts. |
| Success / Blue | `#3B9EFF` | Correct catches, mastery, positive outcomes. |
| Error / Soft Red | `#F26D6D` | Errors, destructive actions, failed states. Gentle, not alarming. |
| Info / Violet | `#A78BFA` | Neutral info, tips, AI coaching notes. |

**Why blue for success.** Blue-versus-red is the most colour-blind-distinguishable success/error pair available inside this palette; a warm success (orange) would sit too close to the soft red under deuteranopia. Colour is never the sole signal regardless (§10), but the default pairing should be the safe one.

### Neutrals — surfaces (dark, default)
| Role | Hex | Notes |
|---|---|---|
| Background | `#050506` | App base / page canvas. True deep black. |
| Surface | `#0C0C0E` | Cards, panels, default raised content. |
| Elevated Surface | `#141417` | Modals, popovers, menus — content above surface. |
| Hover Surface | `#1C1C21` | Accent/hover state layer. |
| Border | `#232328` | Dividers, outlines — decorative separation. |
| Input Border | `#6E6E7A` | Form control boundaries. Lighter than Border to clear the 3:1 graphical-boundary bar (§10). |

### Text
| Role | Hex | Notes |
|---|---|---|
| Primary Text | `#F2F2F5` | Headings, body, high-emphasis. |
| Muted Text | `#9A9AA5` | Hints, placeholders, disabled, captions. |

**Elevation ladder (dark):** Background `#050506` → Surface `#0C0C0E` → Elevated `#141417`. Depth is expressed by getting *lighter*, plus light and shadow (§6). On a true-black canvas a drop shadow is nearly invisible — **surface-lightening and glow are the primary depth cues**, shadow does overlay separation only.

**Accent discipline:** five accents, five roles, no overlap. An accent may only appear in its semantic context — orange means reward, yellow means caution, blue means correct, red means error, purple means brand. Never pick an accent because a screen "needs colour". No decorative rainbow, no random hues (per brand "avoid"). At most one saturated accent should dominate a given screen.

**Foreground pairings** (text intended to sit on a fill):
- On Primary `#7C3AED` → `#FFFFFF`.
- On Reward / Warning / Success fills → use the matching dark foreground token; these hues are luminous and need dark text.
- On Error `#F26D6D` → dark foreground, or use it as text on the canvas.

---

## 2. Semantic Tokens

Components consume **semantic tokens**, never raw hex. Raw colors map to intent-named tokens so themes can swap without touching components. Naming is role-based (`background`, `foreground`, `primary`, `border`…), consistent with shadcn/ui conventions.

| Token | Maps to (dark default) | Purpose |
|---|---|---|
| `background` | `#050506` | App canvas. |
| `foreground` | `#F2F2F5` | Default text on background. |
| `card` | `#0C0C0E` | Card/panel background. |
| `card-foreground` | `#F2F2F5` | Text on surface. |
| `elevated` / `popover` | `#141417` | Menus, popovers, modals. |
| `popover-foreground` | `#F2F2F5` | Text on elevated. |
| `brand` | `#8B5CF6` | Brand hue for glow, rings and graphics — **non-text use**. |
| `primary` | `#7C3AED` | Primary action fill. |
| `primary-foreground` | `#FFFFFF` | Text/icon on primary. |
| `secondary` | `#141417` | Secondary buttons/chips (neutral fill). |
| `secondary-foreground` | `#F2F2F5` | Text on secondary. |
| `muted` | `#0C0C0E` | Muted backgrounds. |
| `muted-foreground` | `#9A9AA5` | Muted/placeholder/disabled text. |
| `accent` | `#1C1C21` | Hover/active **surface** — neutral, so accent hues stay meaningful. |
| `accent-foreground` | `#F2F2F5` | Text on accent. |
| `border` | `#232328` | Borders, dividers. |
| `input` | `#6E6E7A` | Input borders. |
| `ring` | `#8B5CF6` | Focus ring (brand). |
| `reward` / `reward-foreground` | `#FF7A1A` / `#1A0C00` | XP, rewards, progress. |
| `success` / `success-foreground` | `#3B9EFF` / `#04101F` | Correct catches, mastery. |
| `warning` / `warning-foreground` | `#FFC53D` / `#1F1600` | Caution semantic. |
| `destructive` | `#F26D6D` | Error/destructive. |
| `info` / `info-foreground` | `#A78BFA` / `#100526` | Info, tips, AI coaching. |
| `chart-1` … `chart-5` | purple · orange · blue · yellow · red | Data visualization series. |

**Rules:**
- Components reference tokens only. A component must never contain a raw hex value.
- New UI needs → add a semantic token, don't inline a color.
- State layers (hover/active/disabled) derive from base tokens via consistent opacity/lightness steps defined once, not per-component.

---

## 3. Typography

Aligned to Brand Guidelines: modern sans-serif, strong hierarchy, mobile-legible. The scaffold uses **Geist** (variable) as the working sans; a display-weight of the same family covers headlines. Optional monospace for stats/system moments.

**Families**
- `font-sans` — Geist Variable (UI + body).
- `font-heading` — Geist (heavier weights) for display/headings; may diverge later if a distinct display face is chosen.
- `font-mono` — a clean monospace for numbers, XP, stats, code-like data.

**Type scale** (rem, 1rem = 16px; ratio ~1.2–1.25, mobile-first):
| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display` | 3.0rem | 1.1 | 700 | Hero / marketing headlines |
| `h1` | 2.25rem | 1.15 | 700 | Page titles |
| `h2` | 1.75rem | 1.2 | 600 | Section titles |
| `h3` | 1.375rem | 1.3 | 600 | Subsections, card titles |
| `body-lg` | 1.125rem | 1.6 | 400 | Lead paragraphs, scenario context |
| `body` | 1.0rem | 1.6 | 400 | Default body |
| `body-sm` | 0.875rem | 1.5 | 400 | Secondary text, labels |
| `caption` | 0.75rem | 1.4 | 500 | Captions, meta, badges |

**Weights:** 400 regular, 500 medium, 600 semibold, 700 bold. Avoid 300/thin for body (legibility).

**Rules**
- Line length 45–75ch for reading blocks.
- Headings use `font-heading`/heavier weight + tighter line height; body stays 1.5–1.6.
- Emphasis via weight and color hierarchy (primary/secondary/muted text), not many sizes.
- Never justify body; left-aligned (LTR). Respect min tap/read sizes on mobile.

---

## 4. Spacing Scale

Single base unit **4px**. All spacing, sizing, and layout use multiples — no arbitrary values (brand "avoid: inconsistent spacing").

| Token | px | rem |
|---|---|---|
| `0` | 0 | 0 |
| `1` | 4 | 0.25 |
| `2` | 8 | 0.5 |
| `3` | 12 | 0.75 |
| `4` | 16 | 1.0 |
| `5` | 20 | 1.25 |
| `6` | 24 | 1.5 |
| `8` | 32 | 2.0 |
| `10` | 40 | 2.5 |
| `12` | 48 | 3.0 |
| `16` | 64 | 4.0 |
| `20` | 80 | 5.0 |
| `24` | 96 | 6.0 |

**Rules**
- Component internal padding: multiples of 4, typically `3`–`6`.
- Section rhythm: `8`–`16`+.
- Generous whitespace is a brand value — favor more breathing room over dense layouts.
- Consistent gaps within a group; no one-off margins.

---

## 5. Radius Scale

Rounded, approachable, modern — not sharp, not fully pill everywhere. Base radius ~10px (`0.625rem`), matching the scaffold token.

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 6px | Inputs, small chips, badges |
| `radius-md` | 8px | Buttons, small cards |
| `radius-lg` | 10px | Cards, panels (default) |
| `radius-xl` | 14px | Modals, large surfaces |
| `radius-2xl` | 20px | Feature/hero cards |
| `radius-full` | 9999px | Avatars, pills, icon buttons |

**Rules:** consistent radius family across a screen; don't mix many radii. Interactive elements share one radius tier.

---

## 6. Depth, Shadow & Lighting System

On a true-black canvas, **light is the primary depth cue** and shadow is the secondary one — a drop shadow against `#050506` is essentially invisible. Depth is therefore built from three stacked cues: a lighter surface, a hairline top sheen, and glow.

### Shadow ladder
| Token | Elevation | Use |
|---|---|---|
| `depth-flat` | 0 | Flush elements, flat sections |
| `depth-ambient` | 1 | Resting cards, inputs |
| `depth-raised` | 2 | Cards, dropdown triggers |
| `depth-overlay` | 3 | Popovers, menus, sheets |
| `depth-modal` | 4 | Modals/dialogs |
| `depth-interactive` | — | Hover lift (transform) + surface lighten + shadow step |

### Lighting ladder
| Token | Use |
|---|---|
| `glow-soft` | Hover affordance on interactive surfaces |
| `glow` | A primary action, a live state |
| `glow-strong` | Milestone moments only |
| `sheen-top` | Hairline of light on a top edge — the "lit from above" read |
| `glass` | Restrained blur over an already-dark surface |
| `spotlight` | Cursor-aware radial light on a panel |

Glow colour is set per instance via `--glow-color`, drawn from the semantic tone map — the light always agrees with what the element *means* (reward glows orange, a correct catch glows blue).

**Rules**
- Combine light and shadow with the elevation ladder (§1) — elevated surfaces are lighter *and* lit *and* shadowed.
- Glow is a depth cue, not decoration. A screen full of glowing elements has no focal point and destroys the "one clear focus per screen" rule.
- Reserve `glow-strong` and the largest shadows for true milestones and overlays.
- Hover lift is always a `transform` — never an animated layout property.

---

## 7. Motion Principles

From Brand Guidelines: purposeful, smooth, quick, natural. Motion guides attention and rewards progress — never decorates. Implemented with **Anime.js** (primary engine) and **Motion** (scroll, viewport, gestures) — see [MotionSystem.md](../architecture/MotionSystem.md) for the architecture and the exact token values.

**Duration**
| Token | Duration | Use |
|---|---|---|
| `motion-fast` | 140ms | Hover, small state changes, taps |
| `motion-base` | 220ms | Most transitions, enter/exit |
| `motion-slow` | 340ms | Larger surfaces (modals, sheets, page) |
| `motion-celebrate` | 560ms | Milestone/reward moments only |

**Easing:** standard ease-out for entrances, ease-in for exits, gentle ease-in-out for movement. Natural, never linear for UI.

**Principles**
- Subtle by default; celebratory only at genuine milestones (level up, achievement, mastery).
- Micro-interactions on feedback moments (correct/incorrect, XP, unlock) make learning tangible.
- Motion clarifies cause→effect (where a thing came from / went).
- **Always respect `prefers-reduced-motion`** — provide reduced/instant alternatives.
- Performance over spectacle: prefer transform/opacity; avoid layout-thrashing animation. Target 60fps.

---

## 8. Iconography

Per brand: one consistent, line-based, approachable set. Project uses **Lucide** (installed). Single system — no mixing icon libraries or styles.

**Rules**
- Lucide only; consistent stroke weight (~1.5–2px) and rounded terminals.
- Standard sizes: `16` (inline/dense), `20` (default UI), `24` (primary actions/nav). Align to the 4px scale.
- Icons inherit `currentColor` (token-driven), never hardcoded.
- Icons clarify meaning; pair with a label where meaning isn't obvious. Decorative icons are `aria-hidden`.
- Consistent optical sizing and padding within buttons/inputs.

---

## 9. Component Design Principles

- **Token-driven:** every component reads semantic tokens (§2); zero raw values.
- **Composable & reusable:** small primitives compose into features; build once, reuse (matches shadcn/ui model and the project constitution).
- **Consistent states:** every interactive component defines default, hover, active, focus-visible, disabled, and (where relevant) loading and error states.
- **Clear hierarchy:** one primary action per view; secondary/tertiary actions visually subordinate (accent reserved for primary).
- **Spacious & minimal:** generous padding, clear grouping, no clutter.
- **Accessible by construction:** semantic elements, labels, focus order, ARIA where needed (§10).
- **Responsive:** mobile-first; components adapt gracefully across breakpoints; large tap targets.
- **Loading & empty states** are first-class (Skeletons for loading; purposeful empty states) — never a blank or janky screen.
- **Feedback layered:** visual + motion + (where relevant) semantic color communicate outcome together.

---

## 10. Accessibility Rules

Baseline: **WCAG 2.1 AA** (brand: accessibility first).

**Contrast (verified against palette)**
- Primary Text `#F2F2F5` on Background `#050506` → ≈19:1. Passes AA and AAA.
- Muted Text `#9A9AA5` on dark surfaces → ≈7:1. Passes AA for normal text; still avoid for critical reading content.
- White on Primary `#7C3AED` → ≈5.4:1. Passes AA for normal text. **This is why `primary` is a step deeper than `brand`** — white on `#8B5CF6` is ≈4.4:1 and fails at body size.
- Brand `#8B5CF6` on Background → ≈4.5:1 as text, ≥3:1 as a graphical boundary. Safe for focus rings, glow and non-text accents.
- Reward `#FF7A1A` ≈7.6:1, Success `#3B9EFF` ≈7.0:1, Warning `#FFC53D` ≈12.9:1, Error `#F26D6D` ≈7.0:1 on Background — all pass AA as text.
- Reward / Warning / Success **fills** pair with the matching dark foreground token; all four hues are too luminous for white text.
- Border `#232328` is a decorative separator only. Any **essential** UI boundary (form controls) uses Input `#6E6E7A`, which clears the 3:1 graphical bar against Surface.
- **All essential text must meet ≥4.5:1 (normal) / ≥3:1 (large).** UI component/graphical boundaries ≥3:1.

**Rules**
- **Never rely on color alone** — pair status color with icon/text (critical: success/error must not be color-only, for color-blind users).
- **Focus visible:** every interactive element has a clear `ring` (accent `#C96442`) focus indicator; never remove focus outlines.
- Keyboard operable: logical tab order, no traps, Escape closes overlays, arrow-key nav where expected.
- Screen readers: semantic HTML first; ARIA only to fill gaps; labels on all inputs/icon-buttons; live regions for toasts/feedback.
- Tap targets ≥44×44px on touch.
- Respect `prefers-reduced-motion` (§7) and support zoom/reflow to 200%.

---

## 11. Light Theme Strategy (future)

Dark is default and shipped first. Light theme is planned and the token architecture must support it from day one.

- **Token swap only:** switching theme remaps the semantic tokens (§2); components never change. No component may hardcode a dark value.
- **Inverted neutrals:** light background = near-white (`#FAFAFB`), surfaces slightly *lighter/tinted* for elevation, text = near-black neutral.
- **Same accent hues, darker shades:** each of the five accents has a light-theme counterpart deep enough to clear AA on a light surface (e.g. purple `#6D28D9`, orange `#C2410C`, blue `#1D6FD0`). Semantics are identical; only luminance changes.
- **Glow inverts to shadow:** light mode has no black canvas to emit light against, so `--glow-strength` drops and the shadow ladder does the depth work.
- **Status colors:** retune for light-mode contrast (darker success/warning/info as needed); keep semantics identical.
- **Elevation flips:** in light mode, depth uses shadow + subtle darkening, opposite of dark mode's lightening.
- Theme choice: system-preference default with user override; persisted per profile.

Until light theme ships, do not scatter dark-specific values — everything routes through tokens so the future swap is trivial.

---

## 12. Dark Theme (default)

- **Default and primary.** All screens designed dark-first.
- **True deep black base** (`#050506` → `#0C0C0E` → `#141417`) with near-white text — cinematic, immersive, and the canvas that makes accent light read as light.
- **Depth via lightening + glow + shadow, in that order.** Higher elevation = lighter surface; a primary action reads as raised because it *emits light*.
- Five accents, five semantic roles (§1). Each appears only in its own context.
- Sufficient contrast maintained per §10; muted text used only where non-essential.
- Pure white (`#fff`) is used only as label text on a primary fill, never as a surface or body colour.

---

## 13. Design Do's and Don'ts

**Do**
- Use semantic tokens for every color, space, radius, shadow, glow.
- Keep generous whitespace and clear hierarchy.
- Reserve the brand purple for primary actions and brand moments; use each other accent only in its own semantic role.
- Pair status color with an icon/label (never color-only).
- Design mobile-first with large tap targets and visible focus.
- Provide loading (skeleton) and empty states.
- Keep motion subtle and purposeful; respect reduced-motion.
- Maintain one radius family and one icon system per screen.

**Don't**
- Hardcode hex, px, or one-off values in components.
- Introduce new raw colors or random hues outside the palette.
- Overuse the accent or stack multiple saturated colors.
- Rely on shadow alone for depth in dark mode, or on color alone to convey state.
- Use muted text for essential/small reading content.
- Use an accent hue outside its semantic role, or reach for a colour because a screen feels empty.
- Over-animate, add gratuitous effects, or use big shadows/glows everywhere.
- Mix icon styles, mix many radii, or use inconsistent spacing.
- Remove focus outlines or ship without keyboard/SR support.

---

_This specification is the source of truth. Design tokens (CSS variables / Tailwind theme) will be implemented from it next — components consume tokens only._
