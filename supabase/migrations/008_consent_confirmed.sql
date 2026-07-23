-- session_start currently fires on page load, before the consent screen is
-- accepted (see useSession.ts init effect, called unconditionally on mount).
-- That means every fresh page load — including bounces, reloads-into-new-tab,
-- and link-preview crawlers — creates a row in `sessions` and inflates the
-- participant count on /results. This adds an explicit, consent-gated flag.

ALTER TABLE sessions
  ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: the consent screen gates every subsequent screen (intro, tasks),
-- so any session that already has task_sessions rows necessarily passed
-- through consent, even though the explicit event didn't exist yet.
UPDATE sessions
SET consent_given = TRUE
WHERE id IN (SELECT DISTINCT session_id FROM task_sessions);
