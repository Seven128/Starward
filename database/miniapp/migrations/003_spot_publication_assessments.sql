CREATE TABLE IF NOT EXISTS spot_publication_assessments (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  spot_revision integer NOT NULL,
  assessment_digest text NOT NULL,
  complete boolean NOT NULL,
  payload jsonb NOT NULL,
  reviewed_by text NOT NULL,
  review_reason text NOT NULL,
  assessed_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS spot_publication_complete_idx
  ON spot_publication_assessments(complete, assessed_at DESC);

INSERT INTO schema_migrations(version)
VALUES ('003_spot_publication_assessments')
ON CONFLICT (version) DO NOTHING;
