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

Es gibt 7 Trigger, die sich in **zwei Historien** aufteilen:

- **Task-übergreifend** (`top3_bias`, `query_stagnation`, `single_domain`, `struggling`, `no_refinement`): Query-Historie, Click-Historie und Bounce-Count akkumulieren über die **gesamte Session** und resetten bei Task-Wechsel **nicht**. Diese Historie lebt in `SearchPage` (`src/app/page.tsx`), die über alle 4 Tasks hinweg bestehen bleibt. Jeder dieser Trigger feuert dadurch **maximal einmal pro Session**.
- **Pro Task** (`snippet_only`, `quick_decision`): Die zugrunde liegende Query-/Click-Zählung resettet bei **jedem Task-Wechsel** und lebt lokal in `TaskSearchView` (remounted via `key={taskIndex}`).

**Warum diese beiden bewusst pro Task bleiben:**
- `snippet_only` prüft „0 Klicks in dieser Task" — würde diese Bedingung task-übergreifend gezählt, würde sie nach dem allerersten Klick der gesamten Session dauerhaft brechen und könnte nie wieder feuern.
- `quick_decision` ist an die Startzeit der jeweiligen Task gebunden und muss daher pro Task neu bewertet werden.

**Unverändert für alle 7 Trigger** — unabhängig von der Historie-Zuordnung oben:

- Maximal **3 angezeigte Interventionen pro Task**
- Jeder Trigger-Typ feuert **maximal einmal pro Task** (diese Regel ist für die task-übergreifenden Trigger meist automatisch erfüllt, da sie ohnehin nur einmal pro Session feuern)
- Zwischen zwei **angezeigten** Interventionen gilt ein **Cooldown von 20 Sekunden**
- Bei Task-Wechsel werden Interventions-Zähler, Cooldown-Timer und die pro-Task-Liste bereits gefeuerter Trigger zurückgesetzt (`BuddyContainer` wird mit `TaskSearchView` re-mounted)
- Trigger, die wegen Limit **oder** Cooldown nicht angezeigt werden, werden trotzdem mit `was_shown=false` (inkl. `trigger_type` und `timestamp`) in der `interventions`-Tabelle geloggt — Datenverlust in der Auswertung wird so vermieden
- Sind mehrere Bedingungen gleichzeitig erfüllt, wird der zuerst erkannte Trigger angezeigt; die anderen werden ebenfalls mit `was_shown=false` geloggt

**Begründung:** Das Limit von 3 Interventionen pro Task und der 20-Sekunden-Cooldown verhindern „Overprompting". Mudrick et al. zeigen, dass eine hohe Interventionsfrequenz eines pädagogischen Agenten Langeweile vorhersagt und die Autonomie des Nutzers untergräbt. *(DOI dieser Quelle muss noch verifiziert werden.)*

Die task-übergreifende Trigger-Erkennung läuft in `src/hooks/usePatternDetector.ts` (aufgerufen aus `src/app/page.tsx`). Die pro-Task-Trigger (`snippet_only`, `quick_decision`) werden direkt in `src/components/TaskSearchView.tsx` ausgewertet. Die Anzeige-Entscheidung (inkl. Limit/Cooldown) liegt in beiden Fällen in `src/components/buddy/BuddyContainer.tsx`.

---

### Trigger 1 — Top-3 Bias

**Scope:** Task-übergreifend

**Bedingung:** Mindestens 2 Klicks insgesamt (über die gesamte Session), und alle bisherigen Klicks waren auf Rang 1-3.

```
clickHistory.length >= 2 && clickHistory.every(c => c.rank <= 3)
```

**Nachricht:** „Du klickst vor allem auf die obersten Ergebnisse — weiter unten stehen oft andere Perspektiven."

**Begründung:** Nutzer verlassen sich übermäßig auf die obersten Ränge als kognitive Abkürzung (Position Bias). Rieh (2002) zeigt, dass Ranking-Position die Selektionsentscheidung beeinflusst; das Aufbrechen dieses Musters fördert breitere Informationsbetrachtung.

---

### Trigger 2 — Query-Stagnation

**Scope:** Task-übergreifend

**Bedingung:** Die letzte und die vorletzte Query (session-weite Historie) haben eine Jaccard-Ähnlichkeit ≥ 0.5 — aber nur, wenn beide aus derselben Task stammen. Ist die aktuelle Query die erste Query einer neuen Task, wird sie nicht gegen die letzte Query der vorherigen Task geprüft.

```
last.taskPosition === prev.taskPosition &&
jaccardSimilarity(queryHistory[n-1].text, queryHistory[n-2].text) >= 0.5
```

**Nachricht:** „Du suchst schon ähnlich — ein ganz anderer Begriff könnte neue Ergebnisse bringen."

**Begründung:** Wiederholtes Suchen mit minimal variierten Begriffen deutet auf fehlende Reformulierungsstrategie hin. Harvey et al. (2015) zeigen, dass effektive Sucher ihr Vokabular variieren und erweitern.

---

### Trigger 3 — Single Domain

**Scope:** Task-übergreifend

**Bedingung:** Mindestens 3 Klicks insgesamt (über die gesamte Session), und die häufigste Domain macht ≥ 70 % aller Klicks aus.

```
const anteil = maxKlicksEinerDomain / gesamtKlicks
gesamtKlicks >= 3 && anteil >= 0.7
```

**Nachricht:** „Du bist oft auf derselben Domain gelandet — andere Quellen könnten ein anderes Bild zeigen."

**Begründung:** Ausschließliche bzw. dominante Nutzung einer Quellendomäne widerspricht dem Prinzip des lateral reading und erhöht Einseitigkeit. Das Vergleichen mehrerer Quellen ist ein Kernmerkmal kompetenter Informationsbewertung (vgl. Bink et al. 2026, Tip 4). Einseitige Quellennutzung zeigt sich oft erst über mehrere Suchen hinweg — daher task-übergreifend statt pro Task.

---

### Trigger 4 — Schnellentscheidung

**Scope:** Pro Task

**Bedingung:** Beim Öffnen des Antwortformulars feuert der Trigger, wenn entweder (a) weniger als 45 Sekunden seit Task-Start vergangen sind, oder (b) in dieser Task höchstens 1 Ergebnis geöffnet wurde.

```
(Date.now() - taskStartTime < 45_000) || (clicksInCurrentTask <= 1)
```

**Nachricht:** „Das ging schnell — bist du sicher, dass du genug gesehen hast?"

**Begründung:** Vorzeitige/oberflächliche Entscheidungen nach zu kurzer Zeit ODER zu wenig Quellen deuten auf heuristikgetriebenes statt reflektiertes Suchen hin. Evaluation weiterhin beim Öffnen des Antwortformulars (nicht beim Absenden) — das gibt dem Nutzer die Möglichkeit, die Entscheidung zu überdenken (vgl. Dual-Process-Theorie). Geht er zurück ("Abbrechen"), wird das als `answer_cancel` geloggt; das `answer_cancel`-Maß erfasst, ob die Intervention wirkt.

---

### Trigger 5 — Struggling / Bounce-Muster

**Scope:** Task-übergreifend

**Bedingung:** Ein Ergebnis wurde angeklickt und die Verweildauer (dwell_time) war < 5 Sekunden. Dieses Muster tritt **2-mal** auf — gezählt über die gesamte Session, nicht nur innerhalb eines Tasks.

```
dwell < 5s  →  bounceCount++   // session-weit
bounceCount >= 2  →  Trigger feuert
```

**Nachricht:** „Du springst zwischen Ergebnissen — vielleicht hilft ein anderer Suchbegriff statt mehr Ergebnisse durchzuklicken?"

**Begründung:** Schnelles Zurückspringen von Ergebnissen (kurze Dwell-Zeit) ohne Erfolg signalisiert Struggling statt zielgerichtetem Explorieren. Hassan et al. (2014) unterscheiden zwischen „struggling" und „exploring" in Suchsessions. *(DOI dieser Quelle muss noch verifiziert werden.)*

---

### Trigger 6 — Snippet-only Verhalten

**Scope:** Pro Task

**Bedingung:** In der **aktuellen Task** wurden mindestens 3 Queries abgeschickt, aber insgesamt 0 Klicks auf Ergebnisse erfolgten.

```
taskQueryCount >= 3 && taskClickCount === 0
```

**Nachricht:** „Du liest bisher nur die Kurzvorschauen — die Originalseite zeigt oft mehr Kontext."

**Begründung:** Ausschließliches Lesen von Snippets ohne Öffnen der Originalseite führt zu oberflächlichem Verständnis, da Snippets ein unvollständiges Bild geben können. Reaktive Variante zu Bink et al. (2026), Tip 3. Pro Task statt task-übergreifend, weil die 0-Klick-Bedingung sonst nach dem ersten Klick der gesamten Session dauerhaft bräche und nie wieder feuern könnte.

---

### Trigger 7 — Fehlende Begriffsverfeinerung

**Scope:** Task-übergreifend

**Bedingung:** Die letzten 2 abgeschickten Queries (session-weit, unabhängig von der Task) bestehen **beide** aus höchstens 2 Wörtern.

```
letzteZweiQueries.length === 2 &&
letzteZweiQueries.every(q =>
  q.trim().split(/\s+/).filter(Boolean).length <= 2
)
```

**Nachricht:** „Deine Suchbegriffe bleiben kurz — ein spezifischerer Begriff könnte gezieltere Ergebnisse bringen."

**Begründung:** Durchgehend sehr kurze Queries (≤ 2 Wörter) deuten auf fehlende Spezifizierung hin. Harvey et al. (2015) zeigen, dass Experten-Queries tendenziell länger und spezifischer sind; Elsweiler (2026) rahmt dies als Boosting-Ansatz.

---

## Interventions-Logik (Zusammenfassung)

| # | Trigger | Scope | Feuert nach … |
|---|---------|-------|--------------|
| 1 | Top-3 Bias | Task-übergreifend | ≥ 2 Klicks insgesamt, alle Rang 1-3 |
| 2 | Query-Stagnation | Task-übergreifend | 2 ähnlichen Queries (Jaccard ≥ 0.5) |
| 3 | Single Domain | Task-übergreifend | ≥ 3 Klicks insgesamt, ≥ 70 % zur selben Domain |
| 4 | Schnellentscheidung | Pro Task | Antwortformular < 45 s nach Task-Start ODER ≤ 1 Klick in der Task |
| 5 | Struggling | Task-übergreifend | 2 Bounces mit dwell < 5 s |
| 6 | Snippet-only | Pro Task | 3+ Queries in der Task, 0 Klicks in der Task |
| 7 | Fehlende Verfeinerung | Task-übergreifend | letzte 2 Queries (session-weit), beide ≤ 2 Wörter |

Alle 7 Trigger zeigen einen festen Text (`BUDDY_MESSAGES` in `src/lib/constants.ts`) — es gibt keine dynamische, KI-generierte Formulierung mehr.

**Regeln (unverändert für alle Trigger, egal ob Task-übergreifend oder pro Task):**
- Maximal **3 Interventionen pro Task** werden angezeigt.
- Jeder Trigger-Typ feuert **einmal pro Task** — für Task-übergreifende Trigger bedeutet das faktisch **einmal pro Session**, da ihre zugrunde liegende Bedingung ohnehin nur einmal jemals erfüllt wird.
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

Berechnet in `src/lib/task-metrics.ts` (`computeTaskMetrics`). Eine Task gilt als gültig, wenn:
- Mindestens 1 Query wurde abgeschickt
- Eine Antwort wurde eingereicht
- `task_end_time - task_start_time >= 20 Sekunden`

Eine Person kann 3 gültige und 1 ungültige Task haben — bei der Auswertung pro Task filterbar.

---

## CSV-Export

Beide Export-Routen liegen hinter derselben Passwort-Auth wie `/results` (Cookie `results_auth`) und werden in `src/lib/task-metrics.ts` berechnet.

**Pro-Task-Export** (`GET /api/admin/export`): eine Zeile pro Task-Durchlauf — 4 Zeilen pro Person.

Spalten: `session_id`, `condition`, `task_id`, `task_position`, `task_start_time`, `task_end_time`, `time_on_task_s`, `query_count`, `click_count`, `unique_domains`, `top1_click_ratio`, `query_diversity_mean`, `interventions_shown`, `answer_text`, `valid_task`

- `top1_click_ratio`: Anteil der Klicks in dieser Task auf Rang 1 (`null` bei 0 Klicks) — eine deskriptive Metrik, nicht zu verwechseln mit dem `top3_bias`-Trigger (Rang 1-3).
- `query_diversity_mean`: Mittelwert der Unähnlichkeit (`1 - Jaccard`) zwischen aufeinanderfolgenden Queries dieser Task (`null` bei < 2 Queries) — höher heißt mehr Vokabular-Variation zwischen den Suchanfragen.

**Aggregierter Export** (`GET /api/admin/export-aggregated`): eine Zeile pro Person.

Spalten: `session_id`, `condition`, `reloaded`, `n_tasks`, `n_valid_tasks`, `avg_time_on_task_s`, `avg_query_count`, `avg_click_count`, `avg_unique_domains`, `avg_top1_click_ratio`, `avg_query_diversity_mean`, `avg_interventions_shown` — jede `avg_*`-Spalte ist der Mittelwert über die Tasks, in denen die Metrik nicht `null` war.

Beide CSVs lassen sich auch direkt über Buttons oben auf `/results` herunterladen.

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
# supabase/migrations/006_rename_top1_to_top3_bias.sql
# supabase/migrations/007_session_reloaded_flag.sql

# Entwicklungsserver starten
npm run dev
```

### URL-Parameter für Tests

| Parameter | Beispiel | Wirkung |
|-----------|---------|---------|
| `condition` | `?condition=buddy` | Condition überschreiben |
| `task` | `?task=kollagen` | Ersten Task festlegen (Rest bleibt gemischt) |
