CREATE TABLE IF NOT EXISTS dark_sky_dataset_publications (
  dataset_version text PRIMARY KEY,
  source_id text NOT NULL REFERENCES data_source_registry(source_id),
  product_name text NOT NULL,
  data_year integer NOT NULL,
  manifest_sha256 text NOT NULL,
  radiance_sha256 text NOT NULL,
  coverage_sha256 text NOT NULL,
  state text NOT NULL,
  payload jsonb NOT NULL,
  validated_at timestamptz NOT NULL,
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS dark_sky_grid_cells (
  dataset_version text NOT NULL REFERENCES dark_sky_dataset_publications(dataset_version),
  cell_id text NOT NULL,
  geom_wgs84 geometry(Polygon, 4326) NOT NULL,
  state text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (dataset_version, cell_id)
);
CREATE INDEX IF NOT EXISTS dark_sky_grid_cells_geom_gix
  ON dark_sky_grid_cells USING gist(geom_wgs84);

ALTER TABLE light_pollution_samples
  ADD COLUMN IF NOT EXISTS source_id text REFERENCES data_source_registry(source_id);
CREATE INDEX IF NOT EXISTS light_pollution_samples_dataset_idx
  ON light_pollution_samples(dataset_version, spot_id);

INSERT INTO schema_migrations(version) VALUES ('004_dark_sky_dataset_pipeline')
ON CONFLICT (version) DO NOTHING;
