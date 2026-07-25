/**
 * KokonutUI components, migrated into MindShift.
 *
 * Each file keeps its upstream attribution and documents exactly what changed
 * during migration — Next.js APIs removed, Motion particle work handed to
 * Anime.js (the primary engine), hardcoded colours replaced by design tokens,
 * and strict-mode type holes closed.
 *
 * Import from here rather than reaching into the files, so a future upstream
 * refresh has one seam to reconcile.
 */

export { AvatarPicker } from './avatar-picker'
export { AVATAR_OPTIONS, type AvatarOption } from './avatar-options'
export { MatrixText } from './matrix-text'
export { ParticleButton, type ParticleButtonProps } from './particle-button'
export {
  ProfileDropdown,
  type ProfileMenuItem,
  type ProfileSummary,
} from './profile-dropdown'
