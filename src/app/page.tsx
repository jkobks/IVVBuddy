'use client'
import { useRef, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { TaskSearchView } from '@/components/TaskSearchView'
import { TransitionScreen } from '@/components/TransitionScreen'
import { DoneScreen } from '@/components/DoneScreen'
import { getTaskById, TASKS } from '@/lib/tasks'
import type { ClickRecord } from '@/types'

type TaskPhase = 'searching' | 'transition' | 'done'

export default function SearchPage() {
  const { sessionId, condition, taskOrder, taskIndex, advanceTask, ready } = useSession()
  const [taskPhase, setTaskPhase] = useState<TaskPhase>('searching')

  // Accumulated across all 4 tasks — the Buddy sees the full session history
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [clickHistory, setClickHistory] = useState<ClickRecord[]>([])
  const [bounceCount, setBounceCount] = useState(0)
  const bounceCountRef = useRef(0)

  if (!ready) return null

  const currentTask = getTaskById(taskOrder[taskIndex])
  if (!currentTask) return null

  const taskPosition = taskIndex + 1
  const isLastTask = taskIndex === TASKS.length - 1

  if (taskPhase === 'done') return <DoneScreen />

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
      queryHistory={queryHistory}
      setQueryHistory={setQueryHistory}
      clickHistory={clickHistory}
      setClickHistory={setClickHistory}
      bounceCount={bounceCount}
      setBounceCount={setBounceCount}
      bounceCountRef={bounceCountRef}
      onTaskComplete={() => {
        if (isLastTask) setTaskPhase('done')
        else setTaskPhase('transition')
      }}
    />
  )
}
