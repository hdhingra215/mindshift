import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { MagneticButton, RevealContainer } from '@/components/motion'
import { DepthPlane, InstrumentFrame, useWorldWarmth } from '@/components/world'
import { resolveAchievementIcon } from '@/features/achievements'
import { formatMastery } from '@/features/mastery'
import { describeMomentum, momentumOf } from '@/features/streaks'
import { cn } from '@/lib/utils'

import { unlitCount, weakestKnown } from '../lib/orbit'
import type { ObservatoryScene as Scene } from '../types'
import { MindObservatory } from './mind-observatory'

type ObservatorySceneProps = {
  scene: Scene
  displayName: string
  greeting: string
}

/**
 * The dashboard, as a place.
 *
 * Three planes, deliberately: the environment sits behind (mounted globally by
 * `WorldCanvas`), the instrument the player came to look at sits in the middle,
 * and the etched readouts sit nearest the viewer. Content the player *reads*
 * stays on the middle plane where it does not swim.
 *
 * Nothing here is a card. Every reading is an etched line or a bracketed frame,
 * because the moment this screen becomes panels it becomes a report again — and
 * a report is the thing this phase exists to stop it being.
 *
 * One primary action, at the bottom of the object it belongs to. The player's
 * eye lands on their own mind first and on the way in second, which is the
 * correct order for a product whose subject is the player.
 */
export function ObservatoryScene({ scene, displayName, greeting }: ObservatorySceneProps) {
  const unlit = unlitCount(scene.biases)
  const weakest = weakestKnown(scene.biases)
  const momentum = momentumOf(scene.streak)

  /*
   * Momentum warms the whole world, not just this screen. The value is declared
   * here and consumed by `WorldCanvas` in the app shell through a CSS variable —
   * so a player on a run walks into a warmer room, and the temperature follows
   * them to the next route instead of resetting at the door.
   */
  useWorldWarmth(momentum)

  return (
    <div className="relative flex flex-col items-center gap-10 py-4 sm:gap-12">
      {/* ── Nearest plane: who and where ──────────────────────────────────── */}
      <DepthPlane className="flex w-full flex-col items-center gap-2 text-center" depth="near">
        <RevealContainer delay={60} distance="sm" duration="slow">
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            {greeting} · Level {scene.level}
          </p>
        </RevealContainer>

        <RevealContainer delay={160} duration="slow">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
            {scene.isNewcomer ? `Your mind, before training.` : `Welcome back, ${displayName}.`}
          </h1>
        </RevealContainer>

        <RevealContainer className="max-w-md" delay={260} duration="slow">
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {scene.isNewcomer
              ? 'Twelve biases are out there in the dark. Catch one and watch it move closer.'
              : buildStatusLine(unlit, weakest?.name ?? null)}
          </p>
        </RevealContainer>

        {/*
         * Momentum, in words. The environment carries the feeling; this line is
         * the channel that does not depend on seeing warmth or motion, so a
         * screen reader and a player with reduced motion get the same fact.
         *
         * Etched type, no icon, no badge, no colour of its own. A streak that
         * arrives as a decorated number is the thing this system refuses to be.
         */}
        {scene.isNewcomer ? null : (
          <RevealContainer className="max-w-md" delay={320} duration="slow">
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.16em] text-muted-foreground uppercase">
              {describeMomentum(scene.streak)}
            </p>
          </RevealContainer>
        )}
      </DepthPlane>

      {/* ── Middle plane: the instrument ───────────────────────────────────── */}
      <DepthPlane className="w-full" depth="mid">
        <RevealContainer delay={380} distance="base" duration="slow">
          <MindObservatory biases={scene.biases} momentum={momentum} />
        </RevealContainer>
      </DepthPlane>

      {/* ── The way in ─────────────────────────────────────────────────────── */}
      <RevealContainer delay={520} duration="slow">
        <MagneticButton asChild size="lg">
          <Link to="/play">
            {scene.isNewcomer ? 'Enter your first scenario' : 'Continue training'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </MagneticButton>
      </RevealContainer>

      {/* ── Nearest plane: etched readings ─────────────────────────────────── */}
      <DepthPlane className="w-full" depth="near">
        <RevealContainer delay={640} duration="slow">
          <div className="mx-auto grid w-full max-w-2xl gap-6 sm:grid-cols-3">
            <Reading
              legend="Unexplored"
              value={`${unlit}`}
              detail={
                unlit === 0
                  ? 'You have met every one.'
                  : `${unlit === 1 ? 'bias' : 'biases'} you have never met`
              }
              tone={unlit === 0 ? 'text-success' : 'text-warning'}
            />

            <Reading
              legend="Weakest known"
              value={weakest ? formatMastery(weakest.masteryLevel) : '—'}
              detail={weakest ? weakest.name : 'Nothing practised yet'}
              tone={weakest ? weakest.tier.toneClass : 'text-muted-foreground'}
            />

            <Reading
              legend="Recognition"
              value={scene.scenariosCompleted > 0 ? `${Math.round(scene.accuracy)}%` : '—'}
              detail={
                scene.scenariosCompleted > 0
                  ? `across ${scene.scenariosCompleted} ${
                      scene.scenariosCompleted === 1 ? 'decision' : 'decisions'
                    }`
                  : 'No decisions recorded'
              }
              tone="text-foreground"
            />
          </div>
        </RevealContainer>

        {/*
         * Achievements dock at the rim as collected marks rather than listing as
         * rows — collected, not itemised. The full case belongs to the profile.
         */}
        {scene.achievements.length > 0 ? (
          <RevealContainer className="mt-8" delay={740} duration="slow">
            <div className="flex flex-col items-center gap-3">
              <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                Collected
              </p>
              <ul className="flex flex-wrap items-center justify-center gap-2">
                {scene.achievements.map((achievement) => {
                  const Icon = resolveAchievementIcon(achievement.icon)
                  return (
                    <li key={achievement.id}>
                      <span
                        className="flex size-9 items-center justify-center rounded-full border border-brand/30 bg-brand/8 text-brand"
                        title={achievement.name}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                        <span className="sr-only">{achievement.name}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </RevealContainer>
        ) : null}
      </DepthPlane>
    </div>
  )
}

/** One etched reading. Not a stat card — a value scratched onto the instrument. */
function Reading({
  legend,
  value,
  detail,
  tone,
}: {
  legend: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <InstrumentFrame className="px-4 py-3 text-center" legend={legend}>
      <p className={cn('font-heading text-2xl font-semibold tabular-nums', tone)}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </InstrumentFrame>
  )
}

/**
 * The one line of coaching on the screen.
 *
 * Names the most useful next move rather than congratulating the player, and
 * never guilts them about what is missing (InteractionPrinciples §13).
 */
function buildStatusLine(unlit: number, weakestName: string | null): string {
  if (unlit > 0 && weakestName) {
    return `${unlit} ${unlit === 1 ? 'bias' : 'biases'} still sit in the dark, and ${weakestName} keeps slipping past you.`
  }
  if (weakestName) {
    return `You have met all twelve. ${weakestName} is the one still worth another look.`
  }
  return 'Your field is quiet. Play a scenario and something out there will move.'
}
