import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("production deletion preserves successor accounts and retires stale page effects", () => {
  // The probe executes actual API/session/store/page functions and QueryClient;
  // only native storage, HTTP, React and scheduler ports are synthetic.
  const output = execFileSync(process.execPath,
    [fileURLToPath(new URL("./account-deletion-boundary.probe.mjs", import.meta.url))],
    { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  const rows = output.trim().split(/\r?\n/u).map(line => JSON.parse(line));
  assert.deepEqual(rows.at(-1).summary, { cases: 21, passed: 21, failed: 0 });
  assert.equal(rows.filter(row => row.result === "PASSED").length, 21);
});
