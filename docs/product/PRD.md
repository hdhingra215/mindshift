# MindShift — Product Requirements Document

**Status:** Draft v1 · **Owner:** Product · **Last updated:** 2026-07-21

Primary product reference for MindShift. Defines what we're building, for whom, why, and how we measure success. Not an implementation spec — no code or technical design here.

---

## Executive Summary

MindShift is an interactive learning platform that blends behavioral psychology, game design, and AI to help people build better thinking and decision-making skills. Players work through realistic scenarios, make choices, and discover the cognitive biases shaping their decisions — reinforced by XP, progression, and AI-powered explanations. The product turns dry bias education into a game people want to return to. MVP targets a polished single-player core loop on web (mobile-first) with auth, scenario play, feedback, XP, and progress tracking.

---

## Product Definition

A web-based cognitive-training game. Players face decision scenarios drawn from real situations, choose a response, and receive immediate, personalized feedback naming the bias at play and how to counter it. Progress is tracked; mastery grows over time. AI personalizes explanations and, later, generates scenarios and coaches the player.

---

## Problem Statement

Cognitive biases silently distort everyday decisions — in money, work, health, and relationships. Existing bias education is mostly passive (books, articles, videos): people *read about* biases but don't build the reflex to *catch* them in the moment. Knowledge doesn't transfer to behavior. There is no engaging, habit-forming way to actually practice better thinking.

---

## Opportunity

- Rising mainstream interest in psychology, rationality, and self-improvement.
- Proven demand for gamified learning (Duolingo, Brilliant) — but no dominant product for decision-making and biases.
- AI now makes personalized explanations, adaptive difficulty, and scalable scenario generation viable at low cost.
- White space: a premium, adult, science-grounded "gym for your judgment."

---

## Vision

A world where clear thinking is a trainable skill — and improving your judgment feels like play.

## Mission

Turn cognitive-bias education into a game people genuinely want to play, so better thinking happens through action, not lecture.

---

## Goals

- Ship a polished, fun MVP core loop that teaches biases through play.
- Prove learning transfer: players measurably improve at recognizing biases.
- Build a habit-forming loop (return play) without dark patterns.
- Establish a premium, memorable brand and product-quality bar.
- Lay an architecture that scales to story mode, AI generation, and coaching.

## Non-Goals

- Not a clinical or therapeutic tool; no medical claims.
- Not an academic course or certification.
- Not a social network (social is optional/future).
- Not native mobile apps at MVP (responsive web only).
- Not a content-authoring platform for third parties (MVP).

---

## Target Audience

Curious learners, students, professionals, and self-improvers, ~16+, global, mobile-first. They value quality products, enjoy learning, and are drawn to intelligent design over gamified fluff. Comfortable with web apps; motivated by growth and mastery.

---

## User Personas

**1. Alex — The Curious Professional (29)**
Product manager who reads about psychology and productivity. Wants sharper decisions at work. Time-poor; plays in short bursts on mobile. Motivated by insight and self-improvement. Frustrated by dry, long-form content.

**2. Maya — The Student (19)**
Psychology/econ undergrad. Wants to internalize biases beyond memorizing for exams. Enjoys games and streaks. Budget-conscious. Motivated by mastery and fun.

**3. Ravi — The Lifelong Learner (41)**
Reads widely, uses Brilliant/Duolingo. Wants a daily "brain workout." Values depth and quality; dislikes childish or manipulative apps. Willing to pay for a premium experience.

**4. Sofia — The Skeptic/Rationalist (34)**
Engineer interested in rationality. Wants rigor and evidence, not pop-psych. Motivated by accuracy and challenge. Will churn if content feels shallow or wrong.

---

## User Stories

- As a new player, I want a fast, clear onboarding so I understand the game and start playing in under a minute.
- As a player, I want to play realistic scenarios so learning feels relevant to my life.
- As a player, I want immediate feedback naming the bias so I understand what just happened.
- As a player, I want AI-personalized explanations so insights fit my context.
- As a player, I want to earn XP and track progress so I feel my growth.
- As a player, I want to unlock achievements so effort feels rewarded.
- As a returning player, I want to pick up where I left off and see what to do next.
- As a mobile user, I want a smooth, responsive experience on my phone.
- As a registered user, I want my progress saved securely across devices.
- As a privacy-conscious user, I want control over my data and account.

---

## Jobs To Be Done (JTBD)

- When I make important decisions, I want to catch my own biases, so I can choose more rationally.
- When I have a few spare minutes, I want a short, rewarding mental workout, so I feel I used the time well.
- When I learn a concept, I want to practice it in realistic situations, so it sticks and transfers.
- When I improve, I want to see proof of progress, so I stay motivated.
- When I study psychology, I want an engaging way to internalize biases, so learning isn't a chore.

---

## Core Product Principles

- Learn by experience, not by reading.
- Every interaction teaches something.
- Fun first; education through gameplay.
- Reward learning, not memorization.
- Premium quality in every detail.
- Science-grounded and honest — no manipulation.
- Respect the player as a capable adult.

---

## Core Game Loop

1. **Enter scenario** — a realistic situation with context and a decision to make.
2. **Decide** — choose among options (or ranked/limited choices).
3. **Feedback** — reveal the outcome and the bias(es) at play, with an AI-personalized explanation of why and how to counter it.
4. **Reward** — earn XP, update mastery, unlock achievements/streaks.
5. **Reflect & progress** — see growth, then continue to the next scenario at appropriate difficulty.

Loop is short, satisfying, and repeatable; difficulty adapts as mastery grows.

---

## MVP Scope

- User auth (sign up, log in, session persistence) via Supabase.
- Curated library of hand-authored scenarios across a starter set of biases.
- Core game loop: scenario → decision → feedback → reward.
- AI-powered personalized explanations of the bias behind each choice.
- XP system and level/mastery progression.
- Achievements (basic set) and progress tracking.
- Player dashboard (progress, stats, next action).
- Player profile (account basics, data controls).
- Mobile-first responsive UI, light/dark themes, accessible.
- Secure data model with RLS.

## Out of Scope (MVP)

- Story mode / narrative campaign.
- Daily challenges.
- Fully AI-generated scenarios in production (may prototype internally).
- Leaderboards and social features.
- Advanced analytics dashboards for users.
- Personalized AI coach.
- Native mobile apps.
- Monetization / payments.
- Multi-language localization.

---

## Future Roadmap

- **Phase 2:** Daily challenges, streaks, richer achievements, deeper analytics.
- **Phase 3:** Story mode (narrative campaigns), expanded bias library.
- **Phase 4:** AI-generated scenarios (reviewed), adaptive difficulty engine.
- **Phase 5:** Personalized AI coach, learning recommendations, reflection.
- **Phase 6:** Leaderboards and social/community features.
- **Phase 7:** Monetization (subscription), localization, possible native apps.

---

## Functional Requirements

- Account creation, login, logout, session persistence, password reset.
- Scenario delivery: fetch, present context, capture player choice.
- Feedback generation: deterministic outcome + AI-personalized explanation.
- XP calculation and level/mastery progression rules.
- Achievement unlocking based on defined criteria.
- Progress tracking per bias and overall; persisted per user.
- Dashboard surfacing progress, stats, and next recommended action.
- Profile management and basic data controls (view/delete account).
- Content management for authored scenarios (internal, MVP-light).
- Light/dark theme and responsive layouts across breakpoints.
- Graceful handling of AI unavailability (fallback to authored explanation).

## Non-Functional Requirements

- **Performance:** fast loads, common interactions feel instant (<100ms perceived); lazy-load and code-split.
- **Accessibility:** WCAG AA — keyboard, screen reader, contrast, reduced motion.
- **Security:** RLS on all tables; secrets server-side; secure auth; no keys in client.
- **Reliability:** graceful degradation; no data loss of progress.
- **Scalability:** architecture supports growth to future phases without rewrites.
- **Privacy:** minimal data collection; clear user data controls; compliant handling.
- **Maintainability:** feature-first, strongly typed, tested critical logic.
- **Cross-platform:** works on modern mobile and desktop browsers.

---

## Success Metrics

- **Activation:** % of sign-ups who complete first scenario + first feedback.
- **Engagement:** scenarios played per active user; sessions per week.
- **Retention:** D1 / D7 / D30 return rates.
- **Learning outcome:** improvement in bias-recognition accuracy over time.
- **Progression:** % reaching key XP/mastery milestones.
- **Quality:** load performance, error rate, accessibility conformance.
- **Satisfaction:** qualitative feedback, NPS (later).

## North Star Metric

**Weekly Learning Reps** — number of scenarios meaningfully completed (decision + feedback engaged) per active user per week. It captures habit, engagement, and the core learning action in one number.

---

## Risks & Assumptions

**Risks**
- Learning transfer is hard to prove; players may enjoy without improving.
- AI explanations may be inaccurate or generic — hurts trust with skeptics.
- Content depth: authored scenarios are slow/expensive to produce at quality.
- Gamification could feel childish or manipulative if mishandled.
- Retention is hard without daily-challenge/streak hooks (out of MVP scope).
- AI cost and latency at scale.

**Assumptions**
- There is durable demand for gamified thinking-skills training.
- Short, rewarding loops drive habit for this audience.
- AI can meaningfully personalize explanations within cost/latency budgets.
- Web mobile-first is sufficient for MVP validation.
- A premium, adult tone differentiates us from existing edutainment.

---

## Technical Constraints

- Stack fixed: React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, TanStack Router, Framer Motion, GSAP, Supabase (Auth/Postgres/Storage/RLS), Vercel.
- AI provider calls run server-side (edge functions); no keys in client.
- Supabase RLS mandatory on all tables; schema via migrations.
- Mobile-first, accessible, performant per the project constitution.
- No new major dependencies without approval.

---

## Monetization Opportunities (future)

- **Freemium subscription:** free core loop; premium unlocks (advanced scenarios, AI coach, analytics, story mode).
- **Pro tier:** unlimited AI coaching, adaptive training plans, deeper insights.
- **Teams/education:** licenses for classrooms, cohorts, or workplaces.
- **Content packs:** themed scenario packs (finance, negotiation, leadership).
- No ads; no selling user data — consistent with brand honesty.

---

## Competitive Landscape

- **Duolingo** — gamified learning gold standard; not focused on thinking/biases; more childish tone.
- **Brilliant** — premium interactive STEM learning; adjacent, not decision/bias-focused.
- **Elevate / Lumosity / Peak** — brain-training games; general cognition, weak on real-world decision transfer and depth.
- **Books/courses (Kahneman, etc.)** — deep but passive; no practice loop.
- **Newsletters/podcasts on rationality** — content, not training.

**Positioning:** the premium, science-grounded, genuinely fun "gym for your judgment" — Linear-grade polish, Duolingo-grade rewarding loop, adult tone, decision-making focus none of the above own.

---

## Open Questions

- How do we reliably measure learning transfer (in-product signal vs. external)?
- What is the right starter set of biases and scenario count for a compelling MVP?
- How much AI personalization at MVP vs. authored explanations for quality/cost control?
- Single-choice vs. richer decision mechanics for the core loop?
- Do we need lightweight streaks/retention hooks in MVP despite scope, or hold?
- What guardrails ensure AI explanations stay accurate and on-brand?
- Anonymous/guest play before sign-up — yes or no for activation?
- What's the minimum viable content pipeline for authoring quality scenarios?
