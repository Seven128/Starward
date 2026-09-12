CREATE TABLE IF NOT EXISTS astronomical_event_source_configs (
  source_id text PRIMARY KEY,
  provider text NOT NULL,
  endpoint text,
  enabled boolean NOT NULL DEFAULT false,
  parser_version text NOT NULL,
  schema_version text NOT NULL,
  auto_publish_eligible boolean NOT NULL DEFAULT false,
  approved_baseline_version text,
  terms_url text NOT NULL,
  coverage text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (endpoint IS NULL OR endpoint ~ '^https://'),
  CHECK (NOT auto_publish_eligible OR approved_baseline_version IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS astronomical_event_ingestion_runs (
  run_id text PRIMARY KEY,
  source_id text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('SCHEDULED', 'MANUAL_RERUN')),
  state text NOT NULL CHECK (state IN ('NO_CHANGE', 'CANDIDATE_CREATED', 'SOURCE_UNAVAILABLE', 'FAILED')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  http_status integer,
  etag text,
  last_modified text,
  content_sha256 text,
  candidate_id text,
  error_code text,
  CHECK (completed_at >= started_at),
  CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX IF NOT EXISTS astronomical_event_ingestion_source_idx
  ON astronomical_event_ingestion_runs(source_id, completed_at DESC);
DROP TRIGGER IF EXISTS astronomical_event_ingestion_runs_append_only ON astronomical_event_ingestion_runs;
CREATE TRIGGER astronomical_event_ingestion_runs_append_only
  BEFORE UPDATE OR DELETE ON astronomical_event_ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

CREATE TABLE IF NOT EXISTS astronomical_event_catalog_candidates (
  candidate_id text PRIMARY KEY,
  source_id text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('SCHEDULED', 'OPERATOR_IMPORT')),
  state text NOT NULL CHECK (state IN ('REVIEW_REQUIRED', 'AUTO_PUBLISH_ELIGIBLE', 'REJECTED', 'PUBLISHED')),
  catalog_version text NOT NULL,
  schema_version text NOT NULL,
  source_release text NOT NULL,
  parser_version text NOT NULL,
  time_scale text NOT NULL CHECK (time_scale = 'UTC'),
  precision text NOT NULL,
  content_sha256 text NOT NULL UNIQUE CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  diff jsonb NOT NULL,
  decision_reasons jsonb NOT NULL,
  retrieved_at timestamptz NOT NULL,
  actor_id text NOT NULL,
  reviewed_at timestamptz,
  reviewed_by text,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS astronomical_event_candidate_queue_idx
  ON astronomical_event_catalog_candidates(state, created_at);

ALTER TABLE astronomical_event_ingestion_runs
  ADD CONSTRAINT astronomical_event_ingestion_candidate_fk
  FOREIGN KEY (candidate_id) REFERENCES astronomical_event_catalog_candidates(candidate_id);

CREATE TABLE IF NOT EXISTS astronomical_event_catalog_publications (
  publication_id text PRIMARY KEY,
  catalog_version text NOT NULL UNIQUE,
  candidate_id text REFERENCES astronomical_event_catalog_candidates(candidate_id),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  published_at timestamptz NOT NULL,
  published_by text NOT NULL,
  reason text NOT NULL,
  rolled_back_from_version text,
  active boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS astronomical_event_one_active_publication
  ON astronomical_event_catalog_publications(active) WHERE active;
CREATE INDEX IF NOT EXISTS astronomical_event_publication_history_idx
  ON astronomical_event_catalog_publications(published_at DESC);

CREATE OR REPLACE FUNCTION astronomical_event_publication_history_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.active = true AND NEW.active = false
     AND (to_jsonb(OLD) - 'active') = (to_jsonb(NEW) - 'active') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'event_catalog_publication_immutable';
END;
$$;
DROP TRIGGER IF EXISTS astronomical_event_publications_history_guard ON astronomical_event_catalog_publications;
CREATE TRIGGER astronomical_event_publications_history_guard
  BEFORE UPDATE OR DELETE ON astronomical_event_catalog_publications
  FOR EACH ROW EXECUTE FUNCTION astronomical_event_publication_history_guard();

INSERT INTO schema_migrations(version) VALUES ('017_astronomical_event_catalog_pipeline')
ON CONFLICT (version) DO NOTHING;
