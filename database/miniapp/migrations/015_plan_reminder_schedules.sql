CREATE TABLE IF NOT EXISTS plan_reminder_schedules (
  schedule_version text PRIMARY KEY,
  plan_id text NOT NULL,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reminder_id text NOT NULL,
  plan_revision integer NOT NULL,
  trigger_at timestamptz,
  departure_at timestamptz,
  state text NOT NULL CHECK (state IN (
    'NOT_REQUESTED', 'UNSCHEDULABLE', 'WAITING_AUTHORIZATION', 'SCHEDULED',
    'SENT', 'SKIPPED', 'FAILED', 'RESULT_UNKNOWN', 'CANCELED'
  )),
  reason text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_reminder_schedules_active_idx
  ON plan_reminder_schedules(user_id, plan_id, reminder_id) WHERE active;
CREATE INDEX IF NOT EXISTS plan_reminder_schedules_due_idx
  ON plan_reminder_schedules(state, trigger_at) WHERE active;

CREATE TABLE IF NOT EXISTS plan_reminder_delivery_attempts (
  attempt_id uuid PRIMARY KEY,
  schedule_version text NOT NULL,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  attempt_no integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('SENT', 'KNOWN_FAILURE', 'UNKNOWN')),
  provider_receipt text,
  error_code text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_version, attempt_no)
);

INSERT INTO schema_migrations(version) VALUES ('015_plan_reminder_schedules')
ON CONFLICT (version) DO NOTHING;
