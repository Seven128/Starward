CREATE TABLE plan_reminder_subscription_challenges (
  challenge_id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  schedule_version text NOT NULL REFERENCES plan_reminder_schedules(schedule_version) ON DELETE CASCADE,
  app_id text NOT NULL,
  template_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('REQUESTED','CLIENT_ACCEPTED','REJECTED','BANNED','FILTERED','EXPIRED','CANCELED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  resolved_at timestamptz,
  consumed_at timestamptz
);
CREATE INDEX plan_reminder_subscription_lookup_idx
  ON plan_reminder_subscription_challenges(user_id,schedule_version,app_id,template_id);
ALTER TABLE plan_reminder_delivery_attempts ADD COLUMN subscription_challenge_id uuid
  REFERENCES plan_reminder_subscription_challenges(challenge_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX plan_reminder_attempt_subscription_idx
  ON plan_reminder_delivery_attempts(subscription_challenge_id) WHERE subscription_challenge_id IS NOT NULL;
INSERT INTO schema_migrations(version) VALUES ('022_plan_reminder_subscription_challenges')
ON CONFLICT (version) DO NOTHING;
