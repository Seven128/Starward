-- Historical approvals cannot establish review against the currently active catalog.
ALTER TABLE astronomical_event_catalog_candidates
  ADD COLUMN IF NOT EXISTS reviewed_against jsonb;

INSERT INTO schema_migrations(version) VALUES ('019_event_catalog_review_baseline')
ON CONFLICT (version) DO NOTHING;
