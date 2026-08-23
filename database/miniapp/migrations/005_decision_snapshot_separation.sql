CREATE TABLE IF NOT EXISTS sky_opportunity_snapshots (
  snapshot_id text PRIMARY KEY,
  context_fingerprint text NOT NULL,
  location_kind text NOT NULL CHECK (
    location_kind IN ('FORMAL_SPOT', 'DARK_SKY_CANDIDATE', 'ORDINARY_PLACE', 'MAP_POINT')
  ),
  location_ref text NOT NULL,
  spot_id text REFERENCES spots(spot_id) ON DELETE CASCADE,
  local_date date NOT NULL,
  rule_version text NOT NULL REFERENCES rule_versions(rule_version),
  input_digest text NOT NULL,
  source_snapshot_ids jsonb NOT NULL,
  slice_inputs jsonb NOT NULL,
  windows jsonb NOT NULL,
  status text NOT NULL CHECK (
    status IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'INSUFFICIENT_DATA')
  ),
  factors jsonb NOT NULL,
  confidence double precision,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sky_opportunity_snapshots_location_date_idx
  ON sky_opportunity_snapshots(location_kind, location_ref, local_date, generated_at DESC);
