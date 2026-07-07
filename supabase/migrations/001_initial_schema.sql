CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition    TEXT NOT NULL CHECK (condition IN ('buddy', 'control')),
  task_id      TEXT NOT NULL,
  start_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time     TIMESTAMPTZ
);

CREATE TABLE queries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  query_text   TEXT NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clicks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  domain       TEXT NOT NULL,
  rank         INT NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  answer_text  TEXT NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interventions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
                  'top1_bias', 'query_stagnation',
                  'single_domain', 'quick_decision'
               )),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queries_session      ON queries(session_id);
CREATE INDEX idx_clicks_session       ON clicks(session_id);
CREATE INDEX idx_answers_session      ON answers(session_id);
CREATE INDEX idx_interventions_session ON interventions(session_id);

ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert sessions"       ON sessions      FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update sessions"       ON sessions      FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert queries"        ON queries       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert clicks"         ON clicks        FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert answers"        ON answers       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert interventions"  ON interventions FOR INSERT TO anon WITH CHECK (true);
