/**
 * The OAuth providers offered on the auth screens.
 *
 * Everything else in the round trip is already provider-neutral — the callback
 * URL (`oauthCallbackUrl`), the `?redirect=` intent, the route guards, and the
 * PKCE exchange are identical whichever provider a player picks. So a provider
 * is defined entirely by these two values plus its brand mark, and adding a
 * third is a label here and a mark in `components/oauth-provider-buttons`.
 */
export type OAuthProvider = 'google' | 'github'

/**
 * Provider names as players read them. A `Record` rather than a lookup helper:
 * adding a member to `OAuthProvider` without a label is a build error, not a
 * button that renders its own id.
 */
export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
}

/**
 * Render order on the auth screens. Google leads: it is the established path,
 * so it stays the primary alternative to the email form.
 */
export const OAUTH_PROVIDER_ORDER: readonly OAuthProvider[] = ['google', 'github']
