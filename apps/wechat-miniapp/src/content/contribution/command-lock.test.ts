import assert from "node:assert/strict";
import test from "node:test";
import { createContributionCommandLock } from "./command-lock";

test("pending native picker excludes saving and submitting, then releases on cancellation", async () => {
  const exclusive = createContributionCommandLock();
  let cancel!: () => void;
  const pendingPicker = new Promise<void>((resolve) => { cancel = resolve; });
  const calls: string[] = [];
  const choose = exclusive(async () => { calls.push("choose"); await pendingPicker; });
  const save = exclusive(async () => { calls.push("save"); return "saved"; });
  const pending = choose();
  await choose();
  await save();
  assert.deepEqual(calls, ["choose"]);
  cancel();
  await pending;
  assert.equal(await save(), "saved");
});

test("a rejected operation does not lock out retries", async () => {
  const exclusive = createContributionCommandLock();
  const fail = exclusive(async () => { throw new Error("network failed"); });
  await assert.rejects(fail());
  assert.equal(await exclusive(async () => "retried")(), "retried");
});
