import type { TriggerType } from '@/types'

export const BUDDY_MESSAGES: Record<TriggerType, string> = {
  top1_bias:
    'Du hast direkt das erste Ergebnis geöffnet — weiter unten stehen oft andere Perspektiven.',
  query_stagnation:
    'Du suchst schon ähnlich — ein ganz anderer Begriff könnte neue Ergebnisse bringen.',
  single_domain:
    'Du warst bisher auf ähnlichen Seiten — andere Quellen könnten ein anderes Bild zeigen.',
  quick_decision:
    'Das ging schnell — bist du sicher, dass du genug gesehen hast?',
  struggling:
    'Du springst zwischen Ergebnissen — vielleicht hilft ein anderer Suchbegriff statt mehr Ergebnisse durchzuklicken?',
  snippet_only:
    'Du liest bisher nur die Kurzvorschauen — die Originalseite zeigt oft mehr Kontext.',
  no_refinement:
    'Deine Suchbegriffe bleiben kurz — ein spezifischerer Begriff könnte gezieltere Ergebnisse bringen.',
}

export const MAX_INTERVENTIONS = 3           // per task
export const INTERVENTION_COOLDOWN_MS = 30_000 // min gap between shown interventions within a task
export const BUBBLE_DISMISS_MS = 8_000
export const QUICK_DECISION_THRESHOLD_MS = 45_000
export const STAGNATION_THRESHOLD = 0.8
export const TOP1_CONSECUTIVE_THRESHOLD = 2
export const SINGLE_DOMAIN_THRESHOLD = 3

// Trigger 5 — Struggling
export const STRUGGLING_DWELL_THRESHOLD_S = 5
export const STRUGGLING_BOUNCE_COUNT = 2

// Trigger 6 — Snippet-only
export const SNIPPET_ONLY_QUERY_THRESHOLD = 3

// Trigger 7 — Fehlende Begriffsverfeinerung
export const NO_REFINEMENT_QUERY_THRESHOLD = 3
export const NO_REFINEMENT_MAX_WORDS = 2
