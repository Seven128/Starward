import { existsSync, realpathSync, symlinkSync } from "node:fs";
import { rmdir } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMobileWebSession,
  disposeMobileWebSession,
} from "./mobile-web-session.mjs";

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
let projectDependencyLinkCreated = false;

async function availableLoopbackPort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("acceptance_api_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

function hourlyTimes(hours) {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(start.getUTCHours() - 24);
  return Array.from({ length: hours }, (_, index) => new Date(start.getTime() + index * 3_600_000).toISOString().slice(0, 16));
}

function weatherPayload(url) {
  const times = hourlyTimes(16 * 24);
  const comparison = url.searchParams.get("models")?.includes("ecmwf") ?? false;
  const values = (base, wave = 0) => times.map((_, index) => Number((base + Math.sin(index / 6) * wave).toFixed(2)));
  return {
    latitude: Number(url.searchParams.get("latitude") ?? 22.529),
    longitude: Number(url.searchParams.get("longitude") ?? 113.9468),
    utc_offset_seconds: 0,
    hourly: {
      time: times,
      temperature_2m: values(22, 3),
      apparent_temperature: values(22, 3),
      relative_humidity_2m: values(68, 8),
      dew_point_2m: values(16, 2),
      surface_pressure: values(1008, 3),
      weather_code: values(1),
      cloud_cover: values(comparison ? 58 : 24, 12),
      cloud_cover_low: values(comparison ? 46 : 12, 8),
      cloud_cover_mid: values(comparison ? 31 : 10, 6),
      cloud_cover_high: values(18, 5),
      visibility: values(18_000, 2_000),
      wind_speed_10m: values(3, 1),
      wind_gusts_10m: values(5, 1.5),
      wind_direction_10m: values(135, 20),
      precipitation: values(0),
      precipitation_probability: values(comparison ? 35 : 8, 5),
    },
    hourly_units: {
      temperature_2m: "°C",
      apparent_temperature: "°C",
      relative_humidity_2m: "%",
      dew_point_2m: "°C",
      surface_pressure: "hPa",
      cloud_cover: "%",
      cloud_cover_low: "%",
      cloud_cover_mid: "%",
      cloud_cover_high: "%",
      visibility: "m",
      wind_speed_10m: "m/s",
      wind_gusts_10m: "m/s",
      wind_direction_10m: "°",
      precipitation: "mm",
      precipitation_probability: "%",
    },
  };
}

function airQualityPayload() {
  const times = hourlyTimes(7 * 24);
  const constant = (value) => times.map(() => value);
  return {
    hourly: {
      time: times,
      european_aqi: constant(28),
      pm2_5: constant(8),
      pm10: constant(14),
      aerosol_optical_depth: constant(0.12),
    },
    hourly_units: { european_aqi: "", pm2_5: "μg/m³", pm10: "μg/m³", aerosol_optical_depth: "" },
  };
}

async function startWeatherSandbox() {
  const server = createHttpServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const payload = url.pathname.endsWith("/air-quality") ? airQualityPayload() : weatherPayload(url);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("acceptance_weather_port_unavailable");
  return { origin: `http://127.0.0.1:${address.port}`, server };
}

const webPortIndex = process.argv.indexOf("--port");
const webPort = webPortIndex >= 0 ? Number(process.argv[webPortIndex + 1]) : 8081;
const watchApi = process.argv.includes("--watch-api");
const apiPort = await availableLoopbackPort();
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const weatherSandbox = await startWeatherSandbox();
const mobileWebSession = await createMobileWebSession({
  apiBaseUrl,
  baseUrl: `http://127.0.0.1:${webPort}`,
  watchApi,
});
const apiEntrypoint = path.join(dependencyRepositoryRoot, "apps", "api", "src", "start.ts");
const apiProcess = spawn(process.execPath, [tsxCli, ...(watchApi ? ["watch"] : []), apiEntrypoint], {
  cwd: dependencyRepositoryRoot,
  env: {
    ...process.env,
    STARWARD_API_PORT: String(apiPort),
    STARWARD_ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`,
    STARWARD_WEATHER_MODE: "noncommercial-poc",
    STARWARD_WEATHER_LOOPBACK_PROXY: weatherSandbox.origin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
apiProcess.stdout.pipe(process.stdout);
apiProcess.stderr.pipe(process.stderr);

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child) => childExited(child)
  ? Promise.resolve()
  : new Promise((resolve) => child.once("close", resolve));

async function terminateOwnedChild(child) {
  if (!child || childExited(child) || !child.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await waitForChildExit(killer);
  } else {
    child.kill("SIGTERM");
  }
  await Promise.race([
    waitForChildExit(child),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (!childExited(child)) {
    child.kill("SIGKILL");
    await waitForChildExit(child);
  }
}

async function removeOwnedDependencyLink() {
  if (!projectDependencyLinkCreated) return;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rmdir(projectDependencyLink);
      projectDependencyLinkCreated = false;
      // Metro/Watchman descendants can release their final Windows directory handle
      // just after the owned junction disappears. Keep sandbox disposal behind that
      // release boundary instead of racing the Harness recursive cleanup.
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        projectDependencyLinkCreated = false;
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        return;
      }
      if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code) || attempt === 19) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function closeWeatherSandbox() {
  await new Promise((resolve, reject) => weatherSandbox.server.close((error) => error ? reject(error) : resolve()));
}

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
process.env.EXPO_PUBLIC_STARWARD_ACCEPTANCE_SESSION_ID = mobileWebSession.session_id;
process.env.EXPO_PUBLIC_STARWARD_ACCEPTANCE_STARTUP_FINGERPRINT = mobileWebSession.startup_fingerprint;
if (!existsSync(projectDependencyLink)) {
  symlinkSync(mobileDependencyRoot, projectDependencyLink, "junction");
  projectDependencyLinkCreated = true;
}
const expoArguments = process.argv.slice(2).filter((value) => value !== "--watch-api");
const expoProcess = spawn(process.execPath, [expoCli, "start", projectRoot, "--web", ...expoArguments], {
  cwd: dependencyRepositoryRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

let shutdownPromise;
function shutdown(exitCode) {
  shutdownPromise ??= (async () => {
    await Promise.allSettled([
      terminateOwnedChild(expoProcess),
      terminateOwnedChild(apiProcess),
    ]);
    await Promise.allSettled([
      closeWeatherSandbox(),
      removeOwnedDependencyLink(),
      disposeMobileWebSession(mobileWebSession),
    ]);
    process.exitCode = exitCode;
  })();
  return shutdownPromise;
}

process.once("exit", () => {
  if (!childExited(expoProcess)) expoProcess.kill();
  if (!childExited(apiProcess)) apiProcess.kill();
});
process.once("SIGINT", () => { void shutdown(130); });
process.once("SIGTERM", () => { void shutdown(143); });

const expoExit = await new Promise((resolve, reject) => {
  expoProcess.once("error", reject);
  expoProcess.once("close", (code, signal) => resolve({ code, signal }));
});
if (!shutdownPromise) await shutdown(expoExit.code === 0 ? 0 : (expoExit.code ?? 1));
else await shutdownPromise;
