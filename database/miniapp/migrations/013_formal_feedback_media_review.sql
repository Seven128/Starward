ALTER TABLE formal_feedback_media_uploads
  ADD COLUMN IF NOT EXISTS submission_id text REFERENCES user_submissions(submission_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE formal_feedback_media_uploads AS media
   SET submission_id = submission.submission_id
  FROM user_submissions AS submission
 WHERE media.submission_id IS NULL
   AND EXISTS (
     SELECT 1
       FROM jsonb_array_elements(COALESCE(submission.payload->'media', '[]'::jsonb)) AS item
      WHERE item->>'uploadId' = media.upload_id
   );

CREATE INDEX IF NOT EXISTS formal_feedback_media_submission_idx
  ON formal_feedback_media_uploads(submission_id)
  WHERE submission_id IS NOT NULL;

INSERT INTO schema_migrations(version) VALUES ('013_formal_feedback_media_review')
ON CONFLICT (version) DO NOTHING;
