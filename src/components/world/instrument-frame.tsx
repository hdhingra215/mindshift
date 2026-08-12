import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type InstrumentFrameProps = {
  children: ReactNode
  /** Optional label etched into the top edge, like a panel legend. */
  legend?: string
  /**
   * Element the legend renders as. Defaults to a paragraph.
   *
   * Exists so a frame can sit inside a description list (`dt`) or carry a real
   * heading, without every caller re-implementing the etched legend style. The
   * appearance is fixed; only the semantics move.
   */
  legendAs?: ElementType
  as?: ElementType
  className?: string
}

/**
 * A readout, framed like an instrument rather than boxed like a card.
 *
 * The distinction matters more than it sounds. A card is a container the
 * interface puts content in; an instrument is an object in the world that
 * happens to display something. Four hairline corner brackets and no continuous
 * border is what carries that — the frame implies a housing without drawing a
 * rectangle, so the content still sits *in* the space rather than on a panel
 * floating above it.
 *
 * No fill by default either. Filling it would put an opaque plane between the
 * player and the environment, which is exactly the flat-rectangle feeling this
 * phase exists to remove.
 */
export function InstrumentFrame({
  children,
  legend,
  legendAs: Legend = 'p',
  as: Tag = 'div',
  className,
}: InstrumentFrameProps) {
  const bracket =
    'pointer-events-none absolute size-3 border-border/70 transition-colors duration-[var(--motion-base)]'

  return (
    <Tag className={cn('relative', className)}>
      <span aria-hidden="true" className={cn(bracket, 'top-0 left-0 border-t border-l')} />
      <span aria-hidden="true" className={cn(bracket, 'top-0 right-0 border-t border-r')} />
      <span aria-hidden="true" className={cn(bracket, 'bottom-0 left-0 border-b border-l')} />
      <span aria-hidden="true" className={cn(bracket, 'right-0 bottom-0 border-b border-r')} />

      {legend ? (
        <Legend className="mb-3 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          {legend}
        </Legend>
      ) : null}

      {children}
    </Tag>
  )
}
