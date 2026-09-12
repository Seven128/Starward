CREATE TABLE IF NOT EXISTS formal_feedback_upload_intents (
  intent_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  baseline_revision integer NOT NULL CHECK (baseline_revision > 0),
  revision integer NOT NULL CHECK (revision > 0),
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formal_feedback_upload_intents_expiry_idx
  ON formal_feedback_upload_intents(expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS formal_feedback_media_uploads (
  upload_id text PRIMARY KEY,
  intent_id text NOT NULL REFERENCES formal_feedback_upload_intents(intent_id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('PENDING', 'UPLOADED', 'ATTACHED', 'EXPIRED')),
  object_key text,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE(intent_id, upload_id)
);

INSERT INTO schema_migrations(version) VALUES ('012_formal_feedback_upload_intents')
ON CONFLICT (version) DO NOTHING;
