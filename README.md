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

Jeder Trigger feuert maximal **einmal pro Task**. Trigger-Zustand, Interventions-Zähler und Cooldown-Timer werden bei jedem Task-Wechsel zurückgesetzt (durch Re-Mount der `TaskSearchView`-Komponente via `key={taskIndex}`, was `BuddyContainer` mit-remounted).

### Interventions-Limit pro Task

- Maximal **3 angezeigte Interventionen pro Task**
- Jeder Trigger-Typ feuert **maximal einmal pro Task**
- Zwischen zwei **angezeigten** Interventionen gilt ein **Cooldown von 20 Sekunden**
- Bei Task-Wechsel werden Interventions-Zähler, Cooldown-Timer und die Liste bereits gefeuerter Trigger zurückgesetzt
- Trigger, die wegen Limit **oder** Cooldown nicht angezeigt werden, werden trotzdem mit `was_shown=false` (inkl. `trigger_type` und `timestamp`) in der `interventions`-Tabelle geloggt — Datenverlust in der Auswertung wird so vermieden
- Sind mehrere Bedingungen gleichzeitig erfüllt, wird der zuerst erkannte Trigger angezeigt; die anderen werden ebenfalls mit `was_shown=false` geloggt

**Begründung:** Das Limit von 3 Interventionen pro Task und der 20-Sekunden-Cooldown verhindern „Overprompting". Mudrick et al. zeigen, dass eine hohe Interventionsfrequenz eines pädagogischen Agenten Langeweile vorhersagt und die Autonomie des Nutzers untergräbt. *(DOI dieser Quelle muss noch verifiziert werden.)*

Die Trigger-Erkennung läuft in `src/hooks/usePatternDetector.ts`. Die Anzeige-Entscheidung (inkl. Limit/Cooldown) liegt in `src/components/buddy/BuddyContainer.tsx`.

---

### Trigger 1 — Top-1 Bias

**Bedingung:** Die letzten 2 Klicks innerhalb des Tasks haben jeweils Rang 1.

```
clickHistory.slice(-2).every(c => c.rank === 1)
```

**Nachricht:** „Du hast direkt das erste Ergebnis geöffnet — weiter unten stehen oft andere Perspektiven."

**Begründung:** Nutzer verlassen sich übermäßig auf das erstgereihte Ergebnis als kognitive Abkürzung (Position Bias). Rieh (2002) zeigt, dass Ranking-Position die Selektionsentscheidung beeinflusst; das Aufbrechen dieses Musters fördert breitere Informationsbetrachtung.

---

### Trigger 2 — Query-Stagnation

**Bedingung:** Die letzte und die vorletzte Query haben eine Jaccard-Ähnlichkeit ≥ 0.8 (nahezu identische Suchbegriffe).

```
jaccardSimilarity(queryHistory[n-1], queryHistory[n-2]) >= 0.8
```

**Nachricht:** „Du suchst schon ähnlich — ein ganz anderer Begriff könnte neue Ergebnisse bringen."

**Begründung:** Wiederholtes Suchen mit minimal variierten Begriffen deutet auf fehlende Reformulierungsstrategie hin. Harvey et al. (2015) zeigen, dass effektive Sucher ihr Vokabular variieren und erweitern.

---

### Trigger 3 — Single Domain

**Bedingung:** Ab dem 3. Klick: alle bisherigen Klicks innerhalb des Tasks führten zur selben Domain.

```
clickHistory.length >= 3 &&
new Set(clickHistory.map(c => c.domain)).size === 1
```

**Nachricht:** „Du warst bisher auf ähnlichen Seiten — andere Quellen könnten ein anderes Bild zeigen."

**Begründung:** Ausschließliche Nutzung einer Quellendomäne widerspricht dem Prinzip des lateral reading und erhöht Einseitigkeit. Das Vergleichen mehrerer Quellen ist ein Kernmerkmal kompetenter Informationsbewertung (vgl. Bink et al. 2026, Tip 4).

---

### Trigger 4 — Schnellentscheidung

**Bedingung:** Nutzer öffnet das Antwortformular innerhalb von 45 Sekunden nach Task-Start (jede Task hat eine eigene Startzeit).

```
Date.now() - taskStartTime < 45_000
```

**Nachricht:** „Das ging schnell — bist du sicher, dass du genug gesehen hast?"

**Begründung:** Vorzeitige Entscheidungen nach sehr kurzer Recherche deuten auf heuristikgetriebenes statt reflektiertes Suchen hin. Die Intervention beim Öffnen des Antwortformulars gibt dem Nutzer die Möglichkeit, die Entscheidung zu überdenken (vgl. Dual-Process-Theorie; das `answer_cancel`-Maß erfasst, ob dies gelingt).

---

### Trigger 5 — Struggling / Bounce-Muster

**Bedingung:** Ein Ergebnis wurde angeklickt und die Verweildauer (dwell_time) war < 5 Sekunden. Dieses Muster tritt **2-mal** innerhalb des Tasks auf.

```
dwell < 5s  →  bounceCount++
bounceCount >= 2  →  Trigger feuert
```

**Nachricht:** „Du springst zwischen Ergebnissen — vielleicht hilft ein anderer Suchbegriff statt mehr Ergebnisse durchzuklicken?"

**Begründung:** Schnelles Zurückspringen von Ergebnissen (kurze Dwell-Zeit) ohne Erfolg signalisiert Struggling statt zielgerichtetem Explorieren. Hassan et al. (2014) unterscheiden zwischen „struggling" und „exploring" in Suchsessions. *(DOI dieser Quelle muss noch verifiziert werden.)*

---

### Trigger 6 — Snippet-only Verhalten

**Bedingung:** Mindestens 3 Queries wurden abgeschickt, aber insgesamt 0 Klicks auf Ergebnisse erfolgten.

```
queryHistory.length >= 3 && clickHistory.length === 0
```

**Nachricht:** „Du liest bisher nur die Kurzvorschauen — die Originalseite zeigt oft mehr Kontext."

**Begründung:** Ausschließliches Lesen von Snippets ohne Öffnen der Originalseite führt zu oberflächlichem Verständnis, da Snippets ein unvollständiges Bild geben können. Reaktive Variante zu Bink et al. (2026), Tip 3.

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

**Begründung:** Durchgehend sehr kurze Queries (≤ 2 Wörter) deuten auf fehlende Spezifizierung hin. Harvey et al. (2015) zeigen, dass Experten-Queries tendenziell länger und spezifischer sind; Elsweiler (2026) rahmt dies als Boosting-Ansatz.

---

## Interventions-Logik (Zusammenfassung)

| # | Trigger | Feuert nach … |
|---|---------|--------------|
| 1 | Top-1 Bias | 2 aufeinanderfolgenden Rang-1-Klicks |
| 2 | Query-Stagnation | 2 ähnlichen Queries (Jaccard ≥ 0.8) |
| 3 | Single Domain | 3 Klicks zur selben Domain |
| 4 | Schnellentscheidung | Antwortformular < 45 s nach Task-Start |
| 5 | Struggling | 2 Bounces mit dwell < 5 s |
| 6 | Snippet-only | 3+ Queries, 0 Klicks |
| 7 | Fehlende Verfeinerung | 3+ Queries, alle ≤ 2 Wörter |

Alle 7 Trigger zeigen einen festen Text (`BUDDY_MESSAGES` in `src/lib/constants.ts`) — es gibt keine dynamische, KI-generierte Formulierung mehr.

**Regeln (pro Task):**
- Maximal **3 Interventionen pro Task** werden angezeigt.
- Jeder Trigger-Typ feuert **einmal pro Task** (bei Task-Wechsel zurückgesetzt).
- Cooldown von **20 Sekunden** zwischen zwei angezeigten Interventionen.
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
| `message_text` | TEXT | Tatsächlich angezeigter fester Text, `NULL` wenn nicht angezeigt |
| `was_dynamic` | BOOLEAN | Legacy-Spalte aus dem verworfenen LLM-Experiment, wird nicht mehr befüllt (immer `false`) |
| `generation_time_ms` | FLOAT | Legacy-Spalte aus dem verworfenen LLM-Experiment, wird nicht mehr befüllt (immer `NULL`) |
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
