import { NextRequest } from 'next/server'
import { BUDDY_SYSTEM_PROMPT, buildBuddyUserPrompt, type BuddyMessageContext } from '@/lib/buddyPrompt'
import type { DynamicTriggerType } from '@/types'

const DYNAMIC_TRIGGER_TYPES: DynamicTriggerType[] = [
  'top1_bias',
  'query_stagnation',
  'single_domain',
  'no_refinement',
]

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
// Serverseitiges Zeitbudget mit Marge über dem Client-Timeout (der Client bricht selbst nach 4s ab
// und nutzt dann seinen Fallback-Text — dieses Limit verhindert nur, dass der Request ewig offen bleibt).
const UPSTREAM_TIMEOUT_MS = 8_000

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const triggerType = body.triggerType as DynamicTriggerType
  if (!DYNAMIC_TRIGGER_TYPES.includes(triggerType)) {
    return Response.json({ error: 'Unsupported trigger type' }, { status: 400 })
  }

  const topic = body.topic
  if (typeof topic !== 'string' || !topic.trim()) {
    return Response.json({ error: 'Missing topic' }, { status: 400 })
  }

  const ctx: BuddyMessageContext = {
    triggerType,
    topic,
    queries: Array.isArray(body.queries) ? (body.queries as string[]) : undefined,
    resultTitle: typeof body.resultTitle === 'string' ? body.resultTitle : undefined,
    domain: typeof body.domain === 'string' ? body.domain : undefined,
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'LLM not configured' }, { status: 503 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: BUDDY_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildBuddyUserPrompt(ctx) }] }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
          // Ohne dies verbrennt das Modell einen Großteil von maxOutputTokens auf internes
          // "Thinking" und schneidet den sichtbaren Text ab (finishReason: MAX_TOKENS).
          // Für einen kurzen Hinweissatz ist Thinking unnötig — spart auch Latenz.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[buddy-message] status:', res.status, JSON.stringify(err))
      return Response.json({ error: 'LLM API error' }, { status: 502 })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) {
      return Response.json({ error: 'Empty LLM response' }, { status: 502 })
    }

    return Response.json({ message: text })
  } catch (err) {
    console.error('[buddy-message]', err)
    return Response.json({ error: 'LLM request failed' }, { status: 500 })
  } finally {
    clearTimeout(timer)
  }
}
