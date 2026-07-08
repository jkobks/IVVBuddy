# IVV — Informationsverhalten & Verzerrungen

Eine empirische Studie zur Untersuchung von Suchverhalten und kognitiven Verzerrungen bei der Online-Recherche. Das Experiment ist **between-subjects** bezüglich Condition und **within-subjects** bezüglich Task:

- **buddy**: Nutzer erhalten kontextsensitives Feedback durch einen animierten "Search Buddy"
- **control**: Identische Oberfläche ohne jegliches Buddy-Feedback

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Datenbank**: Supabase (PostgreSQL)
- **Suchmaschine**: Google Custom Search API

---

## Studienablauf pro Teilnehmer

Jede Person durchläuft **alle 4 Tasks** (Kollagen, Apfelessig, Zucker, Blaulicht) in einer **zufällig gemischten Reihenfolge** (Fisher-Yates-Shuffle bei Session-Start). Die Reihenfolge wird in `sessionStorage` als `sb_task_order` (JSON-Array) gespeichert.

```
Task 1 → Suchinterface → Antwort abgeben → Zwischenseite → Task 2 → … → Task 4 → Abschlussseite
```

- Die **Condition** (buddy / control) bleibt über alle 4 Tasks **konstant**.
- Die Zwischenseite zeigt eine kurze Vorschau der nächsten Aufgabe.
- Nach Task 4 erscheint eine Abschlussseite ("Vielen Dank!").

### Randomisierung

- Condition: 50/50-Zufallszuweisung bei Session-Start (URL-Override `?condition=buddy|control` für Tests)
- Task-Reihenfolge: Fisher-Yates-Shuffle über alle 4 Tasks (URL-Override `?task=<id>` setzt diesen Task an erste Position, Rest bleibt gemischt)

---

## Buddy Trigger-Logik

Jeder Trigger feuert maximal **einmal pro Task**. Trigger-Zustand und Interventions-Zähler werden bei jedem Task-Wechsel zurückgesetzt (durch Re-Mount der `TaskSearchView`-Komponente via `key={taskIndex}`).

### Interventions-Limit pro Task

- Maximal **3 Interventionen pro Task**
- Zwischen zwei angezeigten Interventionen gilt ein **Cooldown von 30 Sekunden**
- Sind mehrere Bedingungen gleichzeitig erfüllt, wird der zuerst erkannte Trigger angezeigt; die anderen werden verworfen, aber als `was_shown=false` geloggt

Die Trigger-Erkennung läuft in `src/hooks/usePatternDetector.ts`. Die Anzeige-Entscheidung liegt in `src/components/buddy/BuddyContainer.tsx`.

---

### Trigger 1 — Top-1 Bias

**Bedingung:** Die letzten 2 Klicks innerhalb des Tasks haben jeweils Rang 1.

```
clickHistory.slice(-2).every(c => c.rank === 1)
```

**Nachricht:** „Du hast direkt das erste Ergebnis geöffnet — weiter unten stehen oft andere Perspektiven."

**Literatur:** Joachims et al. (2005) zeigen, dass Nutzer stark zum ersten Suchergebnis tendieren, auch wenn es nicht das relevanteste ist (Positional Bias). Pan et al. (2007) bestätigen dies mit Eye-Tracking-Daten.

---

### Trigger 2 — Query-Stagnation

**Bedingung:** Die letzte und die vorletzte Query haben eine Jaccard-Ähnlichkeit ≥ 0.8 (nahezu identische Suchbegriffe).

```
jaccardSimilarity(queryHistory[n-1], queryHistory[n-2]) >= 0.8
```

**Nachricht:** „Du suchst schon ähnlich — ein ganz anderer Begriff könnte neue Ergebnisse bringen."

**Literatur:** Wildemuth (2004) beschreibt Suchstagnation als typisches Merkmal von Suchsessions ohne Fortschritt.

---

### Trigger 3 — Single Domain

**Bedingung:** Ab dem 3. Klick: alle bisherigen Klicks innerhalb des Tasks führten zur selben Domain.

```
clickHistory.length >= 3 &&
new Set(clickHistory.map(c => c.domain)).size === 1
```

**Nachricht:** „Du warst bisher auf ähnlichen Seiten — andere Quellen könnten ein anderes Bild zeigen."

**Literatur:** Rieh & Hilligoss (2008) zur Quellendiversität.

---

### Trigger 4 — Schnellentscheidung

**Bedingung:** Nutzer öffnet das Antwortformular innerhalb von 45 Sekunden nach Task-Start (jede Task hat eine eigene Startzeit).

```
Date.now() - taskStartTime < 45_000
```

**Nachricht:** „Das ging schnell — bist du sicher, dass du genug gesehen hast?"

**Literatur:** Bink et al. (2026), Tip 1; Savolainen (2006).

---

### Trigger 5 — Struggling / Bounce-Muster

**Bedingung:** Ein Ergebnis wurde angeklickt und die Verweildauer (dwell_time) war < 5 Sekunden. Dieses Muster tritt **2-mal** innerhalb des Tasks auf.

```
dwell < 5s  →  bounceCount++
bounceCount >= 2  →  Trigger feuert
```

**Nachricht:** „Du springst zwischen Ergebnissen — vielleicht hilft ein anderer Suchbegriff statt mehr Ergebnisse durchzuklicken?"

---

### Trigger 6 — Snippet-only Verhalten

**Bedingung:** Mindestens 3 Queries wurden abgeschickt, aber insgesamt 0 Klicks auf Ergebnisse erfolgten.

```
queryHistory.length >= 3 && clickHistory.length === 0
```

**Nachricht:** „Du liest bisher nur die Kurzvorschauen — die Originalseite zeigt oft mehr Kontext."

**Literatur:** Bink et al. (2026), Tip 3; Tombros & Sanderson (1998).

---

### Trigger 7 — Fehlende Begriffsverfeinerung

**Bedingung:** Mindestens 3 Queries wurden abgeschickt, und **alle** bisherigen Queries bestehen aus höchstens 2 Wörtern.

```
queryHistory.length >= 3 &&
queryHistory.every(q =>
  q.trim().split(/\s+/).filter(Boolean).length <= 2
)
```

**Nachricht:** „Deine Suchbegriffe bleiben kurz — ein spezifischerer Begriff könnte gezieltere Ergebnisse bringen."

**Literatur:** Elsweiler (2026); Harvey, Pointon & Elsweiler (2015).

---

## Dynamische Buddy-Nachrichten (LLM)

Die **Trigger-Erkennung bleibt vollständig deterministisch** (siehe Trigger 1–7 oben) — Timing, Bedingungen, das Interventions-Limit und die `was_shown`-Logik sind davon unberührt. Dynamisch ist **nur die Formulierung** der angezeigten Nachricht, und auch das nur für einen Teil der Trigger, und nur in der `buddy`-Condition (die `control`-Gruppe zeigt ohnehin nie eine Nachricht).

### Welche Trigger dynamisch sind

| Grad | Trigger | Was die KI bekommt | Was die KI liefert |
|------|---------|--------------------|---------------------|
| **Voll dynamisch** | 2 Query-Stagnation | die letzten 2 Queries + Task-Thema | benennt das Muster + schlägt 1-2 alternative Suchbegriffe vor |
| **Voll dynamisch** | 7 Fehlende Verfeinerung | alle bisherigen Queries + Task-Thema | benennt das Muster + schlägt 1-2 spezifischere Suchbegriffe vor |
| **Halb dynamisch** | 1 Top-1 Bias | Titel des zuletzt geklickten Rang-1-Ergebnisses | greift den Titel auf, **kein** inhaltlicher Suchvorschlag |
| **Halb dynamisch** | 3 Single Domain | die mehrfach besuchte Domain | benennt die Domain, **kein** inhaltlicher Suchvorschlag |
| Fest | 4 Schnellentscheidung, 5 Struggling, 6 Snippet-only | — | immer der feste Text von oben |

Zuständig: `src/lib/buddyMessage.ts` (Client, Kontext-Auswahl + Fetch mit Timeout) und `src/app/api/buddy-message/route.ts` (Server-Proxy zur Gemini API). Die Anzeige-Orchestrierung liegt weiterhin in `src/components/buddy/BuddyContainer.tsx`.

### LLM-Integration

- **Modell:** `gemini-2.5-flash` (Google Generative AI API — schnell + günstig, für kurze Nachrichten ausreichend)
- **Aufruf:** ausschließlich server-side über `/api/buddy-message` — der Gemini-API-Key (`GEMINI_API_KEY`) ist nie im Client sichtbar
- **Input:** `trigger_type`, Task-Thema (`task.topic`, z. B. `"Kollagen gegen Falten"`), plus je nach Trigger die relevanten Query-Historie-Einträge, der Ergebnis-Titel (Trigger 1) oder die Domain (Trigger 3)
- **Output:** ein kurzer deutscher Satz (max. 2 Sätze), freundlicher Ton, im Stil der bisherigen festen Buddy-Nachrichten

### System-Prompt (für Reproduzierbarkeit)

```
Du bist der "Search Buddy" in einer wissenschaftlichen Studie zu Informationsverhalten bei der Websuche. Du hilfst Studienteilnehmenden dabei, BESSER ZU SUCHEN — nicht dabei, ihre Frage zu beantworten.

Du bekommst Informationen über das bisherige Suchverhalten einer Person zu einem Gesundheits-Thema sowie das erkannte Suchmuster.

Deine Aufgabe: Formuliere einen kurzen, freundlichen Hinweis auf Deutsch (maximal 2 Sätze), der zur jeweiligen Anweisung im User-Prompt passt.

KRITISCHE REGEL — unbedingt einhalten:
Du darfst AUSSCHLIESSLICH Hinweise zur Suchstrategie geben (welche Begriffe, wie formulieren, mehr/andere Quellen ansehen). Du darfst NIEMALS:
- inhaltliche Hinweise zur richtigen Antwort der Gesundheitsfrage geben
- suggerieren, ob ein Mittel oder eine Methode wirkt, sicher ist oder empfehlenswert ist
- wertende oder ergebnisvorwegnehmende Begriffe verwenden (z. B. NICHT "Kollagen wirkungslos", sondern neutral "Kollagen Studienlage" oder "Kollagen Wirkung Forschung")

Diese Regel ist essentiell für die wissenschaftliche Validität der Studie — jeder Verstoß macht die Erhebung unbrauchbar. Halte dich im Zweifel strikt neutral und beschränke dich auf reine Suchstrategie-Hinweise.

Antworte NUR mit dem Hinweistext selbst, ohne Anführungszeichen, ohne Einleitung, ohne Meta-Kommentar.
```

Der jeweilige User-Prompt wird pro Trigger in `src/lib/buddyPrompt.ts` (`buildBuddyUserPrompt`) zusammengesetzt und enthält den oben genannten Kontext.

**Inhaltliche Einschränkung:** Der Buddy hilft ausschließlich beim **besseren Suchen** (Begriffe, Formulierung, Quellenvielfalt) — niemals beim Beantworten der Gesundheitsfrage selbst. Das ist Bedingung für die wissenschaftliche Validität der Studie: Ein Buddy, der inhaltlich Position bezieht, würde die zu untersuchende Suchentscheidung der Teilnehmenden verzerren statt nur ihr Suchverhalten zu unterstützen.

### Latenz- und Fallback-Verhalten

Der LLM-Call kann 1–3 s dauern, der Buddy soll aber zeitnah zum Trigger erscheinen:

1. Trigger feuert → Buddy erscheint **sofort** mit einem neutralen Platzhalter (`···`).
2. Sobald die generierte Nachricht eintrifft, ersetzt sie den Platzhalter; die 8-Sekunden-Anzeigedauer (`BUBBLE_DISMISS_MS`) startet erst ab diesem Zeitpunkt neu.
3. **Timeout:** Antwortet die API nicht innerhalb von 4 s (`LLM_TIMEOUT_MS`), bricht der Client-Request ab.
4. **Fehlerfall:** Schlägt der API-Call fehl (Netzwerkfehler, fehlender Key, Rate-Limit, leere Antwort) oder Timeout greift → Fallback auf den **festen Text** dieses Triggers (`BUDDY_MESSAGES`, siehe `src/lib/constants.ts`). Jeder dynamische Trigger hat also garantiert einen festen Fallback-Text.
5. Wechselt die Task, bevor eine laufende Generierung abgeschlossen ist, wird die Intervention beim Unmount sofort mit dem Fallback-Text geloggt statt verworfen (kein Datenverlust in der Auswertung).

### Logging-Erweiterung

Zusätzlich zu den bisherigen Feldern speichert `interventions` pro Eintrag:

| Feld | Bedeutung |
|------|-----------|
| `message_text` | der tatsächlich angezeigte Text — dynamisch generiert oder Fallback |
| `was_dynamic` | `true` = Text kam vom LLM, `false` = fester Fallback-Text wurde genutzt |
| `generation_time_ms` | Dauer des LLM-Calls in ms; `NULL` wenn kein Call gemacht wurde (fester Trigger, Control-Gruppe, Limit erreicht oder Trigger nicht angezeigt) |

Diese Felder sind zentral für die Auswertung (z. B. Anteil erfolgreicher LLM-Generierungen, Effekt dynamischer vs. fester Formulierung) und für die Reproduzierbarkeit im Paper.

---

## Interventions-Logik (Zusammenfassung)

| # | Trigger | Feuert nach … | Formulierung |
|---|---------|--------------|---------------|
| 1 | Top-1 Bias | 2 aufeinanderfolgenden Rang-1-Klicks | halb dynamisch |
| 2 | Query-Stagnation | 2 ähnlichen Queries (Jaccard ≥ 0.8) | voll dynamisch |
| 3 | Single Domain | 3 Klicks zur selben Domain | halb dynamisch |
| 4 | Schnellentscheidung | Antwortformular < 45 s nach Task-Start | fest |
| 5 | Struggling | 2 Bounces mit dwell < 5 s | fest |
| 6 | Snippet-only | 3+ Queries, 0 Klicks | fest |
| 7 | Fehlende Verfeinerung | 3+ Queries, alle ≤ 2 Wörter | voll dynamisch |

**Regeln (pro Task):**
- Maximal **3 Interventionen pro Task** werden angezeigt.
- Jeder Trigger-Typ feuert **einmal pro Task** (bei Task-Wechsel zurückgesetzt).
- Cooldown von **30 Sekunden** zwischen zwei angezeigten Interventionen.
- Nach 3 gezeigten Interventionen bleibt der Buddy für den Rest des Tasks inaktiv.

---

## Logging-Strategie für die Auswertung

In **beiden** Bedingungen werden alle 7 Trigger-Bedingungen kontinuierlich ausgewertet und geloggt — unabhängig davon, ob der Nutzer den Buddy sieht.

### Das `was_shown`-Feld

| `was_shown` | Bedeutung |
|-------------|-----------|
| `true` | Trigger erfüllt, Buddy-Nachricht angezeigt (buddy-Gruppe, innerhalb Limit + Cooldown) |
| `false` | Trigger erfüllt, keine Nachricht — Control-Gruppe, Trigger bereits gefeuert, Limit erreicht oder Cooldown aktiv |

---

## Datenbankschema

### `sessions`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Session-ID |
| `condition` | TEXT | `'buddy'` oder `'control'` |
| `task_order` | TEXT[] | Randomisierte Reihenfolge der 4 Task-IDs |
| `start_time` | TIMESTAMPTZ | Session-Start |
| `end_time` | TIMESTAMPTZ | Session-Ende (bei beforeunload) |

### `task_sessions`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Fremdschlüssel → sessions |
| `task_id` | TEXT | Aufgaben-ID (z. B. `'kollagen'`) |
| `task_position` | INT | Position in der randomisierten Reihenfolge (1–4) |
| `task_start_time` | TIMESTAMPTZ | Start des Tasks |
| `task_end_time` | TIMESTAMPTZ | Ende des Tasks (bei Antwort-Submit) |

### `queries`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Fremdschlüssel → sessions |
| `task_id` | TEXT | Aufgaben-ID |
| `task_position` | INT | Reihenfolge-Position (1–4) |
| `query_text` | TEXT | Suchanfrage |
| `word_count` | INT | Anzahl Wörter (für Trigger 7) |
| `timestamp` | TIMESTAMPTZ | Zeitpunkt |

### `clicks`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Fremdschlüssel → sessions |
| `task_id` | TEXT | Aufgaben-ID |
| `task_position` | INT | Reihenfolge-Position (1–4) |
| `url` | TEXT | Geklickte URL |
| `domain` | TEXT | Domain des Ergebnisses |
| `rank` | INT | Position in der Ergebnisliste |
| `dwell_time_seconds` | FLOAT | Zeit bis zur nächsten Nutzeraktion in Sekunden |
| `timestamp` | TIMESTAMPTZ | Zeitpunkt des Klicks |

### `answers`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Fremdschlüssel → sessions |
| `task_id` | TEXT | Aufgaben-ID |
| `task_position` | INT | Reihenfolge-Position (1–4) |
| `answer_text` | TEXT | Eingegebene Antwort |
| `timestamp` | TIMESTAMPTZ | Zeitpunkt |

### `interventions`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Fremdschlüssel → sessions |
| `task_id` | TEXT | Aufgaben-ID |
| `task_position` | INT | Reihenfolge-Position (1–4) |
| `trigger_type` | TEXT | Einer der 7 Trigger-Typen |
| `was_shown` | BOOLEAN | `true` = angezeigt, `false` = erfüllt aber verworfen |
| `message_text` | TEXT | Tatsächlich angezeigter Text (dynamisch oder Fallback), `NULL` wenn nicht angezeigt |
| `was_dynamic` | BOOLEAN | `true` = Text vom LLM generiert, `false` = fester Fallback-Text |
| `generation_time_ms` | FLOAT | Dauer des LLM-Calls in ms, `NULL` wenn kein Call gemacht wurde |
| `timestamp` | TIMESTAMPTZ | Zeitpunkt der Trigger-Erkennung |

---

## Gültigkeitskriterium (valid_task)

Eine Task gilt als gültig, wenn:
- Mindestens 1 Query wurde abgeschickt
- Eine Antwort wurde eingereicht
- `task_end_time - task_start_time >= 20 Sekunden`

Eine Person kann 3 gültige und 1 ungültige Task haben — bei der Auswertung pro Task filterbar.

---

## CSV-Export

**Pro-Task-Export** (`/api/admin/export`): eine Zeile pro Task-Durchlauf — 4 Zeilen pro Person.

Spalten: `session_id`, `condition`, `task_id`, `task_position`, `task_start_time`, `task_end_time`, `time_on_task_s`, `query_count`, `click_count`, `unique_domains`, `top1_click_ratio`, `query_diversity_mean`, `interventions_shown`, `answer_text`, `valid_task`

**Aggregierter Export** (`/api/admin/export-aggregated`): eine Zeile pro Person, Metriken als Mittelwert über die 4 Tasks.

---

## Setup

```bash
# Abhängigkeiten installieren
npm install

# Umgebungsvariablen setzen (.env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GOOGLE_API_KEY=...
GOOGLE_CSE_ID=...
GEMINI_API_KEY=...      # für dynamische Buddy-Nachrichten, siehe "Dynamische Buddy-Nachrichten (LLM)"

# Datenbank-Migrationen ausführen (Supabase Dashboard oder CLI)
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_new_triggers_and_tracking.sql
# supabase/migrations/003_multi_task.sql
# supabase/migrations/004_answer_cancels.sql
# supabase/migrations/005_dynamic_buddy_messages.sql

# Entwicklungsserver starten
npm run dev
```

### URL-Parameter für Tests

| Parameter | Beispiel | Wirkung |
|-----------|---------|---------|
| `condition` | `?condition=buddy` | Condition überschreiben |
| `task` | `?task=kollagen` | Ersten Task festlegen (Rest bleibt gemischt) |
