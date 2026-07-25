import { useMemo, useState } from 'react'
import { PenLine, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import type { GameScenario, ReflectionInput } from '../types'

type ReflectionPanelProps = {
  scenario: GameScenario
  onSave: (input: ReflectionInput) => Promise<{ error: string | null }>
}

function buildPrompt(scenario: GameScenario): string {
  const name = scenario.primaryBias?.name?.toLowerCase()
  return name
    ? `Where might ${name} shape a real decision of yours this week?`
    : 'Where might this kind of thinking show up in your own week?'
}

/**
 * Optional reflection (ContentStrategy §8, InteractionPrinciples §8). Confidence
 * is metacognition, not a score. The schema requires reflection text, so saving
 * needs a written note; the confidence values persist alongside it. Reflections
 * are immutable — once saved, the panel makes that clear and locks.
 */
export function ReflectionPanel({ scenario, onSave }: ReflectionPanelProps) {
  const prompt = useMemo(() => buildPrompt(scenario), [scenario])
  const [text, setText] = useState('')
  const [before, setBefore] = useState(50)
  const [after, setAfter] = useState(50)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (text.trim().length === 0 || saving) return
    setSaving(true)
    const { error } = await onSave({
      text,
      confidenceBefore: before,
      confidenceAfter: after,
      prompt,
    })
    setSaving(false)
    if (error) {
      toast.error(error)
      return
    }
    setSaved(true)
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Saved — that snapshot of your thinking is yours to keep. Reflections stay
            exactly as written.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-foreground">
          <PenLine className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Reflect (optional)</h3>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="confidence-before" className="text-xs text-muted-foreground">
              How sure were you? <span className="tabular-nums">{before}</span>
            </Label>
            <Slider
              id="confidence-before"
              thumbLabel="How sure were you when you chose"
              value={[before]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setBefore(v[0] ?? before)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="confidence-after" className="text-xs text-muted-foreground">
              How well do you get it now? <span className="tabular-nums">{after}</span>
            </Label>
            <Slider
              id="confidence-after"
              thumbLabel="How well you understand the bias now"
              value={[after]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setAfter(v[0] ?? after)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reflection-text">{prompt}</Label>
          <Textarea
            id="reflection-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A sentence is plenty. Reflect honestly, not perfectly."
            maxLength={1000}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Adding a note saves your confidence too.
          </p>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={text.trim().length === 0 || saving}
            aria-busy={saving}
          >
            {saving ? 'Saving…' : 'Save reflection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
