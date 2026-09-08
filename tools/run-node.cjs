// This entry must remain compatible with Node 16, including before imports run.
const { spawn, spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

const requiredVersion = require("../package.json").engines.node;
const minimum = /^>=(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(requiredVersion);
if (!minimum) throw new Error("Unsupported root Node engine range; update tools/run-node.cjs.");

function supportedVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(version).trim());
  if (!match) return false;
  for (let index = 1; index <= 3; index += 1) {
    const actual = Number(match[index]);
    const expected = Number(minimum[index] || 0);
    if (actual !== expected) return actual > expected;
  }
  return true;
}

function inspectNodeVersion(executable) {
  const result = spawnSync(executable, ["--version"], {
    encoding: "utf8", timeout: 2500, windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function selectNodeRuntime({
  executable = process.execPath,
  version = process.versions.node,
  environment = process.env,
  inspectVersion = inspectNodeVersion,
} = {}) {
  if (supportedVersion(version)) return executable;
  const npmNode = environment.npm_node_execpath;
  if (npmNode && path.isAbsolute(npmNode) && supportedVersion(inspectVersion(npmNode)))
    return npmNode;
  throw new Error(
    `Starward requires Node.js ${requiredVersion}; this command started with Node ${version}. ` +
    "Run npm with a supported Node installation, or invoke tools/run-node.cjs with that Node executable. " +
    "No global PATH change is required.",
  );
}

function nodeEnvironment(executable, environment = process.env, platform = process.platform) {
  const result = { ...environment, npm_node_execpath: executable, NODE: executable };
  const windows = platform === "win32";
  const keys = Object.keys(result).filter((key) => windows ? /^path$/i.test(key) : key === "PATH");
  const separator = windows ? ";" : ":";
  const inherited = keys.map((key) => result[key]).filter(Boolean).join(separator);
  for (const key of keys) delete result[key];
  const runtimeDirectory = (windows ? path.win32 : path.posix).dirname(executable);
  result[windows ? "Path" : "PATH"] = runtimeDirectory + (inherited ? separator + inherited : "");
  return result;
}

function resolveArguments(argv, { cwd = process.cwd(), environment = process.env } = {}) {
  if (argv[0] === "--bin") {
    const [, packageName, binName, ...args] = argv;
    if (!packageName || !binName) throw new Error("Use --bin <installed-package> <bin-name> [arguments].");
    const resolver = createRequire(path.join(cwd, "package.json"));
    const manifestPath = resolver.resolve(`${packageName}/package.json`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin && manifest.bin[binName];
    if (typeof bin !== "string") throw new Error(`Installed package ${packageName} has no ${binName} binary.`);
    return [path.resolve(path.dirname(manifestPath), bin), ...args];
  }
  if (argv[0] === "--npm") {
    const npmCli = environment.npm_execpath;
    if (!npmCli || !path.isAbsolute(npmCli) || path.basename(npmCli).toLowerCase() !== "npm-cli.js")
      throw new Error("The --npm mode must be called from an npm script with npm_execpath set.");
    return [npmCli, ...argv.slice(1)];
  }
  if (!argv.length) throw new Error("Use tools/run-node.cjs <script-or-node-options> [arguments].");
  return argv;
}

function run(argv) {
  const executable = selectNodeRuntime();
  const args = resolveArguments(argv);
  const child = spawn(executable, args, {
    env: nodeEnvironment(executable), stdio: "inherit", windowsHide: true,
  });
  const listeners = new Map(["SIGINT", "SIGTERM"].map((signal) => [signal, () => child.kill(signal)]));
  for (const [signal, listener] of listeners) process.on(signal, listener);
  function detach() {
    for (const [signal, listener] of listeners) process.off(signal, listener);
  }
  child.once("error", (error) => {
    detach();
    process.stderr.write(`Node launcher failed: ${error.code || "spawn_error"}\n`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    detach();
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code === null ? 1 : code;
  });
}

module.exports = { nodeEnvironment, resolveArguments, selectNodeRuntime, supportedVersion };
if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
