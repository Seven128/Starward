CREATE TABLE IF NOT EXISTS device_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_active
  ON device_sessions (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS privacy_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  revision INTEGER NOT NULL,
  granted INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  UNIQUE (user_id, purpose, revision)
);

CREATE TABLE IF NOT EXISTS identity_export_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready', 'expired', 'failed')),
  scope_json TEXT NOT NULL,
  object_key TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_export_jobs_user_created
  ON identity_export_jobs (user_id, created_at);

CREATE TABLE IF NOT EXISTS identity_deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('cooling-off', 'executing', 'completed', 'cancelled', 'legal-hold')),
  contribution_choice TEXT NOT NULL CHECK (contribution_choice IN ('delete-personal', 'anonymize-facts')),
  requested_at TEXT NOT NULL,
  cooling_off_ends_at TEXT NOT NULL,
  primary_delete_by TEXT NOT NULL,
  backup_expiry_by TEXT NOT NULL,
  legal_hold_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_deletion_active_user
  ON identity_deletion_requests (user_id)
  WHERE state IN ('cooling-off', 'executing', 'legal-hold');

CREATE TABLE IF NOT EXISTS identity_security_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  session_id_hash TEXT,
  outcome TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  detail_json TEXT NOT NULL
);
