/**
 * Avatar Picker — adapted from KokonutUI (MIT).
 * Source: https://kokonutui.com · @dorianbaffier
 *
 * ── Migration notes ──────────────────────────────────────────────────────────
 *  1. Scope narrowed to one job. Upstream bundled avatar selection *with* a
 *     username field and a "Get Started" CTA — that is a screen, not a
 *     primitive. This is a controlled picker; the surrounding form belongs to
 *     whichever feature uses it.
 *  2. Avatar art is generated from the palette instead of four hardcoded
 *     off-brand SVGs (hot pink, mint). Marks are abstract and geometric per the
 *     Brand Guidelines — no cartoon faces.
 *  3. `useState<Avatar>(avatars[0])` was unsound under `noUncheckedIndexedAccess`;
 *     selection is now driven by a stable id the caller owns.
 *  4. Accessibility: a real radiogroup with roving arrow-key selection, a
 *     visible focus ring, and selection signalled by border + check + text —
 *     never by colour alone.
 */

import { useId, type CSSProperties } from 'react'
import { Check } from 'lucide-react'

import { TONE_VARIABLE } from '@/components/motion/tones'
import { usePressFeedback } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AVATAR_OPTIONS, type AvatarOption } from './avatar-options'

function AvatarMark({ option, className }: { option: AvatarOption; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('size-full', className)}
      role="presentation"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="var(--avatar-tone)" height="48" width="48" />
      <g
        opacity="0.9"
        transform={`rotate(${option.rotation} 24 24)`}
        stroke="var(--background)"
        strokeLinecap="round"
        strokeWidth="3.5"
        fill="none"
      >
        <path d="M14 30 L24 18 L34 30" />
        <path d="M14 18 h20" opacity="0.55" />
      </g>
    </svg>
  )
}

type AvatarPickerProps = {
  /** Currently selected avatar id. Controlled — the caller owns the value. */
  value: string
  onChange: (id: string) => void
  options?: readonly AvatarOption[]
  className?: string
  /** Accessible name for the group. */
  label?: string
}

/**
 * A controlled avatar picker.
 *
 * Renders as a radiogroup so keyboard users get native radio semantics: arrows
 * move and select, Tab enters and leaves the group as one stop. Selection reads
 * as selected through three independent channels — a check mark, a ring, and
 * `aria-checked` — so it survives colour-blindness and reduced motion alike.
 */
export function AvatarPicker({
  value,
  onChange,
  options = AVATAR_OPTIONS,
  className,
  label = 'Choose an avatar',
}: AvatarPickerProps) {
  const groupId = useId()
  const playPress = usePressFeedback(0.94)

  const selectRelative = (currentIndex: number, step: number) => {
    const next = options[(currentIndex + step + options.length) % options.length]
    if (next) onChange(next.id)
  }

  return (
    <div
      aria-label={label}
      className={cn('flex flex-wrap gap-3', className)}
      id={groupId}
      role="radiogroup"
    >
      {options.map((option, index) => {
        const isSelected = option.id === value

        return (
          <button
            aria-checked={isSelected}
            aria-label={option.label}
            className={cn(
              'relative size-14 cursor-pointer overflow-hidden rounded-xl border-2',
              'transition-[border-color,opacity,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-move)]',
              'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              isSelected
                ? 'border-foreground opacity-100 glow-soft'
                : 'border-border opacity-60 hover:opacity-100'
            )}
            key={option.id}
            onClick={(event) => {
              playPress(event)
              onChange(option.id)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                selectRelative(index, 1)
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                selectRelative(index, -1)
              }
            }}
            role="radio"
            style={
              {
                '--avatar-tone': TONE_VARIABLE[option.tone],
                '--glow-color': TONE_VARIABLE[option.tone],
              } as CSSProperties
            }
            tabIndex={isSelected ? 0 : -1}
            type="button"
          >
            <AvatarMark option={option} />
            {isSelected ? (
              <span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-foreground">
                <Check aria-hidden="true" className="size-3 text-background" />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default AvatarPicker
