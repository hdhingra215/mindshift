/**
 * Motion system — public API.
 *
 * Import from `@/lib/motion`, never from the files inside it. The barrel is the
 * seam that lets the engines underneath change without a product-wide refactor.
 *
 * Layout:
 *   tokens.ts         durations, easings, springs, stagger, travel, layering
 *   reduced-motion.ts the accessibility gate every animation passes through
 *   engine.ts         Anime.js adapter — time-driven motion (PRIMARY engine)
 *   scroll.ts         Motion adapter — scroll- and viewport-driven motion
 *   pointer.ts        the shared cursor engine (one rAF loop, many effects)
 *   hooks.ts          React lifecycle bindings for all of the above
 */

export * from './tokens'
export * from './reduced-motion'
export * from './engine'
export * from './scroll'
export * from './pointer'
export * from './hooks'
