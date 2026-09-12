CREATE TABLE IF NOT EXISTS spot_formal_reference_media (
  upload_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('parking', 'toilet', 'site')),
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  source_submission_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spot_formal_reference_media_spot_idx
  ON spot_formal_reference_media(spot_id, kind, created_at);

INSERT INTO schema_migrations(version) VALUES ('014_formal_feedback_canonical_media')
ON CONFLICT (version) DO NOTHING;
