import assert from "node:assert/strict";
import test from "node:test";
import { OutboxQueueHandleProbe } from "./outbox-dispatch-recovery.ts";

test("outbox recovery requires positive absence in both current and legacy queues", async () => {
  const absent = { getJob: async () => undefined };
  assert.equal(await new OutboxQueueHandleProbe([absent, absent]).absent("event"), true);
  for (const state of ["active", "waiting", "delayed", "completed", "failed", "unknown"]) {
    const present = { getJob: async () => ({ state }) };
    assert.equal(await new OutboxQueueHandleProbe([absent, present]).absent("event"), false);
  }
  const failed = { getJob: async () => { throw new Error("redis_read_failed"); } };
  await assert.rejects(new OutboxQueueHandleProbe([absent, failed]).absent("event"), /redis_read_failed/);
});

test("a timed-out Redis read stays unknown and cannot accumulate new commands", async () => {
  let reads = 0;
  let resolveFirst!: (value: unknown) => void;
  const first = new Promise<unknown>(resolve => { resolveFirst = resolve; });
  const probe = new OutboxQueueHandleProbe([{
    getJob: async () => { reads += 1; return reads === 1 ? first : undefined; },
  }], 15);
  await assert.rejects(probe.absent("lost-event"), /outbox_queue_probe_timeout/);
  await assert.rejects(probe.absent("another-event"), /outbox_queue_probe_pending/);
  assert.equal(reads, 1);
  resolveFirst(undefined);
  await first;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(await probe.absent("another-event"), true);
  assert.equal(reads, 2, "the late reply cannot substitute for a fresh read of the next event");
});

test("one rejected queue read cannot release another still-pending read", async () => {
  let reads = 0;
  let resolveSlow!: (value: unknown) => void;
  const slow = new Promise<unknown>(resolve => { resolveSlow = resolve; });
  const probe = new OutboxQueueHandleProbe([
    { getJob: async () => { throw new Error("first_queue_failed"); } },
    { getJob: async () => { reads += 1; return slow; } },
  ]);
  await assert.rejects(probe.absent("event"), /first_queue_failed/);
  await assert.rejects(probe.absent("event"), /outbox_queue_probe_pending/);
  assert.equal(reads, 1);
  resolveSlow(undefined);
  await slow;
});

test("continuation retirement requires every existing handle to be affirmatively failed", async () => {
  const absent = { getJob: async () => undefined };
  const failed = { getJob: async () => ({ getState: async () => "failed" }) };
  assert.equal(await new OutboxQueueHandleProbe([failed, absent]).inspect("event"), "retained");
  assert.equal(await new OutboxQueueHandleProbe([failed, absent]).inspect("event", true), "failed");
  assert.equal(await new OutboxQueueHandleProbe([failed, failed]).inspect("event", true), "failed");
  for (const state of ["active", "waiting", "paused", "delayed", "completed", "unknown"]) {
    const legacy = { getJob: async () => ({ getState: async () => state }) };
    assert.equal(await new OutboxQueueHandleProbe([failed, legacy]).inspect("event", true), "retained");
  }
  const unavailable = { getJob: async () => ({ getState: async () => { throw new Error("state_read_failed"); } }) };
  await assert.rejects(new OutboxQueueHandleProbe([failed, unavailable]).inspect("event", true), /state_read_failed/);
});

test("a timed-out continuation state read retains the shared in-flight owner", async () => {
  let reads = 0;
  let finish!: (value: string) => void;
  const state = new Promise<string>(resolve => { finish = resolve; });
  const probe = new OutboxQueueHandleProbe([{
    getJob: async () => { reads++; return { getState: async () => state }; },
  }], 15);
  await assert.rejects(probe.inspect("event", true), /outbox_queue_probe_timeout/);
  await assert.rejects(probe.absent("another-event"), /outbox_queue_probe_pending/);
  assert.equal(reads, 1);
  finish("failed");
  await state;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(await probe.inspect("event", true), "failed");
  assert.equal(reads, 2);
});
