'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearch } from '@/hooks/useSearch'
import { useTracker } from '@/hooks/useTracker'
import { usePatternDetector } from '@/hooks/usePatternDetector'
import { TaskBanner } from './TaskBanner'
import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { SubmitButton } from './SubmitButton'
import { BuddyContainer } from './buddy/BuddyContainer'
import type { ClickRecord, Condition, PendingClick, SearchResult, TriggerType } from '@/types'
import type { Task } from '@/lib/tasks'
import { QUICK_DECISION_THRESHOLD_MS, STRUGGLING_DWELL_THRESHOLD_S } from '@/lib/constants'

const TOTAL_TASKS = 4

interface Props {
  task: Task
  taskPosition: number
  sessionId: string
  condition: Condition
  isLastTask: boolean
  // Behavioral history lives in page.tsx and accumulates across all tasks.
  // key={taskIndex} on this component resets the search UI and trigger counters,
  // while the history itself carries over so the Buddy sees the full session.
  queryHistory: string[]
  setQueryHistory: React.Dispatch<React.SetStateAction<string[]>>
  clickHistory: ClickRecord[]
  setClickHistory: React.Dispatch<React.SetStateAction<ClickRecord[]>>
  bounceCount: number
  setBounceCount: React.Dispatch<React.SetStateAction<number>>
  bounceCountRef: React.MutableRefObject<number>
  onTaskComplete: () => void
}

export function TaskSearchView({
  task,
  taskPosition,
  sessionId,
  condition,
  isLastTask,
  queryHistory,
  setQueryHistory,
  clickHistory,
  setClickHistory,
  bounceCount,
  setBounceCount,
  bounceCountRef,
  onTaskComplete,
}: Props) {
  const taskStartTime = useRef(Date.now())
  const pendingClickRef = useRef<PendingClick | null>(null)

  const { query, setQuery, results, isLoading, error, executeSearch } = useSearch()
  const tracker = useTracker(sessionId, task.id, taskPosition)
  const [latestTrigger, setLatestTrigger] = useState<TriggerType | null>(null)

  useEffect(() => {
    tracker.trackTaskStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTrigger = useCallback((type: TriggerType) => {
    setLatestTrigger(type)
  }, [])

  usePatternDetector(queryHistory, clickHistory, bounceCount, handleTrigger)

  function flushPendingClick(dwellSeconds: number | null) {
    if (!pendingClickRef.current) return
    tracker.trackClick(pendingClickRef.current.result, dwellSeconds)
    if (dwellSeconds !== null && dwellSeconds < STRUGGLING_DWELL_THRESHOLD_S) {
      bounceCountRef.current += 1
      setBounceCount(bounceCountRef.current)
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
      setQueryHistory((prev) => [...prev, q])
      tracker.trackQuery(q, wordCount)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executeSearch, tracker]
  )

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const now = Date.now()
      if (pendingClickRef.current) {
        const dwell = (now - pendingClickRef.current.clickTime) / 1000
        flushPendingClick(dwell)
      }
      const record: ClickRecord = { domain: result.displayLink, rank: result.rank }
      setClickHistory((prev) => [...prev, record])
      pendingClickRef.current = { result, clickTime: now }
      window.open(result.url, '_blank', 'noopener,noreferrer')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker]
  )

  const handleAnswerOpen = useCallback(() => {
    if (pendingClickRef.current) {
      const dwell = (Date.now() - pendingClickRef.current.clickTime) / 1000
      flushPendingClick(dwell)
    }
    if (Date.now() - taskStartTime.current < QUICK_DECISION_THRESHOLD_MS) {
      setLatestTrigger('quick_decision')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswerSubmit = useCallback(
    (answerText: string) => {
      tracker.trackAnswer(answerText)
      tracker.trackTaskEnd()
      onTaskComplete()
    },
    [tracker, onTaskComplete]
  )

  const handleInterventionFired = useCallback(
    (type: TriggerType, wasShown: boolean) => {
      tracker.trackIntervention(type, wasShown)
    },
    [tracker]
  )

  const handleTriggerConsumed = useCallback(() => {
    setLatestTrigger(null)
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
        <SubmitButton onOpen={handleAnswerOpen} onSubmit={handleAnswerSubmit} isLastTask={isLastTask} />
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
