'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearch } from '@/hooks/useSearch'
import { useTracker } from '@/hooks/useTracker'
import { TaskBanner } from './TaskBanner'
import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { SubmitButton } from './SubmitButton'
import { BuddyContainer } from './buddy/BuddyContainer'
import type { ClickRecord, Condition, PendingClick, SearchResult, TriggerType } from '@/types'
import type { Task } from '@/lib/tasks'
import {
  QUICK_DECISION_THRESHOLD_MS,
  QUICK_DECISION_MAX_CLICKS,
  STRUGGLING_DWELL_THRESHOLD_S,
  SNIPPET_ONLY_QUERY_THRESHOLD,
} from '@/lib/constants'

const TOTAL_TASKS = 4

interface Props {
  task: Task
  taskPosition: number
  sessionId: string
  condition: Condition
  isLastTask: boolean
  onTaskComplete: () => void
  // Cross-task (session-wide) history lives in the parent (SearchPage) — these
  // report each query/click/bounce event upward so the session-level detector sees them.
  onQuery: (query: string, taskPosition: number) => void
  onResultClick: (record: ClickRecord) => void
  onBounce: () => void
  // The parent's session-level detector relays its (at-most-once-per-session) trigger here.
  sessionTrigger: TriggerType | null
  onSessionTriggerConsumed: () => void
}

// Remounted via key={taskIndex} in page.tsx on each task change. This resets:
// - within-task UI state (search field, results, pending-click dwell timer)
// - the per-task triggers snippet_only and quick_decision (query/click counts reset)
// - BuddyContainer's intervention limit, cooldown, and per-task fired-trigger set,
//   which per spec apply unchanged to every trigger, cross-task or not.
// Cross-task triggers (top3_bias, query_stagnation, single_domain, struggling,
// no_refinement) are detected in the parent and relayed in via `sessionTrigger`.
export function TaskSearchView({
  task,
  taskPosition,
  sessionId,
  condition,
  isLastTask,
  onTaskComplete,
  onQuery,
  onResultClick,
  onBounce,
  sessionTrigger,
  onSessionTriggerConsumed,
}: Props) {
  const taskStartTime = useRef(Date.now())
  const pendingClickRef = useRef<PendingClick | null>(null)
  const snippetOnlyFiredRef = useRef(false)

  const { query, setQuery, results, isLoading, error, executeSearch } = useSearch()
  const tracker = useTracker(sessionId, task.id, taskPosition)
  // Kept in sync every render so the unmount-cleanup below (empty dep array) can
  // always reach the latest tracker without re-registering the cleanup on every render.
  const trackerRef = useRef(tracker)
  trackerRef.current = tracker

  const [taskQueryCount, setTaskQueryCount] = useState(0)
  const [taskClickCount, setTaskClickCount] = useState(0)
  // Queue instead of a single slot: several trigger conditions can become true in the
  // same tick (a relayed cross-task trigger arriving the same moment a per-task trigger
  // fires locally). A single `latestTrigger` value would let one silently overwrite the
  // other before BuddyContainer ever sees it. Every queued type is guaranteed to reach
  // BuddyContainer exactly once and get logged (was_shown=true or false).
  const [triggerQueue, setTriggerQueue] = useState<TriggerType[]>([])
  const latestTrigger = triggerQueue[0] ?? null

  const enqueueTrigger = useCallback((type: TriggerType) => {
    setTriggerQueue((prev) => [...prev, type])
  }, [])

  useEffect(() => {
    tracker.trackTaskStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Relay a cross-task trigger from the parent's session-level detector into our queue.
  useEffect(() => {
    if (sessionTrigger) {
      enqueueTrigger(sessionTrigger)
      onSessionTriggerConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionTrigger])

  // Trigger 6 — Snippet-only (pro Task)
  useEffect(() => {
    if (
      !snippetOnlyFiredRef.current &&
      taskQueryCount >= SNIPPET_ONLY_QUERY_THRESHOLD &&
      taskClickCount === 0
    ) {
      snippetOnlyFiredRef.current = true
      enqueueTrigger('snippet_only')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskQueryCount, taskClickCount])

  // Flush whatever click is still pending when this task view goes away (answer
  // submitted, task changed) — otherwise the last click of a task never reaches the DB.
  useEffect(() => {
    return () => {
      if (pendingClickRef.current) {
        const dwell = (Date.now() - pendingClickRef.current.clickTime) / 1000
        trackerRef.current.trackClick(pendingClickRef.current.result, dwell)
        pendingClickRef.current = null
      }
    }
  }, [])

  // Flush via sendBeacon on tab close/reload — a normal fetch can be aborted mid-flight
  // when the page unloads, sendBeacon is designed to survive that.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!pendingClickRef.current) return
      const dwellTimeSeconds = (Date.now() - pendingClickRef.current.clickTime) / 1000
      const { result } = pendingClickRef.current
      const payload = JSON.stringify({
        type: 'click',
        sessionId,
        taskId: task.id,
        taskPosition,
        url: result.url,
        domain: result.displayLink,
        rank: result.rank,
        dwellTimeSeconds,
        timestamp: new Date().toISOString(),
      })
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      pendingClickRef.current = null
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionId, task.id, taskPosition])

  function flushPendingClick(dwellSeconds: number | null) {
    if (!pendingClickRef.current) return
    tracker.trackClick(pendingClickRef.current.result, dwellSeconds)
    if (dwellSeconds !== null && dwellSeconds < STRUGGLING_DWELL_THRESHOLD_S) {
      onBounce()
    }
    pendingClickRef.current = null
  }

  const handleSearch = useCallback(
    async (q: string) => {
      if (pendingClickRef.current) {
        const dwell = (Date.now() - pendingClickRef.current.clickTime) / 1000
        flushPendingClick(dwell)
      }
      await executeSearch(q)
      const wordCount = q.trim().split(/\s+/).filter(Boolean).length
      setTaskQueryCount((c) => c + 1)
      onQuery(q, taskPosition)
      tracker.trackQuery(q, wordCount)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executeSearch, tracker, onQuery, taskPosition]
  )

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const now = Date.now()
      if (pendingClickRef.current) {
        const dwell = (now - pendingClickRef.current.clickTime) / 1000
        flushPendingClick(dwell)
      }
      const record: ClickRecord = { domain: result.displayLink, rank: result.rank, title: result.title }
      setTaskClickCount((c) => c + 1)
      onResultClick(record)
      pendingClickRef.current = { result, clickTime: now }
      window.open(result.url, '_blank', 'noopener,noreferrer')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker, onResultClick]
  )

  const handleAnswerOpen = useCallback(() => {
    if (pendingClickRef.current) {
      const dwell = (Date.now() - pendingClickRef.current.clickTime) / 1000
      flushPendingClick(dwell)
    }
    const tooFast = Date.now() - taskStartTime.current < QUICK_DECISION_THRESHOLD_MS
    const tooFewClicks = taskClickCount <= QUICK_DECISION_MAX_CLICKS
    if (tooFast || tooFewClicks) {
      enqueueTrigger('quick_decision')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskClickCount])

  const handleAnswerCancel = useCallback(() => {
    tracker.trackAnswerCancel()
  }, [tracker])

  const handleAnswerSubmit = useCallback(
    (answerText: string) => {
      tracker.trackAnswer(answerText)
      tracker.trackTaskEnd()
      onTaskComplete()
    },
    [tracker, onTaskComplete]
  )

  const handleInterventionFired = useCallback(
    (type: TriggerType, wasShown: boolean, messageText: string | null) => {
      tracker.trackIntervention(type, wasShown, messageText)
    },
    [tracker]
  )

  const handleTriggerConsumed = useCallback(() => {
    setTriggerQueue((prev) => prev.slice(1))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <TaskBanner task={task} taskPosition={taskPosition} totalTasks={TOTAL_TASKS} />
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        <SearchBar
          query={query}
          onChange={setQuery}
          onSubmit={() => handleSearch(query)}
          isLoading={isLoading}
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ResultsList results={results} onClickResult={handleResultClick} />
        <SubmitButton onOpen={handleAnswerOpen} onCancel={handleAnswerCancel} onSubmit={handleAnswerSubmit} isLastTask={isLastTask} />
      </div>
      <BuddyContainer
        condition={condition}
        latestTrigger={latestTrigger}
        onTriggerConsumed={handleTriggerConsumed}
        onInterventionFired={handleInterventionFired}
      />
    </main>
  )
}
