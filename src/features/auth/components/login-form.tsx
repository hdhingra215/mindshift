import { useState, type FormEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { useAuth } from '../hooks/use-auth'
import { loginSchema } from '../validation/schemas'
import { safeInternalPath } from '../lib/redirects'
import { FormField } from './form-field'
import { FormAlert } from './form-alert'
import { PasswordInput } from './password-input'
import { SubmitButton } from './submit-button'

type LoginFormProps = {
  /** Where to land after login (validated to an internal path). */
  redirectTo?: string
}

type FieldErrors = {
  email?: string
  password?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] })
      return
    }
    setFieldErrors({})

    setPending(true)
    const { error } = await signIn(parsed.data.email, parsed.data.password)
    setPending(false)

    if (error) {
      setFormError(error)
      return
    }
    router.history.push(safeInternalPath(redirectTo))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormAlert message={formError} /> : null}

      <FormField id="email" label="Email" error={fieldErrors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField id="password" label="Password" error={fieldErrors.password}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          placeholder="Your password"
        />
      </FormField>

      <div className="-mt-1 text-right">
        <Link
          to="/auth/forgot-password"
          className="rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton pending={pending} pendingLabel="Signing you in…">
        Continue
      </SubmitButton>
    </form>
  )
}
