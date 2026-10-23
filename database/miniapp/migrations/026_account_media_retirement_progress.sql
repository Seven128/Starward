ALTER TABLE account_deletion_media_queue ADD COLUMN cleanup_attempted_at timestamptz;
CREATE INDEX account_media_retirement_attempts_idx ON account_deletion_media_queue
  (deletion_batch_id, cleanup_attempted_at NULLS FIRST, object_key);

-- Only scalar acknowledgements survive bounded pages. Object keys remain in
-- the existing deletion queue until individually deleted or proven current.
CREATE TABLE account_media_retirement_progress (
  deletion_batch_id uuid PRIMARY KEY,
  deleted_object_count integer NOT NULL DEFAULT 0 CHECK (deleted_object_count >= 0),
  retained_object_count integer NOT NULL DEFAULT 0 CHECK (retained_object_count >= 0)
);

INSERT INTO schema_migrations(version) VALUES ('026_account_media_retirement_progress')
ON CONFLICT (version) DO NOTHING;
