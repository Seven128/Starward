CREATE TABLE IF NOT EXISTS wechat_identities (
  identity_digest text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_digest text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON user_sessions(user_id, expires_at DESC);

ALTER TABLE observation_plans
  ADD COLUMN IF NOT EXISTS context_snapshot jsonb;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS scope_id text NOT NULL DEFAULT 'system';
ALTER TABLE idempotency_records
  DROP CONSTRAINT IF EXISTS idempotency_records_pkey;
ALTER TABLE idempotency_records
  ADD PRIMARY KEY (scope_id, idempotency_key);

CREATE TABLE IF NOT EXISTS published_dataset_versions (
  dataset_kind text NOT NULL,
  dataset_version text NOT NULL,
  state text NOT NULL,
  manifest jsonb NOT NULL,
  published_at timestamptz,
  PRIMARY KEY (dataset_kind, dataset_version)
);

CREATE TABLE IF NOT EXISTS map_layer_snapshots (
  snapshot_id text PRIMARY KEY,
  layer_kind text NOT NULL,
  context_fingerprint text NOT NULL,
  dataset_version text NOT NULL,
  valid_at timestamptz,
  expires_at timestamptz,
  state text NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS map_layer_context_idx
  ON map_layer_snapshots(context_fingerprint, layer_kind, generated_at DESC);

INSERT INTO schema_migrations(version) VALUES ('002_current_product_chain')
ON CONFLICT (version) DO NOTHING;
