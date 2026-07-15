'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { TaskSearchView } from '@/components/TaskSearchView'
import { TransitionScreen } from '@/components/TransitionScreen'
import { DoneScreen } from '@/components/DoneScreen'
import { ConsentScreen } from '@/components/ConsentScreen'
import { IntroScreen } from '@/components/IntroScreen'
import { getTaskById, TASKS } from '@/lib/tasks'

type TaskPhase = 'searching' | 'transition' | 'done'

const KEY_CONSENT = 'sb_consent'
const KEY_INTRO_SEEN = 'sb_intro_seen'

export default function SearchPage() {
  const { sessionId, condition, taskOrder, taskIndex, advanceTask, ready } = useSession()
  const [taskPhase, setTaskPhase] = useState<TaskPhase>('searching')
  const [consented, setConsented] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [introSeen, setIntroSeen] = useState(false)

  useEffect(() => {
    setConsented(sessionStorage.getItem(KEY_CONSENT) === '1')
    setIntroSeen(sessionStorage.getItem(KEY_INTRO_SEEN) === '1')
    setConsentChecked(true)
  }, [])

  if (!consentChecked) return null

  if (!consented) {
    return (
      <ConsentScreen
        onAccept={() => {
          sessionStorage.setItem(KEY_CONSENT, '1')
          setConsented(true)
        }}
      />
    )
  }

  if (!ready) return null

  if (!introSeen) {
    return (
      <IntroScreen
        condition={condition}
        onContinue={() => {
          sessionStorage.setItem(KEY_INTRO_SEEN, '1')
          setIntroSeen(true)
        }}
      />
    )
  }

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

  // key={taskIndex} remounts TaskSearchView on each task, resetting all behavioral
  // state so that triggers evaluate within-task only — which is what they were designed for.
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
