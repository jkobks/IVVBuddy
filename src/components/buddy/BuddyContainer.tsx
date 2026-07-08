'use client'
import { useEffect, useRef, useState } from 'react'
import { SearchBuddy } from './SearchBuddy'
import { BUDDY_MESSAGES, BUDDY_PLACEHOLDER, BUBBLE_DISMISS_MS, MAX_INTERVENTIONS, INTERVENTION_COOLDOWN_MS } from '@/lib/constants'
import { buildDynamicContext, fetchDynamicBuddyMessage, isDynamicTrigger } from '@/lib/buddyMessage'
import type { ClickRecord, Condition, TriggerType } from '@/types'

interface Props {
  condition: Condition
  latestTrigger: TriggerType | null
  taskTopic: string
  queryHistory: string[]
  clickHistory: ClickRecord[]
  onTriggerConsumed: () => void
  onInterventionFired: (
    type: TriggerType,
    wasShown: boolean,
    messageText: string | null,
    wasDynamic: boolean,
    generationTimeMs: number | null
  ) => void
}

export function BuddyContainer({
  condition,
  latestTrigger,
  taskTopic,
  queryHistory,
  clickHistory,
  onTriggerConsumed,
  onInterventionFired,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeMessage, setActiveMessage] = useState('')
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // All three counters reset on remount (i.e., on each task change via key prop)
  const interventionCount = useRef(0)
  const lastShownTime = useRef<number>(0)
  const evaluatedTriggers = useRef<Set<TriggerType>>(new Set())

  // Guards against a stale LLM response landing after a newer trigger fired, or after unmount
  const requestIdRef = useRef(0)
  const pendingInterventionRef = useRef<TriggerType | null>(null)

  const onTriggerConsumedRef = useRef(onTriggerConsumed)
  const onInterventionFiredRef = useRef(onInterventionFired)
  useEffect(() => { onTriggerConsumedRef.current = onTriggerConsumed }, [onTriggerConsumed])
  useEffect(() => { onInterventionFiredRef.current = onInterventionFired }, [onInterventionFired])

  // Snapshot of behavioral context, read only at the moment a trigger fires
  const contextRef = useRef({ taskTopic, queryHistory, clickHistory })
  useEffect(() => {
    contextRef.current = { taskTopic, queryHistory, clickHistory }
  }, [taskTopic, queryHistory, clickHistory])

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      requestIdRef.current++
      // A dynamic message was in flight when the task ended — log the fallback text
      // now rather than silently dropping the intervention record.
      if (pendingInterventionRef.current) {
        const type = pendingInterventionRef.current
        pendingInterventionRef.current = null
        onInterventionFiredRef.current(type, true, BUDDY_MESSAGES[type], false, null)
      }
    }
  }, [])

  function showFinalMessage(text: string) {
    setActiveMessage(text)
    setIsVisible(true)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => setIsVisible(false), BUBBLE_DISMISS_MS)
  }

  useEffect(() => {
    if (!latestTrigger) return

    if (evaluatedTriggers.current.has(latestTrigger)) {
      onTriggerConsumedRef.current()
      return
    }
    evaluatedTriggers.current.add(latestTrigger)

    const now = Date.now()
    const cooldownElapsed = now - lastShownTime.current >= INTERVENTION_COOLDOWN_MS

    const wasShown =
      condition !== 'control' &&
      interventionCount.current < MAX_INTERVENTIONS &&
      cooldownElapsed

    if (wasShown) {
      lastShownTime.current = now
      interventionCount.current++

      if (isDynamicTrigger(latestTrigger)) {
        const myRequestId = ++requestIdRef.current
        pendingInterventionRef.current = latestTrigger

        // Show a neutral placeholder immediately, swap in the real message once it arrives.
        setActiveMessage(BUDDY_PLACEHOLDER)
        setIsVisible(true)
        if (dismissTimer.current) clearTimeout(dismissTimer.current)

        const { taskTopic: topic, queryHistory: queries, clickHistory: clicks } = contextRef.current
        const dynamicContext = buildDynamicContext(latestTrigger, queries, clicks)

        fetchDynamicBuddyMessage(latestTrigger, topic, dynamicContext).then((result) => {
          if (requestIdRef.current !== myRequestId) return // superseded or unmounted
          pendingInterventionRef.current = null
          showFinalMessage(result.message)
          onInterventionFiredRef.current(latestTrigger, true, result.message, result.wasDynamic, result.generationTimeMs)
        })
      } else {
        const text = BUDDY_MESSAGES[latestTrigger]
        showFinalMessage(text)
        onInterventionFiredRef.current(latestTrigger, true, text, false, null)
      }
    } else {
      onInterventionFiredRef.current(latestTrigger, false, null, false, null)
    }

    onTriggerConsumedRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestTrigger, condition])

  if (condition === 'control') return null

  return (
    <SearchBuddy message={activeMessage} visible={isVisible} />
  )
}
