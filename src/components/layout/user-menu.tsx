import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth'
import { toUserIdentity } from './user-identity'

type UserMenuProps = {
  /** `full` shows name + email beside the avatar (sidebar); `compact` is avatar-only (top bar). */
  variant?: 'full' | 'compact'
}

/**
 * Account menu: avatar, display name, email, quick links, and logout.
 * Built on the accessible radix DropdownMenu (arrow-key nav, Escape to close,
 * focus returns to the trigger). Identity comes from the authenticated user.
 */
export function UserMenu({ variant = 'compact' }: UserMenuProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const identity = toUserIdentity(user)

  async function handleSignOut() {
    await signOut()
    void navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className={cn(
          'group/user flex items-center gap-2.5 rounded-lg outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
          variant === 'full'
            ? 'w-full p-2 hover:bg-muted aria-expanded:bg-muted'
            : 'p-0.5 hover:opacity-90',
        )}
      >
        <Avatar>
          {identity.avatarUrl ? (
            <AvatarImage src={identity.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{identity.initials}</AvatarFallback>
        </Avatar>

        {variant === 'full' ? (
          <span className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-sm font-medium text-foreground">
              {identity.displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {identity.email}
            </span>
          </span>
        ) : null}

        {variant === 'full' ? (
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded/user:rotate-180"
            aria-hidden="true"
          />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">
            {identity.displayName}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {identity.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/profile' })}>
          <UserIcon aria-hidden="true" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/settings' })}>
          <SettingsIcon aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
