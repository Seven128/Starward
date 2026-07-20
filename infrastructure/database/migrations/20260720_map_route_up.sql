CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS spots (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'provisional', 'closed')),
  facilities TEXT[] NOT NULL DEFAULT '{}',
  coordinate_source TEXT NOT NULL,
  horizontal_accuracy_m DOUBLE PRECISION,
  verification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spots_location_gist_idx ON spots USING GIST (location);
CREATE INDEX IF NOT EXISTS spots_status_idx ON spots (status);

CREATE TABLE IF NOT EXISTS route_snapshots (
  id UUID PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_version TEXT NOT NULL,
  origin GEOGRAPHY(POINT, 4326) NOT NULL,
  destination GEOGRAPHY(POINT, 4326) NOT NULL,
  provider_coordinate_system TEXT NOT NULL CHECK (provider_coordinate_system = 'GCJ-02'),
  mode TEXT NOT NULL CHECK (mode IN ('drive', 'walk', 'cycle', 'transit')),
  distance_m INTEGER NOT NULL CHECK (distance_m >= 0),
  duration_s INTEGER NOT NULL CHECK (duration_s >= 0),
  geometry GEOMETRY(LINESTRING, 4326),
  generated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > generated_at),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_snapshots_expiry_idx ON route_snapshots (expires_at);
