CREATE TABLE IF NOT EXISTS account_deletion_media_queue (
  deletion_batch_id uuid NOT NULL,
  object_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deletion_batch_id, object_key)
);

CREATE INDEX IF NOT EXISTS account_deletion_media_queue_created_idx
  ON account_deletion_media_queue(created_at);

INSERT INTO schema_migrations(version) VALUES ('008_account_data_operations')
ON CONFLICT (version) DO NOTHING;
