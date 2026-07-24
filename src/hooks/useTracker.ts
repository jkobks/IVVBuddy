'use client'
import { useCallback } from 'react'
import type { SearchResult, TriggerType } from '@/types'

function post(payload: Record<string, unknown>) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

export function useTracker(sessionId: string, taskId: string, taskPosition: number) {
  const trackTaskStart = useCallback(() => {
    post({ type: 'task_start', sessionId, taskId, taskPosition, timestamp: new Date().toISOString() })
  }, [sessionId, taskId, taskPosition])

  const trackTaskEnd = useCallback(() => {
    post({ type: 'task_end', sessionId, taskId, taskPosition, timestamp: new Date().toISOString() })
  }, [sessionId, taskId, taskPosition])

  const trackQuery = useCallback(
    (queryText: string, wordCount: number) => {
      post({ type: 'query', sessionId, taskId, taskPosition, queryText, wordCount, timestamp: new Date().toISOString() })
    },
    [sessionId, taskId, taskPosition]
  )

  const trackClick = useCallback(
    (result: SearchResult, dwellTimeSeconds: number | null) => {
      post({
        type: 'click',
        sessionId,
        taskId,
        taskPosition,
        url: result.url,
        domain: result.displayLink,
        rank: result.rank,
        dwellTimeSeconds,
        timestamp: new Date().toISOString(),
      })
    },
    [sessionId, taskId, taskPosition]
  )

  const trackAnswerOpen = useCallback(
    (timeToOpenSeconds: number) => {
      post({ type: 'answer_open', sessionId, taskId, taskPosition, timeToOpenSeconds, timestamp: new Date().toISOString() })
    },
    [sessionId, taskId, taskPosition]
  )

  const trackAnswer = useCallback(
    (answerText: string) => {
      post({ type: 'answer', sessionId, taskId, taskPosition, answerText, timestamp: new Date().toISOString() })
    },
    [sessionId, taskId, taskPosition]
  )

  const trackIntervention = useCallback(
    (triggerType: TriggerType, wasShown: boolean, messageText: string | null) => {
      post({
        type: 'intervention',
        sessionId,
        taskId,
        taskPosition,
        triggerType,
        wasShown,
        messageText,
        timestamp: new Date().toISOString(),
      })
    },
    [sessionId, taskId, taskPosition]
  )

  const trackAnswerCancel = useCallback(() => {
    post({ type: 'answer_cancel', sessionId, taskId, taskPosition, timestamp: new Date().toISOString() })
  }, [sessionId, taskId, taskPosition])

  return { trackTaskStart, trackTaskEnd, trackQuery, trackClick, trackAnswer, trackAnswerOpen, trackAnswerCancel, trackIntervention }
}
