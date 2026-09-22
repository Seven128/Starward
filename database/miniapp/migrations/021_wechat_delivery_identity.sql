ALTER TABLE wechat_identities
  ADD COLUMN delivery_app_id text,
  ADD COLUMN delivery_identity_ciphertext text,
  ADD COLUMN delivery_identity_updated_at timestamptz,
  ADD CONSTRAINT wechat_delivery_identity_complete CHECK (
    (delivery_app_id IS NULL AND delivery_identity_ciphertext IS NULL AND delivery_identity_updated_at IS NULL)
    OR (delivery_app_id IS NOT NULL AND delivery_identity_ciphertext IS NOT NULL AND delivery_identity_updated_at IS NOT NULL)
  );

-- Existing digests cannot be reversed. A subsequent verified login supplies the destination.
-- The existing account-erasure path deletes wechat_identities, including these fields.
INSERT INTO schema_migrations(version) VALUES ('021_wechat_delivery_identity')
ON CONFLICT (version) DO NOTHING;
