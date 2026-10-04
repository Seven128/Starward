import assert from "node:assert/strict";
import test from "node:test";
import { createSystemMotionReader, effectiveReducedMotion, readSystemMotion, type SystemMotion } from "./system-motion";
const normal = [{ width: 29 }, { width: 11 }, { width: 1 }];
const reduced = [{ width: 29 }, { width: 1 }, { width: 17 }];

function harness() {
  let now = 0, serial = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const values: SystemMotion[] = [];
  const callbacks: Array<(rows: unknown) => void> = [];
  const reader = createSystemMotionReader(value => values.push(value), {
    later(run, delay) { const id = ++serial; timers.set(id, { at: now + delay, run }); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel(id) { timers.delete(id as unknown as number); },
  });
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at; timers.delete(next[0]); next[1].run();
    }
    now = end;
  };
  const respond = (index: number, rows: unknown) => { const receive = callbacks[index]; assert.ok(receive, "this native query must have been issued"); receive(rows); };
  return { reader, values, callbacks, respond, query: (receive: (rows: unknown) => void) => { callbacks.push(receive); }, advance, pending: () => timers.size };
}

test("only actual mutually exclusive native matches identify system preference", () => {
  assert.equal(readSystemMotion(normal), "no-preference");
  assert.equal(readSystemMotion(reduced), "reduce");
  for (const unknown of [undefined, [], [{ width: 29 }, { width: 1 }, { width: 1 }], [{ width: 29 }, { width: 11 }, { width: 17 }], [{ width: 14.5 }, { width: 11 }, { width: 1 }], [{ width: 29 }, { width: "11" }, { width: 1 }]]) assert.equal(readSystemMotion(unknown), "unknown");
});
test("account and system inputs combine without treating unavailable input as normal", () => {
  assert.equal(effectiveReducedMotion(false, "no-preference"), false);
  for (const value of ["unknown", "reduce"] as const) assert.equal(effectiveReducedMotion(false, value), true);
  for (const value of ["unknown", "no-preference", "reduce"] as const) assert.equal(effectiveReducedMotion(true, value), true);
});
test("latest native sample wins; late normal cannot replace confirmed reduction", () => {
  const h = harness(); h.reader.start("map", h.query); h.advance(250);
  h.respond(1, reduced); h.respond(0, normal);
  assert.deepEqual(h.values, ["unknown", "reduce"]);
  h.advance(700); assert.equal(h.values.at(-1), "reduce");
});
test("hide/unmount permanently retires callbacks even after the same page returns", () => {
  const h = harness(); const release = h.reader.start("map", h.query); h.advance(0); release();
  assert.equal(h.pending(), 0); h.reader.start("map", h.query); h.advance(0);
  h.respond(1, reduced); h.respond(0, normal); release();
  assert.equal(h.values.at(-1), "reduce"); assert.ok(h.pending() > 0);
});
test("a prior page release cannot cancel the new page's reader", () => {
  const h = harness(), old = h.reader.start("map", h.query); h.advance(0);
  h.reader.start("settings", h.query); old(); h.advance(0); h.respond(1, normal); h.respond(0, reduced);
  assert.equal(h.values.at(-1), "no-preference"); assert.ok(h.pending() > 0);
});
test("no callback reaches unknown terminal and all four bounded samples finish", () => {
  const h = harness(); h.reader.start("map", h.query); h.advance(4000);
  assert.equal(h.callbacks.length, 4); assert.equal(h.values.at(-1), "unknown"); assert.equal(h.pending(), 0);
  h.respond(3, normal); assert.equal(h.values.at(-1), "unknown");
});
test("query failure stays quiet and a later valid read recovers normal", () => {
  const h = harness(); let fail = true;
  const release = h.reader.start("map", receive => { if (fail) throw Error("native unavailable"); receive(normal); });
  h.advance(0); assert.equal(h.values.at(-1), "unknown"); fail = false; h.advance(250);
  assert.equal(h.values.at(-1), "no-preference"); release(); assert.equal(h.pending(), 0);
});

test("retiring the visible page invalidates a former normal result without touching a new owner", () => {
  const h = harness(), old = h.reader.start("map", h.query); h.advance(0); h.respond(0, normal);
  old(); assert.equal(h.values.at(-1), "unknown");
  h.reader.start("settings", h.query); h.advance(0); h.respond(1, reduced); old();
  assert.equal(h.values.at(-1), "reduce");
});
