-- Neue Felder für erweitertes Tracking

ALTER TABLE queries
  ADD COLUMN word_count INT;

ALTER TABLE clicks
  ADD COLUMN dwell_time_seconds FLOAT;

-- was_shown=true: Intervention wurde dem Nutzer angezeigt
-- was_shown=false: Bedingung erfüllt, aber nicht angezeigt (Limit, bereits gefeuert, oder Control-Gruppe)
ALTER TABLE interventions
  ADD COLUMN was_shown BOOLEAN NOT NULL DEFAULT TRUE;

-- Bestehende CHECK-Constraint ersetzen um neue Trigger-Typen aufzunehmen
ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS interventions_trigger_type_check;

ALTER TABLE interventions
  ADD CONSTRAINT interventions_trigger_type_check
  CHECK (trigger_type IN (
    'top1_bias',
    'query_stagnation',
    'single_domain',
    'quick_decision',
    'struggling',
    'snippet_only',
    'no_refinement'
  ));
