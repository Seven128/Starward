import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import runtime from "./run-node.cjs";

const { nodeEnvironment, resolveArguments, selectNodeRuntime, supportedVersion } = runtime;
const launcher = fileURLToPath(new URL("./run-node.cjs", import.meta.url));

test("runtime selection uses a supported current Node without probing another installation", () => {
  const executable = path.resolve("node24", "node.exe");
  assert.equal(selectNodeRuntime({ executable, version: "24.16.0", inspectVersion() { throw new Error("unexpected probe"); } }), executable);
  assert.equal(supportedVersion("v24.0.0"), true);
  assert.equal(supportedVersion("25.1.0"), true);
  assert.equal(supportedVersion("v16.13.1"), false);
  assert.equal(supportedVersion("unknown"), false);
});

test("old script Node can recover only through a verified absolute npm Node path", () => {
  const npmNode = path.resolve("npm runtime with spaces", "node.exe");
  const select = (candidate, observed) => selectNodeRuntime({
    version: "16.13.1", environment: { npm_node_execpath: candidate },
    inspectVersion(executable) { assert.equal(executable, candidate); return observed; },
  });
  assert.equal(select(npmNode, "v24.16.0"), npmNode);
  for (const [candidate, observed] of [[undefined, ""], ["node", "v24.16.0"], [npmNode, "v16.13.1"], [npmNode, ""]])
    assert.throws(() => select(candidate, observed), /Starward requires Node\.js >=24/u);
});

test("child PATH selects Node on Windows and POSIX without mutating the parent", () => {
  const windows = { Path: "C:\\tools", PATH: "C:\\more", TEMP: "private-temp" };
  const selected = "C:\\Program Files\\nodejs\\node.exe";
  assert.deepEqual(nodeEnvironment(selected, windows, "win32"), {
    Path: "C:\\Program Files\\nodejs;C:\\tools;C:\\more", TEMP: "private-temp",
    NODE: selected, npm_node_execpath: selected,
  });
  assert.equal(windows.Path, "C:\\tools");
  assert.equal(windows.PATH, "C:\\more");
  assert.equal(nodeEnvironment("/opt/node/bin/node", { PATH: "/usr/bin", Path: "ordinary-variable" }, "linux").PATH, "/opt/node/bin:/usr/bin");
  assert.equal(nodeEnvironment("/opt/node/bin/node", { Path: "ordinary-variable" }, "linux").Path, "ordinary-variable");
});

test("binary resolution follows the invoking workspace and preserves literal arguments", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-node-entry-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const packageDirectory = path.join(directory, "node_modules", "fixture-bin");
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(directory, "package.json"), "{}\n");
  await writeFile(path.join(packageDirectory, "package.json"), JSON.stringify({ name: "fixture-bin", bin: { fixture: "cli.cjs" } }));
  const literalArgs = ["path with spaces", "x&y", "$(not-a-shell)", '"quoted"'];
  assert.deepEqual(resolveArguments(["--bin", "fixture-bin", "fixture", ...literalArgs], { cwd: directory }), [path.join(packageDirectory, "cli.cjs"), ...literalArgs]);
  assert.throws(() => resolveArguments(["--bin", "fixture-bin", "missing"], { cwd: directory }), /has no missing binary/u);
  assert.throws(() => resolveArguments(["--npm", "run", "test"], { environment: {} }), /npm_execpath/u);
  const npmCli = path.resolve(directory, "npm-cli.js");
  assert.deepEqual(resolveArguments(["--npm", "run", "test"], { environment: { npm_execpath: npmCli } }), [npmCli, "run", "test"]);
});

function capture(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [launcher, ...args], { ...options, windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("real child and its nested node inherit the selected runtime; exit codes survive", async () => {
  const result = await capture(["-e", "const cp=require('node:child_process'); console.log(JSON.stringify({self:process.execPath,nested:cp.execFileSync('node',['-p','process.execPath'],{encoding:'utf8'}).trim(),argv:process.argv.slice(1)}));", "argument with spaces", "&literal"]);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { self: process.execPath, nested: process.execPath, argv: ["argument with spaces", "&literal"] });
  assert.equal((await capture(["-e", "process.exitCode=7"])).code, 7);
});
