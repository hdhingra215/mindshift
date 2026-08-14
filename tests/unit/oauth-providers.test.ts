import { describe, expect, it } from 'vitest'
import {
  OAUTH_PROVIDER_LABELS,
  OAUTH_PROVIDER_ORDER,
  type OAuthProvider,
} from '@/features/auth/lib/oauth-providers'
import { toFriendlyOAuthError } from '@/features/auth/lib/auth-errors'

/**
 * The provider registry is the one place that decides which OAuth buttons the
 * auth screens offer. A provider listed without a label, or a label without a
 * slot in the render order, ships a broken button — cheap to assert, and the
 * failure mode is silent otherwise.
 *
 * `toFriendlyOAuthError` is covered here because it is the provider-facing half
 * of the flow's error handling and had no test before GitHub was added.
 */
describe('OAuth provider registry', () => {
  it('gives every provider in the render order a human label', () => {
    for (const provider of OAUTH_PROVIDER_ORDER) {
      expect(OAUTH_PROVIDER_LABELS[provider]).toBeTruthy()
    }
  })

  it('renders every labelled provider — no provider defined but hidden', () => {
    const labelled = Object.keys(OAUTH_PROVIDER_LABELS) as OAuthProvider[]
    expect([...OAUTH_PROVIDER_ORDER].sort()).toEqual(labelled.sort())
  })

  it('offers Google and GitHub, Google first', () => {
    expect(OAUTH_PROVIDER_ORDER).toEqual(['google', 'github'])
    expect(OAUTH_PROVIDER_LABELS.google).toBe('Google')
    expect(OAUTH_PROVIDER_LABELS.github).toBe('GitHub')
  })
})

describe('toFriendlyOAuthError', () => {
  it('reads a cancelled consent as a non-failure', () => {
    expect(toFriendlyOAuthError('access_denied')).toMatch(/cancelled/i)
    expect(toFriendlyOAuthError('user_cancelled_login')).toMatch(/cancelled/i)
  })

  it('falls back to a calm generic line for other provider codes', () => {
    expect(toFriendlyOAuthError('server_error')).toMatch(/didn’t complete/i)
  })

  /**
   * The callback URL carries the error code but not the provider that produced
   * it, so the copy must not name one — a wrong name is worse than none.
   */
  it('never names a specific provider', () => {
    for (const code of ['access_denied', 'server_error']) {
      expect(toFriendlyOAuthError(code)).not.toMatch(/google|github/i)
    }
  })

  it('always offers the email form as a way forward', () => {
    for (const code of ['access_denied', 'server_error']) {
      expect(toFriendlyOAuthError(code)).toMatch(/email below/i)
    }
  })
})
