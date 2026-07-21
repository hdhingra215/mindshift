import type { ComponentProps } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

/**
 * Theme provider.
 *
 * Dark is the default and, for now, the only shipped theme (per the Design
 * System). Themes are token-driven: switching only remaps CSS variables via
 * the `class` attribute on <html> — components never change.
 *
 * Light theme is planned; `enableSystem` stays off until it ships.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
