import { existsSync, realpathSync, symlinkSync } from "node:fs";
import { rmdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRepositoryRoot = path.resolve(acceptanceRoot, "../..");
const dependencyRepositoryRoot = path.resolve(realpathSync(path.join(acceptanceRoot, "node_modules")), "../../..");
const opsRoot = path.join(projectRepositoryRoot, "apps", "admin-web");
const opsPackage = path.join(opsRoot, "package.json");
if (!existsSync(opsPackage)) throw new Error("owner_ops_package_missing:apps/admin-web/package.json");
const projectDependencyLink = path.join(projectRepositoryRoot, "node_modules");
let projectDependencyLinkCreated = false;
if (!existsSync(projectDependencyLink)) {
  symlinkSync(path.join(dependencyRepositoryRoot, "node_modules"), projectDependencyLink, "junction");
  projectDependencyLinkCreated = true;
}

async function availableLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("ops_acceptance_api_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const webPortIndex = process.argv.indexOf("--port");
const webPort = webPortIndex >= 0 ? Number(process.argv[webPortIndex + 1]) : 4173;
const apiPort = await availableLoopbackPort();
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const requireFromRepository = createRequire(path.join(dependencyRepositoryRoot, "package.json"));
const tsxCli = requireFromRepository.resolve("tsx/cli");
const apiProcess = spawn(process.execPath, [tsxCli, path.join(dependencyRepositoryRoot, "apps", "api", "src", "start.ts")], {
  cwd: dependencyRepositoryRoot,
  env: {
    ...process.env,
    STARWARD_API_PORT: String(apiPort),
    STARWARD_ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`,
    STARWARD_RELEASE_PROFILE: "individual-personal-trial",
    STARWARD_PRODUCTION_TRAFFIC_ALLOWED: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
apiProcess.stdout.pipe(process.stdout);
apiProcess.stderr.pipe(process.stderr);

let apiReady = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  if (apiProcess.exitCode !== null) throw new Error(`ops_acceptance_api_exited:${apiProcess.exitCode}`);
  try {
    const response = await fetch(`${apiBaseUrl}/health/live`);
    if (response.ok) { apiReady = true; break; }
  } catch { /* bounded startup retry */ }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!apiReady) throw new Error("ops_acceptance_api_not_ready");

const viteCli = path.resolve(path.dirname(requireFromRepository.resolve("vite")), "../../bin/vite.js");
const opsProcess = spawn(process.execPath, [viteCli, "--host", "127.0.0.1", "--port", String(webPort)], {
  cwd: opsRoot,
  env: {
    ...process.env,
    STARWARD_API_BASE_URL: apiBaseUrl,
    STARWARD_RELEASE_PROFILE: "individual-personal-trial",
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
opsProcess.stdout.pipe(process.stdout);
opsProcess.stderr.pipe(process.stderr);

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child) => childExited(child) ? Promise.resolve() : new Promise((resolve) => child.once("close", resolve));
async function terminateOwnedChild(child) {
  if (!child || childExited(child) || !child.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    await waitForChildExit(killer);
  } else child.kill("SIGTERM");
  await Promise.race([waitForChildExit(child), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (!childExited(child)) { child.kill("SIGKILL"); await waitForChildExit(child); }
}
async function removeOwnedDependencyLink() {
  if (!projectDependencyLinkCreated) return;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rmdir(projectDependencyLink);
      projectDependencyLinkCreated = false;
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        projectDependencyLinkCreated = false;
        return;
      }
      if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code) || attempt === 19) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
let shutdownPromise;
function shutdown(exitCode) {
  shutdownPromise ??= (async () => {
    await Promise.allSettled([terminateOwnedChild(opsProcess), terminateOwnedChild(apiProcess)]);
    await removeOwnedDependencyLink();
    process.exitCode = exitCode;
  })();
  return shutdownPromise;
}
process.once("SIGINT", () => { void shutdown(130); });
process.once("SIGTERM", () => { void shutdown(143); });

await new Promise((resolve, reject) => {
  opsProcess.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ops_acceptance_web_exited:${code}`)));
  opsProcess.once("error", reject);
});
await shutdown(process.exitCode ?? 0);
