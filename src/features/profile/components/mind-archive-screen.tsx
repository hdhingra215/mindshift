import { toUserIdentity } from '@/components/layout/user-identity'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'

import { useMindArchive } from '../hooks/use-mind-archive'
import { ArchiveScene } from './archive-scene'

/**
 * Archive orchestrator.
 *
 * A thin switch over the three load states, so the room itself never has to know
 * about loading or failure — the same division the dashboard uses, for the same
 * reason.
 *
 * The waiting state draws the archive's own structure — a masthead rule and one
 * empty plate per section — rather than grey skeleton bars. The player should see the room
 * they are walking into, unlit, instead of rectangles standing in for content
 * that has not arrived (InteractionPrinciples §5).
 */
export function MindArchiveScreen() {
  const { user } = useAuth()
  const { displayName } = toUserIdentity(user)
  const archive = useMindArchive()

  if (archive.status === 'ready') {
    return <ArchiveScene displayName={displayName} record={archive.record} />
  }

  if (archive.status === 'failed') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          Archive sealed
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{archive.message}</p>
        <Button onClick={archive.retry} size="lg" variant="outline">
          Try again
        </Button>
      </div>
    )
  }

  return <ArchivePlaceholder />
}

/**
 * How many numbered plates the room has, so the unlit version matches it.
 * Derived from one place because the two drifted the moment a plate was added.
 */
const ARCHIVE_PLATES = [1, 2, 3, 4, 5, 6]

/** The room before the lights come up. Same skeleton geometry, no content. */
function ArchivePlaceholder() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 py-4 sm:gap-20">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <span className="block h-2 w-32 rounded-full bg-border/40" />
        <span className="block h-7 w-64 rounded-full bg-border/30" />
      </div>

      {ARCHIVE_PLATES.map((plate) => (
        <div aria-hidden="true" className="flex flex-col gap-4" key={plate}>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground/50 tabular-nums">
              {String(plate).padStart(2, '0')}
            </span>
            <span className="h-px flex-1 bg-border/40" />
          </div>
          <span className="block h-2 w-48 rounded-full bg-border/25" />
        </div>
      ))}

      <p className="sr-only" role="status">
        Opening your archive.
      </p>
    </div>
  )
}
