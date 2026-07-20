import { defineConfig, devices } from "@playwright/test";
import { createServer } from "node:net";

const externalBaseUrl = process.env.STARWARD_ACCEPTANCE_BASE_URL;
const inheritedPort = process.env.STARWARD_ACCEPTANCE_RUN_PORT;
const acceptancePort = externalBaseUrl ? null : inheritedPort ? Number(inheritedPort) : await availableLoopbackPort();
if (!externalBaseUrl && !inheritedPort) process.env.STARWARD_ACCEPTANCE_RUN_PORT = String(acceptancePort);
const acceptanceBaseUrl = externalBaseUrl ?? `http://127.0.0.1:${acceptancePort}`;

async function availableLoopbackPort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("acceptance_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

export default defineConfig({
  testDir: "./ui",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 75_000,
  expect: { timeout: 35_000 },
  webServer: externalBaseUrl ? undefined : {
    command: `node start-mobile-web.mjs --port ${acceptancePort}`,
    url: acceptanceBaseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    colorScheme: "dark",
    reducedMotion: "reduce",
    baseURL: acceptanceBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-390x844", use: { browserName: "chromium" } }],
});
