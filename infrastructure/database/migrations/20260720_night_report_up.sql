CREATE TABLE IF NOT EXISTS night_report_snapshots (
  id UUID PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  generated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'partial', 'insufficient-data', 'blocked')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > generated_at)
);

CREATE INDEX IF NOT EXISTS night_report_snapshots_generated_at_idx ON night_report_snapshots (generated_at DESC);
