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
  // While the tab is hidden, the dismiss countdown is paused here (ms left) instead
  // of ticking down unseen; resumed for the remaining duration once visible again.
  const pausedRemainingMs = useRef<number | null>(null)
  const dismissStartedAt = useRef<number>(0)

  // All three counters reset on remount (i.e., on each task change via key prop) —
  // the 3-per-task limit, 20s cooldown, and once-per-trigger-per-task rule apply
  // uniformly, whether the underlying trigger condition is cross-task or per-task.
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

  // Pause the auto-dismiss countdown while the tab is in the background so a
  // shown bubble can't expire before the participant ever sees it.
  useEffect(() => {
    function handleVisibilityChange() {
      if (!isVisible) return
      if (document.visibilityState === 'hidden') {
        if (dismissTimer.current) {
          clearTimeout(dismissTimer.current)
          dismissTimer.current = null
        }
        const elapsed = Date.now() - dismissStartedAt.current
        pausedRemainingMs.current = Math.max(BUBBLE_DISMISS_MS - elapsed, 0)
      } else if (pausedRemainingMs.current !== null) {
        dismissStartedAt.current = Date.now()
        dismissTimer.current = setTimeout(() => setIsVisible(false), pausedRemainingMs.current)
        pausedRemainingMs.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isVisible])

  function processTrigger(type: TriggerType) {
    if (evaluatedTriggers.current.has(type)) {
      onTriggerConsumedRef.current()
      return
    }
    evaluatedTriggers.current.add(type)

    const now = Date.now()
    const cooldownElapsed = now - lastShownTime.current >= INTERVENTION_COOLDOWN_MS

    const wasShown =
      condition !== 'control' &&
      interventionCount.current < MAX_INTERVENTIONS &&
      cooldownElapsed

    if (wasShown) {
      lastShownTime.current = now
      interventionCount.current++

      const text = BUDDY_MESSAGES[type]
      setActiveMessage(text)
      setIsVisible(true)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      pausedRemainingMs.current = null
      dismissStartedAt.current = now
      dismissTimer.current = setTimeout(() => setIsVisible(false), BUBBLE_DISMISS_MS)

      onInterventionFiredRef.current(type, true, text)
    } else {
      onInterventionFiredRef.current(type, false, null)
    }

    onTriggerConsumedRef.current()
  }

  // Don't let a trigger fire (and its bubble start counting down) while the
  // participant isn't even looking at the tab — wait for it to regain focus.
  //
  // A result click opens the target in a new tab (window.open) synchronously,
  // but the trigger reaching this component takes several React state hops
  // (click count -> patternDetector -> session trigger -> queue -> this prop),
  // each a separate render/effect pass. The browser's own 'visibilitychange'
  // for the tab going hidden is a race against those hops — on some
  // browsers/timings this effect can still read 'visible' a beat before the
  // tab actually flips. The 100ms grace period lets that settle before we
  // trust the read, instead of checking the instant this effect runs.
  useEffect(() => {
    if (!latestTrigger) return

    let handled = false
    function tryShow() {
      if (handled || document.visibilityState !== 'visible') return
      handled = true
      document.removeEventListener('visibilitychange', tryShow)
      processTrigger(latestTrigger!)
    }

    document.addEventListener('visibilitychange', tryShow)
    const settleTimer = setTimeout(tryShow, 100)
    return () => {
      clearTimeout(settleTimer)
      document.removeEventListener('visibilitychange', tryShow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestTrigger, condition])

  if (condition === 'control') return null

  return (
    <SearchBuddy message={activeMessage} visible={isVisible} />
  )
}
