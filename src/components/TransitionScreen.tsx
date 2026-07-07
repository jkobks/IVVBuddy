'use client'
import type { Task } from '@/lib/tasks'

interface Props {
  completedPosition: number  // 1-indexed position of the task just finished
  totalTasks: number
  nextTask: Task
  nextPosition: number
  onContinue: () => void
}

export function TransitionScreen({ completedPosition, totalTasks, nextTask, nextPosition, onContinue }: Props) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">
            Aufgabe {completedPosition} von {totalTasks} abgeschlossen
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Gut gemacht! Weiter zur nächsten Aufgabe.
          </h2>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 text-left">
            <p className="text-xs text-blue-500 font-medium mb-1">Aufgabe {nextPosition}</p>
            <p className="text-sm text-blue-800 mb-1">{nextTask.scenario}</p>
            <p className="text-sm font-semibold text-blue-900">{nextTask.question}</p>
          </div>
          <button
            onClick={onContinue}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Aufgabe starten
          </button>
        </div>
      </div>
    </main>
  )
}
