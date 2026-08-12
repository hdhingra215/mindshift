import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Environment and reachability for the live-database harness.
 *
 * ── Why this reads `.env.local` by hand ─────────────────────────────────────
 * Vite only exposes `VITE_`-prefixed variables, and the service-role key is
 * deliberately *not* prefixed (ProjectStatus §12.2 — a `VITE_` secret would be
 * shipped to the browser, and `src/config/env.ts` refuses to start if one
 * appears). Twelve lines of parsing here is cheaper than a dotenv dependency and
 * keeps the secret on the Node side where it belongs.
 *
 * The service-role key is used for exactly two things: creating and deleting the
 * throwaway test player. Every assertion in the harness runs through an
 * anon-key client signed in as that player, because a harness that bypassed RLS
 * would verify the schema and prove nothing about the product.
 */

export type LiveEnv = {
  url: string
  anonKey: string
  serviceRoleKey: string
}

function parseEnvFile(path: string): Record<string, string> {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return {}
  }

  const parsed: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    // Strip one layer of matching quotes; leave everything else verbatim.
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2')

    if (key.length > 0) parsed[key] = value
  }

  return parsed
}

/** Process env wins, so CI can supply credentials without a file on disk. */
function readEnv(): LiveEnv | null {
  const file = parseEnvFile(resolve(process.cwd(), '.env.local'))
  const pick = (key: string): string => process.env[key] ?? file[key] ?? ''

  const url = pick('VITE_SUPABASE_URL')
  const anonKey = pick('VITE_SUPABASE_ANON_KEY')
  const serviceRoleKey = pick('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !anonKey || !serviceRoleKey) return null
  return { url, anonKey, serviceRoleKey }
}

export type LiveStatus =
  | { available: true; env: LiveEnv }
  | { available: false; reason: string }

/**
 * Is there a database to test against right now?
 *
 * Probes PostgREST rather than trusting the config, because the two ways this
 * harness fails to run — missing credentials and a *paused* Supabase project —
 * are indistinguishable from configuration alone. A paused project's hostname
 * stops resolving entirely, which surfaces here as a fetch failure rather than
 * as a mysterious timeout inside the first test.
 */
export async function probeLiveDatabase(): Promise<LiveStatus> {
  const env = readEnv()
  if (!env) {
    return {
      available: false,
      reason:
        'missing credentials — needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`${env.url}/rest/v1/biases?select=slug&limit=1`, {
      headers: { apikey: env.anonKey },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { available: false, reason: `PostgREST returned ${response.status}` }
    }

    return { available: true, env }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      available: false,
      reason: `cannot reach the project (${detail}) — it is most likely paused`,
    }
  } finally {
    clearTimeout(timeout)
  }
}
