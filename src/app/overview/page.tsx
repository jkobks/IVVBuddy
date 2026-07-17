import { TASKS } from '@/lib/tasks'
import { BUDDY_MESSAGES } from '@/lib/constants'
import type { TriggerType } from '@/types'

const TRIGGERS: {
  type: TriggerType
  title: string
  scope: 'Task-übergreifend' | 'Pro Task'
  condition: string
  detail: string
  note?: string
  reasoning: string
  reasoningCaveat?: string
}[] = [
  {
    type: 'top3_bias',
    title: 'Top-3 Bias',
    scope: 'Task-übergreifend',
    condition: 'Mindestens 2 Klicks insgesamt, und alle bisherigen Klicks waren auf Rang 1-3',
    detail: 'clickHistory.length >= 2 && clickHistory.every(c => c.rank <= 3)',
    reasoning: 'Nutzer verlassen sich übermäßig auf die obersten Ränge als kognitive Abkürzung (Position Bias). Rieh (2002) zeigt, dass Ranking-Position die Selektionsentscheidung beeinflusst; das Aufbrechen dieses Musters fördert breitere Informationsbetrachtung.',
  },
  {
    type: 'query_stagnation',
    title: 'Query-Stagnation',
    scope: 'Task-übergreifend',
    condition: 'Letzte 2 Queries sind ≥ 50 % ähnlich (Jaccard-Ähnlichkeit) — session-weit gezählt, aber nur wenn beide aus derselben Task stammen',
    detail: 'last.taskPosition === prev.taskPosition && jaccardSimilarity(last, prev) ≥ 0.5',
    note: 'Jaccard misst den Wortüberlapp zweier Texte: |Schnittmenge| ÷ |Vereinigung| der Wörter. Beispiel: "kollagen falten studie" vs. "kollagen falten forschung" → gemeinsame Wörter {kollagen, falten}, alle Wörter {kollagen, falten, studie, forschung} → Jaccard = 2/4 = 0,5 (Trigger). "kollagen studie" vs. "apfelessig abnehmen" → 0/4 = 0,0 (kein Trigger). Ab 0,5 gilt die Query als zu ähnlich zur vorherigen.',
    reasoning: 'Wiederholtes Suchen mit minimal variierten Begriffen deutet auf fehlende Reformulierungsstrategie hin. Harvey et al. (2015) zeigen, dass effektive Sucher ihr Vokabular variieren und erweitern.',
  },
  {
    type: 'single_domain',
    title: 'Single Domain',
    scope: 'Task-übergreifend',
    condition: 'Mindestens 3 Klicks insgesamt, und die häufigste Domain macht ≥ 70 % aller Klicks aus',
    detail: 'gesamtKlicks >= 3 && (maxKlicksEinerDomain / gesamtKlicks) >= 0.7',
    reasoning: 'Ausschließliche bzw. dominante Nutzung einer Quellendomäne widerspricht dem Prinzip des lateral reading und erhöht Einseitigkeit. Das Vergleichen mehrerer Quellen ist ein Kernmerkmal kompetenter Informationsbewertung (vgl. Bink et al. 2026, Tip 4). Einseitige Quellennutzung zeigt sich oft erst über mehrere Suchen hinweg, daher task-übergreifend.',
  },
  {
    type: 'quick_decision',
    title: 'Schnellentscheidung',
    scope: 'Pro Task',
    condition: 'Beim Öffnen des Antwortformulars: weniger als 45 s seit Task-Start ODER höchstens 1 Ergebnis in dieser Task geöffnet',
    detail: '(Date.now() - taskStartTime < 45_000) || (clicksInCurrentTask <= 1)',
    note: 'Evaluation beim Öffnen des Formulars (nicht beim Abschicken) — damit der Nutzer nach dem Buddy-Hinweis zurückgehen und weitersuchen kann. Geht er zurück ("Abbrechen"), wird das als answer_cancel geloggt. So lässt sich auswerten: Hat der Buddy jemanden dazu gebracht, doch nochmal zu suchen?',
    reasoning: 'Vorzeitige/oberflächliche Entscheidungen nach zu kurzer Zeit ODER zu wenig Quellen deuten auf heuristikgetriebenes statt reflektiertes Suchen hin. Die Intervention beim Öffnen des Antwortformulars gibt dem Nutzer die Möglichkeit, die Entscheidung zu überdenken (vgl. Dual-Process-Theorie; das answer_cancel-Maß erfasst, ob dies gelingt).',
  },
  {
    type: 'struggling',
    title: 'Struggling',
    scope: 'Task-übergreifend',
    condition: '2 Bounces: Dwell-Zeit < 5 s nach Klick, gezählt über die gesamte Session',
    detail: 'bounceCount ≥ 2 (dwell < 5 s pro Klick)',
    reasoning: 'Schnelles Zurückspringen von Ergebnissen (kurze Dwell-Zeit) ohne Erfolg signalisiert Struggling statt zielgerichtetem Explorieren. Hassan et al. (2014) unterscheiden zwischen "struggling" und "exploring" in Suchsessions.',
    reasoningCaveat: 'DOI dieser Quelle muss noch verifiziert werden.',
  },
  {
    type: 'snippet_only',
    title: 'Snippet-only',
    scope: 'Pro Task',
    condition: 'In der aktuellen Task: 3+ Queries abgeschickt, aber 0 Klicks',
    detail: 'taskQueryCount >= 3 && taskClickCount === 0',
    reasoning: 'Ausschließliches Lesen von Snippets ohne Öffnen der Originalseite führt zu oberflächlichem Verständnis, da Snippets ein unvollständiges Bild geben können. Reaktive Variante zu Bink et al. (2026), Tip 3.',
  },
  {
    type: 'no_refinement',
    title: 'Keine Begriffsverfeinerung',
    scope: 'Task-übergreifend',
    condition: 'Die letzten 2 abgeschickten Queries (session-weit) bestehen beide aus ≤ 2 Wörtern',
    detail: 'letzteZweiQueries.length === 2 && letzteZweiQueries.every(q => wordCount(q) <= 2)',
    reasoning: 'Durchgehend sehr kurze Queries (≤ 2 Wörter) deuten auf fehlende Spezifizierung hin. Harvey et al. (2015) zeigen, dass Experten-Queries tendenziell länger und spezifischer sind; Elsweiler (2026) rahmt dies als Boosting-Ansatz.',
  },
]

function SpeechBubble({ message }: { message: string }) {
  return (
    <div className="relative inline-block max-w-xs">
      <div className="bg-white rounded-2xl shadow border border-gray-200 px-4 py-3 text-sm text-gray-700 leading-relaxed">
        {message}
      </div>
      <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
    </div>
  )
}

function FlowStep({ number, label, sub, highlight }: { number: string; label: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${highlight ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{number}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IVV — Studienübersicht</h1>
          <p className="text-sm text-gray-500 mt-1">Informationsverhalten & Verzerrungen · Between-subjects (Condition) × Within-subjects (Task)</p>
        </div>

        {/* Design */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Studiendesign</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-medium mb-1">Bedingung: BUDDY</p>
              <p className="text-sm text-blue-900">Animierter Search Buddy gibt kontextsensitives Feedback bei verhaltensbasierten Triggern.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Bedingung: CONTROL</p>
              <p className="text-sm text-gray-700">Identische Oberfläche ohne Buddy-Feedback. Trigger werden im Hintergrund geloggt.</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Condition wird zufällig bei Session-Start zugewiesen (50/50) und bleibt über alle 4 Tasks konstant.
          </div>
        </section>

        {/* Flow */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Ablauf pro Teilnehmer</h2>
          <div className="space-y-2">
            <FlowStep number="S" label="Session-Start" sub="Condition zuweisen · Task-Reihenfolge shuffeln · in sessionStorage speichern" highlight />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <FlowStep number={String(i)} label={`Task ${i} von 4`} sub="Suchinterface · Trigger-Erkennung läuft · max. 3 Interventionen pro Task" highlight />
                {i < 4 && (
                  <FlowStep number="→" label="Zwischenseite" sub="Bestätigung + Vorschau der nächsten Aufgabe" />
                )}
              </div>
            ))}
            <FlowStep number="✓" label="Abschlussseite" sub='"Vielen Dank!" — alle 4 Antworten gespeichert' />
          </div>
        </section>

        {/* Tasks */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Die 4 Tasks</h2>
          <p className="text-xs text-gray-500">Reihenfolge wird pro Person zufällig gemischt (Fisher-Yates).</p>
          <div className="space-y-3">
            {TASKS.map((task, i) => (
              <div key={task.id} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Task {i + 1} · ID: {task.id}</p>
                <p className="text-sm text-gray-700 mb-1">{task.scenario}</p>
                <p className="text-sm font-semibold text-gray-900">{task.question}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interventions rules */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Interventions-Regeln</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Max. Interventionen', value: '3', sub: 'angezeigt pro Task' },
              { label: 'Pro Trigger', value: '1×', sub: 'pro Task, kann in jedem Task erneut feuern' },
              { label: 'Cooldown', value: '20 s', sub: 'zwischen zwei angezeigten Interventionen' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-1">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-2">
            <p className="text-xs font-medium text-blue-800">Zwei getrennte Historien: Task-übergreifend vs. pro Task</p>
            <p className="text-xs text-blue-700">
              Die meisten Trigger (<code>top3_bias</code>, <code>query_stagnation</code>, <code>single_domain</code>,{' '}
              <code>struggling</code>, <code>no_refinement</code>) zählen <strong>task-übergreifend</strong>: Query-Historie,
              Click-Historie und Bounce-Count akkumulieren über die gesamte Session und resetten bei Task-Wechsel nicht.
              Der Buddy betrachtet damit das gesamte bisherige Suchverhalten einer Person, nicht nur die aktuelle Aufgabe —
              jeder dieser Trigger feuert deshalb maximal einmal pro Session.
            </p>
            <p className="text-xs text-blue-700">
              <code>snippet_only</code> und <code>quick_decision</code> zählen bewusst <strong>pro Task</strong> und resetten
              bei jedem Task-Wechsel: Die 0-Klick-Bedingung von snippet_only würde sonst nach dem allerersten Klick der
              gesamten Session dauerhaft brechen und könnte nie wieder feuern; quick_decision ist an die Startzeit der
              jeweiligen Task gebunden und muss daher pro Task neu bewertet werden.
            </p>
            <p className="text-xs text-blue-700">
              Unverändert für <strong>alle</strong> Trigger — unabhängig von dieser Unterscheidung: das Interventions-Limit
              (max. 3 angezeigte pro Task), die Regel &bdquo;1× pro Trigger pro Task&ldquo; und der 20-Sekunden-Cooldown. Diese
              Zähler leben in <code>BuddyContainer</code>, das bei jedem Task-Wechsel neu gemountet wird (<code>key=&#123;taskIndex&#125;</code>),
              während die task-übergreifende Historie in der übergeordneten <code>SearchPage</code>-Komponente lebt, die
              über die ganze Session bestehen bleibt.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-1">
            <p className="text-xs font-medium text-green-800">Begründung für Limit + Cooldown</p>
            <p className="text-xs text-green-800 leading-relaxed">
              Das Limit von 3 Interventionen pro Task und der 20-Sekunden-Cooldown verhindern &bdquo;Overprompting&ldquo;.
              Mudrick et al. zeigen, dass eine hohe Interventionsfrequenz eines pädagogischen Agenten Langeweile
              vorhersagt und die Autonomie des Nutzers untergräbt.
              <span className="text-green-600"> (DOI dieser Quelle muss noch verifiziert werden.)</span>
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Trigger, die wegen Limit oder Cooldown nicht angezeigt werden, werden trotzdem mit <code>was_shown=false</code>,
            {' '}<code>trigger_type</code> und <code>timestamp</code> geloggt — genau wie in der Control-Gruppe, wo alle 7
            Trigger-Bedingungen kontinuierlich ausgewertet und geloggt (<code>was_shown=false</code>), aber nie angezeigt werden.
          </p>
        </section>

        {/* Triggers */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Die 7 Trigger</h2>
          <div className="space-y-6">
            {TRIGGERS.map((t, i) => (
              <div key={t.type} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-gray-400 font-medium">Trigger {i + 1} · <code className="bg-gray-100 px-1 rounded">{t.type}</code></p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.scope === 'Task-übergreifend' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t.scope}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 mt-0.5">{t.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{t.condition}</p>
                  <code className="text-xs text-gray-400 mt-1 block">{t.detail}</code>
                </div>
                {t.note && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-800 leading-relaxed">{t.note}</p>
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-green-800 mb-1">Wissenschaftliche Begründung</p>
                  <p className="text-xs text-green-800 leading-relaxed">
                    {t.reasoning}
                    {t.reasoningCaveat && <span className="text-green-600"> ({t.reasoningCaveat})</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Buddy-Nachricht:</p>
                  <SpeechBubble message={BUDDY_MESSAGES[t.type]} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data model */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Datenmodell (Supabase)</h2>
          <div className="space-y-2">
            {[
              { table: 'sessions', fields: 'id, condition, task_order[ ], start_time, end_time' },
              { table: 'task_sessions', fields: 'session_id, task_id, task_position, task_start_time, task_end_time' },
              { table: 'queries', fields: 'session_id, task_id, task_position, query_text, word_count, timestamp' },
              { table: 'clicks', fields: 'session_id, task_id, task_position, url, domain, rank, dwell_time_seconds, timestamp' },
              { table: 'answers', fields: 'session_id, task_id, task_position, answer_text, timestamp' },
              { table: 'interventions', fields: 'session_id, task_id, task_position, trigger_type, was_shown, message_text, was_dynamic, generation_time_ms, timestamp' },
            ].map(row => (
              <div key={row.table} className="flex gap-3 items-baseline">
                <code className="text-xs font-bold text-blue-700 w-32 shrink-0">{row.table}</code>
                <p className="text-xs text-gray-500">{row.fields}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 pt-2">CSV-Export: 4 Zeilen pro Person (eine pro Task-Durchlauf) · Spalte <code>task_position</code> ermöglicht Fatigue-Analyse</p>
        </section>

      </div>
    </div>
  )
}
