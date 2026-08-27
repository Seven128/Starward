-- Operations/revision closure for the current Mini Program handoff.
-- The existing JSON payloads remain the read-model projection; these tables
-- make the history, command receipt and publication boundaries explicit.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS active_revision_id text;

ALTER TABLE user_submissions
  ADD COLUMN IF NOT EXISTS submission_state text,
  ADD COLUMN IF NOT EXISTS merge_state text,
  ADD COLUMN IF NOT EXISTS publication_impact text;

ALTER TABLE contribution_media_uploads
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE user_submissions
   SET submission_state = COALESCE(submission_state, CASE payload->>'state'
     WHEN 'APPROVED' THEN 'ACCEPTED'
     ELSE payload->>'state'
   END),
       merge_state = COALESCE(merge_state, 'NOT_STARTED'),
       publication_impact = COALESCE(publication_impact, 'NONE')
 WHERE submission_state IS NULL
    OR merge_state IS NULL
    OR publication_impact IS NULL;

CREATE TABLE IF NOT EXISTS spot_revisions (
  revision_id text PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  spot_payload jsonb NOT NULL,
  detail_payload jsonb NOT NULL,
  payload_digest text NOT NULL,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, revision_no),
  UNIQUE (spot_id, revision_id)
);

CREATE INDEX IF NOT EXISTS spot_revisions_spot_created_idx
  ON spot_revisions(spot_id, revision_no DESC);

INSERT INTO spot_revisions(
  revision_id, spot_id, revision_no, spot_payload, detail_payload,
  payload_digest, source_ids, created_by, reason
)
SELECT
  'spot-revision:' || s.spot_id || ':' || s.version,
  s.spot_id,
  s.version,
  s.payload,
  r.payload,
  encode(digest(convert_to(s.payload::text || r.payload::text, 'UTF8'), 'sha256'), 'hex'),
  COALESCE((
    SELECT jsonb_agg(DISTINCT source_id ORDER BY source_id)
      FROM jsonb_array_elements(COALESCE(r.payload->'dataDisclosure', '[]'::jsonb)) item
      CROSS JOIN LATERAL (SELECT item->>'id' AS source_id) source
     WHERE source_id IS NOT NULL
  ), '[]'::jsonb),
  'system:migration-007',
  'Backfill immutable revision from the current canonical projection'
FROM spots s
JOIN spot_overview_read_models r USING (spot_id)
ON CONFLICT (spot_id, revision_no) DO NOTHING;

UPDATE spots s
   SET active_revision_id = 'spot-revision:' || s.spot_id || ':' || s.version
 WHERE active_revision_id IS NULL
   AND EXISTS (
     SELECT 1 FROM spot_revisions r
      WHERE r.spot_id = s.spot_id AND r.revision_no = s.version
   );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spots_active_revision_fk'
  ) THEN
    ALTER TABLE spots
      ADD CONSTRAINT spots_active_revision_fk
      FOREIGN KEY (active_revision_id) REFERENCES spot_revisions(revision_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contribution_revisions (
  revision_id text PRIMARY KEY,
  submission_id text NOT NULL REFERENCES user_submissions(submission_id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  submission_state text NOT NULL,
  merge_state text NOT NULL,
  publication_impact text NOT NULL,
  payload jsonb NOT NULL,
  payload_digest text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, revision_no)
);

INSERT INTO contribution_revisions(
  revision_id, submission_id, revision_no, submission_state, merge_state,
  publication_impact, payload, payload_digest, actor_id, created_at
)
SELECT
  'contribution-revision:' || submission_id || ':' || revision,
  submission_id,
  revision,
  COALESCE(submission_state, CASE payload->>'state' WHEN 'APPROVED' THEN 'ACCEPTED' ELSE payload->>'state' END),
  COALESCE(merge_state, 'NOT_STARTED'),
  COALESCE(publication_impact, 'NONE'),
  payload,
  encode(digest(payload::text, 'sha256'), 'hex'),
  'system:migration-007',
  COALESCE(updated_at, created_at)
FROM user_submissions
ON CONFLICT (submission_id, revision_no) DO NOTHING;

CREATE INDEX IF NOT EXISTS contribution_revisions_submission_idx
  ON contribution_revisions(submission_id, revision_no DESC);

CREATE TABLE IF NOT EXISTS moderation_case_events (
  event_id uuid PRIMARY KEY,
  case_id text NOT NULL REFERENCES moderation_cases(case_id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id text NOT NULL,
  reason text,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_case_events_case_idx
  ON moderation_case_events(case_id, occurred_at DESC);

INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
SELECT md5('migration-007:' || case_id)::uuid, case_id, 'CASE_CREATED', 'system:migration-007', 'Backfill case history',
       jsonb_build_object('state', state, 'subjectType', subject_type)
  FROM moderation_cases
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS contribution_merge_events (
  merge_event_id uuid PRIMARY KEY,
  case_id text NOT NULL REFERENCES moderation_cases(case_id),
  submission_id text NOT NULL REFERENCES user_submissions(submission_id),
  spot_id text NOT NULL REFERENCES spots(spot_id),
  submission_revision integer NOT NULL,
  prior_spot_revision integer NOT NULL,
  resulting_spot_revision integer NOT NULL,
  confirmed_claims jsonb NOT NULL,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor_id text NOT NULL,
  reason text NOT NULL,
  idempotency_scope text NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_scope, idempotency_key),
  UNIQUE (case_id)
);

CREATE TABLE IF NOT EXISTS spot_publication_assessment_events (
  assessment_event_id uuid PRIMARY KEY,
  spot_id text NOT NULL REFERENCES spots(spot_id) ON DELETE CASCADE,
  spot_revision integer NOT NULL,
  assessment_digest text NOT NULL,
  complete boolean NOT NULL,
  payload jsonb NOT NULL,
  actor_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spot_publication_assessment_events_idx
  ON spot_publication_assessment_events(spot_id, spot_revision DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS spot_replacement_relations (
  relation_id uuid PRIMARY KEY,
  predecessor_spot_id text NOT NULL REFERENCES spots(spot_id),
  successor_spot_id text REFERENCES spots(spot_id),
  state text NOT NULL CHECK (state IN ('PREVIEW', 'COMMITTED', 'NO_SUCCESSOR')),
  actor_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  CHECK (successor_spot_id IS NULL OR successor_spot_id <> predecessor_spot_id),
  UNIQUE (predecessor_spot_id)
);

CREATE TABLE IF NOT EXISTS operation_receipts (
  receipt_id text PRIMARY KEY,
  operation text NOT NULL,
  scope_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_id text NOT NULL,
  actor_id text NOT NULL,
  request_digest text NOT NULL,
  status text NOT NULL CHECK (status IN ('COMMITTED', 'REPLAYED', 'REJECTED')),
  resulting_revision integer,
  assessment_digest text,
  result_payload jsonb,
  readback_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_id, idempotency_key)
);

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS request_digest text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS operation_receipts_operation_idx
  ON operation_receipts(operation, created_at DESC);

CREATE OR REPLACE FUNCTION miniapp_append_only_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append_only_record_immutable';
END;
$$;

DROP TRIGGER IF EXISTS spot_revisions_append_only ON spot_revisions;
CREATE TRIGGER spot_revisions_append_only
  BEFORE UPDATE OR DELETE ON spot_revisions
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS contribution_revisions_append_only ON contribution_revisions;
CREATE TRIGGER contribution_revisions_append_only
  BEFORE UPDATE OR DELETE ON contribution_revisions
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS moderation_case_events_append_only ON moderation_case_events;
CREATE TRIGGER moderation_case_events_append_only
  BEFORE UPDATE OR DELETE ON moderation_case_events
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS contribution_merge_events_append_only ON contribution_merge_events;
CREATE TRIGGER contribution_merge_events_append_only
  BEFORE UPDATE OR DELETE ON contribution_merge_events
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS spot_publication_assessment_events_append_only ON spot_publication_assessment_events;
CREATE TRIGGER spot_publication_assessment_events_append_only
  BEFORE UPDATE OR DELETE ON spot_publication_assessment_events
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS spot_replacement_relations_append_only ON spot_replacement_relations;
CREATE TRIGGER spot_replacement_relations_append_only
  BEFORE UPDATE OR DELETE ON spot_replacement_relations
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

DROP TRIGGER IF EXISTS operation_receipts_append_only ON operation_receipts;
CREATE TRIGGER operation_receipts_append_only
  BEFORE UPDATE OR DELETE ON operation_receipts
  FOR EACH ROW EXECUTE FUNCTION miniapp_append_only_guard();

INSERT INTO schema_migrations(version) VALUES ('007_operations_revisions_receipts')
ON CONFLICT (version) DO NOTHING;
