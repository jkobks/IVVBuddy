import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// Server-balanced condition assignment: counts existing sessions per condition and
// assigns whichever is underrepresented (random on a tie), instead of a client-side
// 50/50 coin flip that can drift over a small sample.
// Must stay dynamic: without this, Next.js can statically cache the response at
// build/deploy time and keep serving the same condition to every new session.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

    const [buddy, control] = await Promise.all([
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('condition', 'buddy'),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('condition', 'control'),
    ])

    if (buddy.error || control.error) {
      throw buddy.error ?? control.error
    }

    const buddyCount = buddy.count ?? 0
    const controlCount = control.count ?? 0

    let condition: 'buddy' | 'control'
    if (buddyCount < controlCount) condition = 'buddy'
    else if (controlCount < buddyCount) condition = 'control'
    else condition = Math.random() < 0.5 ? 'buddy' : 'control'

    return Response.json({ condition, _debugBuddyCount: buddyCount, _debugControlCount: controlCount })
  } catch (err) {
    console.error('[assign-condition]', err)
    return Response.json({ condition: null, _debugError: String(err) }, { status: 500 })
  }
}
