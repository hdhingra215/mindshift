# MindShift — Design System Specification

**Status:** Draft v1 · **Owner:** Design · **Last updated:** 2026-07-21

Translates the approved [Brand Guidelines](BrandGuidelines.md) into a production-ready design-system spec. This is the **source of truth** the design tokens will be built from next. No CSS, no TypeScript, no implementation here — specification only.

Dark theme is the **default and primary** experience. Light theme is planned (see §11). The palette below is warm, calm, and premium — a terracotta accent on warm charcoal neutrals — matching the brand's intelligent, approachable, adult tone.

---

## 1. Color System

The official color foundation. All values are fixed brand colors; do not introduce new raw colors — extend only through semantic tokens (§2).

### Brand & accent
| Role | Hex | Notes |
|---|---|---|
| Primary Accent | `#C96442` | Terracotta. Primary actions, focus, brand moments. Use with restraint for punch. |

### Neutrals — surfaces (dark, default)
| Role | Hex | Notes |
|---|---|---|
| Background | `#2B2A27` | App base / page canvas. |
| Surface | `#34322F` | Cards, panels, default raised content. |
| Elevated Surface | `#3D3A36` | Modals, popovers, menus — content above surface. |
| Border | `#4A4640` | Dividers, outlines, input borders. |

### Text
| Role | Hex | Notes |
|---|---|---|
| Primary Text | `#F0ECE0` | Headings, body, high-emphasis. |
| Secondary Text | `#CFC9BC` | Supporting text, labels, medium emphasis. |
| Muted Text | `#A79F91` | Hints, placeholders, disabled, captions. |

### Semantic status
| Role | Hex | Notes |
|---|---|---|
| Success | `#6D8E5D` | Correct answers, positive outcomes, confirmations. Muted sage — encouraging, not loud. |
| Warning | `#D6A249` | Cautions, streak-at-risk, non-blocking alerts. |
| Error | `#C25B5B` | Errors, destructive actions, failed states. Gentle, not alarming. |
| Info | `#6B95C7` | Neutral info, tips, coaching notes. |

**Elevation ladder (dark):** Background `#2B2A27` → Surface `#34322F` → Elevated `#3D3A36`. Depth is expressed by getting *lighter*, plus shadow (§6). Never rely on shadow alone in dark mode — surface-lightening is the primary depth cue.

**Accent discipline:** the terracotta accent is the only saturated color in the core UI. Status colors appear only in their semantic context. No decorative rainbow, no random hues (per brand "avoid").

**Foreground pairings** (text intended to sit on a fill):
- On Primary Accent `#C96442` → Primary Text `#F0ECE0`.
- On Success/Warning/Error/Info fills → use Background `#2B2A27` or Primary Text depending on which meets contrast (§10); warning is light, prefer dark foreground on it.

---

## 2. Semantic Tokens

Components consume **semantic tokens**, never raw hex. Raw colors map to intent-named tokens so themes can swap without touching components. Naming is role-based (`background`, `foreground`, `primary`, `border`…), consistent with shadcn/ui conventions.

| Token | Maps to (dark default) | Purpose |
|---|---|---|
| `background` | `#2B2A27` | App canvas. |
| `foreground` | `#F0ECE0` | Default text on background. |
| `surface` / `card` | `#34322F` | Card/panel background. |
| `surface-foreground` / `card-foreground` | `#F0ECE0` | Text on surface. |
| `popover` / `elevated` | `#3D3A36` | Menus, popovers, modals. |
| `popover-foreground` | `#F0ECE0` | Text on elevated. |
| `primary` | `#C96442` | Primary action fill / brand. |
| `primary-foreground` | `#F0ECE0` | Text/icon on primary. |
| `secondary` | `#3D3A36` | Secondary buttons/chips (neutral fill). |
| `secondary-foreground` | `#F0ECE0` | Text on secondary. |
| `muted` | `#34322F` | Muted backgrounds. |
| `muted-foreground` | `#A79F91` | Muted/placeholder/disabled text. |
| `accent` | `#C96442` | Hover/active accent surfaces (used sparingly). |
| `accent-foreground` | `#F0ECE0` | Text on accent. |
| `border` | `#4A4640` | Borders, dividers. |
| `input` | `#4A4640` | Input borders. |
| `ring` | `#C96442` | Focus ring (accent). |
| `success` / `success-foreground` | `#6D8E5D` / `#2B2A27` | Positive semantic. |
| `warning` / `warning-foreground` | `#D6A249` / `#2B2A27` | Caution semantic. |
| `error` (`destructive`) / `error-foreground` | `#C25B5B` / `#F0ECE0` | Error/destructive. |
| `info` / `info-foreground` | `#6B95C7` / `#2B2A27` | Info semantic. |

**Secondary/muted text tokens:** `text-secondary` → `#CFC9BC`, `text-muted` → `#A79F91`, applied via foreground utilities, not new backgrounds.

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

## 6. Shadow System

Dark UI leans on **surface lightening first, shadow second**. Shadows are soft, low-opacity, warm-neutral (never pure black harsh drop shadows). Purpose: separate elevated layers and signal interactivity.

| Token | Elevation | Use |
|---|---|---|
| `shadow-none` | 0 | Flush elements, flat sections |
| `shadow-sm` | 1 | Subtle raise — hover on cards, inputs |
| `shadow-md` | 2 | Cards, dropdown triggers |
| `shadow-lg` | 3 | Popovers, menus, sheets |
| `shadow-xl` | 4 | Modals/dialogs |
| `shadow-focus` | — | Accent focus ring (see accessibility) |

**Rules**
- Combine shadow with the elevation ladder (§1) — elevated surfaces are both lighter *and* shadowed.
- Soft, diffuse, low opacity. No neon glows, no heavy borders masquerading as shadow.
- Reserve the largest shadows for true overlays (modal, sheet).

---

## 7. Motion Principles

From Brand Guidelines: purposeful, smooth, quick, natural. Motion guides attention and rewards progress — never decorates. (Implemented later with Framer Motion / GSAP; principles only here.)

**Duration**
| Token | Duration | Use |
|---|---|---|
| `motion-fast` | 120–150ms | Hover, small state changes, taps |
| `motion-base` | 200–250ms | Most transitions, enter/exit |
| `motion-slow` | 300–400ms | Larger surfaces (modals, sheets, page) |
| `motion-celebrate` | 400–700ms | Milestone/reward moments only |

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
- Primary Text `#F0ECE0` on Background `#2B2A27` / Surface `#34322F` / Elevated `#3D3A36` → high contrast, passes AA for body and large text.
- Secondary Text `#CFC9BC` on dark surfaces → passes AA for normal text.
- Muted Text `#A79F91` on dark surfaces → use for **large text, secondary, or non-essential** info; verify ≥4.5:1 for any small essential text and bump to Secondary Text if it falls short. Never use muted for critical reading content.
- Primary Text on Primary Accent `#C96442` → intended for large text/buttons; **verify per use** and prefer larger/semibold labels on accent fills.
- Warning `#D6A249` and Info/Success fills: pair with **dark foreground** (`#2B2A27`) for contrast; Error `#C25B5B` pairs with light foreground.
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
- **Inverted neutrals:** light background = warm off-white (a light counterpart to the warm charcoal), surfaces slightly *darker/tinted* for elevation, text = dark warm neutral. Keep the warm, premium character — not stark clinical white.
- **Same accent:** terracotta `#C96442` carries across both themes; verify its contrast on light surfaces (may need a slightly darker accent shade for AA on light).
- **Status colors:** retune for light-mode contrast (darker success/warning/info as needed); keep semantics identical.
- **Elevation flips:** in light mode, depth uses shadow + subtle darkening, opposite of dark mode's lightening.
- Theme choice: system-preference default with user override; persisted per profile.

Until light theme ships, do not scatter dark-specific values — everything routes through tokens so the future swap is trivial.

---

## 12. Dark Theme (default)

- **Default and primary.** All screens designed dark-first.
- Warm charcoal neutral base (`#2B2A27` → `#34322F` → `#3D3A36`) with warm off-white text — calm, premium, low-fatigue for longer sessions.
- **Depth via lightening + soft shadow.** Higher elevation = lighter surface.
- Terracotta accent is the single saturated brand color; status colors semantic-only.
- Avoid pure black (`#000`) and pure white (`#fff`) — the warm neutrals define the mood.
- Sufficient contrast maintained per §10; muted text used only where non-essential.

---

## 13. Design Do's and Don'ts

**Do**
- Use semantic tokens for every color, space, radius, shadow.
- Keep generous whitespace and clear hierarchy.
- Reserve the terracotta accent for primary actions and brand moments.
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
- Over-animate, add gratuitous effects, or use big shadows/glows everywhere.
- Mix icon styles, mix many radii, or use inconsistent spacing.
- Remove focus outlines or ship without keyboard/SR support.

---

_This specification is the source of truth. Design tokens (CSS variables / Tailwind theme) will be implemented from it next — components consume tokens only._
