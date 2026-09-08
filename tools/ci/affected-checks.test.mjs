import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { affectedChecks, checksForEvent } from "./affected-checks.mjs";

test("lightweight and full installs resolve the same locked Context checker", () => {
  const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
  const root = read("../../package.json");
  const workspace = read("../context-check/package.json");
  const lock = read("../../package-lock.json");
  const selected = root.devDependencies["project-tiny-context-harness"];
  assert.match(selected, /^\d+\.\d+\.\d+$/u);
  assert.equal(workspace.devDependencies["project-tiny-context-harness"], selected);
  assert.equal(lock.packages["tools/context-check"].devDependencies["project-tiny-context-harness"], selected);
  assert.equal(lock.packages["node_modules/project-tiny-context-harness"].version, selected);
});

test("context and existing Skill prose can use lightweight checks without skipping product inputs", () => {
  assert.deepEqual(affectedChecks(["project_context/global.md", ".codex/skills/uiux_design/SKILL.md"]), { product: false, context: true });
  for (const file of ["DESIGN.md", "docs/design-resources/map/ADOPTED.md", "docs/source-plan.md", "apps/wechat-miniapp/src/app.tsx", "packages/astronomy-core/data/catalog.json", "unknown-config.json"])
    assert.equal(affectedChecks([file]).product, true, file);
  assert.deepEqual(affectedChecks(["package-lock.json"]), { product: true, context: true });
  assert.deepEqual(affectedChecks([".github/workflows/product-ci.yml"]), { product: true, context: true });
  assert.deepEqual(affectedChecks(["tools/run-node.cjs"]), { product: true, context: true });
  assert.deepEqual(affectedChecks(["tools/miniapp/runtime-event-policy.mjs"]), { product: true, context: true });
});

test("manual dispatch, initial push, empty or failed diff retain full validation", () => {
  const both = { product: true, context: true };
  assert.deepEqual(checksForEvent("workflow_dispatch", {}), both);
  assert.deepEqual(checksForEvent("push", { before: "0".repeat(40), after: "b".repeat(40) }), both);
  assert.deepEqual(checksForEvent("push", { before: "a".repeat(40), after: "b".repeat(40) }, () => { throw Error("missing base"); }), both);
  assert.deepEqual(affectedChecks([]), both);
});

test("PRs compare the merge base and push ranges include every commit and deleted/renamed source", () => {
  const calls = [];
  const event = { pull_request: { base: { sha: "a".repeat(40) }, head: { sha: "b".repeat(40) } } };
  const result = checksForEvent("pull_request", event, (...args) => {
    calls.push(args);
    return args[0] === "merge-base" ? "c".repeat(40) : "project_context/global.md\0apps/api/src/deleted.ts\0";
  });
  assert.deepEqual(result, { product: true, context: true });
  assert.equal(calls[1].at(-2), "c".repeat(40));
  assert.ok(calls[1].includes("--no-renames"));
  const pushCalls = [];
  checksForEvent("push", { before: "a".repeat(40), after: "b".repeat(40) }, (...args) => { pushCalls.push(args); return "README.md\0"; });
  assert.deepEqual(pushCalls[0].slice(-2), ["a".repeat(40), "b".repeat(40)]);
});
