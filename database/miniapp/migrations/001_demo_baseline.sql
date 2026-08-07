CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  state text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_source_registry (
  source_id text PRIMARY KEY,
  provider text NOT NULL,
  license text NOT NULL,
  license_url text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_source_snapshots (
  snapshot_id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  state text NOT NULL,
  raw_payload_hash text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL,
  valid_from timestamptz,
  valid_to timestamptz
);

CREATE TABLE IF NOT EXISTS spots (
  spot_id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL,
  timezone text NOT NULL,
  geom_wgs84 geography(Point, 4326) NOT NULL,
  gcj02_lat double precision NOT NULL,
  gcj02_lng double precision NOT NULL,
  status text NOT NULL,
  visibility_policy text NOT NULL,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  payload jsonb NOT NULL,
  display_order integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spots_geom_wgs84_gix ON spots USING gist(geom_wgs84);

CREATE TABLE IF NOT EXISTS spot_access_profiles (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_horizon_profiles (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_verifications (
  verification_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  verified_at timestamptz
);

CREATE TABLE IF NOT EXISTS spot_status_history (
  history_id uuid PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  prior_status text,
  next_status text NOT NULL,
  reason text NOT NULL,
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_vendor_refs (
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (spot_id, provider)
);

CREATE TABLE IF NOT EXISTS spot_facilities (
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  facility_type text NOT NULL,
  state text NOT NULL,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  payload jsonb NOT NULL,
  PRIMARY KEY (spot_id, facility_type)
);

CREATE TABLE IF NOT EXISTS spot_media (
  media_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  source_url text NOT NULL,
  license text NOT NULL,
  site_specific boolean NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  article_id text PRIMARY KEY,
  state text NOT NULL,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_spots (
  article_id text NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, spot_id)
);

CREATE TABLE IF NOT EXISTS spot_overview_read_models (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  dependency_digest text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_spot_summaries (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_spot_summaries (
  spot_id text PRIMARY KEY REFERENCES spots(spot_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_sky_summaries (
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  local_date date NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, local_date)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE TABLE IF NOT EXISTS observation_plans (
  plan_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  local_date date NOT NULL,
  local_time time NOT NULL,
  notes text NOT NULL,
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profile_links (
  profile_link_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  visibility text NOT NULL,
  sort_order integer NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

CREATE TABLE IF NOT EXISTS external_post_imports (
  import_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  platform text NOT NULL,
  original_url text NOT NULL,
  rights_confirmed boolean NOT NULL,
  parse_state text NOT NULL,
  moderation_state text NOT NULL,
  spot_id text REFERENCES spots(spot_id),
  spot_proposal_id text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_post_import_drafts (
  import_id text PRIMARY KEY REFERENCES external_post_imports(import_id) ON DELETE CASCADE,
  stage text NOT NULL,
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_proposals (
  proposal_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  state text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_submissions (
  submission_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text REFERENCES spots(spot_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_reports (
  field_report_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  observed_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS corrections (
  correction_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weather_runs (
  run_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  source_snapshot_id text REFERENCES data_source_snapshots(snapshot_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_hourly (
  run_id text NOT NULL REFERENCES weather_runs(run_id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (run_id, observed_at)
);

CREATE TABLE IF NOT EXISTS astronomy_nights (
  night_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  local_date date NOT NULL,
  algorithm_version text NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, local_date, algorithm_version)
);

CREATE TABLE IF NOT EXISTS astronomy_targets (
  night_id text NOT NULL REFERENCES astronomy_nights(night_id) ON DELETE CASCADE,
  target_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (night_id, target_id)
);

CREATE TABLE IF NOT EXISTS light_pollution_samples (
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  dataset_version text NOT NULL,
  state text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (spot_id, dataset_version)
);

CREATE TABLE IF NOT EXISTS route_snapshots (
  route_snapshot_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  state text NOT NULL,
  payload jsonb NOT NULL,
  valid_to timestamptz
);

CREATE TABLE IF NOT EXISTS rule_versions (
  rule_version text PRIMARY KEY,
  state text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tonight_decision_snapshots (
  snapshot_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id),
  local_date date NOT NULL,
  rule_version text NOT NULL REFERENCES rule_versions(rule_version),
  input_digest text NOT NULL,
  source_snapshot_ids jsonb NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_call_usage (
  usage_id bigserial PRIMARY KEY,
  provider text NOT NULL,
  operation text NOT NULL,
  capability text NOT NULL,
  status text NOT NULL,
  latency_ms integer NOT NULL,
  estimated_cost_cny numeric(12, 6) NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_health_checks (
  provider text PRIMARY KEY,
  state text NOT NULL,
  failure_code text,
  checked_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key text PRIMARY KEY,
  operation text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'PENDING',
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  manual_replay_count integer NOT NULL DEFAULT 0,
  last_replayed_at timestamptz
);

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS manual_replay_count integer NOT NULL DEFAULT 0;
ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS last_replayed_at timestamptz;

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(state, available_at);

CREATE TABLE IF NOT EXISTS job_executions (
  execution_id uuid PRIMARY KEY,
  event_id uuid REFERENCES outbox_events(event_id),
  job_kind text NOT NULL,
  attempt integer NOT NULL,
  state text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  error_code text,
  result_state text,
  result_payload jsonb
);

ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS result_state text;
ALTER TABLE job_executions ADD COLUMN IF NOT EXISTS result_payload jsonb;

CREATE TABLE IF NOT EXISTS job_effects (
  effect_key text PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES outbox_events(event_id),
  job_kind text NOT NULL,
  result_state text NOT NULL,
  result_payload jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, job_kind)
);

CREATE TABLE IF NOT EXISTS moderation_cases (
  case_id text PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  state text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  request_id text NOT NULL,
  before_payload jsonb,
  after_payload jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations(version) VALUES ('001_demo_baseline')
ON CONFLICT (version) DO NOTHING;
