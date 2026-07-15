import { createClient } from '@supabase/supabase-js'

// Server-only client using the service_role key. Never import this from a
// client component — RESULTS pages only, guarded by password auth.
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin env vars not set')
  }
  return createClient(url, key)
}
