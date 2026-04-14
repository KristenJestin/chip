-- Migrate tasks with status 'review' to 'done'.
-- The 'review' status is removed from the task status enum (tasks use todo|in-progress|done only).
-- Phases retain their own 'review' status and are unaffected.
UPDATE tasks SET status = 'done' WHERE status = 'review';
