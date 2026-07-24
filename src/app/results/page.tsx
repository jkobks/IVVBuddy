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
  reloaded: boolean
  consent_given: boolean
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

interface AnswerOpenRow {
  session_id: string
  task_id: string | null
  time_to_open_s: number
  timestamp: string
}

const TRIGGER_TYPES: TriggerType[] = [
  'top3_bias',
  'query_stagnation',
  'single_domain',
  'quick_decision',
  'struggling',
  'snippet_only',
  'no_refinement',
]

const REQUIRED_TASK_COUNT = 4

function isSessionComplete(session: SessionRow, answerRows: AnswerRow[]) {
  const requiredTasks = session.task_order?.length || REQUIRED_TASK_COUNT
  const answeredTaskIds = new Set(
    answerRows.filter(a => a.session_id === session.id && a.task_id).map(a => a.task_id)
  )
  return answeredTaskIds.size >= requiredTasks
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

function fmtSeconds(s: number | null) {
  if (s == null) return '—'
  return s < 60 ? `${s.toFixed(0)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

// A user can cancel and reopen the answer form, producing multiple answer_opens rows
// per task — only the first reflects the initial decision time (what quick_decision checks).
function firstAnswerOpen(rows: AnswerOpenRow[], sessionId: string, taskId: string) {
  return rows
    .filter(a => a.session_id === sessionId && a.task_id === taskId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
}

function computeStats(
  sessionRows: SessionRow[],
  taskSessionRows: TaskSessionRow[],
  queryRows: QueryRow[],
  clickRows: ClickRow[],
  interventionRows: InterventionRow[],
  cancelRows: AnswerCancelRow[],
  answerRows: AnswerRow[],
  answerOpenRows: AnswerOpenRow[]
) {
  const conditions = ['buddy', 'control'] as const

  const byCondition = conditions.map(condition => {
    const sessionsInCondition = sessionRows.filter(s => s.condition === condition)
    const ids = new Set(sessionsInCondition.map(s => s.id))
    const completed = sessionsInCondition.filter(s => isSessionComplete(s, answerRows))
    const taskCount = taskSessionRows.filter(t => ids.has(t.session_id)).length || 1

    return {
      condition,
      n: sessionsInCondition.length,
      completed: completed.length,
      avgSessionDurationSec: avg(
        completed
          .filter(s => s.end_time)
          .map(s => (new Date(s.end_time!).getTime() - new Date(s.start_time).getTime()) / 1000)
      ),
      avgQueriesPerTask: queryRows.filter(q => ids.has(q.session_id)).length / taskCount,
      avgClicksPerTask: clickRows.filter(c => ids.has(c.session_id)).length / taskCount,
      avgDwellSeconds: avg(
        clickRows.filter(c => ids.has(c.session_id) && c.dwell_time_seconds != null).map(c => c.dwell_time_seconds!)
      ),
      avgAnswerTimeSec: avg(
        taskSessionRows
          .filter(t => ids.has(t.session_id))
          .map(t => {
            const a = answerRows.find(a => a.session_id === t.session_id && a.task_id === t.task_id)
            return a ? (new Date(a.timestamp).getTime() - new Date(t.task_start_time).getTime()) / 1000 : null
          })
          .filter((s): s is number => s != null)
      ),
      avgTimeToAnswerOpenSec: avg(
        taskSessionRows
          .filter(t => ids.has(t.session_id))
          .map(t => firstAnswerOpen(answerOpenRows, t.session_id, t.task_id)?.time_to_open_s)
          .filter((s): s is number => s != null)
      ),
      avgCancelsPerSession: cancelRows.filter(c => ids.has(c.session_id)).length / (sessionsInCondition.length || 1),
    }
  })

  const triggerStats = TRIGGER_TYPES.map(type => {
    const rows = interventionRows.filter(iv => iv.trigger_type === type)
    return {
      type,
      total: rows.length,
      shown: rows.filter(r => r.was_shown).length,
      buddy: rows.filter(r => sessionRows.find(s => s.id === r.session_id)?.condition === 'buddy').length,
      control: rows.filter(r => sessionRows.find(s => s.id === r.session_id)?.condition === 'control').length,
    }
  })

  return {
    total: sessionRows.length,
    completed: sessionRows.filter(s => isSessionComplete(s, answerRows)).length,
    byCondition,
    triggerStats,
  }
}

function StatsSection({
  stats,
  reloadedCount,
  noConsentCount,
}: {
  stats: ReturnType<typeof computeStats>
  reloadedCount: number
  noConsentCount: number
}) {
  const dropoutRate = stats.total ? Math.round(((stats.total - stats.completed) / stats.total) * 100) : 0

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
      <h2 className="font-semibold text-gray-900">Übersicht</h2>
      {noConsentCount > 0 && (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {noConsentCount} Seitenaufruf{noConsentCount === 1 ? '' : 'e'} ohne erteilten Consent wurden aus Teilnehmerzahl,
          Stats und der Einzelansicht ausgeschlossen (session_start wird beim Laden der Seite geloggt, noch vor der
          Consent-Abfrage).
        </p>
      )}
      {reloadedCount > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {reloadedCount} Session{reloadedCount === 1 ? '' : 's'} mit Reload wurden aus den folgenden Aggregat-Stats
          ausgeschlossen (Trigger-Historie/Timer nach Reload nicht mehr verlässlich) — unten in der Einzelansicht aber
          weiterhin mit &bdquo;reloaded&ldquo;-Badge sichtbar.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Teilnehmer gesamt</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-1">abgeschlossen</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{dropoutRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Dropout-Rate</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Buddy vs. Control</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1 pr-3 font-medium"></th>
                <th className="py-1 pr-3 font-medium">n</th>
                <th className="py-1 pr-3 font-medium">abgeschlossen</th>
                <th className="py-1 pr-3 font-medium">Ø Dauer/Session</th>
                <th className="py-1 pr-3 font-medium">Ø Queries/Task</th>
                <th className="py-1 pr-3 font-medium">Ø Klicks/Task</th>
                <th className="py-1 pr-3 font-medium">Ø Dwell</th>
                <th className="py-1 pr-3 font-medium">Ø bis Formular</th>
                <th className="py-1 pr-3 font-medium">Ø Antwortzeit</th>
                <th className="py-1 font-medium">Ø Abbrüche/Session</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCondition.map(c => (
                <tr key={c.condition} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3">
                    <span className={`font-semibold ${c.condition === 'buddy' ? 'text-blue-700' : 'text-gray-700'}`}>
                      {c.condition}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-gray-700">{c.n}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{c.completed}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{fmtSeconds(c.avgSessionDurationSec)}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{c.avgQueriesPerTask.toFixed(1)}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{c.avgClicksPerTask.toFixed(1)}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{fmtSeconds(c.avgDwellSeconds)}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{fmtSeconds(c.avgTimeToAnswerOpenSec)}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{fmtSeconds(c.avgAnswerTimeSec)}</td>
                  <td className="py-1.5 text-gray-700">{c.avgCancelsPerSession.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Trigger-Häufigkeit</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1 pr-3 font-medium">Trigger</th>
                <th className="py-1 pr-3 font-medium">gesamt</th>
                <th className="py-1 pr-3 font-medium">angezeigt</th>
                <th className="py-1 pr-3 font-medium">buddy</th>
                <th className="py-1 font-medium">control</th>
              </tr>
            </thead>
            <tbody>
              {stats.triggerStats.map(t => (
                <tr key={t.type} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3"><code className="text-gray-700">{t.type}</code></td>
                  <td className="py-1.5 pr-3 text-gray-700">{t.total}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{t.shown}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{t.buddy}</td>
                  <td className="py-1.5 text-gray-700">{t.control}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  )
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Berlin' })
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

  const [sessions, taskSessions, queries, clicks, answers, interventions, answerCancels, answerOpens] = await Promise.all([
    supabase.from('sessions').select('*').order('start_time', { ascending: false }),
    supabase.from('task_sessions').select('*'),
    supabase.from('queries').select('*').order('timestamp', { ascending: true }),
    supabase.from('clicks').select('*').order('timestamp', { ascending: true }),
    supabase.from('answers').select('*').order('timestamp', { ascending: true }),
    supabase.from('interventions').select('*').order('timestamp', { ascending: true }),
    supabase.from('answer_cancels').select('*').order('timestamp', { ascending: true }),
    supabase.from('answer_opens').select('*').order('timestamp', { ascending: true }),
  ])

  const err = sessions.error || taskSessions.error || queries.error || clicks.error || answers.error || interventions.error || answerCancels.error || answerOpens.error
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
  const answerOpenRows = (answerOpens.data ?? []) as AnswerOpenRow[]

  // Numbered only among consented sessions, so "Teilnehmer N" lines up with the
  // participant count above — non-consented rows (bounces) get no number, just
  // the "kein Consent" badge below.
  const participantNumberBySessionId = new Map(
    sessionRows
      .filter(s => s.consent_given)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((s, i) => [s.id, i + 1])
  )

  // Sessions without confirmed consent are page loads/bounces, not participants
  // (session_start fires on mount, before the consent screen — see migration 008) —
  // excluded from the participant count and all stats below, still shown (with a
  // badge) in the per-session listing.
  const consentedSessionRows = sessionRows.filter(s => s.consent_given)
  const noConsentCount = sessionRows.length - consentedSessionRows.length

  // Reloaded sessions lost their cross-task trigger history and their quick_decision
  // timer mid-study (see migration 007) — excluded from the aggregate stats below,
  // still shown (with a badge) in the per-session listing.
  const cleanSessionRows = consentedSessionRows.filter(s => !s.reloaded)
  const reloadedCount = consentedSessionRows.length - cleanSessionRows.length

  // The per-session list below only shows real, completed participants —
  // consented sessions still in progress or bounced without consent are
  // covered by the counts/stats above, not listed individually here.
  const displaySessionRows = consentedSessionRows.filter(s => isSessionComplete(s, answerRows))

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auswertung</h1>
            <p className="text-sm text-gray-500 mt-1">
              {consentedSessionRows.length} Teilnehmer
              {noConsentCount > 0 && (
                <span className="text-gray-400"> ({sessionRows.length} Seitenaufrufe insgesamt)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/admin/export"
              className="text-xs font-medium bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
            >
              CSV Export (pro Task)
            </a>
            <a
              href="/api/admin/export-aggregated"
              className="text-xs font-medium bg-gray-100 text-gray-700 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
            >
              CSV Export (aggregiert)
            </a>
          </div>
        </div>

        {sessionRows.length > 0 && (
          <StatsSection
            stats={computeStats(cleanSessionRows, taskSessionRows, queryRows, clickRows, interventionRows, cancelRows, answerRows, answerOpenRows)}
            reloadedCount={reloadedCount}
            noConsentCount={noConsentCount}
          />
        )}

        {displaySessionRows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
            Noch keine abgeschlossenen Teilnehmer vorhanden.
          </div>
        )}

        {displaySessionRows.map(session => {
          const sessionTaskSessions = taskSessionRows.filter(t => t.session_id === session.id)
          const orderedTaskIds = session.task_order?.length
            ? session.task_order
            : sessionTaskSessions.map(t => t.task_id)

          return (
            <div key={session.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-gray-900">
                  Teilnehmer {participantNumberBySessionId.get(session.id)}
                </span>
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
                {session.reloaded && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full" title="Reload im selben Tab erkannt — aus Aggregat-Stats ausgeschlossen">
                    reloaded
                  </span>
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
                  const tAnswerOpen = firstAnswerOpen(answerOpenRows, session.id, taskId)

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
                                {iv.message_text && <div className="mt-0.5 italic">&bdquo;{iv.message_text}&ldquo;</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Antwort {tCancels.length > 0 && <span className="text-amber-600">({tCancels.length}× abgebrochen zuvor)</span>}
                          {tAnswerOpen && (
                            <span className="text-gray-400 font-normal"> · Formular geöffnet nach {fmtSeconds(tAnswerOpen.time_to_open_s)}</span>
                          )}
                          {tAnswer && ts?.task_start_time && (
                            <span className="text-gray-400 font-normal">
                              {' '}· abgeschickt nach {fmtSeconds((new Date(tAnswer.timestamp).getTime() - new Date(ts.task_start_time).getTime()) / 1000)}
                            </span>
                          )}
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
