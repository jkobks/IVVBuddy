import type { DynamicTriggerType, TriggerType } from '@/types'

// Trigger 2 und 7 sind voll dynamisch (KI schlägt Suchbegriffe vor),
// Trigger 1 und 3 sind halb dynamisch (KI greift Kontext auf, macht aber keinen inhaltlichen Vorschlag).
// Alle anderen Trigger nutzen ausschließlich den festen Text unten.
export const DYNAMIC_TRIGGER_TYPES: DynamicTriggerType[] = [
  'top1_bias',
  'query_stagnation',
  'single_domain',
  'no_refinement',
]

// Fallback-Texte: werden angezeigt wenn ein Trigger fest ist, oder wenn die
// LLM-Generierung für einen dynamischen Trigger fehlschlägt/zu lange dauert.
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
export const INTERVENTION_COOLDOWN_MS = 0
export const BUBBLE_DISMISS_MS = 8_000

// Platzhaltertext während die LLM-Nachricht generiert wird
export const BUDDY_PLACEHOLDER = '···'
// Max. Wartezeit auf die LLM-Antwort, danach Fallback auf den festen Text.
// Gemessene reale Latenz von claude-haiku-4-5 für diese Prompt-Länge liegt bei ~1.5-6s;
// bei 4s wäre ein Großteil der erfolgreichen Generierungen abgebrochen worden.
export const LLM_TIMEOUT_MS = 7_000
export const QUICK_DECISION_THRESHOLD_MS = 45_000
export const STAGNATION_THRESHOLD = 0.5
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
