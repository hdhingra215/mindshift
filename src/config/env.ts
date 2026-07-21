import { z } from 'zod'

/**
 * Client environment.
 *
 * Validated once, on module load, so the app fails fast with a clear message
 * if configuration is missing or malformed — never at some random call site
 * deep in the app.
 *
 * Only client-safe values live here. Every variable MUST be `VITE_`-prefixed
 * (Vite only exposes those to the browser bundle). Secrets (service role key,
 * AI provider keys) are server-side only and must never appear in this file
 * or carry a `VITE_` prefix.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required'),
})

/**
 * Guardrail: refuse to run if a service-role / secret key was accidentally
 * exposed to the client via a `VITE_` prefix. This never happens in a correct
 * setup — but if it did, the leak would be shipped to every browser.
 */
function assertNoLeakedSecrets(source: Record<string, unknown>): void {
  const forbidden = /SERVICE_ROLE|SECRET/i
  const leaked = Object.keys(source).filter(
    (key) => key.startsWith('VITE_') && forbidden.test(key),
  )

  if (leaked.length > 0) {
    throw new Error(
      `Refusing to start: server-only secret exposed to the client bundle: ${leaked.join(
        ', ',
      )}. Remove the VITE_ prefix and keep secrets server-side.`,
    )
  }
}

function loadEnv(): Readonly<z.infer<typeof envSchema>> {
  assertNoLeakedSecrets(import.meta.env as Record<string, unknown>)

  const parsed = envSchema.safeParse(import.meta.env)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid client environment variables:\n${issues}`)
  }

  return Object.freeze(parsed.data)
}

export const env = loadEnv()

export type Env = typeof env
