import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { composeExecutor, composeInvocation } from "./compose-runtime.mjs";

test("deployment Compose always binds the exact descriptor and release file", () => {
  const composePath = path.resolve("infrastructure/deployment/compose.yml");
  const deployEnvPath = path.resolve("tmp/staging/deploy.env");
  assert.deepEqual(composeInvocation({ composePath, deployEnvPath, args: ["config", "--quiet"] }), {
    command: "docker",
    args: ["compose", "--env-file", deployEnvPath, "-f", composePath, "config", "--quiet"],
  });
});

test("Compose executor does not invoke a shell or interpolate caller arguments", () => {
  const calls = [];
  const run = composeExecutor({
    composePath: path.resolve("infrastructure/deployment/compose.yml"),
    deployEnvPath: path.resolve("tmp/staging/deploy.env"),
    cwd: path.resolve("."),
    execute(input) {
      calls.push(input);
      return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    },
  });
  run({ args: ["pull"], step: "pull" });
  assert.equal(calls[0].command, "docker");
  assert.deepEqual(calls[0].args.slice(-1), ["pull"]);
  assert.equal("shell" in calls[0], false);
});
