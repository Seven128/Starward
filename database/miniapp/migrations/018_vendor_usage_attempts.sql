-- Preserve historical estimates; legacy zero is not verified free usage.
ALTER TABLE vendor_call_usage
  ALTER COLUMN estimated_cost_cny DROP NOT NULL,
  ALTER COLUMN estimated_cost_cny DROP DEFAULT,
  ADD COLUMN request_id uuid UNIQUE,
  ADD COLUMN product text NOT NULL DEFAULT 'MINIAPP' CHECK (product = 'MINIAPP'),
  ADD COLUMN http_status integer CHECK (http_status BETWEEN 100 AND 599),
  ADD COLUMN estimated_request_units numeric(16,6),
  ADD COLUMN unit_basis text NOT NULL DEFAULT 'LEGACY_UNVERIFIED',
  ADD COLUMN cost_basis text NOT NULL DEFAULT 'LEGACY_UNVERIFIED',
  ADD COLUMN request_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX vendor_call_usage_month_idx ON vendor_call_usage (product, occurred_at);

INSERT INTO schema_migrations(version) VALUES ('018_vendor_usage_attempts')
ON CONFLICT (version) DO NOTHING;
