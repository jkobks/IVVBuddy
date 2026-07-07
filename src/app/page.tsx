'use client'
import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { TaskSearchView } from '@/components/TaskSearchView'
import { TransitionScreen } from '@/components/TransitionScreen'
import { DoneScreen } from '@/components/DoneScreen'
import { getTaskById, TASKS } from '@/lib/tasks'

type TaskPhase = 'searching' | 'transition' | 'done'

export default function SearchPage() {
  const { sessionId, condition, taskOrder, taskIndex, advanceTask, ready } = useSession()
  const [taskPhase, setTaskPhase] = useState<TaskPhase>('searching')

  if (!ready) return null

  const currentTask = getTaskById(taskOrder[taskIndex])
  if (!currentTask) return null

  const taskPosition = taskIndex + 1   // 1-indexed
  const isLastTask = taskIndex === TASKS.length - 1

  if (taskPhase === 'done') {
    return <DoneScreen />
  }

  if (taskPhase === 'transition') {
    const nextTask = getTaskById(taskOrder[taskIndex + 1])!
    return (
      <TransitionScreen
        completedPosition={taskPosition}
        totalTasks={TASKS.length}
        nextTask={nextTask}
        nextPosition={taskPosition + 1}
        onContinue={() => {
          advanceTask()
          setTaskPhase('searching')
        }}
      />
    )
  }

  return (
    <TaskSearchView
      key={taskIndex}
      task={currentTask}
      taskPosition={taskPosition}
      sessionId={sessionId}
      condition={condition}
      isLastTask={isLastTask}
      onTaskComplete={() => {
        if (isLastTask) setTaskPhase('done')
        else setTaskPhase('transition')
      }}
    />
  )
}
