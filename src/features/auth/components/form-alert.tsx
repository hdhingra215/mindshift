import { CircleAlert } from 'lucide-react'

type FormAlertProps = {
  message: string
}

/**
 * Form-level error banner. Calm, gentle error tone (never alarming red),
 * icon + text so it never relies on color alone (§12), announced immediately
 * to assistive tech via role="alert".
 */
export function FormAlert({ message }: FormAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
