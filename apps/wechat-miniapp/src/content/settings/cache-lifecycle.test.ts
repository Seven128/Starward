import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("cache cleanup retires hidden, unmounted and departed-account page results", () => {
  const output = execFileSync(process.execPath,
    [fileURLToPath(new URL("./cache-lifecycle.probe.mjs", import.meta.url))],
    { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  const rows = output.trim().split(/\r?\n/u).map(line => JSON.parse(line));
  assert.deepEqual(rows.at(-1).summary, { cases: 6, passed: 6, failed: 0 });
});
