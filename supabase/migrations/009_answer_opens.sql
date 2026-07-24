-- Trackt wenn Nutzer auf "Antwort abgeben" klickt (Formular öffnet sich), inkl. Sekunden
-- seit Task-Start — also genau die Zeitspanne, die auch den quick_decision-Trigger auslöst
-- (< QUICK_DECISION_THRESHOLD_MS), bisher aber nirgends als Wert gespeichert wurde.
CREATE TABLE answer_opens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  task_id           TEXT,
  task_position     INT,
  time_to_open_s    NUMERIC NOT NULL,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_answer_opens_session ON answer_opens(session_id);

ALTER TABLE answer_opens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert answer_opens"    ON answer_opens FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service select answer_opens" ON answer_opens FOR SELECT TO service_role USING (true);
