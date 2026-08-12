import { MindObservatory, type ObservatoryBias } from '@/features/dashboard'
import { MASTERY_TIERS, formatMastery } from '@/features/mastery'
import { cn } from '@/lib/utils'

import {
  formatFamilyMastery,
  masteryDistribution,
  standingsByFamily,
  strongestKnown,
} from '../lib/evidence'

type MasteryPlateProps = {
  biases: readonly ObservatoryBias[]
  momentum: number
}

/**
 * The mastery plate: the observatory, and the same picture in words.
 *
 * The instrument is embedded unchanged — the archive is not a second view of
 * mastery, it is the same view brought indoors. What the archive adds is the
 * readable form of it: the tier ladder as five counts, and the families ranked.
 *
 * ── Why the ladder and the families are written out ─────────────────────────
 * The orbital field says everything spatially, which means it says nothing at
 * all to a screen reader, to a player who cannot distinguish the tier colours,
 * or to anyone who wants the actual number. The dashboard can accept that — it
 * is a glance. The archive is the *record*, so every fact the scene carries has
 * to exist in text somewhere on this plate.
 */
export function MasteryPlate({ biases, momentum }: MasteryPlateProps) {
  const distribution = masteryDistribution(biases)
  const families = standingsByFamily(biases)
  const strongest = strongestKnown(biases)
  const anyMet = biases.some((bias) => bias.totalAttempts > 0)

  return (
    <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-12">
      <MindObservatory
        biases={biases}
        className="lg:mx-0 lg:max-w-[24rem] lg:shrink-0"
        momentum={momentum}
      />

      <div className="flex w-full flex-col gap-8">
        {/* The ladder, as counts. Icon + label + number — never colour alone. */}
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            The twelve, by tier
          </p>
          <dl className="mt-4 flex flex-col gap-2">
            {MASTERY_TIERS.map((tier) => {
              const count = distribution[tier.id]
              return (
                <div className="flex items-baseline gap-3" key={tier.id}>
                  <dt className={cn('w-24 shrink-0 text-xs font-medium', tier.toneClass)}>
                    {tier.label}
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    {/*
                     * A row of marks rather than a bar. Twelve is small enough to
                     * count at a glance, and counting is a better reading of
                     * "where am I" than a length the eye has to estimate.
                     */}
                    <span aria-hidden="true" className="flex gap-1">
                      {Array.from({ length: biases.length }, (_, index) => (
                        <span
                          className={cn(
                            'block size-1.5 rounded-full',
                            index < count ? tier.fillClass : 'bg-border/60',
                          )}
                          key={`${tier.id}-${index}`}
                        />
                      ))}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {anyMet
              ? strongest
                ? `${strongest.name} is the one you catch most reliably, at ${formatMastery(strongest.masteryLevel)}.`
                : 'Nothing has moved off the floor yet — which is where every bias starts.'
              : 'All twelve are still unfamiliar. That is the honest starting shape of any mind.'}
          </p>
        </div>

        {/* Families, ranked. The spatial regions of the scene, made readable. */}
        {families.length > 0 ? (
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
              By family
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {families.map((family) => (
                <div className="flex items-baseline justify-between gap-3" key={family.name}>
                  <dt className="min-w-0 truncate text-xs text-foreground">{family.name}</dt>
                  <dd className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatFamilyMastery(family)}
                    <span className="ml-2 text-[10px] tracking-[0.14em] uppercase">
                      {family.metCount}/{family.size} met
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  )
}
