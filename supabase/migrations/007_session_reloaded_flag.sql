-- Markiert Sessions, bei denen ein Reload im selben Tab erkannt wurde. Ein Reload
-- verwirft den kompletten In-Memory-State der task-übergreifenden Trigger-Historie
-- (queryHistory/clickHistory/bounceCount + firedRef-Set) und lässt Timer wie den
-- quick_decision-45s-Timer neu beginnen. Statt das nachträglich zu heilen, wird die
-- betroffene Session hier markiert, damit sie bei der Auswertung ausgeschlossen
-- werden kann.

ALTER TABLE sessions
  ADD COLUMN reloaded BOOLEAN NOT NULL DEFAULT FALSE;
