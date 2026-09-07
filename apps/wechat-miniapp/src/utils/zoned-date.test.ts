import assert from "node:assert/strict";
import test from "node:test";
import { displayBeijingTimestamp } from "./zoned-date";

test("history timestamps show Beijing calendar rollover and reject unavailable instants", () => {
  assert.equal(displayBeijingTimestamp("2026-09-06T18:05:00Z"), "2026-09-07 02:05（北京时间）");
  assert.equal(displayBeijingTimestamp("2026-09-07T02:05:00+08:00"), "2026-09-07 02:05（北京时间）");
  assert.equal(displayBeijingTimestamp("invalid"), "时间暂不可用");
});
