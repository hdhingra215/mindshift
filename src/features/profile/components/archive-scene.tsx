import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { MagneticButton, RevealContainer } from '@/components/motion'
import { DepthPlane, useWorldWarmth } from '@/components/world'
import { describeMomentum, momentumOf } from '@/features/streaks'
import { useSoundscape } from '@/lib/feedback'

import type { ArchiveRecord } from '../types'
import { ArchivePlate } from './archive-plate'
import { ConvictionPanel } from './conviction-panel'
import { DiscoveryPlate } from './discovery-plate'
import { EvidencePanel } from './evidence-panel'
import { MasteryPlate } from './mastery-plate'
import { ReflectionPlate } from './reflection-plate'
import { TwinChamber } from './twin-chamber'

type ArchiveSceneProps = {
  record: ArchiveRecord
  displayName: string
}

/**
 * The Mind Archive, as a place.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 * Not a profile page. There is no avatar block, no editable fields, no settings
 * and no account furniture — those belong to `/settings`, and putting them here
 * would turn a room in the world into a form. What this holds is *evidence*: the
 * instrument reading the player's mastery, the record of the decisions that
 * produced it, the discoveries they found, and their own words.
 *
 * ── Structure ───────────────────────────────────────────────────────────────
 * A masthead, then five numbered plates, read top to bottom:
 *
 *   00  the masthead — whose archive, since when, and what it is
 *   01  mastery      — the observatory, plus the same picture in text
 *   02  evidence     — how this player actually decides
 *   03  discoveries  — the catalogue, found and unfound
 *   04  reflections  — the player's own words, unedited
 *   05  the twin     — a sealed housing, honestly empty
 *
 * The order is deliberate: what you are, then what you did, then what you found,
 * then what you said, then what is still coming. It moves from the system's
 * account of the player to the player's account of themselves.
 *
 * ── Cost ────────────────────────────────────────────────────────────────────
 * No animation loop is introduced. The observatory brings its own two Anime.js
 * timelines (already paid for on the dashboard); everything else is a
 * scroll-held reveal on the shared Motion path, and the depth planes read the
 * camera variables `WorldCanvas` already publishes. One read on mount, no
 * subscription, no polling.
 */
export function ArchiveScene({ record, displayName }: ArchiveSceneProps) {
  const { observatory } = record
  const momentum = momentumOf(observatory.streak)

  /*
   * Momentum is a property of the player, not of the dashboard, so the archive
   * declares the same warmth. Walking from one room to the other does not cool
   * the world down.
   */
  useWorldWarmth(momentum)

  // A narrower, drier room than the observatory: less body, a higher texture,
  // a slower breath. The same run resolves it in the same way.
  useSoundscape('archive', momentum)

  const isNewcomer = observatory.isNewcomer

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 py-4 sm:gap-20">
      {/* ── 00 · Masthead ──────────────────────────────────────────────────── */}
      <DepthPlane as="header" className="flex flex-col gap-3" depth="near">
        <RevealContainer delay={60} distance="sm" duration="slow">
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            {describeOpening(record.openedAt)}
          </p>
        </RevealContainer>

        <RevealContainer delay={160} duration="slow">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            The Mind Archive
          </h1>
        </RevealContainer>

        <RevealContainer className="max-w-xl" delay={260} duration="slow">
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {isNewcomer
              ? `Everything you decide gets kept here, ${displayName} — how long you took, how sure you were, and what you made of it afterwards. The shelves are empty because nothing has happened yet.`
              : `Everything you have decided, kept as it happened. Not a score, ${displayName} — a record of how you actually think.`}
          </p>
        </RevealContainer>

        {isNewcomer ? null : (
          <RevealContainer className="max-w-xl" delay={340} duration="slow">
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.16em] text-muted-foreground uppercase">
              {describeMomentum(observatory.streak)}
            </p>
          </RevealContainer>
        )}
      </DepthPlane>

      {/* ── 01 · Mastery ───────────────────────────────────────────────────── */}
      <DepthPlane depth="mid">
        <ArchivePlate
          index={1}
          standfirst={
            isNewcomer
              ? 'Twelve biases, all still at the rim. Distance from the centre is how well you catch each one — so this field tightens as you learn.'
              : 'Distance from the centre is mastery. The same instrument as the dashboard, read up close.'
          }
          title="Mind Observatory"
        >
          <MasteryPlate biases={observatory.biases} momentum={momentum} />
        </ArchivePlate>
      </DepthPlane>

      {/* ── 02 · Evidence ──────────────────────────────────────────────────── */}
      <DepthPlane depth="near">
        <ArchivePlate
          index={2}
          standfirst="What the record shows about how you decide — the timings, the confidence, and where the traps actually caught you."
          title="Evidence of decisions"
        >
          <EvidencePanel
            accuracy={observatory.accuracy}
            calibration={record.calibration}
            decisions={record.decisions}
            scenariosCompleted={observatory.scenariosCompleted}
            truncated={record.decisionsTruncated}
          />
        </ArchivePlate>
      </DepthPlane>

      {/* ── 03 · Conviction ────────────────────────────────────────────────── */}
      <DepthPlane depth="near">
        <ArchivePlate
          index={3}
          standfirst="Confidence is a feeling and costs nothing. A stake is a commitment — so what you back is a different measurement from what you say."
          title="Conviction"
        >
          <ConvictionPanel accuracy={observatory.accuracy} wagers={record.wagers} />
        </ArchivePlate>
      </DepthPlane>

      {/* ── 04 · Discoveries ───────────────────────────────────────────────── */}
      <DepthPlane depth="near">
        <ArchivePlate
          index={4}
          standfirst="Every discovery in the catalogue, found or not. Each one marks a kind of learning rather than an amount of play."
          title="Discoveries"
        >
          <DiscoveryPlate discoveries={record.discoveries} />
        </ArchivePlate>
      </DepthPlane>

      {/* ── 05 · Reflections ───────────────────────────────────────────────── */}
      <DepthPlane depth="near">
        <ArchivePlate
          index={5}
          standfirst="Your words, exactly as you wrote them. Nothing here is edited or scored."
          title="Reflections"
        >
          <ReflectionPlate reflections={record.reflections} total={record.reflectionTotal} />
        </ArchivePlate>
      </DepthPlane>

      {/* ── 06 · The twin ──────────────────────────────────────────────────── */}
      <DepthPlane depth="mid">
        <ArchivePlate
          index={6}
          standfirst="A model of how you decide, built from this record and nothing else. It guesses before some scenarios — and it is wrong often enough to be worth arguing with."
          title="Cognitive Twin"
        >
          <TwinChamber
            decisionCount={observatory.scenariosCompleted}
            reflectionCount={record.reflectionTotal}
            twin={record.twin}
          />
        </ArchivePlate>
      </DepthPlane>

      {/* One primary action, at the end of the room and pointing out of it. */}
      <RevealContainer className="flex justify-center" delay={0} duration="slow" revealOnScroll>
        <MagneticButton asChild size="lg">
          <Link to="/play">
            {isNewcomer ? 'Record your first decision' : 'Add to the record'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </MagneticButton>
      </RevealContainer>
    </div>
  )
}

/**
 * When the archive was opened.
 *
 * Falls back to the product's own framing rather than showing a blank or a
 * placeholder date — a missing profile row is a deployment detail, not something
 * the player should have to look at.
 */
function describeOpening(openedAt: string | null): string {
  if (!openedAt) return 'Personal record'

  const date = new Date(openedAt)
  if (Number.isNaN(date.getTime())) return 'Personal record'

  return `Open since ${date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
}
