import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import type { Database } from '@/types/database.types'

/**
 * Supabase browser client — singleton.
 *
 * Created once at module load and reused everywhere. Uses only the public
 * anon key (safe for the client, gated by Row Level Security). The service
 * role key is never used here and must never reach the browser.
 *
 * Typed with the generated `Database` schema, so a column rename now breaks the
 * build instead of returning `undefined` at runtime. Regenerate after every
 * migration:
 *
 *   npx supabase gen types typescript --linked > src/types/database.types.ts
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
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
