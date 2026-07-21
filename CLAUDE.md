# MindShift — Project Constitution

This document is the permanent source of truth for how MindShift is built. Claude Code must follow it throughout development. When a request conflicts with this document, surface the conflict before proceeding.

---

## 1. Project Overview

**What it is.** MindShift is a production-grade, AI-powered web game that teaches players to recognize and overcome cognitive biases through interactive decision-making scenarios. Players work through realistic situations, make choices, earn XP, unlock achievements, track progress, and receive AI-powered explanations of the biases behind their decisions.

**Vision.** A world where clear thinking is a trainable skill — where anyone can learn to spot the mental traps that distort their judgment.

**Mission.** Turn cognitive-bias education into an engaging game people actually want to play, so learning happens through action rather than lecture.

**Target audience.** Curious learners, students, professionals, and lifelong self-improvers who want sharper decision-making. Ages ~16+. Mobile-first, global.

**Long-term goals.** Story mode, daily challenges, AI-generated scenarios, leaderboards, analytics, and a personalized AI coach — layered onto a stable core loop without compromising quality.

---

## 2. Product Philosophy

- **Learn by experience, not by reading.** Players discover biases by falling into them, then reflecting.
- **Every interaction teaches something.** No dead clicks. Feedback always carries insight.
- **Fun first, education through gameplay.** If it isn't fun, it won't teach. Engagement is the delivery vehicle.
- **Premium product quality.** Every screen, transition, and copy line meets a high bar. No placeholder feel in shipped work.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Routing | TanStack Router (file-based) |
| Animation | Framer Motion + GSAP |
| Backend | Supabase — Auth, PostgreSQL, Storage, Row Level Security |
| Hosting | Vercel |

Do not add technologies outside this stack without explicit approval.

---

## 4. Architecture Principles

- **Feature-first.** Domain logic lives in `src/features/<name>/` (owns `components/`, `hooks/`, `api/`, `types.ts`, `index.ts`). Import features only through their `index.ts` barrel.
- **Reusable components.** Shared UI in `src/components/` (`ui/`, `layout/`, `game/`, `shared/`). Build once, reuse everywhere.
- **Modular design.** Small, self-contained units with clear boundaries. Low coupling, high cohesion.
- **Strong typing.** Types model the domain. Shared types in `src/types/`; feature types local.
- **Separation of concerns.** UI, state, data access, and business logic stay distinct. Data access lives in `api/` and `src/lib/supabase/`.
- **Scalability over shortcuts.** Choose the maintainable path. A shortcut that will need rewriting is not a shortcut.

---

## 5. Coding Standards

- TypeScript **strict mode** on. No loosening compiler flags.
- No `any` unless unavoidable — justify it in a comment when used. Prefer `unknown` + narrowing.
- Reusable components over copy-paste. Extract on the second use.
- Small, focused functions. One responsibility each.
- Clear naming: `camelCase` values, `PascalCase` components/types, `SCREAMING_SNAKE_CASE` constants. Names describe intent.
- Self-documenting code. Comment the *why*, not the *what*. No redundant comments.

---

## 6. UI/UX Principles

- **Mobile-first.** Design for small screens, enhance upward.
- **Accessibility first.** Semantic HTML, keyboard navigation, focus states, ARIA where needed, sufficient contrast. WCAG AA minimum.
- **Consistent spacing.** Use the Tailwind spacing scale and design tokens — no arbitrary magic numbers.
- **Smooth animations.** Purposeful motion that guides attention. Respect `prefers-reduced-motion`.
- **Beautiful but performant.** Visual polish never at the cost of frame rate or load time.
- **Professional SaaS quality.** The bar is a polished commercial product, not a prototype.

---

## 7. Game Design Principles

- **Reward learning, not memorization.** Score understanding and transfer, not rote recall.
- **Progressive difficulty.** Ramp complexity as mastery grows.
- **Meaningful feedback.** Every outcome explains the bias at play and why the choice mattered.
- **Strong replayability.** Varied scenarios and outcomes keep sessions fresh.
- **Fair progression.** XP and unlocks feel earned, never grindy or pay-gated.
- **Every mechanic reinforces learning.** No mechanic exists purely for engagement metrics.

---

## 8. Supabase Rules

- **Never bypass Row Level Security.** Every table has RLS enabled with explicit policies. No service-role keys in client code.
- **Use migrations.** All schema and policy changes are committed migrations in `supabase/migrations/`. No manual dashboard edits as source of truth.
- **Keep secrets server-side.** Secrets never carry the `VITE_` prefix. AI/provider keys live only in edge functions.
- **Secure authentication.** Use Supabase Auth. Validate sessions server-side for protected operations.
- **Database-first thinking.** Model the schema and constraints deliberately before building UI on top.

---

## 9. Performance Standards

- Lazy-load routes and heavy components.
- Code-split by route and feature.
- Optimize bundle size — audit dependencies, tree-shake, avoid heavyweight libraries for small jobs.
- Fast interactions — perceived responsiveness under 100ms for common actions.
- Avoid unnecessary re-renders — stable references, memoization where it measurably helps (not by default).

---

## 10. Git Standards

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.
- Small, focused commits — one logical change each.
- **Never commit secrets.** `.env` stays ignored; only `.env.example` is tracked.
- Keep history clean and readable. Branch: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.

---

## 11. Definition of Done

A feature is done only when it:

- Works correctly across expected inputs and edge cases.
- Is responsive on mobile and desktop.
- Is accessible (keyboard, screen reader, contrast).
- Is properly typed — no `any` leaks, no type errors.
- Is documented where non-obvious.
- Is production-ready — no debug logs, dead code, or placeholder content.

---

## 12. Things Claude Must Never Do

- Duplicate components or logic that already exist.
- Hardcode values that belong in config, constants, or design tokens.
- Ignore accessibility.
- Ignore performance.
- Bypass security or Row Level Security.
- Add unnecessary dependencies.
- Create dead code (unused exports, unreachable branches, commented-out blocks).
- Leave `TODO`s without an explanation and owner/context.

---

## 13. Development Workflow

Always:

- **Understand the task first.** Read relevant code and patterns before writing.
- **Explain major architectural changes when requested.** Surface trade-offs before large moves.
- **Keep changes minimal and clean.** Touch only what the task needs.
- **Follow existing patterns.** Match the conventions already in the codebase.
- **Build for long-term maintainability.** Optimize for the developer reading this in a year.

---

_Follow installed skills throughout: UI UX Pro Max · Game Development · Clean Code · Senior Fullstack._

---

## Core Principles

- Build systems, not pages.
- Build reusable engines, not one-off solutions.
- Simplicity over cleverness.
- User experience over technical complexity.
- Learning outcomes over engagement metrics.
- Quality over speed.
- Every feature should feel intentional.
- Every decision should support long-term scalability.

---

## Decision Framework

When multiple implementation options exist, prefer the one that:

- Improves maintainability.
- Reduces future technical debt.
- Maximizes reusability.
- Improves user experience.
- Keeps the codebase simple.
- Follows existing project patterns.

Never choose the quickest implementation if it sacrifices long-term quality.

---

## UI Design Standards

The visual quality of MindShift should feel comparable to modern premium SaaS products.

Every interface should be:

- Clean
- Minimal
- Highly readable
- Consistent
- Spacious
- Modern
- Delightful

Avoid:

- Visual clutter
- Excessive gradients
- Random colors
- Inconsistent spacing
- Over-animation
- Unnecessary visual effects

Animations should enhance usability, never distract from it.

---

## AI Guidelines

AI should improve the learning experience, not replace it.

AI may be used for:

- Personalized explanations
- Scenario generation
- Adaptive difficulty
- Learning recommendations
- Reflection and coaching

AI should never:

- Fabricate learning content without review.
- Replace deterministic game logic.
- Expose API keys.
- Make security decisions.

---

## Project Quality Standards

Before considering any feature complete, verify:

- Visual consistency
- Responsive behavior
- Accessibility
- Error handling
- Loading states
- Empty states
- Performance
- Type safety
- Clean code

---

## Future-Proofing

MindShift is expected to grow over time.

Every implementation should allow future expansion without major rewrites.

- Avoid tightly coupled features.
- Prefer extensible architecture over feature-specific solutions.

---

## Documentation Rules

- Important architectural decisions should be documented.
- When introducing a major system, update the relevant documentation inside the `docs/` folder.
- Documentation is part of the finished product.

---

## Testing Philosophy

Critical game logic should be testable.

Prioritize testing:

- XP calculations
- Progress tracking
- Achievement logic
- Scenario evaluation
- Authentication
- Database policies

Favor meaningful tests over high coverage percentages.

---

## Implementation Philosophy

Claude should act as a senior software engineer working within an established engineering team.

Before implementing significant features:

- Think through the architecture.
- Reuse existing systems whenever possible.
- Avoid unnecessary complexity.
- Prefer composition over duplication.
- Keep implementations incremental.
- Build foundations before advanced features.
- Never optimize prematurely.
- Never sacrifice maintainability for short-term speed.
- Before generating large amounts of code, first plan the implementation internally and keep the solution modular.
- Prefer extending existing systems over creating new parallel ones.
- If a requested implementation conflicts with this constitution, explicitly point out the conflict before proceeding.

---

## Mandatory Skill Usage

The following Claude Code skills are installed for this project and MUST be actively used throughout development:

- UI UX Pro Max
- Game Development
- Clean Code
- Senior Fullstack

These skills are mandatory and should guide every relevant decision, including:

- Architecture
- UI/UX
- Game mechanics
- Full-stack implementation
- Code quality
- Scalability
- Accessibility
- Performance
- Maintainability

Claude should proactively apply the knowledge and best practices from these skills instead of waiting for explicit instructions.

If multiple skills apply to a task, combine their recommendations to produce the best possible solution.

Always assume these skills are active and follow their guidance for every relevant task.

---

> This constitution is the highest-level technical document for MindShift. Unless explicitly instructed otherwise, every implementation should follow these principles.
