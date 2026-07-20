CREATE TABLE IF NOT EXISTS spot_visibility_policies (
  spot_id UUID PRIMARY KEY REFERENCES spots(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL CHECK (visibility IN ('public_exact', 'public_approximate', 'verified_only', 'invite_only', 'private', 'hidden')),
  reason TEXT,
  version INTEGER NOT NULL CHECK (version > 0),
  effective_at TIMESTAMPTZ NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_facts (
  id UUID PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  fact_value JSONB,
  state TEXT NOT NULL CHECK (state IN ('known', 'unknown', 'temporary-unavailable')),
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'admin-verified', 'verified-contribution', 'community', 'model')),
  source_label TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  version TEXT NOT NULL,
  safety_relevant BOOLEAN NOT NULL DEFAULT false,
  supersedes_id UUID REFERENCES spot_facts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > observed_at)
);
CREATE INDEX IF NOT EXISTS spot_facts_spot_key_time_idx ON spot_facts (spot_id, fact_key, observed_at DESC);

CREATE TABLE IF NOT EXISTS spot_status_history (
  id UUID PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'caution', 'closed')),
  reason TEXT,
  source_type TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spot_status_history_spot_time_idx ON spot_status_history (spot_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS spot_horizon_sectors (
  id UUID PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  azimuth_start_deg DOUBLE PRECISION NOT NULL CHECK (azimuth_start_deg >= 0 AND azimuth_start_deg < 360),
  azimuth_end_deg DOUBLE PRECISION NOT NULL CHECK (azimuth_end_deg > 0 AND azimuth_end_deg <= 360),
  terrain_altitude_deg DOUBLE PRECISION,
  artificial_altitude_deg DOUBLE PRECISION,
  panorama_altitude_deg DOUBLE PRECISION,
  effective_altitude_deg DOUBLE PRECISION NOT NULL,
  source_version TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spot_verifications (
  id UUID PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  verifier_id UUID,
  verified_at TIMESTAMPTZ NOT NULL,
  coverage TEXT[] NOT NULL,
  evidence_refs JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
