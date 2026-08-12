import { InstrumentFrame } from '@/components/world'
import { RevealContainer } from '@/components/motion'
import { cn } from '@/lib/utils'

import { describeEvidence, describeVerdict } from '../lib/twin'
import type { TwinVerdict } from '../types'

type TwinVerdictCardProps = {
  verdict: TwinVerdict
}

/**
 * How the guess turned out.
 *
 * ── A miss is not an error state ────────────────────────────────────────────
 * Both outcomes use the same housing, the same weight and the same amount of
 * space. A hit is etched in `info` — the token for "here is something to know" —
 * and a miss in `brand`, the colour this product spends on genuine milestones,
 * because a player who broke their own pattern did the thing the game exists to
 * teach. Nothing here is red, nothing apologises, and the Twin never implies the
 * player did something wrong by surprising it.
 *
 * Which of the two happened is carried by the eyebrow text, so the distinction
 * survives with colour removed (ProjectStatus §12.23).
 */
export function TwinVerdictCard({ verdict }: TwinVerdictCardProps) {
  const { eyebrow, line } = describeVerdict(verdict)

  return (
    <RevealContainer className="mx-auto w-full max-w-2xl" delay={80} distance="sm" duration="slow">
      <InstrumentFrame as="aside" className="px-5 py-4" legend={eyebrow}>
        <p
          className={cn(
            'font-heading text-base leading-relaxed text-pretty',
            verdict.wasCorrect ? 'text-info' : 'text-brand',
          )}
        >
          {line}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {describeEvidence(verdict.contextLabel, verdict.observedRate, verdict.sampleSize)}{' '}
          {verdict.wasCorrect
            ? 'That read holds for now.'
            : 'One more decision that doesn’t fit the pattern.'}
        </p>
      </InstrumentFrame>
    </RevealContainer>
  )
}
