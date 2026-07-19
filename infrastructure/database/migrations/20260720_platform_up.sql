CREATE TABLE IF NOT EXISTS platform_schema_versions (
  scope TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  applied_at TEXT NOT NULL
);

INSERT INTO platform_schema_versions (scope, revision, applied_at)
VALUES ('starward-platform', 1, '2026-07-20T00:00:00Z')
ON CONFLICT (scope) DO UPDATE SET revision = excluded.revision, applied_at = excluded.applied_at;
