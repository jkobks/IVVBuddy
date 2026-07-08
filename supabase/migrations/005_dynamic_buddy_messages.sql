-- Erweiterung für LLM-generierte Buddy-Nachrichten (dynamische Formulierung bei
-- unveränderter, deterministischer Trigger-Erkennung).

ALTER TABLE interventions
  ADD COLUMN message_text       TEXT,
  ADD COLUMN was_dynamic        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN generation_time_ms FLOAT;

COMMENT ON COLUMN interventions.message_text IS 'Tatsächlich angezeigter Text (LLM-generiert oder fester Fallback-Text)';
COMMENT ON COLUMN interventions.was_dynamic IS 'true = Text wurde vom LLM generiert, false = fester Fallback-Text wurde genutzt';
COMMENT ON COLUMN interventions.generation_time_ms IS 'Dauer des LLM-Calls in ms, NULL wenn kein Call gemacht wurde (fester Trigger, Control-Gruppe oder nicht angezeigt)';
