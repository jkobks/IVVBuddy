'use client'
import { useEffect, useRef } from 'react'
import { jaccardSimilarity } from '@/lib/similarity'
import {
  STAGNATION_THRESHOLD,
  TOP_BIAS_MIN_CLICKS,
  TOP_BIAS_MAX_RANK,
  SINGLE_DOMAIN_MIN_CLICKS,
  SINGLE_DOMAIN_RATIO,
  STRUGGLING_BOUNCE_COUNT,
  NO_REFINEMENT_LOOKBACK,
  NO_REFINEMENT_MAX_WORDS,
} from '@/lib/constants'
import type { ClickRecord, QueryRecord, TriggerType } from '@/types'

// Detects the 5 task-übergreifende (cross-task) triggers. queryHistory/clickHistory/
// bounceCount are accumulated over the whole session by the caller, and each trigger
// type fires at most once per session (firedRef never resets here).
export function usePatternDetector(
  queryHistory: QueryRecord[],
  clickHistory: ClickRecord[],
  bounceCount: number,
  onTrigger: (type: TriggerType) => void
) {
  const onTriggerRef = useRef(onTrigger)
  useEffect(() => {
    onTriggerRef.current = onTrigger
  }, [onTrigger])

  const firedRef = useRef<Set<TriggerType>>(new Set())

  function fire(type: TriggerType) {
    if (!firedRef.current.has(type)) {
      firedRef.current.add(type)
      onTriggerRef.current(type)
    }
  }

  // Trigger 2 — Query-Stagnation (nur innerhalb derselben Task vergleichen — sonst
  // würde die letzte Query von Task N gegen die erste Query von Task N+1 geprüft und
  // direkt zu Task-Beginn feuern)
  useEffect(() => {
    if (queryHistory.length < 2) return
    const last = queryHistory[queryHistory.length - 1]
    const prev = queryHistory[queryHistory.length - 2]
    if (last.taskPosition !== prev.taskPosition) return
    if (jaccardSimilarity(last.text, prev.text) >= STAGNATION_THRESHOLD) {
      fire('query_stagnation')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryHistory])

  // Trigger 1 — Top-3 Bias, Trigger 3 — Single Domain
  useEffect(() => {
    if (clickHistory.length >= TOP_BIAS_MIN_CLICKS && clickHistory.every((c) => c.rank <= TOP_BIAS_MAX_RANK)) {
      fire('top3_bias')
    }
    if (clickHistory.length >= SINGLE_DOMAIN_MIN_CLICKS) {
      const counts = new Map<string, number>()
      for (const c of clickHistory) {
        counts.set(c.domain, (counts.get(c.domain) ?? 0) + 1)
      }
      const maxCount = Math.max(...counts.values())
      if (maxCount / clickHistory.length >= SINGLE_DOMAIN_RATIO) {
        fire('single_domain')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickHistory])

  // Trigger 5 — Struggling / Bounce-Muster
  useEffect(() => {
    if (bounceCount >= STRUGGLING_BOUNCE_COUNT) {
      fire('struggling')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounceCount])

  // Trigger 7 — Fehlende Begriffsverfeinerung (nur letzte 2 Queries, session-weit)
  useEffect(() => {
    if (queryHistory.length < NO_REFINEMENT_LOOKBACK) return
    const recent = queryHistory.slice(-NO_REFINEMENT_LOOKBACK)
    const allShort = recent.every(
      (q) => q.text.trim().split(/\s+/).filter(Boolean).length <= NO_REFINEMENT_MAX_WORDS
    )
    if (allShort) {
      fire('no_refinement')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryHistory])
}
