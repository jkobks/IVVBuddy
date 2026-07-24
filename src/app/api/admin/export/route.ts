import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { computeTaskMetrics } from '@/lib/task-metrics'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const COLUMNS = [
  'session_id',
  'condition',
  'task_id',
  'task_position',
  'task_start_time',
  'task_end_time',
  'time_on_task_s',
  'answer_time_s',
  'time_to_answer_open_s',
  'query_count',
  'click_count',
  'unique_domains',
  'top1_click_ratio',
  'query_diversity_mean',
  'interventions_shown',
  'answer_text',
  'valid_task',
]

export async function GET() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('results_auth')?.value
  const expected = process.env.RESULTS_PASSWORT
  if (!expected || authCookie !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const [sessions, taskSessions, queries, clicks, answers, interventions, answerOpens] = await Promise.all([
    supabase.from('sessions').select('id, condition, reloaded'),
    supabase.from('task_sessions').select('*'),
    supabase.from('queries').select('session_id, task_id, query_text, timestamp').order('timestamp', { ascending: true }),
    supabase.from('clicks').select('session_id, task_id, domain, rank'),
    supabase.from('answers').select('session_id, task_id, answer_text, timestamp'),
    supabase.from('interventions').select('session_id, task_id, was_shown'),
    supabase.from('answer_opens').select('session_id, task_id, time_to_open_s').order('timestamp', { ascending: true }),
  ])

  const err = sessions.error || taskSessions.error || queries.error || clicks.error || answers.error || interventions.error || answerOpens.error
  if (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }

  const rows = computeTaskMetrics(
    sessions.data ?? [],
    taskSessions.data ?? [],
    queries.data ?? [],
    clicks.data ?? [],
    interventions.data ?? [],
    answers.data ?? [],
    answerOpens.data ?? []
  )

  const csv = toCsv(rows as unknown as Record<string, unknown>[], COLUMNS)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="search-buddy-export-per-task.csv"',
    },
  })
}
