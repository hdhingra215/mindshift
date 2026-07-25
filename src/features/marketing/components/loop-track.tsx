import { useRef } from 'react'
import { motion } from 'motion/react'

import { useSectionProgress, useTransform, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { LOOP_STAGES } from '../constants'

type LoopTrackProps = {
  className?: string
}

/**
 * The core loop, told as a descent rather than a row of feature cards.
 *
 * Three beats sit on a single vertical rail. A light travels down the rail as
 * you scroll and each beat brightens as the light reaches it, so reading the
 * section *is* moving through the loop. Cards would have presented three
 * independent facts; a rail presents one sequence, which is what the loop
 * actually is.
 *
 * Scroll-linked motion is Motion's job (MotionSystem §1): the rail and the beat
 * opacities are derived from a scroll MotionValue via `useTransform`, so they
 * track the scroll position exactly and update without a React render per
 * frame. Anime.js is deliberately not used here — nothing is time-driven.
 *
 * Under reduced motion every beat renders fully lit and the rail is static: the
 * content is identical, only the progressive disclosure is dropped.
 */
export function LoopTrack({ className }: LoopTrackProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const progress = useSectionProgress(ref)

  // The rail fills across the middle of the section's scroll pass, so it is
  // already moving when the first beat is read and completes near the last.
  const railScale = useTransform(progress, [0.1, 0.75], [0, 1], { clamp: true })

  return (
    <div className={cn('relative', className)} ref={ref}>
      {/* Rail track */}
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[11px] w-px bg-border sm:left-[15px]"
      />
      {/* Rail fill — the travelling light */}
      <motion.div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[11px] w-px origin-top bg-gradient-to-b from-brand via-brand to-reward sm:left-[15px]"
        style={{ scaleY: reduced ? 1 : railScale }}
      />

      <ol className="flex flex-col gap-14 sm:gap-20">
        {LOOP_STAGES.map((stage, index) => (
          <LoopStage
            body={stage.body}
            index={index}
            key={stage.id}
            ordinal={stage.ordinal}
            progress={progress}
            reduced={reduced}
            title={stage.title}
            total={LOOP_STAGES.length}
          />
        ))}
      </ol>
    </div>
  )
}

type LoopStageProps = {
  ordinal: string
  title: string
  body: string
  index: number
  total: number
  progress: ReturnType<typeof useSectionProgress>
  reduced: boolean
}

function LoopStage({ ordinal, title, body, index, total, progress, reduced }: LoopStageProps) {
  // Each beat owns a slice of the section's scroll pass and lights as the rail
  // reaches it. The window overlaps slightly so beats hand off rather than blink.
  const start = 0.1 + (index / total) * 0.6
  const opacity = useTransform(progress, [start, start + 0.16], [0.28, 1], { clamp: true })

  return (
    <motion.li className="relative pl-10 sm:pl-14" style={{ opacity: reduced ? 1 : opacity }}>
      <span
        aria-hidden="true"
        className="absolute top-1.5 left-0 flex size-6 items-center justify-center rounded-full border border-brand/50 bg-background sm:size-8"
      >
        <span className="size-1.5 rounded-full bg-brand sm:size-2" />
      </span>

      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{ordinal}</p>
      <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h3>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
        {body}
      </p>
    </motion.li>
  )
}
