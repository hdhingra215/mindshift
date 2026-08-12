import { InstrumentFrame } from '@/components/world'

import type { ArchiveReflection } from '../types'

type ReflectionPlateProps = {
  reflections: readonly ArchiveReflection[]
  /** Every reflection ever written, which may exceed the number shown. */
  total: number
}

/**
 * The reflection plate: the player's own words, kept as written.
 *
 * The only place in the product where the *player* is the author. Everything
 * else on this screen is the system's account of them; this is their account of
 * themselves, and it is treated accordingly — set in the reading face, at size,
 * unedited, with the machine's metadata pushed down to a mono footer where it
 * belongs.
 *
 * Reflections are immutable rows (ProjectStatus §12.9). Nothing here offers to
 * edit or delete one, and that is deliberate rather than unbuilt: a record you
 * can revise after the fact is not evidence of how you were thinking at the time.
 */
export function ReflectionPlate({ reflections, total }: ReflectionPlateProps) {
  if (reflections.length === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
        This is where your own thinking gets recorded. Write a reflection after a
        scenario and your words land here — honest, not polished, and exactly as
        you left them.
      </p>
    )
  }

  const hidden = Math.max(0, total - reflections.length)

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-5">
        {reflections.map((reflection) => (
          <li key={reflection.id}>
            <InstrumentFrame as="figure" className="px-5 py-4">
              <blockquote className="m-0">
                <p className="font-heading text-base leading-relaxed text-pretty text-foreground">
                  {reflection.text}
                </p>
              </blockquote>

              <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                <span>{formatRecordedAt(reflection.recordedAt)}</span>
                {reflection.scenarioTitle ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="normal-case tracking-normal">
                      {reflection.scenarioTitle}
                    </span>
                  </>
                ) : null}
                {describeConfidenceShift(reflection) ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{describeConfidenceShift(reflection)}</span>
                  </>
                ) : null}
              </figcaption>
            </InstrumentFrame>
          </li>
        ))}
      </ul>

      {hidden > 0 ? (
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {hidden} earlier {hidden === 1 ? 'reflection' : 'reflections'} also on file.
        </p>
      ) : null}
    </div>
  )
}

/**
 * The date, plainly.
 *
 * Locale-formatted rather than relative: "3 weeks ago" is friendlier in a feed
 * and useless in an archive, where the point of a record is that it is fixed to
 * a moment. Falls back to the raw value rather than throwing on a malformed date.
 */
function formatRecordedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * How understanding moved while writing, when both readings exist.
 *
 * Stated as two numbers, not as a verdict. A drop is as legitimate as a rise —
 * realising a situation is harder than you thought is learning, and the archive
 * must not frame it as a regression.
 */
function describeConfidenceShift(reflection: ArchiveReflection): string | null {
  const { confidenceBefore, confidenceAfter } = reflection
  if (confidenceBefore === null || confidenceAfter === null) return null
  // Spelled out rather than an arrow glyph, which most screen readers drop.
  return `Sureness ${confidenceBefore}% before, ${confidenceAfter}% after`
}
