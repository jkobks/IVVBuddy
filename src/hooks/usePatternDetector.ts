'use client'
import { useEffect, useRef } from 'react'
import { jaccardSimilarity } from '@/lib/similarity'
import {
  STAGNATION_THRESHOLD,
  TOP1_CONSECUTIVE_THRESHOLD,
  SINGLE_DOMAIN_THRESHOLD,
  STRUGGLING_BOUNCE_COUNT,
  SNIPPET_ONLY_QUERY_THRESHOLD,
  NO_REFINEMENT_QUERY_THRESHOLD,
  NO_REFINEMENT_MAX_WORDS,
} from '@/lib/constants'
import type { ClickRecord, TriggerType } from '@/types'

export function usePatternDetector(
  queryHistory: string[],
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

  // Trigger 2 — Query-Stagnation
  useEffect(() => {
    if (queryHistory.length < 2) return
    const last = queryHistory[queryHistory.length - 1]
    const prev = queryHistory[queryHistory.length - 2]
    if (jaccardSimilarity(last, prev) >= STAGNATION_THRESHOLD) {
      fire('query_stagnation')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryHistory])

  // Trigger 1 — Top-1 Bias, Trigger 3 — Single Domain
  useEffect(() => {
    if (clickHistory.length < TOP1_CONSECUTIVE_THRESHOLD) return
    const recent = clickHistory.slice(-TOP1_CONSECUTIVE_THRESHOLD)
    if (recent.every((c) => c.rank === 1)) {
      fire('top1_bias')
    }
    if (clickHistory.length >= SINGLE_DOMAIN_THRESHOLD) {
      const domains = new Set(clickHistory.map((c) => c.domain))
      if (domains.size === 1) {
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

  // Trigger 6 — Snippet-only Verhalten
  useEffect(() => {
    if (queryHistory.length >= SNIPPET_ONLY_QUERY_THRESHOLD && clickHistory.length === 0) {
      fire('snippet_only')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryHistory, clickHistory])

  // Trigger 7 — Fehlende Begriffsverfeinerung
  useEffect(() => {
    if (queryHistory.length < NO_REFINEMENT_QUERY_THRESHOLD) return
    const allShort = queryHistory.every(
      (q) => q.trim().split(/\s+/).filter(Boolean).length <= NO_REFINEMENT_MAX_WORDS
    )
    if (allShort) {
      fire('no_refinement')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryHistory])
}
