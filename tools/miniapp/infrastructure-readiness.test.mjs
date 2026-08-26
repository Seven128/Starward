import assert from "node:assert/strict";
import test from "node:test";

import { connectResourceWithRetry } from "./infrastructure-readiness.mjs";

function transientError(code) {
  return Object.assign(new Error(code), { code });
}

test("connection readiness retries a transient reset and closes the failed client", async () => {
  let attempts = 0;
  let closed = 0;
  let clock = 0;
  const resource = await connectResourceWithRetry({
    label: "postgres",
    create: () => ({ attempt: ++attempts }),
    connect: async (client) => {
      if (client.attempt === 1) throw transientError("ECONNRESET");
    },
    close: async () => {
      closed += 1;
    },
    timeoutMs: 1_000,
    retryDelayMs: 100,
    now: () => clock,
    wait: async (milliseconds) => {
      clock += milliseconds;
    },
  });
  assert.equal(resource.attempt, 2);
  assert.equal(closed, 1);
});

test("connection readiness retries node-postgres startup termination without broad unknown retries", async () => {
  let attempts = 0;
  const resource = await connectResourceWithRetry({
    label: "postgres",
    create: () => ({ attempt: ++attempts }),
    connect: async (client) => {
      if (client.attempt === 1)
        throw new Error("Connection terminated unexpectedly");
    },
    close: async () => {},
    wait: async () => {},
  });

  assert.equal(attempts, 2);
  assert.equal(resource.attempt, 2);
});

test("connection readiness fails immediately on a non-transient configuration error", async () => {
  let attempts = 0;
  let closed = 0;
  await assert.rejects(
    () =>
      connectResourceWithRetry({
        label: "postgres",
        create: () => ({ attempt: ++attempts }),
        connect: async () => {
          throw transientError("28P01");
        },
        close: async () => {
          closed += 1;
        },
        timeoutMs: 1_000,
        retryDelayMs: 100,
      }),
    /postgres_connect_failed:28P01/u,
  );
  assert.equal(attempts, 1);
  assert.equal(closed, 1);
});

test("connection readiness stops at its bounded timeout", async () => {
  let clock = 0;
  let attempts = 0;
  await assert.rejects(
    () =>
      connectResourceWithRetry({
        label: "redis",
        create: () => ({ attempt: ++attempts }),
        connect: async () => {
          throw transientError("ECONNREFUSED");
        },
        close: async () => {},
        timeoutMs: 1_000,
        retryDelayMs: 250,
        now: () => clock,
        wait: async (milliseconds) => {
          clock += milliseconds;
        },
      }),
    /redis_start_timeout:ECONNREFUSED/u,
  );
  assert.equal(attempts, 4);
});
