import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function logIfError(label: string, result: { error: { message: string } | null }) {
  if (result.error) {
    console.error(`[track] ${label}:`, result.error.message)
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const { type } = body

    if (type === 'session_start') {
      logIfError('session_start', await supabase.from('sessions').upsert({
        id: body.sessionId,
        condition: body.condition,
        task_order: body.taskOrder,
        start_time: body.startTime,
      }))
    } else if (type === 'session_end') {
      logIfError('session_end', await supabase
        .from('sessions')
        .update({ end_time: body.endTime })
        .eq('id', body.sessionId))
    } else if (type === 'task_start') {
      logIfError('task_start', await supabase.from('task_sessions').upsert(
        {
          session_id: body.sessionId,
          task_id: body.taskId,
          task_position: body.taskPosition,
          task_start_time: body.timestamp,
        },
        { onConflict: 'session_id,task_id' }
      ))
    } else if (type === 'task_end') {
      logIfError('task_end', await supabase
        .from('task_sessions')
        .update({ task_end_time: body.timestamp })
        .eq('session_id', body.sessionId)
        .eq('task_id', body.taskId))
    } else if (type === 'query') {
      logIfError('query', await supabase.from('queries').insert({
        session_id: body.sessionId,
        task_id: body.taskId,
        task_position: body.taskPosition,
        query_text: body.queryText,
        word_count: body.wordCount,
        timestamp: body.timestamp,
      }))
    } else if (type === 'click') {
      logIfError('click', await supabase.from('clicks').insert({
        session_id: body.sessionId,
        task_id: body.taskId,
        task_position: body.taskPosition,
        url: body.url,
        domain: body.domain,
        rank: body.rank,
        dwell_time_seconds: body.dwellTimeSeconds ?? null,
        timestamp: body.timestamp,
      }))
    } else if (type === 'answer_cancel') {
      logIfError('answer_cancel', await supabase.from('answer_cancels').insert({
        session_id: body.sessionId,
        task_id: body.taskId,
        task_position: body.taskPosition,
        timestamp: body.timestamp,
      }))
    } else if (type === 'answer') {
      logIfError('answer', await supabase.from('answers').insert({
        session_id: body.sessionId,
        task_id: body.taskId,
        task_position: body.taskPosition,
        answer_text: body.answerText,
        timestamp: body.timestamp,
      }))
    } else if (type === 'intervention') {
      logIfError('intervention', await supabase.from('interventions').insert({
        session_id: body.sessionId,
        task_id: body.taskId,
        task_position: body.taskPosition,
        trigger_type: body.triggerType,
        was_shown: body.wasShown,
        message_text: body.messageText ?? null,
        was_dynamic: body.wasDynamic ?? false,
        generation_time_ms: body.generationTimeMs ?? null,
        timestamp: body.timestamp,
      }))
    }
  } catch (err) {
    console.error('[track]', err)
  }

  return Response.json({ ok: true })
}
