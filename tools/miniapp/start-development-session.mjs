import { spawn, spawnSync } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const projectPath = path.join(root, "apps", "wechat-miniapp");
const outputEntry = path.join(projectPath, "dist", "weapp", "app.json");
const composePath = path.join(root, "infra", "miniapp", "docker-compose.yml");
const devtoolsExecutable =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\微信开发者工具.exe";
const devtoolsCliEntry =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js";
const devtoolsCliBootstrap =
  "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const npmCli = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  const next = process.argv[index + 1];
  if (key === "--api-port" && next) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, true);
  }
}
const apiPort = Number(args.get("--api-port") ?? 8787);
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535)
  throw new Error("valid_development_api_port_required");

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () =>
      server.close(() => resolve(true)),
    );
  });
}

async function waitFor(predicate, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    if (stopping)
      throw new Error(
        `${label}_aborted${lastError ? `:${String(lastError.message ?? lastError)}` : ""}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(
    `${label}_timeout${lastError ? `:${String(lastError.message ?? lastError)}` : ""}`,
  );
}

function stopProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {}
}

function startNpm(script, env) {
  return spawn(process.execPath, [npmCli, "run", script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
  });
}

function openDevtools() {
  if (args.has("--no-open")) return;
  const child = spawn(
    devtoolsExecutable,
    [
      "-e",
      devtoolsCliBootstrap,
      devtoolsCliEntry,
      "open",
      "--project",
      projectPath,
      "--trust-project",
    ],
    {
      cwd: path.dirname(devtoolsExecutable),
      env: {
        ...process.env,
        cwd: projectPath,
        ELECTRON: "",
        ELECTRON_RUN_AS_NODE: "1",
      },
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    },
  );
  child.unref();
}

if (!(await canListen(apiPort)))
  throw new Error(`development_api_port_in_use:${apiPort}`);

const useMemory = args.has("--memory");
if (!useMemory) {
  const infrastructure = spawnSync(
    "docker",
    ["compose", "-f", composePath, "up", "-d", "--wait"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (infrastructure.status !== 0)
    throw new Error(`development_infrastructure_failed:${infrastructure.status}`);
}

const infrastructureEnv = useMemory
  ? {
      MINIAPP_STORAGE_MODE: "MEMORY_TEST",
      MINIAPP_DEVELOPMENT_FIXTURE_MODE: "1",
    }
  : {
      DATABASE_URL:
        "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp",
      REDIS_URL: "redis://127.0.0.1:56379",
      MINIAPP_STORAGE_MODE: "postgres",
      MINIAPP_AUTO_MIGRATE: "1",
      MINIAPP_CACHE_PREFIX: "starward:miniapp:development:",
      MINIAPP_QUEUE_NAME: "starward-miniapp-development",
    };

const children = [];
let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) stopProcessTree(child.pid);
  process.exitCode = exitCode;
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.once(signal, () => stop(0));

const api = startNpm("dev:miniapp:api", {
  ...infrastructureEnv,
  MINIAPP_API_PORT: String(apiPort),
});
children.push(api);
api.once("exit", (code) => {
  if (!stopping) stop(code ?? 1);
});

await waitFor(async () => {
  const response = await fetch(`http://127.0.0.1:${apiPort}/v2/capabilities`);
  return response.ok;
}, "miniapp_api_ready");

if (!useMemory) {
  const worker = startNpm("dev:miniapp:worker", infrastructureEnv);
  children.push(worker);
  worker.once("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

// The generated WEAPP directory is disposable. Remove the previous compiler
// output before starting watch mode so an old app.json can never be mistaken
// for this session's first successful build or opened concurrently with emit.
await rm(path.dirname(outputEntry), { recursive: true, force: true });
const compiler = startNpm("dev:miniapp:weapp", {
  MINIAPP_API_BASE: `http://127.0.0.1:${apiPort}`,
  ...(useMemory ? { MINIAPP_DEVELOPMENT_FIXTURE_MODE: "1" } : {}),
});
children.push(compiler);
compiler.once("exit", (code) => {
  if (!stopping) stop(code ?? 1);
});

await waitFor(async () => {
  await access(outputEntry);
  return true;
}, "weapp_watch_build_ready");
openDevtools();

process.stdout.write(
  `${JSON.stringify({
    status: "ready",
    api: `http://127.0.0.1:${apiPort}/v2`,
    project: projectPath,
    authoring_root: path.join(projectPath, "src"),
    devtools_opened: !args.has("--no-open"),
    persistence: useMemory
      ? "explicit_test_fixture_lane"
      : "postgres_postgis_redis_bullmq",
  })}\n`,
);

await new Promise((resolve) => {
  const poll = setInterval(() => {
    if (stopping) {
      clearInterval(poll);
      resolve();
    }
  }, 250);
});
