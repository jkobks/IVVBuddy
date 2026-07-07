'use client'
import type { Task } from '@/lib/tasks'

interface Props {
  task: Task
  taskPosition: number
  totalTasks: number
}

export function TaskBanner({ task, taskPosition, totalTasks }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 px-4 py-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-blue-500 font-medium mb-1">Aufgabe {taskPosition} von {totalTasks}</p>
        <p className="text-sm text-blue-800 mb-1">{task.scenario}</p>
        <p className="text-sm font-semibold text-blue-900">{task.question}</p>
      </div>
    </div>
  )
}
