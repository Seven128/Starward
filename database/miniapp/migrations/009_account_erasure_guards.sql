-- Account erasure is the only permitted rewrite of retained contribution
-- content. Row locks serialize it with late user/admin commands; stale writers
-- must fail rather than repopulate a redacted record after deletion commits.
CREATE OR REPLACE FUNCTION guard_miniapp_contribution_erasure()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.payload ? 'privacyErasedAt' THEN
    RAISE EXCEPTION 'contribution_account_deleted';
  END IF;
  IF NEW.payload ? 'privacyErasedAt' THEN
    RETURN NEW;
  END IF;
  PERFORM 1 FROM users WHERE user_id = NEW.user_id AND state = 'ACTIVE' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER miniapp_contribution_erasure_guard
BEFORE INSERT OR UPDATE ON user_submissions
FOR EACH ROW EXECUTE FUNCTION guard_miniapp_contribution_erasure();

CREATE OR REPLACE FUNCTION guard_miniapp_moderation_erasure()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.payload ? 'privacyErasedAt' THEN
    RAISE EXCEPTION 'contribution_account_deleted';
  END IF;
  IF NEW.payload ? 'privacyErasedAt' THEN
    RETURN NEW;
  END IF;
  IF NEW.subject_type = 'USER_CONTRIBUTION' THEN
    PERFORM 1 FROM user_submissions
      WHERE submission_id = NEW.subject_id AND NOT (payload ? 'privacyErasedAt') FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'contribution_account_deleted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER miniapp_moderation_erasure_guard
BEFORE INSERT OR UPDATE ON moderation_cases
FOR EACH ROW EXECUTE FUNCTION guard_miniapp_moderation_erasure();

CREATE OR REPLACE FUNCTION guard_miniapp_revision_erasure()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM user_submissions
    WHERE submission_id = NEW.submission_id AND NOT (payload ? 'privacyErasedAt') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contribution_account_deleted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER miniapp_revision_erasure_guard
BEFORE INSERT ON contribution_revisions
FOR EACH ROW EXECUTE FUNCTION guard_miniapp_revision_erasure();

INSERT INTO schema_migrations(version) VALUES ('009_account_erasure_guards')
ON CONFLICT (version) DO NOTHING;
