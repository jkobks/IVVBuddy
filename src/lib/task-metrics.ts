import { jaccardSimilarity } from '@/lib/similarity'

const VALID_TASK_MIN_SECONDS = 20

export interface SessionRow {
  id: string
  condition: string
  reloaded: boolean
}

export interface TaskSessionRow {
  session_id: string
  task_id: string
  task_position: number
  task_start_time: string
  task_end_time: string | null
}

export interface QueryRow {
  session_id: string
  task_id: string | null
  query_text: string
  timestamp: string
}

export interface ClickRow {
  session_id: string
  task_id: string | null
  domain: string
  rank: number
}

export interface InterventionRow {
  session_id: string
  task_id: string | null
  was_shown: boolean
}

export interface AnswerRow {
  session_id: string
  task_id: string | null
  answer_text: string
}

export interface TaskMetricRow {
  session_id: string
  condition: string
  task_id: string
  task_position: number
  task_start_time: string
  task_end_time: string | null
  time_on_task_s: number | null
  query_count: number
  click_count: number
  unique_domains: number
  // Anteil der Klicks in dieser Task auf Rang 1 (nicht zu verwechseln mit dem
  // top3_bias-Trigger, der Rang 1-3 betrachtet) — null wenn 0 Klicks.
  top1_click_ratio: number | null
  // Mittlere Unähnlichkeit (1 - Jaccard) zwischen aufeinanderfolgenden Queries dieser
  // Task — höher = mehr Vokabular-Variation zwischen den Suchanfragen. Null wenn < 2 Queries.
  query_diversity_mean: number | null
  interventions_shown: number
  answer_text: string | null
  valid_task: boolean
}

export function computeTaskMetrics(
  sessionRows: SessionRow[],
  taskSessionRows: TaskSessionRow[],
  queryRows: QueryRow[],
  clickRows: ClickRow[],
  interventionRows: InterventionRow[],
  answerRows: AnswerRow[]
): TaskMetricRow[] {
  const conditionBySession = new Map(sessionRows.map((s) => [s.id, s.condition]))

  return taskSessionRows.map((ts) => {
    const tQueries = queryRows.filter((q) => q.session_id === ts.session_id && q.task_id === ts.task_id)
    const tClicks = clickRows.filter((c) => c.session_id === ts.session_id && c.task_id === ts.task_id)
    const tInterventions = interventionRows.filter(
      (iv) => iv.session_id === ts.session_id && iv.task_id === ts.task_id
    )
    const tAnswer = answerRows.find((a) => a.session_id === ts.session_id && a.task_id === ts.task_id)

    const time_on_task_s =
      ts.task_end_time != null
        ? (new Date(ts.task_end_time).getTime() - new Date(ts.task_start_time).getTime()) / 1000
        : null

    const top1_click_ratio =
      tClicks.length > 0 ? tClicks.filter((c) => c.rank === 1).length / tClicks.length : null

    let query_diversity_mean: number | null = null
    if (tQueries.length >= 2) {
      const dissimilarities: number[] = []
      for (let i = 1; i < tQueries.length; i++) {
        dissimilarities.push(1 - jaccardSimilarity(tQueries[i - 1].query_text, tQueries[i].query_text))
      }
      query_diversity_mean = dissimilarities.reduce((a, b) => a + b, 0) / dissimilarities.length
    }

    const valid_task =
      tQueries.length >= 1 && tAnswer != null && time_on_task_s != null && time_on_task_s >= VALID_TASK_MIN_SECONDS

    return {
      session_id: ts.session_id,
      condition: conditionBySession.get(ts.session_id) ?? '',
      task_id: ts.task_id,
      task_position: ts.task_position,
      task_start_time: ts.task_start_time,
      task_end_time: ts.task_end_time,
      time_on_task_s,
      query_count: tQueries.length,
      click_count: tClicks.length,
      unique_domains: new Set(tClicks.map((c) => c.domain)).size,
      top1_click_ratio,
      query_diversity_mean,
      interventions_shown: tInterventions.filter((iv) => iv.was_shown).length,
      answer_text: tAnswer?.answer_text ?? null,
      valid_task,
    }
  })
}

export interface AggregatedSessionRow {
  session_id: string
  condition: string
  reloaded: boolean
  n_tasks: number
  n_valid_tasks: number
  avg_time_on_task_s: number | null
  avg_query_count: number | null
  avg_click_count: number | null
  avg_unique_domains: number | null
  avg_top1_click_ratio: number | null
  avg_query_diversity_mean: number | null
  avg_interventions_shown: number | null
}

function avgIgnoringNulls(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n != null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

export function computeAggregatedRows(
  sessionRows: SessionRow[],
  taskMetricRows: TaskMetricRow[]
): AggregatedSessionRow[] {
  return sessionRows.map((session) => {
    const rows = taskMetricRows.filter((r) => r.session_id === session.id)
    return {
      session_id: session.id,
      condition: session.condition,
      reloaded: session.reloaded,
      n_tasks: rows.length,
      n_valid_tasks: rows.filter((r) => r.valid_task).length,
      avg_time_on_task_s: avgIgnoringNulls(rows.map((r) => r.time_on_task_s)),
      avg_query_count: avgIgnoringNulls(rows.map((r) => r.query_count)),
      avg_click_count: avgIgnoringNulls(rows.map((r) => r.click_count)),
      avg_unique_domains: avgIgnoringNulls(rows.map((r) => r.unique_domains)),
      avg_top1_click_ratio: avgIgnoringNulls(rows.map((r) => r.top1_click_ratio)),
      avg_query_diversity_mean: avgIgnoringNulls(rows.map((r) => r.query_diversity_mean)),
      avg_interventions_shown: avgIgnoringNulls(rows.map((r) => r.interventions_shown)),
    }
  })
}
