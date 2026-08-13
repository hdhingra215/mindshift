import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { InstrumentFrame } from '@/components/world'
import { hapticsSupported } from '@/lib/haptics'
import { resetAudioMix, setAudioMix, toggleHaptics, useAudioMix } from '@/lib/audio'
import { signal } from '@/lib/feedback'
import { cn } from '@/lib/utils'

import { SoundToggle } from './sound-toggle'

/** The three channels, in the order they matter to a player. */
const CHANNELS = [
  {
    key: 'master',
    label: 'Overall',
    hint: 'Everything, together.',
  },
  {
    key: 'sfx',
    label: 'Interactions',
    hint: 'Choices, locks, reveals — the sounds your decisions make.',
  },
  {
    key: 'ambient',
    label: 'Atmosphere',
    hint: 'The room tone behind the interface. Off is a perfectly good setting.',
  },
] as const satisfies readonly {
  key: 'master' | 'sfx' | 'ambient'
  label: string
  hint: string
}[]

/**
 * The full mix.
 *
 * Three channels rather than one, because "interface sounds are useful but the
 * room is distracting" is a real preference and the usual single volume slider
 * forces it to be resolved as silence.
 *
 * Auditioning is part of the control: moving the interaction slider plays the
 * sound it governs, at the level just chosen, so the setting can be judged by
 * ear instead of by number. The atmosphere channel needs no audition — it is
 * already playing.
 */
export function FeedbackSettings() {
  const mix = useAudioMix()
  const canVibrate = hapticsSupported()

  return (
    <InstrumentFrame as="section" className="max-w-md p-5" legend="Sound">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-base font-semibold text-foreground">
            The world&rsquo;s sound
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {mix.muted
              ? 'Sound is off. Nothing plays until you turn it back on.'
              : 'Nothing here is required to play — every sound has something on screen that says the same thing.'}
          </p>
        </div>
        <SoundToggle />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {CHANNELS.map((channel) => (
          <div className="flex flex-col gap-2" key={channel.key}>
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor={`mix-${channel.key}`}>
                {channel.label}
              </label>
              <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground tabular-nums">
                {Math.round(mix[channel.key] * 100)}%
              </span>
            </div>
            <Slider
              className="w-full"
              disabled={mix.muted}
              id={`mix-${channel.key}`}
              max={100}
              onValueChange={([next]) => {
                if (next === undefined) return
                setAudioMix({ [channel.key]: next / 100 })
                if (channel.key !== 'ambient') signal('choice.select')
              }}
              step={5}
              thumbLabel={`${channel.label} volume`}
              value={[Math.round(mix[channel.key] * 100)]}
            />
            <p className="text-xs text-muted-foreground">{channel.hint}</p>
          </div>
        ))}
      </div>

      {/*
       * Haptics sit with sound rather than in a section of their own: they are
       * the same kind of thing — feedback a player may not want — and they are
       * remembered in the same record, so silencing one cannot half-persist.
       */}
      <div className="mt-6 flex items-start justify-between gap-4 border-t border-border/60 pt-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Vibration</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {canVibrate
              ? 'A short pulse when a decision lands or something is committed. Never while you scroll or type.'
              : 'This device has no vibration motor, so nothing here would be felt. The setting is remembered for one that does.'}
          </p>
        </div>

        <button
          aria-pressed={mix.haptics}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--motion-fast)]',
            'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            mix.haptics ? 'border-primary/60 bg-primary/30' : 'border-border bg-muted',
            !canVibrate && 'opacity-60',
          )}
          onClick={() => {
            const next = toggleHaptics()
            // Confirm by doing the thing: turning vibration on fires one pulse,
            // which is the only honest way to preview a physical setting.
            if (next.haptics) signal('choice.select')
          }}
          type="button"
        >
          <span className="sr-only">
            {mix.haptics ? 'Turn vibration off' : 'Turn vibration on'}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-foreground transition-[left] duration-[var(--motion-fast)] ease-[var(--ease-move)]',
              mix.haptics ? 'left-[1.375rem]' : 'left-0.5',
            )}
          />
        </button>
      </div>

      {/*
       * Strength, not volume.
       *
       * The Vibration API exposes duration and nothing else — no amplitude, no
       * waveform — so intensity is dwell time: the pulses stretch and shrink
       * while the rhythm holds. The label says "strength" rather than "volume"
       * because that is what the control actually does.
       */}
      <div className="mt-5 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label className="text-sm font-medium text-foreground" htmlFor="mix-haptic-intensity">
            Vibration strength
          </label>
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground tabular-nums">
            {Math.round(mix.hapticIntensity * 100)}%
          </span>
        </div>
        <Slider
          className="w-full"
          disabled={mix.muted || !mix.haptics}
          id="mix-haptic-intensity"
          max={100}
          onValueChange={([next]) => {
            if (next === undefined) return
            setAudioMix({ hapticIntensity: next / 100 })
            // Auditioned by doing it: a strength setting can only be judged by
            // feel, so every step fires the pattern at the level just chosen.
            signal('choice.select')
          }}
          step={5}
          thumbLabel="Vibration strength"
          value={[Math.round(mix.hapticIntensity * 100)]}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Longer pulses feel stronger — it is the only control the browser gives
          us over a vibration motor.
        </p>
      </div>

      <div className="mt-6 flex justify-end border-t border-border/60 pt-4">
        <Button
          onClick={() => {
            resetAudioMix()
            signal('choice.select')
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          Reset to defaults
        </Button>
      </div>
    </InstrumentFrame>
  )
}
