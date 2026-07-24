import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { computeTaskMetrics, computeAggregatedRows } from '@/lib/task-metrics'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const COLUMNS = [
  'session_id',
  'condition',
  'reloaded',
  'n_tasks',
  'n_valid_tasks',
  'avg_time_on_task_s',
  'avg_answer_time_s',
  'avg_query_count',
  'avg_click_count',
  'avg_unique_domains',
  'avg_top1_click_ratio',
  'avg_query_diversity_mean',
  'avg_interventions_shown',
]

export async function GET() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('results_auth')?.value
  const expected = process.env.RESULTS_PASSWORT
  if (!expected || authCookie !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const [sessions, taskSessions, queries, clicks, answers, interventions] = await Promise.all([
    supabase.from('sessions').select('id, condition, reloaded'),
    supabase.from('task_sessions').select('*'),
    supabase.from('queries').select('session_id, task_id, query_text, timestamp').order('timestamp', { ascending: true }),
    supabase.from('clicks').select('session_id, task_id, domain, rank'),
    supabase.from('answers').select('session_id, task_id, answer_text, timestamp'),
    supabase.from('interventions').select('session_id, task_id, was_shown'),
  ])

  const err = sessions.error || taskSessions.error || queries.error || clicks.error || answers.error || interventions.error
  if (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }

  const sessionRows = sessions.data ?? []
  const taskMetricRows = computeTaskMetrics(
    sessionRows,
    taskSessions.data ?? [],
    queries.data ?? [],
    clicks.data ?? [],
    interventions.data ?? [],
    answers.data ?? []
  )
  const rows = computeAggregatedRows(sessionRows, taskMetricRows)

  const csv = toCsv(rows as unknown as Record<string, unknown>[], COLUMNS)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="search-buddy-export-aggregated.csv"',
    },
  })
}
