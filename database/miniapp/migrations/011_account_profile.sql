ALTER TABLE users
  ADD COLUMN nickname text,
  ADD COLUMN profile_revision integer NOT NULL DEFAULT 1 CHECK (profile_revision > 0),
  ADD COLUMN profile_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE users ADD CONSTRAINT users_nickname_length
  CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 1 AND 40);

INSERT INTO schema_migrations(version) VALUES ('011_account_profile')
ON CONFLICT (version) DO NOTHING;
