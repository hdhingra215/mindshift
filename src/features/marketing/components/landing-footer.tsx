import { Logo } from '@/components/shared/logo'

/**
 * Footer. One line, no link farm — the page has one destination and it is
 * above this.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <Logo className="text-sm text-muted-foreground" showMark={false} />
        <p>Better thinking, one decision at a time.</p>
      </div>
    </footer>
  )
}
