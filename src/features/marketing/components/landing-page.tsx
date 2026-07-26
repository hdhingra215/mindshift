import { useState } from 'react'

import { AnimatedSection, ParallaxLayer, RevealContainer } from '@/components/motion'
import { useAuth } from '@/features/auth'

import { HERO_LEAD, HERO_SUPPORT, TEASER_BIAS_SLUG } from '../constants'
import type { TeaserOutcome } from '../types'
import { BlindspotConstellation } from './blindspot-constellation'
import { ChapterMarker } from './chapter-marker'
import { HeroLens } from './hero-lens'
import { Invitation } from './invitation'
import { LandingFooter } from './landing-footer'
import { LandingHeader } from './landing-header'
import { LoopTrack } from './loop-track'
import { PerceptionField } from './perception-field'
import { TrapTeaser } from './trap-teaser'

/**
 * The opening experience.
 *
 * ── Structure ────────────────────────────────────────────────────────────────
 * Four chapters, read as a descent rather than browsed as sections:
 *
 *   00  The lens        — a sentence that changes meaning under your cursor
 *   01  The trap        — a real scenario, played, with the reveal it earns
 *   02  The loop        — how the game works, told on a scroll-driven rail
 *   03  The blind spots — twelve unlit points; the one you caught stays lit
 *       The invitation  — an argument built from what the visitor just did
 *
 * ── Why state lives here ─────────────────────────────────────────────────────
 * The teaser outcome is the page's only piece of state, and three chapters
 * depend on it: the teaser renders its reveal, the constellation lights the
 * bias that was caught, and the invitation changes its argument. Lifting it to
 * the page is what makes the later sections *remember* — which is the whole
 * reason the page feels like an experience rather than a scroll. A context
 * would be ceremony for one value with one owner.
 *
 * Nothing is persisted. Reloading resets the discovery, which is correct: this
 * is a demonstration, and the real progress model lives behind an account.
 */
export function LandingPage() {
  const { status } = useAuth()
  const isAuthed = status === 'authenticated'

  const [outcome, setOutcome] = useState<TeaserOutcome | null>(null)

  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHeader isAuthed={isAuthed} />

      <main className="flex-1">
        {/* ── 00 · The lens ─────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden px-6 py-24 sm:py-36">
          <PerceptionField />

          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <RevealContainer delay={80} distance="sm" duration="slow">
              <ChapterMarker label="Before we begin" ordinal="00" />
            </RevealContainer>

            <RevealContainer className="mt-10 w-full" delay={200} duration="slow">
              <HeroLens />
            </RevealContainer>

            {/*
             * The plain answer, landing early and ranked in two tiers: the lead
             * is foreground weight so it is caught in a glance, the support sits
             * a step back in muted for the reader who stays. One paragraph, two
             * levels of hierarchy — clarity without a second block of copy.
             */}
            <RevealContainer className="mt-8 max-w-2xl" delay={300} duration="slow">
              <p className="text-lg leading-relaxed text-pretty sm:text-xl">
                <span className="font-medium text-foreground">{HERO_LEAD}</span>{' '}
                <span className="text-muted-foreground">{HERO_SUPPORT}</span>
              </p>
            </RevealContainer>
          </div>
        </section>

        {/* ── 01 · The trap ─────────────────────────────────────────────── */}
        <AnimatedSection
          className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28"
          label="A scenario you can play right now"
          stagger="loose"
        >
          <ChapterMarker label="A decision" ordinal="01" tone="success" />

          <h2 className="mt-6 font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            No account needed. Just answer honestly.
          </h2>

          <div className="mt-10">
            <TrapTeaser onResolve={setOutcome} outcome={outcome} />
          </div>
        </AnimatedSection>

        {/* ── 02 · The loop ─────────────────────────────────────────────── */}
        <AnimatedSection
          className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28"
          label="How the game works"
        >
          <ChapterMarker label="The loop" ordinal="02" tone="reward" />

          <h2 className="mt-6 max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            That was the whole game. It just gets harder.
          </h2>

          <LoopTrack className="mt-14" />
        </AnimatedSection>

        {/* ── 03 · The blind spots ──────────────────────────────────────── */}
        <section
          aria-labelledby="blindspots-heading"
          className="relative overflow-hidden px-6 py-20 sm:py-28"
        >
          <div className="mx-auto w-full max-w-5xl">
            <RevealContainer revealOnScroll>
              <ChapterMarker label="Your blind spots" ordinal="03" tone="warning" />
              <h2
                className="mt-6 max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl"
                id="blindspots-heading"
              >
                Twelve of these are running your decisions right now.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
                {outcome
                  ? 'One of them is lit, because you just met it. Look around for the others — they get brighter as you get closer, which is roughly how this works in real life too.'
                  : 'You cannot name them, which is exactly what makes them expensive. Look around — they respond to attention.'}
              </p>
            </RevealContainer>

            {/*
             * A gentle parallax drift decouples the field from the page, so the
             * constellation reads as sitting behind the text rather than on it.
             */}
            <ParallaxLayer className="mt-8" distance={44}>
              <BlindspotConstellation litSlug={outcome ? TEASER_BIAS_SLUG : null} />
            </ParallaxLayer>
          </div>
        </section>

        {/* ── The invitation ────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-6 pt-8 pb-24 sm:pb-32">
          <RevealContainer distance="base" duration="slow" revealOnScroll>
            <Invitation
              caught={outcome?.caught ?? false}
              hasPlayed={outcome !== null}
              isAuthed={isAuthed}
            />
          </RevealContainer>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
