import { MASTERY_MAX } from '@/features/mastery'

import type { ObservatoryBias } from '../types'

/**
 * Orbital geometry for the observatory.
 *
 * The one idea this file exists to express: **mastery is distance.** A bias you
 * have integrated orbits close to the core; one you have never met sits far out
 * in the dark. Nothing is labelled "81%" for the geometry to work — the shape of
 * the scene *is* the data, so a player reads their own mind at a glance and only
 * later notices there were numbers involved.
 *
 * Two consequences worth having on purpose:
 *   * Progress visibly contracts the scene. Twelve distant points pull inward
 *     over weeks, so the environment the player returns to is not the one they
 *     left. That is the "progress reshapes the world" requirement, satisfied by
 *     geometry rather than by a progress bar.
 *   * Blind spots are literally peripheral. The things you cannot see sit at the
 *     edge of vision, dim, which is exactly what a blind spot is.
 *
 * Pure functions, no DOM, no React. The renderer only turns these numbers into
 * transforms.
 */

/** Innermost orbit, as a fraction of the field radius. Never zero — the core lives there. */
const MIN_ORBIT = 0.44
/** Outermost orbit. Just inside the rim so nothing clips the frame. */
const MAX_ORBIT = 1

/** Slowest and fastest angular rates, as multiples of the shared orbit clock. */
const SLOWEST_RATE = 0.45
const FASTEST_RATE = 1.05

export type OrbitPlacement = {
  bias: ObservatoryBias
  /** Distance from the core, 0–1 of the field radius. */
  radius: number
  /** Starting angle in degrees. */
  phase: number
  /** Angular rate as a multiple of the shared clock. Inner orbits run faster. */
  rate: number
  /** 0–1 presence: how brightly this object reads at rest. */
  luminosity: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Place every bias in the field.
 *
 * Angle is grouped by family rather than spread evenly, so the six categories
 * form recognisable regions instead of a uniform ring. A player learns "my
 * social biases are all out there on the left" without being told, which is the
 * kind of spatial memory a flat list can never build.
 */
export function placeBiases(biases: readonly ObservatoryBias[]): OrbitPlacement[] {
  const families = groupByFamily(biases)
  const sectorSize = families.length > 0 ? 360 / families.length : 360

  return families.flatMap((family, familyIndex) => {
    const sectorStart = familyIndex * sectorSize
    // Inset from the sector edges so neighbouring families never touch.
    const usable = sectorSize * 0.62
    const step = family.members.length > 1 ? usable / (family.members.length - 1) : 0
    const offset = (sectorSize - usable) / 2

    return family.members.map((bias, memberIndex) => {
      const mastery = clamp01(bias.masteryLevel / MASTERY_MAX)

      return {
        bias,
        // Mastered pulls inward. The curve is squared so early progress moves a
        // point visibly — the first scenario has to feel like it did something.
        //
        // Clamped because floating point puts the fully-mastered case a hair
        // under MIN_ORBIT, and the renderer is entitled to trust the bounds this
        // type documents.
        radius: clampRange(
          MAX_ORBIT - (MAX_ORBIT - MIN_ORBIT) * Math.sqrt(mastery),
          MIN_ORBIT,
          MAX_ORBIT,
        ),
        phase: sectorStart + offset + step * memberIndex,
        // Kepler's habit: inner orbits are quicker. Integrated thinking reads as
        // active, distant blind spots as almost still.
        rate: SLOWEST_RATE + (FASTEST_RATE - SLOWEST_RATE) * mastery,
        // A floor of presence so an unmet bias is a faint point rather than
        // nothing — you must be able to see that something is out there.
        luminosity: 0.16 + 0.84 * mastery,
      }
    })
  })
}

type Family = { name: string; members: ObservatoryBias[] }

/** Stable family grouping — insertion-ordered so the scene never reshuffles. */
function groupByFamily(biases: readonly ObservatoryBias[]): Family[] {
  const families = new Map<string, Family>()

  for (const bias of biases) {
    const name = bias.categoryName ?? 'Unfiled'
    const existing = families.get(name)
    if (existing) existing.members.push(bias)
    else families.set(name, { name, members: [bias] })
  }

  return [...families.values()]
}

/**
 * How strongly the core burns, 0–1.
 *
 * Averaged mastery rather than XP: the core is the player's *thinking*, and XP
 * measures activity. A player who has ground a hundred scenarios without
 * learning anything should not have a brighter mind than one who learned deeply
 * from ten.
 */
export function coreIntensity(biases: readonly ObservatoryBias[]): number {
  if (biases.length === 0) return 0
  const total = biases.reduce((sum, bias) => sum + bias.masteryLevel, 0)
  return clamp01(total / (biases.length * MASTERY_MAX))
}

/** Biases never encountered. The scene's open questions. */
export function unlitCount(biases: readonly ObservatoryBias[]): number {
  return biases.filter((bias) => bias.totalAttempts === 0).length
}

/**
 * The bias most worth returning to: met, but weakest.
 *
 * Deliberately not the strongest and not an untouched one. Something you have
 * already fallen for and not yet fixed is the most useful next move, and naming
 * it is the difference between a dashboard that reports and one that coaches.
 */
export function weakestKnown(biases: readonly ObservatoryBias[]): ObservatoryBias | null {
  const known = biases.filter((bias) => bias.totalAttempts > 0)
  if (known.length === 0) return null

  return known.reduce((weakest, bias) =>
    bias.masteryLevel < weakest.masteryLevel ? bias : weakest,
  )
}
