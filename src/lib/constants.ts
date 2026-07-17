import type { TriggerType } from '@/types'

export const BUDDY_MESSAGES: Record<TriggerType, string> = {
  top3_bias:
    'Du klickst vor allem auf die obersten Ergebnisse — weiter unten stehen oft andere Perspektiven.',
  query_stagnation:
    'Du suchst schon ähnlich — ein ganz anderer Begriff könnte neue Ergebnisse bringen.',
  single_domain:
    'Du bist oft auf derselben Domain gelandet — andere Quellen könnten ein anderes Bild zeigen.',
  quick_decision:
    'Das ging schnell — bist du sicher, dass du genug gesehen hast?',
  struggling:
    'Du springst zwischen Ergebnissen — vielleicht hilft ein anderer Suchbegriff statt mehr Ergebnisse durchzuklicken?',
  snippet_only:
    'Du liest bisher nur die Kurzvorschauen — die Originalseite zeigt oft mehr Kontext.',
  no_refinement:
    'Deine Suchbegriffe bleiben kurz — ein spezifischerer Begriff könnte gezieltere Ergebnisse bringen.',
}

export const MAX_INTERVENTIONS = 3           // shown interventions per task
export const INTERVENTION_COOLDOWN_MS = 20_000 // min. gap between two shown interventions
export const BUBBLE_DISMISS_MS = 8_000

// Trigger 1 — Top-3 Bias (task-übergreifend)
export const TOP_BIAS_MIN_CLICKS = 2
export const TOP_BIAS_MAX_RANK = 3

// Trigger 2 — Query-Stagnation (task-übergreifend)
export const STAGNATION_THRESHOLD = 0.5

// Trigger 3 — Single Domain (task-übergreifend)
export const SINGLE_DOMAIN_MIN_CLICKS = 3
export const SINGLE_DOMAIN_RATIO = 0.7

// Trigger 4 — Schnellentscheidung (pro Task)
export const QUICK_DECISION_THRESHOLD_MS = 45_000
export const QUICK_DECISION_MAX_CLICKS = 1

// Trigger 5 — Struggling (task-übergreifend)
export const STRUGGLING_DWELL_THRESHOLD_S = 5
export const STRUGGLING_BOUNCE_COUNT = 2

// Trigger 6 — Snippet-only (pro Task)
export const SNIPPET_ONLY_QUERY_THRESHOLD = 3

// Trigger 7 — Fehlende Begriffsverfeinerung (task-übergreifend, nur letzte 2 Queries)
export const NO_REFINEMENT_LOOKBACK = 2
export const NO_REFINEMENT_MAX_WORDS = 2
