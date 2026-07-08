import type { ClickRecord, DynamicTriggerType, TriggerType } from '@/types'
import { BUDDY_MESSAGES, DYNAMIC_TRIGGER_TYPES, LLM_TIMEOUT_MS } from '@/lib/constants'

export function isDynamicTrigger(type: TriggerType): type is DynamicTriggerType {
  return (DYNAMIC_TRIGGER_TYPES as TriggerType[]).includes(type)
}

interface DynamicContext {
  queries?: string[]
  resultTitle?: string
  domain?: string
}

// Wählt pro Trigger genau den Kontext aus, den die KI zur Formulierung braucht.
export function buildDynamicContext(
  type: DynamicTriggerType,
  queryHistory: string[],
  clickHistory: ClickRecord[]
): DynamicContext {
  switch (type) {
    case 'query_stagnation':
      return { queries: queryHistory.slice(-2) }
    case 'no_refinement':
      return { queries: queryHistory }
    case 'top1_bias':
      return { resultTitle: clickHistory[clickHistory.length - 1]?.title }
    case 'single_domain':
      return { domain: clickHistory[clickHistory.length - 1]?.domain }
  }
}

export interface DynamicMessageResult {
  message: string
  wasDynamic: boolean
  generationTimeMs: number
}

// Ruft die LLM-generierte Nachricht ab. Bricht nach LLM_TIMEOUT_MS ab und fällt
// dann (wie bei jedem anderen Fehler) auf den festen Fallback-Text des Triggers zurück.
export async function fetchDynamicBuddyMessage(
  type: DynamicTriggerType,
  topic: string,
  context: DynamicContext
): Promise<DynamicMessageResult> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const res = await fetch('/api/buddy-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: type, topic, ...context }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || typeof data.message !== 'string' || !data.message.trim()) {
      throw new Error('invalid response')
    }
    return { message: data.message, wasDynamic: true, generationTimeMs: Date.now() - start }
  } catch {
    return { message: BUDDY_MESSAGES[type], wasDynamic: false, generationTimeMs: Date.now() - start }
  } finally {
    clearTimeout(timer)
  }
}
