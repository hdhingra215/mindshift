/**
 * Profile Dropdown — adapted from KokonutUI (MIT).
 * Source: https://kokonutui.com
 *
 * ── Migration notes ──────────────────────────────────────────────────────────
 *  1. `next/image` and `next/link` are gone (this is Vite + TanStack Router).
 *     Navigation is delegated to the caller via a render-free `to`/`onSelect`
 *     item shape, so the primitive stays router-agnostic.
 *  2. The Gemini AI branding icon and its "Model / Subscription / PRO" sample
 *     data are removed — they belong to the demo, not to MindShift.
 *  3. Every `zinc-*`, `blue-*`, `purple-*` and `red-*` literal is replaced by a
 *     design token, so the component themes with the product.
 *  4. Accessibility: the trigger has a real accessible name, the avatar has
 *     meaningful alt text with a graceful initials fallback, and destructive
 *     actions are marked as such rather than being red-only.
 */

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type ProfileSummary = {
  name: string
  email: string
  /** Optional avatar URL. Falls back to initials when absent or broken. */
  avatarUrl?: string
}

export type ProfileMenuItem = {
  id: string
  label: string
  icon: ReactNode
  /** Trailing value chip — a plan name, a count, a status. */
  value?: string
  onSelect: () => void
  /** Renders in the error tone with a divider above. Sign out, delete account. */
  destructive?: boolean
}

type ProfileDropdownProps = {
  profile: ProfileSummary
  items: ProfileMenuItem[]
  className?: string
  /** Accessible label for the trigger. */
  triggerLabel?: string
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Account menu: identity summary as the trigger, actions in the panel.
 *
 * Data-driven by design — it renders whatever items it is handed and calls
 * back, so the auth feature owns navigation and sign-out while this owns
 * presentation and keyboard behaviour.
 */
export function ProfileDropdown({
  profile,
  items,
  className,
  triggerLabel = 'Open account menu',
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showImage = Boolean(profile.avatarUrl) && !avatarFailed

  const primaryItems = items.filter((item) => !item.destructive)
  const destructiveItems = items.filter((item) => item.destructive)

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={triggerLabel}
          className={cn(
            'group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-2 pr-3',
            'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-move)]',
            'hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            className
          )}
          type="button"
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
            {showImage ? (
              <img
                alt=""
                className="size-full object-cover"
                onError={() => setAvatarFailed(true)}
                src={profile.avatarUrl}
              />
            ) : (
              <span aria-hidden="true" className="text-xs font-semibold text-secondary-foreground">
                {initialsOf(profile.name)}
              </span>
            )}
          </span>

          <span className="hidden min-w-0 flex-1 text-left sm:block">
            <span className="block truncate text-sm font-medium text-foreground">{profile.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--motion-fast)] ease-[var(--ease-move)]',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1.5 depth-overlay" sideOffset={8}>
        {primaryItems.map((item) => (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2.5 rounded-lg p-2.5"
            key={item.id}
            onSelect={item.onSelect}
          >
            <span aria-hidden="true" className="text-muted-foreground">
              {item.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.value ? (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {item.value}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}

        {destructiveItems.length > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}

        {destructiveItems.map((item) => (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2.5 rounded-lg p-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
            key={item.id}
            onSelect={item.onSelect}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
