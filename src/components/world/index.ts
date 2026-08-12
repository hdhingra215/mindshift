/**
 * World layer — the environment the authenticated product exists inside.
 *
 * These are not decorations and not motion primitives. They are the scaffolding
 * that turns a dark canvas into a *place*: one direction of light, structure in
 * the void, distance from the camera, and housings that objects sit in.
 *
 *   WorldCanvas      the environment itself — light, lattice, vignette, camera
 *   DepthPlane       places content at a distance; pure CSS, zero renders
 *   InstrumentFrame  a readout framed as an object rather than boxed as a card
 *
 * They compose `@/lib/motion` and never re-implement it. Anything time-driven
 * here is Anime.js; nothing here is scroll- or gesture-driven.
 *
 * All of it is structural or decorative. Remove the entire layer and the product
 * still says everything it says — flatter, but complete.
 */

export { DepthPlane, type WorldDepth } from './depth-plane'
export { InstrumentFrame } from './instrument-frame'
export { WorldCanvas } from './world-canvas'
export { resetWorldWarmth, setWorldWarmth, useWorldWarmth } from './world-atmosphere'
