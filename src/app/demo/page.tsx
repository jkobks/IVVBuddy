'use client'
import { useState } from 'react'
import { BuddyContainer } from '@/components/buddy/BuddyContainer'
import type { TriggerType } from '@/types'

interface DemoTrigger {
  type: TriggerType
  label: string
  condition: string
}

const DEMO_TRIGGERS: DemoTrigger[] = [
  { type: 'top3_bias', label: 'Top-3 Bias', condition: '≥ 2 Klicks insgesamt, alle auf Rang 1-3 (task-übergreifend)' },
  { type: 'query_stagnation', label: 'Query-Stagnation', condition: 'zwei aufeinanderfolgende Suchanfragen zu ähnlich (Jaccard ≥ 0.5, task-übergreifend)' },
  { type: 'single_domain', label: 'Single Domain', condition: '≥ 3 Klicks insgesamt, ≥ 70% zur selben Domain (task-übergreifend)' },
  { type: 'quick_decision', label: 'Quick Decision', condition: 'Antwortformular < 45s nach Task-Start ODER ≤ 1 Klick in dieser Task (pro Task)' },
  { type: 'struggling', label: 'Struggling / Bounce', condition: '2 Klicks mit Verweildauer < 5s (task-übergreifend)' },
  { type: 'snippet_only', label: 'Snippet-only', condition: '3+ Suchanfragen in dieser Task, aber noch nie geklickt (pro Task)' },
  { type: 'no_refinement', label: 'Fehlende Begriffsverfeinerung', condition: 'letzte 2 Suchanfragen (task-übergreifend) je max. 2 Wörter' },
]

interface LogEntry {
  type: TriggerType
  wasShown: boolean
  messageText: string | null
}

export default function DemoPage() {
  const [active, setActive] = useState<TriggerType | null>(null)
  const [fireKey, setFireKey] = useState(0)
  const [log, setLog] = useState<LogEntry | null>(null)

  function fire(type: TriggerType) {
    setLog(null)
    setActive(type)
    // key change remounts BuddyContainer so its internal MAX_INTERVENTIONS /
    // cooldown / evaluatedTriggers state resets and every trigger can fire on demand.
    setFireKey((k) => k + 1)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900">Buddy-Trigger-Demo</h1>
        <p className="mt-1 text-sm text-gray-600">
          Löst jeden Trigger einzeln aus, unabhängig von den echten Auslösebedingungen — zeigt den
          festen Buddy-Text, der auch im echten Task-Flow angezeigt würde.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DEMO_TRIGGERS.map((trigger) => (
            <button
              key={trigger.type}
              onClick={() => fire(trigger.type)}
              className="text-left rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm transition"
            >
              <div className="font-medium text-gray-900">{trigger.label}</div>
              <div className="mt-1 text-xs text-gray-500">{trigger.condition}</div>
            </button>
          ))}
        </div>

        {log && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <div><span className="text-gray-500">Trigger:</span> {log.type}</div>
            <div><span className="text-gray-500">Angezeigt:</span> {String(log.wasShown)}</div>
            <div className="mt-1"><span className="text-gray-500">Text:</span> {log.messageText}</div>
          </div>
        )}
      </div>

      {active && (
        <BuddyContainer
          key={fireKey}
          condition="buddy"
          latestTrigger={active}
          onTriggerConsumed={() => {}}
          onInterventionFired={(type, wasShown, messageText) => setLog({ type, wasShown, messageText })}
        />
      )}
    </main>
  )
}
