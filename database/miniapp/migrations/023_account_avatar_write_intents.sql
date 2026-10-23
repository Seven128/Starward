-- A private object write can outlive a rolled-back or indeterminate profile
-- transaction. Persist its ownership before any bytes are written.
CREATE TABLE account_avatar_write_intents (
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  object_key text NOT NULL UNIQUE,
  request_digest text NOT NULL CHECK (request_digest ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  retired_at timestamptz,
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX account_avatar_write_intents_expiry_idx
  ON account_avatar_write_intents(expires_at, object_key)
  WHERE retired_at IS NULL;

INSERT INTO schema_migrations(version) VALUES ('023_account_avatar_write_intents')
ON CONFLICT (version) DO NOTHING;
