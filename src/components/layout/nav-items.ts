import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Gamepad2, User, Settings } from 'lucide-react'

/** A primary navigation destination in the authenticated shell. */
export type NavItem = {
  label: string
  /** Literal path so TanStack Router type-checks the link target. */
  to: '/dashboard' | '/play' | '/profile' | '/settings'
  icon: LucideIcon
}

/**
 * Single source of truth for primary navigation. Consumed by the desktop
 * sidebar, the mobile bottom nav, and the top-bar title — so the four
 * surfaces can never drift out of sync.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Play', to: '/play', icon: Gamepad2 },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const
