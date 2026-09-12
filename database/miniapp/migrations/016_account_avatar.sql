ALTER TABLE users
  ADD COLUMN avatar_object_key text,
  ADD COLUMN avatar_mime_type text,
  ADD COLUMN avatar_byte_size integer,
  ADD COLUMN avatar_sha256 text,
  ADD COLUMN avatar_zoom numeric(3,2);

ALTER TABLE users ADD CONSTRAINT users_avatar_complete
  CHECK ((avatar_object_key IS NULL AND avatar_mime_type IS NULL AND avatar_byte_size IS NULL AND avatar_sha256 IS NULL AND avatar_zoom IS NULL)
      OR (avatar_object_key IS NOT NULL AND avatar_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
          AND avatar_byte_size > 0 AND avatar_sha256 ~ '^[a-f0-9]{64}$' AND avatar_zoom BETWEEN 1 AND 2.5));

INSERT INTO schema_migrations(version) VALUES ('016_account_avatar')
ON CONFLICT (version) DO NOTHING;
