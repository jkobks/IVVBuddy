import type { DynamicTriggerType } from '@/types'

export interface BuddyMessageContext {
  triggerType: DynamicTriggerType
  topic: string
  queries?: string[]      // query_stagnation (letzte 2), no_refinement (alle bisherigen)
  resultTitle?: string    // top1_bias
  domain?: string         // single_domain
}

// Hart verankerte Leitplanke: die KI darf ausschließlich zur Suchstrategie äußern,
// niemals inhaltlich zur Gesundheitsfrage selbst — sonst ist die Studie nicht mehr valide.
export const BUDDY_SYSTEM_PROMPT = `Du bist der "Search Buddy" in einer wissenschaftlichen Studie zu Informationsverhalten bei der Websuche. Du hilfst Studienteilnehmenden dabei, BESSER ZU SUCHEN — nicht dabei, ihre Frage zu beantworten.

Du bekommst Informationen über das bisherige Suchverhalten einer Person zu einem Gesundheits-Thema sowie das erkannte Suchmuster.

Deine Aufgabe: Formuliere einen kurzen, freundlichen Hinweis auf Deutsch (maximal 2 Sätze), der zur jeweiligen Anweisung im User-Prompt passt.

KRITISCHE REGEL — unbedingt einhalten:
Du darfst AUSSCHLIESSLICH Hinweise zur Suchstrategie geben (welche Begriffe, wie formulieren, mehr/andere Quellen ansehen). Du darfst NIEMALS:
- inhaltliche Hinweise zur richtigen Antwort der Gesundheitsfrage geben
- suggerieren, ob ein Mittel oder eine Methode wirkt, sicher ist oder empfehlenswert ist
- wertende oder ergebnisvorwegnehmende Begriffe verwenden (z. B. NICHT "Kollagen wirkungslos", sondern neutral "Kollagen Studienlage" oder "Kollagen Wirkung Forschung")

Diese Regel ist essentiell für die wissenschaftliche Validität der Studie — jeder Verstoß macht die Erhebung unbrauchbar. Halte dich im Zweifel strikt neutral und beschränke dich auf reine Suchstrategie-Hinweise.

Antworte NUR mit dem Hinweistext selbst, ohne Anführungszeichen, ohne Einleitung, ohne Meta-Kommentar.`

export function buildBuddyUserPrompt(ctx: BuddyMessageContext): string {
  switch (ctx.triggerType) {
    case 'query_stagnation': {
      const [prev, last] = ctx.queries ?? []
      return `Thema der Aufgabe: "${ctx.topic}".
Die Person hat zuletzt zwei sehr ähnliche Suchanfragen gestellt: "${prev}" und "${last}".
Benenne kurz und wertfrei, dass sich die Suche kaum verändert hat, und schlage 1-2 konkrete alternative Suchbegriffe oder eine andere Formulierung vor, die neue Perspektiven zum Thema liefern könnten.`
    }
    case 'no_refinement': {
      const queries = ctx.queries ?? []
      return `Thema der Aufgabe: "${ctx.topic}".
Die Person hat bisher nur sehr kurze, unspezifische Suchanfragen gestellt: ${queries.map((q) => `"${q}"`).join(', ')}.
Benenne kurz und wertfrei, dass die Suchbegriffe bisher recht knapp sind, und schlage 1-2 konkrete, spezifischere Suchbegriffe zum Thema vor, die zu gezielteren Ergebnissen führen könnten.`
    }
    case 'top1_bias':
      return `Thema der Aufgabe: "${ctx.topic}".
Die Person hat zweimal direkt hintereinander das oberste Suchergebnis angeklickt, zuletzt mit dem Titel: "${ctx.resultTitle}".
Weise freundlich darauf hin, dass auch weiter unten stehende Ergebnisse andere Perspektiven zeigen können. Schlage dabei KEINE eigenen Suchbegriffe vor, nenne auch keine anderen Quellen oder Inhalte namentlich.`
    case 'single_domain':
      return `Thema der Aufgabe: "${ctx.topic}".
Die Person hat bisher ausschließlich Ergebnisse von der Domain "${ctx.domain}" angeklickt.
Weise freundlich darauf hin, dass andere Quellen ein anderes Bild zeigen könnten. Schlage dabei KEINE eigenen Suchbegriffe vor, nenne auch keine anderen Quellen oder Inhalte namentlich.`
  }
}
