ALTER TABLE user_submissions
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS user_submissions_owner_updated_idx
  ON user_submissions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS contribution_media_uploads (
  upload_id text PRIMARY KEY,
  submission_id text NOT NULL REFERENCES user_submissions(submission_id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('PENDING', 'UPLOADED', 'ATTACHED', 'EXPIRED')),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  original_name text NOT NULL,
  declared_byte_size integer NOT NULL CHECK (declared_byte_size > 0 AND declared_byte_size <= 1200000),
  byte_size integer,
  sha256 text,
  object_key text,
  expires_at timestamptz NOT NULL,
  uploaded_at timestamptz,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, upload_id)
);

CREATE INDEX IF NOT EXISTS contribution_media_expiry_idx
  ON contribution_media_uploads(state, expires_at)
  WHERE state IN ('PENDING', 'UPLOADED');

INSERT INTO schema_migrations(version) VALUES ('006_contribution_intake')
ON CONFLICT (version) DO NOTHING;
