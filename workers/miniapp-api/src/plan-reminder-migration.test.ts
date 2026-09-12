import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL(
  "../../../database/miniapp/migrations/015_plan_reminder_schedules.sql",
  import.meta.url,
), "utf8");

test("reminder migration owns versioned schedules, bounded attempts and account erasure", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS plan_reminder_schedules/u);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS plan_reminder_schedules_active_idx/u);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS plan_reminder_delivery_attempts/u);
  assert.match(migration, /UNIQUE \(schedule_version, attempt_no\)/u);
  assert.match(migration, /REFERENCES users\(user_id\) ON DELETE CASCADE/gu);
  assert.match(migration, /015_plan_reminder_schedules/u);
});
