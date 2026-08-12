import { InstrumentFrame } from '@/components/world'
import { RevealContainer } from '@/components/motion'

import { describePrediction, describePredictionEvidence } from '../lib/twin'
import type { TwinPrediction } from '../types'

type TwinPredictionCardProps = {
  prediction: TwinPrediction
}

/**
 * The Twin, speaking before a decision.
 *
 * An instrument housing that has surfaced with something to say, not a card and
 * not a chat bubble. It appears above the scenario, states a guess and the
 * evidence under it, and then gets out of the way — the player's decision is the
 * point, and an interface that argued with them first would be changing the
 * thing it claims to be measuring.
 *
 * ── Why it says so little ───────────────────────────────────────────────────
 * Two lines. Any more and the Twin starts coaching, which would both spoil the
 * scenario and corrupt its own evidence: a prediction that changes the decision
 * it predicts is worthless as a measurement. The guess is hedged, the sample is
 * always visible, and nothing here hints at which choice is correct.
 */
export function TwinPredictionCard({ prediction }: TwinPredictionCardProps) {
  return (
    <RevealContainer className="mx-auto w-full max-w-2xl" delay={120} distance="sm" duration="slow">
      <InstrumentFrame as="aside" className="px-5 py-4" legend="Your Twin">
        <p className="font-heading text-base leading-relaxed text-pretty text-foreground">
          {describePrediction(prediction)}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {describePredictionEvidence(prediction)}{' '}
          {/*
           * States plainly that this is a reading of history, not knowledge of
           * the answer. Without it a player could reasonably infer the Twin has
           * seen the solution — which would make every prediction a spoiler.
           */}
          <span className="text-muted-foreground/80">
            I’m reading your record, not this scenario.
          </span>
        </p>
      </InstrumentFrame>
    </RevealContainer>
  )
}
