import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useAuth } from '../hooks/use-auth'
import { signupSchema } from '../validation/schemas'
import { FormField } from './form-field'
import { FormAlert } from './form-alert'
import { PasswordInput } from './password-input'
import { SubmitButton } from './submit-button'

type FieldErrors = {
  displayName?: string
  email?: string
  password?: string
}

export function SignupForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = signupSchema.safeParse({ displayName, email, password })
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({
        displayName: errors.displayName?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
      })
      return
    }
    setFieldErrors({})

    setPending(true)
    const { error, needsVerification } = await signUp(parsed.data)
    setPending(false)

    if (error) {
      setFormError(error)
      return
    }

    if (needsVerification) {
      void navigate({
        to: '/auth/verify-email',
        search: { email: parsed.data.email },
      })
      return
    }

    // Confirmation disabled on the project → session is live; head in.
    toast.success('You’re in. Let’s find the first trap your mind falls for.')
    void navigate({ to: '/dashboard' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormAlert message={formError} /> : null}

      <FormField id="displayName" label="What should we call you?" error={fieldErrors.displayName}>
        <Input
          id="displayName"
          type="text"
          autoComplete="nickname"
          autoFocus
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.displayName)}
          aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
          placeholder="Your name"
        />
      </FormField>

      <FormField id="email" label="Email" error={fieldErrors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={fieldErrors.password}
        hint="At least 8 characters."
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? 'password-error' : 'password-hint'
          }
          placeholder="Create a password"
        />
      </FormField>

      <SubmitButton pending={pending} pendingLabel="Creating your account…">
        Start training
      </SubmitButton>
    </form>
  )
}
