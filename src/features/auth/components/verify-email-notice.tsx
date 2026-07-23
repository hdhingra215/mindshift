import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { MailCheck, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/use-auth'

type VerifyEmailNoticeProps = {
  /** Email the confirmation was sent to (from signup), if known. */
  email?: string
}

const RESEND_COOLDOWN_SECONDS = 30

/**
 * Post-signup notice + confirmation landing. Two states:
 * - Not yet verified → "check your inbox", with a rate-limited resend.
 * - Verified in this tab (link opened here → session detected) → success and a
 *   clear way forward.
 */
export function VerifyEmailNotice({ email }: VerifyEmailNoticeProps) {
  const { status, resendVerification } = useAuth()
  const navigate = useNavigate()
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  if (status === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-5 text-center" aria-live="polite">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your email’s confirmed. Let’s find the first trap your mind falls for.
        </p>
        <Button size="lg" className="w-full" onClick={() => void navigate({ to: '/dashboard' })}>
          Enter MindShift
        </Button>
      </div>
    )
  }

  async function handleResend() {
    if (!email || cooldown > 0 || resending) return
    setResending(true)
    const { error } = await resendVerification(email)
    setResending(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Sent again — check your inbox in a moment.')
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <MailCheck className="size-6" aria-hidden="true" />
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {email ? (
          <>
            We’ve sent a confirmation link to{' '}
            <span className="text-foreground">{email}</span>. Open it to finish
            setting up — then you’re in.
          </>
        ) : (
          <>Check your inbox for a confirmation link to finish setting up your account.</>
        )}
      </p>

      {email ? (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          aria-busy={resending}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
        </Button>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Already confirmed?{' '}
        <Link
          to="/auth/login"
          className="rounded-md font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
