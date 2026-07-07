-- Trackt wenn Nutzer das Antwortformular öffnet und dann abbricht (Zurück-Button).
-- Wichtig für die Auswertung von quick_decision: Hat der Buddy den Nutzer dazu gebracht,
-- nochmal zu suchen statt direkt abzuschicken?
CREATE TABLE answer_cancels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  task_id       TEXT,
  task_position INT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_answer_cancels_session ON answer_cancels(session_id);

ALTER TABLE answer_cancels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert answer_cancels"    ON answer_cancels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service select answer_cancels" ON answer_cancels FOR SELECT TO service_role USING (true);
