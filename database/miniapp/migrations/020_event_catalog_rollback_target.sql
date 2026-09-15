-- Preserve the exact selected historical version independently of the bounded
-- new publication ID. Old append-only records remain unknown, not inferred.
ALTER TABLE astronomical_event_catalog_publications
  ADD COLUMN restored_from_version text;

INSERT INTO schema_migrations(version) VALUES ('020_event_catalog_rollback_target')
ON CONFLICT (version) DO NOTHING;
