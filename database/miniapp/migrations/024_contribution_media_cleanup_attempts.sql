ALTER TABLE contribution_media_uploads ADD COLUMN cleanup_attempted_at timestamptz;
ALTER TABLE formal_feedback_media_uploads ADD COLUMN cleanup_attempted_at timestamptz;

CREATE INDEX contribution_media_cleanup_due_idx ON contribution_media_uploads
  (cleanup_attempted_at NULLS FIRST, expires_at, upload_id)
  WHERE state IN ('PENDING', 'UPLOADED', 'EXPIRED');
CREATE INDEX formal_media_cleanup_due_idx ON formal_feedback_media_uploads
  (cleanup_attempted_at NULLS FIRST, expires_at, upload_id)
  WHERE state IN ('PENDING', 'UPLOADED', 'EXPIRED');

INSERT INTO schema_migrations(version) VALUES ('024_contribution_media_cleanup_attempts')
ON CONFLICT (version) DO NOTHING;
