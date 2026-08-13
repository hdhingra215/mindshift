import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  oauthCallbackUrl,
  safeInternalPath,
} from '@/features/auth/lib/redirects'

/**
 * The OAuth callback URL is the one auth value that differs between production
 * and localhost, and getting it wrong strands every Google sign-in. It is built
 * from the live origin — asserted here for both, plus the open-redirect guard
 * that sanitises the `?redirect=` intent carried across the round trip.
 */
function withOrigin(origin: string, run: () => void): void {
  vi.stubGlobal('window', { location: { origin } })
  try {
    run()
  } finally {
    vi.unstubAllGlobals()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('oauthCallbackUrl', () => {
  it('uses the deployed origin in production', () => {
    withOrigin('https://mindshift-theta.vercel.app', () => {
      expect(oauthCallbackUrl()).toBe(
        'https://mindshift-theta.vercel.app/auth/login?redirect=%2Fdashboard',
      )
    })
  })

  it('uses the dev-server origin locally', () => {
    withOrigin('http://localhost:5173', () => {
      expect(oauthCallbackUrl('/play')).toBe(
        'http://localhost:5173/auth/login?redirect=%2Fplay',
      )
    })
  })

  it('drops an external intent rather than carrying it through the provider', () => {
    withOrigin('https://mindshift-theta.vercel.app', () => {
      expect(oauthCallbackUrl('https://evil.example/steal')).toContain(
        'redirect=%2Fdashboard',
      )
    })
  })
})

describe('safeInternalPath', () => {
  it('keeps root-relative paths', () => {
    expect(safeInternalPath('/profile')).toBe('/profile')
  })

  it('rejects absolute and protocol-relative targets', () => {
    expect(safeInternalPath('https://evil.example')).toBe('/dashboard')
    expect(safeInternalPath('//evil.example')).toBe('/dashboard')
  })
})
