import { defineConfig, devices } from "@playwright/test";
import { createServer } from "node:net";

const externalBaseUrl = process.env.STARWARD_OPS_ACCEPTANCE_BASE_URL;
const inheritedPort = process.env.STARWARD_OPS_ACCEPTANCE_RUN_PORT;
const acceptancePort = externalBaseUrl ? null : inheritedPort ? Number(inheritedPort) : await availableLoopbackPort();
if (!externalBaseUrl && !inheritedPort) process.env.STARWARD_OPS_ACCEPTANCE_RUN_PORT = String(acceptancePort);
const acceptanceBaseUrl = externalBaseUrl ?? `http://127.0.0.1:${acceptancePort}`;

async function availableLoopbackPort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("ops_acceptance_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

export default defineConfig({
  testDir: "./ui",
  testMatch: "ops.spec.mjs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  webServer: externalBaseUrl ? undefined : {
    command: `node start-ops-web.mjs --port ${acceptancePort}`,
    url: acceptanceBaseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    colorScheme: "dark",
    reducedMotion: "reduce",
    baseURL: acceptanceBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-owner-ops-1440x900", use: { browserName: "chromium" } }],
});
