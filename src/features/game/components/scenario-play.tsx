import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DifficultyBadge } from './difficulty-badge'
import type { GameScenario } from '../types'

type ScenarioPlayProps = {
  scenario: GameScenario
  selectedChoiceId: string | null
  submitting: boolean
  completedCount: number
  /** XP banked this session so far, as recorded by the server. */
  sessionXp: number
  onSelect: (choiceId: string) => void
  onSubmit: () => void
}

/**
 * The decision screen: session/pack meta, the focal scenario card, and the
 * choices as an accessible radio group. Selection is a deliberate two-step
 * (pick → commit) so a decision feels consequential and can't be double-fired.
 */
export function ScenarioPlay({
  scenario,
  selectedChoiceId,
  submitting,
  completedCount,
  sessionXp,
  onSelect,
  onSubmit,
}: ScenarioPlayProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {scenario.packName ? (
          <span className="text-sm text-muted-foreground">{scenario.packName}</span>
        ) : null}
        {scenario.categoryName ? (
          <Badge variant="outline">{scenario.categoryName}</Badge>
        ) : null}
        <DifficultyBadge difficulty={scenario.difficulty} />
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          Scenario {completedCount + 1} · this session
          {sessionXp > 0 ? (
            <>
              {' · '}
              <span className="tabular-nums text-reward">{sessionXp} XP</span>
            </>
          ) : null}
        </span>
      </div>

      <Card className="animate-in fade-in slide-in-from-bottom-1 duration-300">
        <CardHeader>
          <CardTitle className="text-xl leading-snug tracking-tight">
            {scenario.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-base leading-relaxed text-foreground/90">
            {scenario.context}
          </p>
          {scenario.stakes ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">At stake: </span>
              {scenario.stakes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">What do you do?</p>
        <RadioGroupPrimitive.Root
          value={selectedChoiceId ?? undefined}
          onValueChange={onSelect}
          disabled={submitting}
          aria-label="Choose your response"
          className="grid gap-3"
        >
          {scenario.choices.map((choice) => (
            <RadioGroupPrimitive.Item
              key={choice.id}
              value={choice.id}
              className={cn(
                'group/choice flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all outline-none',
                'hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50',
                'data-[state=checked]:border-primary data-[state=checked]:bg-primary/8',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-transparent transition-colors group-data-[state=checked]/choice:border-primary group-data-[state=checked]/choice:bg-primary group-data-[state=checked]/choice:text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {choice.label}
                </span>
                {choice.body ? (
                  <span className="text-sm text-muted-foreground">{choice.body}</span>
                ) : null}
              </span>
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Pick the response you’d actually make — there’s no obvious right answer.
        </p>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!selectedChoiceId || submitting}
          aria-busy={submitting}
          onClick={onSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Locking it in…
            </>
          ) : (
            'Lock it in'
          )}
        </Button>
      </div>
    </div>
  )
}
