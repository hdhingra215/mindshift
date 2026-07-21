import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * Supabase browser client — singleton.
 *
 * Created once at module load and reused everywhere. Uses only the public
 * anon key (safe for the client, gated by Row Level Security). The service
 * role key is never used here and must never reach the browser.
 *
 * The `Database` generic is intentionally omitted for now — generated types
 * are wired in once tables and migrations exist.
 */
export const supabase: SupabaseClient = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
