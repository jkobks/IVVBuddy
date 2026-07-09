'use client'
import { useEffect, useRef, useState } from 'react'
import { SearchBuddy } from './SearchBuddy'
import { BUDDY_MESSAGES, BUBBLE_DISMISS_MS, MAX_INTERVENTIONS, INTERVENTION_COOLDOWN_MS } from '@/lib/constants'
import type { Condition, TriggerType } from '@/types'

interface Props {
  condition: Condition
  latestTrigger: TriggerType | null
  onTriggerConsumed: () => void
  onInterventionFired: (type: TriggerType, wasShown: boolean, messageText: string | null) => void
}

export function BuddyContainer({
  condition,
  latestTrigger,
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

  const onTriggerConsumedRef = useRef(onTriggerConsumed)
  const onInterventionFiredRef = useRef(onInterventionFired)
  useEffect(() => { onTriggerConsumedRef.current = onTriggerConsumed }, [onTriggerConsumed])
  useEffect(() => { onInterventionFiredRef.current = onInterventionFired }, [onInterventionFired])

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

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

      const text = BUDDY_MESSAGES[latestTrigger]
      setActiveMessage(text)
      setIsVisible(true)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setIsVisible(false), BUBBLE_DISMISS_MS)

      onInterventionFiredRef.current(latestTrigger, true, text)
    } else {
      onInterventionFiredRef.current(latestTrigger, false, null)
    }

    onTriggerConsumedRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestTrigger, condition])

  if (condition === 'control') return null

  return (
    <SearchBuddy message={activeMessage} visible={isVisible} />
  )
}
