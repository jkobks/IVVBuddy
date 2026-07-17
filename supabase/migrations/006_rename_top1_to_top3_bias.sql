-- top1_bias wurde zu top3_bias (Bedingung erweitert: Rang 1-3 statt nur Rang 1)

UPDATE interventions SET trigger_type = 'top3_bias' WHERE trigger_type = 'top1_bias';

ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS interventions_trigger_type_check;

ALTER TABLE interventions
  ADD CONSTRAINT interventions_trigger_type_check
  CHECK (trigger_type IN (
    'top3_bias',
    'query_stagnation',
    'single_domain',
    'quick_decision',
    'struggling',
    'snippet_only',
    'no_refinement'
  ));
