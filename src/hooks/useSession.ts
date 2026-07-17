'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Condition, SessionState } from '@/types'
import { TASKS, shuffleTasks } from '@/lib/tasks'

const KEY_ID         = 'sb_session_id'
const KEY_CONDITION  = 'sb_condition'
const KEY_TASK_ORDER = 'sb_task_order'
const KEY_TASK_INDEX = 'sb_task_index'
const KEY_START      = 'sb_start_time'

function track(payload: Record<string, unknown>) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

// Falls back to a client-side coin flip if the balancing endpoint is unreachable
// (e.g. DB hiccup) — imbalance from a rare fallback beats blocking the study.
async function assignBalancedCondition(): Promise<Condition> {
  try {
    const res = await fetch('/api/session/assign-condition')
    const data = await res.json()
    if (data.condition === 'buddy' || data.condition === 'control') return data.condition
  } catch {
    // fall through to client-side random
  }
  return Math.random() < 0.5 ? 'buddy' : 'control'
}

export interface SessionHandle extends SessionState {
  advanceTask: () => void
}

export function useSession(): SessionHandle {
  const [state, setState] = useState<SessionState>({
    sessionId: '',
    condition: 'control',
    startTime: 0,
    taskOrder: [],
    taskIndex: 0,
    ready: false,
  })

  useEffect(() => {
    let cancelled = false
    let removeUnloadListener: (() => void) | null = null

    async function init() {
      const existing = sessionStorage.getItem(KEY_ID)
      const isNew = !existing

      let sessionId: string
      let condition: Condition
      let startTime: number
      let taskOrder: string[]
      let taskIndex: number

      if (isNew) {
        sessionId = crypto.randomUUID()
        const searchParams = new URLSearchParams(window.location.search)

        const conditionParam = searchParams.get('condition')
        condition =
          conditionParam === 'buddy' || conditionParam === 'control'
            ? conditionParam
            : await assignBalancedCondition()
        if (cancelled) return
        startTime = Date.now()

        // ?task=<id> puts that task first (for testing); rest is still shuffled
        const taskParam = searchParams.get('task')
        const shuffled = shuffleTasks()
        if (taskParam && TASKS.find((t) => t.id === taskParam)) {
          const rest = shuffled.filter((t) => t.id !== taskParam)
          taskOrder = [taskParam, ...rest.map((t) => t.id)]
        } else {
          taskOrder = shuffled.map((t) => t.id)
        }
        taskIndex = 0

        sessionStorage.setItem(KEY_ID, sessionId)
        sessionStorage.setItem(KEY_CONDITION, condition)
        sessionStorage.setItem(KEY_TASK_ORDER, JSON.stringify(taskOrder))
        sessionStorage.setItem(KEY_TASK_INDEX, '0')
        sessionStorage.setItem(KEY_START, String(startTime))

        track({
          type: 'session_start',
          sessionId,
          condition,
          taskOrder,
          startTime: new Date(startTime).toISOString(),
        })
      } else {
        sessionId = existing!
        condition = (sessionStorage.getItem(KEY_CONDITION) as Condition) ?? 'control'
        startTime = parseInt(sessionStorage.getItem(KEY_START) ?? '0', 10) || Date.now()
        try {
          taskOrder = JSON.parse(sessionStorage.getItem(KEY_TASK_ORDER) ?? '[]')
        } catch {
          taskOrder = TASKS.map((t) => t.id)
        }
        taskIndex = parseInt(sessionStorage.getItem(KEY_TASK_INDEX) ?? '0', 10) || 0

        // A reload within the same tab wipes the in-memory cross-task trigger history
        // (queryHistory/clickHistory/bounceCount + firedRef in usePatternDetector) and
        // restarts the quick_decision timer — neither is recoverable from sessionStorage
        // alone. Flag the session so it can be excluded from the evaluation instead of
        // silently treating it as if nothing happened.
        track({ type: 'session_reloaded', sessionId })
      }

      if (cancelled) return
      setState({ sessionId, condition, startTime, taskOrder, taskIndex, ready: true })

      const handleUnload = () => {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_end',
            sessionId,
            endTime: new Date().toISOString(),
          }),
          keepalive: true,
        }).catch(() => {})
      }
      window.addEventListener('beforeunload', handleUnload)
      removeUnloadListener = () => window.removeEventListener('beforeunload', handleUnload)
    }

    init()

    return () => {
      cancelled = true
      removeUnloadListener?.()
    }
  }, [])

  const advanceTask = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.taskIndex + 1
      sessionStorage.setItem(KEY_TASK_INDEX, String(nextIndex))
      return { ...prev, taskIndex: nextIndex }
    })
  }, [])

  return { ...state, advanceTask }
}
