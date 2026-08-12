import { resolveAchievementIcon } from '@/features/achievements'
import { cn } from '@/lib/utils'

import type { ArchiveDiscovery } from '../types'

type DiscoveryPlateProps = {
  discoveries: readonly ArchiveDiscovery[]
}

/**
 * The discovery plate: the whole catalogue, found and unfound.
 *
 * The dashboard shows the marks a player has collected. The archive shows the
 * *set* — because an unfound discovery, named and described, is a legible thing
 * still out there rather than a locked box. That is the same argument that puts
 * all twelve biases in the observatory whether or not they have been met, and it
 * is the difference between a trophy case and a map.
 *
 * ── Not a grid of cards ─────────────────────────────────────────────────────
 * Each entry is a mark on the left and a line of type on the right, sitting
 * directly on the ground of the room. Found ones are lit in brand purple — the
 * one thing brand purple is for — and carry the sentence explaining why they
 * reflect real growth. Unfound ones are dim, ringed with a dashed hairline, and
 * still say their name: the state is carried by the ring, the dimming, *and* the
 * word "Not yet found", so it never rests on colour.
 */
export function DiscoveryPlate({ discoveries }: DiscoveryPlateProps) {
  if (discoveries.length === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
        The catalogue is still being written. When there are discoveries to make,
        they will be listed here — found or not.
      </p>
    )
  }

  // Found first, then the rest in catalogue order. What you have earned should
  // not be buried under what you have not.
  const ordered = [...discoveries].sort((a, b) => {
    if (Boolean(a.unlockedAt) !== Boolean(b.unlockedAt)) return a.unlockedAt ? -1 : 1
    if (a.unlockedAt && b.unlockedAt) return b.unlockedAt.localeCompare(a.unlockedAt)
    return a.name.localeCompare(b.name)
  })

  const found = discoveries.filter((discovery) => discovery.unlockedAt !== null).length

  return (
    <div className="flex flex-col gap-6">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        {found} of {discoveries.length} found
      </p>

      <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {ordered.map((discovery) => {
          const Icon = resolveAchievementIcon(discovery.icon)
          const isFound = discovery.unlockedAt !== null

          return (
            <li className="flex items-start gap-3" key={discovery.id}>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border',
                  isFound
                    ? 'border-brand/40 bg-brand/8 text-brand'
                    : 'border-dashed border-border/70 text-muted-foreground/50',
                )}
              >
                <Icon className="size-4" />
              </span>

              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isFound ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {discovery.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {isFound
                    ? (discovery.description ?? 'Found.')
                    : 'Not yet found.'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
