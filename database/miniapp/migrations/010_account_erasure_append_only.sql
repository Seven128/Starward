-- Preserve immutable history, with a narrow UPDATE-only privacy projection
-- inside the repository's account-erasure transaction. Never disable triggers.
CREATE OR REPLACE FUNCTION miniapp_append_only_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  stamp text := current_setting('starward.account_erasure_at', true);
  before_row jsonb := to_jsonb(OLD);
  after_row jsonb := to_jsonb(NEW);
  marker jsonb;
  mutable_columns text[];
  permitted boolean := false;
BEGIN
  IF TG_OP <> 'UPDATE' OR COALESCE(stamp, '') = '' THEN
    RAISE EXCEPTION 'append_only_record_immutable';
  END IF;
  marker := jsonb_build_object('privacyErasedAt', stamp);
  CASE TG_TABLE_NAME
    WHEN 'contribution_revisions' THEN
      mutable_columns := ARRAY['payload', 'payload_digest', 'actor_id'];
      permitted := after_row->'payload'->>'privacyErasedAt' = stamp
        AND after_row->'payload'->>'detail' = ''
        AND after_row->'payload'->'media' = '[]'::jsonb
        AND after_row->'payload'->'candidateLocation' = 'null'::jsonb
        AND EXISTS (SELECT 1 FROM user_submissions
          WHERE submission_id = OLD.submission_id AND payload->>'privacyErasedAt' = stamp);
    WHEN 'moderation_case_events' THEN
      mutable_columns := ARRAY['reason', 'redacted_payload', 'actor_id'];
      permitted := after_row->'redacted_payload' = marker
        AND after_row->'reason' = 'null'::jsonb
        AND EXISTS (SELECT 1 FROM moderation_cases
          WHERE case_id = OLD.case_id AND payload->>'privacyErasedAt' = stamp);
    WHEN 'contribution_merge_events' THEN
      mutable_columns := ARRAY['reason', 'actor_id'];
      permitted := after_row->>'reason' = 'account-data-erased'
        AND EXISTS (SELECT 1 FROM user_submissions
          WHERE submission_id = OLD.submission_id AND payload->>'privacyErasedAt' = stamp);
    WHEN 'operation_receipts' THEN
      mutable_columns := ARRAY['result_payload', 'readback_payload'];
      permitted := after_row->'result_payload' = marker AND after_row->'readback_payload' = marker;
    WHEN 'audit_logs' THEN
      mutable_columns := ARRAY['before_payload', 'after_payload', 'actor_id', 'subject_id'];
      permitted := after_row->'before_payload' = marker AND after_row->'after_payload' = marker;
    ELSE
      RAISE EXCEPTION 'append_only_record_immutable';
  END CASE;
  IF permitted AND (before_row - mutable_columns) = (after_row - mutable_columns) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'append_only_record_immutable';
END;
$$;

INSERT INTO schema_migrations(version) VALUES ('010_account_erasure_append_only')
ON CONFLICT (version) DO NOTHING;
