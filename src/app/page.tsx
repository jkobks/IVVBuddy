'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { usePatternDetector } from '@/hooks/usePatternDetector'
import { TaskSearchView } from '@/components/TaskSearchView'
import { TransitionScreen } from '@/components/TransitionScreen'
import { DoneScreen } from '@/components/DoneScreen'
import { ConsentScreen } from '@/components/ConsentScreen'
import { IntroScreen } from '@/components/IntroScreen'
import { getTaskById, TASKS } from '@/lib/tasks'
import type { ClickRecord, QueryRecord, TriggerType } from '@/types'

type TaskPhase = 'searching' | 'transition' | 'done'

const KEY_CONSENT = 'sb_consent'
const KEY_INTRO_SEEN = 'sb_intro_seen'

export default function SearchPage() {
  const { sessionId, condition, taskOrder, taskIndex, advanceTask, ready } = useSession()
  const [taskPhase, setTaskPhase] = useState<TaskPhase>('searching')
  const [consented, setConsented] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [introSeen, setIntroSeen] = useState(false)

  // Cross-task (session-wide) history for the 5 task-übergreifende Trigger
  // (top3_bias, query_stagnation, single_domain, struggling, no_refinement).
  // Accumulates across all 4 tasks — never resets on task change.
  const [queryHistory, setQueryHistory] = useState<QueryRecord[]>([])
  const [clickHistory, setClickHistory] = useState<ClickRecord[]>([])
  const [bounceCount, setBounceCount] = useState(0)
  // Queue, not a single slot: if two cross-task conditions become true from the same
  // event (e.g. a click completes both top3_bias and single_domain at once), both
  // usePatternDetector effects call handleSessionTrigger in the same tick. A single
  // `sessionTrigger` value would let the second overwrite the first before TaskSearchView
  // ever reads it, silently dropping (and never logging) the first trigger.
  const [sessionTriggerQueue, setSessionTriggerQueue] = useState<TriggerType[]>([])
  const sessionTrigger = sessionTriggerQueue[0] ?? null

  const handleSessionTrigger = useCallback(
    (type: TriggerType) => setSessionTriggerQueue((prev) => [...prev, type]),
    []
  )
  usePatternDetector(queryHistory, clickHistory, bounceCount, handleSessionTrigger)

  const handleQuery = useCallback(
    (q: string, queryTaskPosition: number) =>
      setQueryHistory((prev) => [...prev, { text: q, taskPosition: queryTaskPosition }]),
    []
  )
  const handleResultClick = useCallback(
    (record: ClickRecord) => setClickHistory((prev) => [...prev, record]),
    []
  )
  const handleBounce = useCallback(() => setBounceCount((c) => c + 1), [])
  const handleSessionTriggerConsumed = useCallback(
    () => setSessionTriggerQueue((prev) => prev.slice(1)),
    []
  )

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

  // key={taskIndex} remounts TaskSearchView (and its BuddyContainer) on each task,
  // resetting within-task UI state, the per-task triggers, and the intervention
  // limit/cooldown/fired-set — but NOT the cross-task history above, which lives here.
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
      onQuery={handleQuery}
      onResultClick={handleResultClick}
      onBounce={handleBounce}
      sessionTrigger={sessionTrigger}
      onSessionTriggerConsumed={handleSessionTriggerConsumed}
    />
  )
}
