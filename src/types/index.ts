export type Condition = 'buddy' | 'control'

export type TriggerType =
  | 'top1_bias'
  | 'query_stagnation'
  | 'single_domain'
  | 'quick_decision'
  | 'struggling'
  | 'snippet_only'
  | 'no_refinement'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  displayLink: string
  rank: number
}

export interface ClickRecord {
  domain: string
  rank: number
}

export interface PendingClick {
  result: SearchResult
  clickTime: number
}

export interface SessionState {
  sessionId: string
  condition: Condition
  startTime: number
  taskOrder: string[]   // task IDs in shuffled order for this session
  taskIndex: number     // current position (0–3)
  ready: boolean
}
