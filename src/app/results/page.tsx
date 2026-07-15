import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getTaskById } from '@/lib/tasks'
import type { TriggerType } from '@/types'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  condition: string
  task_order: string[]
  start_time: string
  end_time: string | null
}

interface TaskSessionRow {
  session_id: string
  task_id: string
  task_position: number
  task_start_time: string
  task_end_time: string | null
}

interface QueryRow {
  session_id: string
  task_id: string | null
  query_text: string
  word_count: number | null
  timestamp: string
}

interface ClickRow {
  session_id: string
  task_id: string | null
  url: string
  domain: string
  rank: number
  dwell_time_seconds: number | null
  timestamp: string
}

interface AnswerRow {
  session_id: string
  task_id: string | null
  answer_text: string
  timestamp: string
}

interface InterventionRow {
  session_id: string
  task_id: string | null
  trigger_type: TriggerType
  was_shown: boolean
  message_text: string | null
  was_dynamic: boolean
  generation_time_ms: number | null
  timestamp: string
}

interface AnswerCancelRow {
  session_id: string
  task_id: string | null
  timestamp: string
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })
}

function fmtDuration(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return '—'
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms < 0) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function LoginForm({ error }: { error: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form action="/api/results-auth" method="POST" className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm space-y-3">
        <h1 className="font-semibold text-gray-900">Auswertung — Login</h1>
        <input
          type="password"
          name="password"
          placeholder="Passwort"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-600">Falsches Passwort.</p>}
        <button type="submit" className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium">
          Anmelden
        </button>
      </form>
    </div>
  )
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('results_auth')?.value
  const expected = process.env.RESULTS_PASSWORT

  if (!expected || authCookie !== expected) {
    return <LoginForm error={searchParams.error === '1'} />
  }

  const supabase = createAdminSupabaseClient()

  const [sessions, taskSessions, queries, clicks, answers, interventions, answerCancels] = await Promise.all([
    supabase.from('sessions').select('*').order('start_time', { ascending: false }),
    supabase.from('task_sessions').select('*'),
    supabase.from('queries').select('*').order('timestamp', { ascending: true }),
    supabase.from('clicks').select('*').order('timestamp', { ascending: true }),
    supabase.from('answers').select('*').order('timestamp', { ascending: true }),
    supabase.from('interventions').select('*').order('timestamp', { ascending: true }),
    supabase.from('answer_cancels').select('*').order('timestamp', { ascending: true }),
  ])

  const err = sessions.error || taskSessions.error || queries.error || clicks.error || answers.error || interventions.error || answerCancels.error
  if (err) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Fehler beim Laden: {err.message}
        </div>
      </div>
    )
  }

  const sessionRows = (sessions.data ?? []) as SessionRow[]
  const taskSessionRows = (taskSessions.data ?? []) as TaskSessionRow[]
  const queryRows = (queries.data ?? []) as QueryRow[]
  const clickRows = (clicks.data ?? []) as ClickRow[]
  const answerRows = (answers.data ?? []) as AnswerRow[]
  const interventionRows = (interventions.data ?? []) as InterventionRow[]
  const cancelRows = (answerCancels.data ?? []) as AnswerCancelRow[]

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auswertung</h1>
          <p className="text-sm text-gray-500 mt-1">{sessionRows.length} Session(s)</p>
        </div>

        {sessionRows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
            Noch keine Sessions vorhanden.
          </div>
        )}

        {sessionRows.map(session => {
          const sessionTaskSessions = taskSessionRows.filter(t => t.session_id === session.id)
          const orderedTaskIds = session.task_order?.length
            ? session.task_order
            : sessionTaskSessions.map(t => t.task_id)

          return (
            <div key={session.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    session.condition === 'buddy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {session.condition}
                </span>
                <code className="text-xs text-gray-400">{session.id.slice(0, 8)}</code>
                <span className="text-xs text-gray-500">{fmtTime(session.start_time)}</span>
                <span className="text-xs text-gray-400">→ Dauer gesamt: {fmtDuration(session.start_time, session.end_time)}</span>
                {!session.end_time && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">läuft / abgebrochen</span>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {orderedTaskIds.map((taskId, i) => {
                  const ts = sessionTaskSessions.find(t => t.task_id === taskId)
                  const task = getTaskById(taskId)
                  const tQueries = queryRows.filter(q => q.session_id === session.id && q.task_id === taskId)
                  const tClicks = clickRows.filter(c => c.session_id === session.id && c.task_id === taskId)
                  const tAnswer = answerRows.find(a => a.session_id === session.id && a.task_id === taskId)
                  const tInterventions = interventionRows.filter(iv => iv.session_id === session.id && iv.task_id === taskId)
                  const tCancels = cancelRows.filter(c => c.session_id === session.id && c.task_id === taskId)

                  return (
                    <div key={taskId} className="p-5 space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-gray-400">Task {i + 1}</span>
                        <span className="text-sm font-semibold text-gray-900">{task?.question ?? taskId}</span>
                        <span className="text-xs text-gray-400 ml-auto">{fmtDuration(ts?.task_start_time ?? null, ts?.task_end_time ?? null)}</span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Queries ({tQueries.length})</p>
                          <ul className="space-y-1">
                            {tQueries.map((q, qi) => (
                              <li key={qi} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                                {q.query_text} <span className="text-gray-400">({q.word_count ?? '?'} Wörter)</span>
                              </li>
                            ))}
                            {tQueries.length === 0 && <li className="text-xs text-gray-400">—</li>}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Klicks ({tClicks.length})</p>
                          <ul className="space-y-1">
                            {tClicks.map((c, ci) => (
                              <li key={ci} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                                <span className="font-medium">{c.domain}</span> · Rang {c.rank}
                                {c.dwell_time_seconds != null && <span className="text-gray-400"> · {c.dwell_time_seconds.toFixed(1)}s</span>}
                              </li>
                            ))}
                            {tClicks.length === 0 && <li className="text-xs text-gray-400">—</li>}
                          </ul>
                        </div>
                      </div>

                      {tInterventions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Interventionen</p>
                          <ul className="space-y-1">
                            {tInterventions.map((iv, ivi) => (
                              <li
                                key={ivi}
                                className={`text-xs rounded px-2 py-1 ${
                                  iv.was_shown ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'
                                }`}
                              >
                                <code>{iv.trigger_type}</code> · {iv.was_shown ? 'angezeigt' : 'nicht angezeigt'}
                                {iv.was_dynamic && <span> · LLM ({iv.generation_time_ms?.toFixed(0)}ms)</span>}
                                {iv.message_text && <div className="mt-0.5 italic">&bdquo;{iv.message_text}&ldquo;</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Antwort {tCancels.length > 0 && <span className="text-amber-600">({tCancels.length}× abgebrochen zuvor)</span>}
                        </p>
                        <p className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">{tAnswer?.answer_text ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
