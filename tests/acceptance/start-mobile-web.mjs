import { existsSync, realpathSync, symlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(acceptanceRoot, "../../apps/mobile");
const dependencyRepositoryRoot = path.resolve(realpathSync(path.join(acceptanceRoot, "node_modules")), "../../..");
const mobileDependencyRoot = path.join(dependencyRepositoryRoot, "apps", "mobile", "node_modules");
const requireFromMobile = createRequire(path.join(dependencyRepositoryRoot, "apps", "mobile", "package.json"));
const requireFromRepository = createRequire(path.join(dependencyRepositoryRoot, "package.json"));
const expoPackageRoot = path.dirname(requireFromMobile.resolve("expo/package.json"));
const expoCli = path.join(expoPackageRoot, "bin", "cli");
const tsxCli = requireFromRepository.resolve("tsx/cli");
const projectDependencyLink = path.join(projectRoot, "node_modules");

async function availableLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("acceptance_api_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const webPortIndex = process.argv.indexOf("--port");
const webPort = webPortIndex >= 0 ? Number(process.argv[webPortIndex + 1]) : 8081;
const apiPort = await availableLoopbackPort();
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const apiProcess = spawn(process.execPath, [tsxCli, path.join(dependencyRepositoryRoot, "apps", "api", "src", "start.ts")], {
  cwd: dependencyRepositoryRoot,
  env: {
    ...process.env,
    STARWARD_API_PORT: String(apiPort),
    STARWARD_ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`,
    STARWARD_WEATHER_MODE: "noncommercial-poc",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
apiProcess.stdout.pipe(process.stdout);
apiProcess.stderr.pipe(process.stderr);
const stopApi = () => { if (!apiProcess.killed) apiProcess.kill(); };
process.once("exit", stopApi);
process.once("SIGINT", () => { stopApi(); process.exit(130); });
process.once("SIGTERM", () => { stopApi(); process.exit(143); });

let apiReady = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  if (apiProcess.exitCode !== null) throw new Error(`acceptance_api_exited:${apiProcess.exitCode}`);
  try {
    const response = await fetch(`${apiBaseUrl}/health/live`);
    if (response.ok) { apiReady = true; break; }
  } catch { /* startup retry */ }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!apiReady) throw new Error("acceptance_api_not_ready");

process.env.STARWARD_MOBILE_DEPENDENCY_ROOT = mobileDependencyRoot;
process.env.EXPO_PUBLIC_API_BASE_URL = apiBaseUrl;
if (!existsSync(projectDependencyLink)) symlinkSync(mobileDependencyRoot, projectDependencyLink, "junction");
process.argv = [process.execPath, expoCli, "start", projectRoot, "--web", ...process.argv.slice(2)];
await import(pathToFileURL(expoCli).href);
