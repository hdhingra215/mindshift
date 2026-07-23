import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/**
 * Label + control + inline error, wired for accessibility. The control passed
 * as `children` must carry `id`, and (when `error` is set) `aria-invalid` and
 * `aria-describedby={`${id}-error`}`. Errors are calm, never alarming
 * (InteractionPrinciples §3/§6) and paired with text (not color alone, §12).
 */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
