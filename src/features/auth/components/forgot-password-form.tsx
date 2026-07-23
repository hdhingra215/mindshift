import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/use-auth'
import { forgotPasswordSchema } from '../validation/schemas'
import { FormField } from './form-field'
import { FormAlert } from './form-alert'
import { SubmitButton } from './submit-button'

export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0])
      return
    }
    setFieldError(undefined)

    setPending(true)
    const { error } = await requestPasswordReset(parsed.data.email)
    setPending(false)

    if (error) {
      setFormError(error)
      return
    }
    // Always confirm success without revealing whether the account exists.
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <span className="flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, a
          reset link is on its way. Check your inbox — and your spam folder, just in
          case.
        </p>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/auth/login">Back to login</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormAlert message={formError} /> : null}

      <FormField id="email" label="Email" error={fieldError}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'email-error' : undefined}
          placeholder="you@example.com"
        />
      </FormField>

      <SubmitButton pending={pending} pendingLabel="Sending the link…">
        Send reset link
      </SubmitButton>
    </form>
  )
}
