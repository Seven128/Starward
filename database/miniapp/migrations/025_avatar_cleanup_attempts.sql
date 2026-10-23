ALTER TABLE account_avatar_write_intents ADD COLUMN cleanup_attempted_at timestamptz;
CREATE INDEX account_avatar_cleanup_attempts_idx ON account_avatar_write_intents
  (cleanup_attempted_at NULLS FIRST, expires_at, object_key)
  WHERE retired_at IS NULL;

INSERT INTO schema_migrations(version) VALUES ('025_avatar_cleanup_attempts')
ON CONFLICT (version) DO NOTHING;
