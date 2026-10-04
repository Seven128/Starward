import assert from "node:assert/strict";
import test from "node:test";
import { createSkyLandscapeReadiness } from "./sky-landscape-readiness";

test("a returning photo fades in after success, with cancellation and canvas retirement", () => {
  let now = 1000, sequence = 0;
  const callbacks = new Map<number, () => void>(), values: number[] = [];
  const owner = createSkyLandscapeReadiness({ now: () => now,
    requestFrame(callback) { callbacks.set(++sequence, callback); return sequence; },
    cancelFrame(handle) { callbacks.delete(handle as number); }, changed: value => values.push(value) });
  const advance = (time: number) => { now = time; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(fn => fn()); };
  owner.setAvailable(true); advance(1120); assert.deepEqual(values, [.5]);
  advance(1240); assert.deepEqual(values, [.5, 1]); assert.equal(callbacks.size, 0);
  owner.setAvailable(false); assert.equal(values.at(-1), 0);
  owner.setAvailable(true); const late = [...callbacks.values()][0]!;
  owner.setAvailable(false); late(); assert.equal(callbacks.size, 0); assert.equal(values.at(-1), 0);
  owner.setAvailable(true, true); assert.equal(values.at(-1), 1); assert.equal(callbacks.size, 0);
  const settled = values.length; owner.setAvailable(true, false);
  assert.equal(values.length, settled, "changing motion preference cannot clear a ready foreground");
  assert.equal(callbacks.size, 0);
  owner.setAvailable(false); owner.setAvailable(true);
  const restarted = values.length; now = 1300; late();
  assert.equal(values.length, restarted, "an old canceled tick cannot publish into a new availability cycle");
  assert.equal(callbacks.size, 1, "the retired cycle cannot steal the active handle or schedule another timer");
  owner.dispose();
  assert.equal(callbacks.size, 0); const count = values.length; owner.setAvailable(true, true); late(); assert.equal(values.length, count);
});
