import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuth } from '../hooks/use-auth'
import { resetPasswordSchema } from '../validation/schemas'
import { FormField } from './form-field'
import { FormAlert } from './form-alert'
import { PasswordInput } from './password-input'
import { SubmitButton } from './submit-button'

type FieldErrors = {
  password?: string
  confirmPassword?: string
}

export function ResetPasswordForm() {
  const { status, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // The recovery link establishes a session (detected from the URL). Without
  // one, the link was invalid or expired — guide the player to start over.
  if (status !== 'authenticated') {
    return (
      <div className="flex flex-col gap-4 text-center" aria-live="polite">
        <p className="text-sm leading-relaxed text-muted-foreground">
          This reset link has expired or already been used. Request a fresh one and
          you’ll be right back.
        </p>
        <Link
          to="/auth/forgot-password"
          className="rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      })
      return
    }
    setFieldErrors({})

    setPending(true)
    const { error } = await updatePassword(parsed.data.password)
    setPending(false)

    if (error) {
      setFormError(error)
      return
    }

    toast.success('Password updated. You’re all set.')
    void navigate({ to: '/dashboard' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormAlert message={formError} /> : null}

      <FormField
        id="password"
        label="New password"
        error={fieldErrors.password}
        hint="At least 8 characters."
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
          placeholder="Create a new password"
        />
      </FormField>

      <FormField id="confirmPassword" label="Confirm new password" error={fieldErrors.confirmPassword}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={
            fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined
          }
          placeholder="Re-enter your new password"
        />
      </FormField>

      <SubmitButton pending={pending} pendingLabel="Updating your password…">
        Update password
      </SubmitButton>
    </form>
  )
}
