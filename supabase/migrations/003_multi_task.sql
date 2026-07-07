-- Migration 003: Umstellung auf Within-Subjects (4 Tasks pro Person)

-- sessions: task_id (single) → task_order (Array der 4 Task-IDs in randomisierter Reihenfolge)
ALTER TABLE sessions DROP COLUMN IF EXISTS task_id;
ALTER TABLE sessions ADD COLUMN task_order TEXT[] NOT NULL DEFAULT '{}';

-- Neue Tabelle: Pro-Task-Zeitmessung (task_start_time / task_end_time)
CREATE TABLE task_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  task_id          TEXT NOT NULL,
  task_position    INT  NOT NULL CHECK (task_position BETWEEN 1 AND 4),
  task_start_time  TIMESTAMPTZ NOT NULL DEFAULT now(),
  task_end_time    TIMESTAMPTZ,
  CONSTRAINT task_sessions_session_task_unique UNIQUE (session_id, task_id)
);

-- task_id + task_position in alle Event-Tabellen
ALTER TABLE queries
  ADD COLUMN task_id       TEXT,
  ADD COLUMN task_position INT;

ALTER TABLE clicks
  ADD COLUMN task_id       TEXT,
  ADD COLUMN task_position INT;

ALTER TABLE answers
  ADD COLUMN task_id       TEXT,
  ADD COLUMN task_position INT;

ALTER TABLE interventions
  ADD COLUMN task_id       TEXT,
  ADD COLUMN task_position INT;

-- Indizes
CREATE INDEX idx_task_sessions_session  ON task_sessions(session_id);
CREATE INDEX idx_queries_task           ON queries(session_id, task_id);
CREATE INDEX idx_clicks_task            ON clicks(session_id, task_id);
CREATE INDEX idx_answers_task           ON answers(session_id, task_id);
CREATE INDEX idx_interventions_task     ON interventions(session_id, task_id);

-- RLS für task_sessions
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert task_sessions" ON task_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update task_sessions" ON task_sessions FOR UPDATE TO anon USING (true);

-- SELECT-Rechte für Admin-Export (service_role hat ohnehin vollen Zugriff)
CREATE POLICY "service select sessions"      ON sessions      FOR SELECT TO service_role USING (true);
CREATE POLICY "service select task_sessions" ON task_sessions FOR SELECT TO service_role USING (true);
CREATE POLICY "service select queries"       ON queries       FOR SELECT TO service_role USING (true);
CREATE POLICY "service select clicks"        ON clicks        FOR SELECT TO service_role USING (true);
CREATE POLICY "service select answers"       ON answers       FOR SELECT TO service_role USING (true);
CREATE POLICY "service select interventions" ON interventions FOR SELECT TO service_role USING (true);
