import { CheckCircle2, Eye, Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSignalOnMount } from '@/lib/feedback'
import type { AttemptRecord, GameScenario } from '../types'

type OutcomeRevealProps = {
  scenario: GameScenario
  attempt: AttemptRecord
}

/**
 * The teaching payload (ContentStrategy §7 five-part). Correct answers
 * reinforce the reasoning; misses are reframed as a discovery, never "Wrong".
 * result_text = what happened; explanation carries why → mechanism → counter →
 * transfer; the bias's counter-strategy is surfaced as its own callout.
 */
export function OutcomeReveal({ scenario, attempt }: OutcomeRevealProps) {
  const { outcome } = attempt
  const correct = outcome.isCorrect
  const bias = scenario.primaryBias

  /*
   * The head of the reveal phrase, at zero. Everything else that lands on this
   * screen — the wager, the Twin, mastery, XP — is offset behind it, so four
   * surfaces arriving together are heard as one sequence settling rather than
   * as four sounds colliding.
   *
   * A miss is the same size of event as a catch. See the catalogue.
   */
  useSignalOnMount(correct ? 'outcome.correct' : 'outcome.miss')

  return (
    <div className="mx-auto flex max-w-2xl animate-in fade-in slide-in-from-bottom-1 flex-col gap-6 duration-300">
      <div className="flex items-start gap-3">
        <span
          className={
            correct
              ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success'
              : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-info/15 text-info'
          }
        >
          {correct ? (
            <CheckCircle2 className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {correct ? 'Nicely reasoned.' : 'A classic trap — and a useful one.'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {correct
              ? 'You saw past the pull. Here’s what made it the sound call.'
              : 'Almost everyone makes this call. Here’s the tell you can catch next time.'}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <p className="text-xs text-muted-foreground">
            You chose:{' '}
            <span className="font-medium text-foreground">{attempt.choice.label}</span>
          </p>

          <p className="text-base leading-relaxed text-foreground">
            {outcome.resultText}
          </p>

          {bias ? (
            <div>
              <Badge>{bias.name}</Badge>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-muted-foreground">
            {outcome.explanation}
          </p>

          {bias?.counterStrategy ? (
            <div className="flex items-start gap-3 rounded-lg border border-info/25 bg-info/8 p-4">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold tracking-wide text-info uppercase">
                  Catch it next time
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {bias.counterStrategy}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
