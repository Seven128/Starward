import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "../../..");
const reuseExistingServer = process.env.PW_REUSE_SERVER === "1";
const apiPort = process.env.MINIAPP_API_PORT
  ? Number(process.env.MINIAPP_API_PORT)
  : await availableLoopbackPort();
let h5Port = process.env.MINIAPP_H5_PORT
  ? Number(process.env.MINIAPP_H5_PORT)
  : await availableLoopbackPort();
while (h5Port === apiPort && !process.env.MINIAPP_H5_PORT)
  h5Port = await availableLoopbackPort();
process.env.MINIAPP_API_PORT = String(apiPort);
process.env.MINIAPP_API_BASE = `http://127.0.0.1:${apiPort}/v1`;
process.env.MINIAPP_H5_PORT = String(h5Port);
const acceptanceToken =
  process.env.MINIAPP_ACCEPTANCE_TOKEN ?? `miniapp-acceptance-${randomUUID()}`;
process.env.MINIAPP_ACCEPTANCE_TOKEN = acceptanceToken;

async function availableLoopbackPort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("miniapp_acceptance_port_unavailable");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

export default defineConfig({
  testDir: configDir,
  testMatch: "*.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // During repair, stop on the first current-candidate defect. A passing run
  // still executes the complete matrix; set the opt-in only when collecting a
  // deliberately exhaustive failure inventory.
  maxFailures: process.env.MINIAPP_ACCEPTANCE_COLLECT_ALL === "1" ? 0 : 1,
  globalTimeout: 15 * 60_000,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  webServer: [
    {
      command: "npm start --workspace @starward/miniapp-api",
      cwd: repoRoot,
      url: `http://127.0.0.1:${apiPort}/v1/capabilities`,
      env: {
        ...process.env,
        MINIAPP_ACCEPTANCE_MODE: "1",
        MINIAPP_ACCEPTANCE_TOKEN: acceptanceToken,
        MINIAPP_STORAGE_MODE: "memory",
      },
      reuseExistingServer,
      timeout: 120_000,
      stderr: "pipe",
    },
    {
      command:
        `node tools/miniapp/start-h5-acceptance.mjs --port ${h5Port}`,
      cwd: repoRoot,
      url: `http://127.0.0.1:${h5Port}/`,
      reuseExistingServer,
      timeout: 180_000,
      stderr: "pipe",
    },
  ],
  use: {
    baseURL: `http://127.0.0.1:${h5Port}`,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "wechat-h5-320",
      use: { viewport: { width: 320, height: 720 } },
    },
    {
      name: "wechat-h5-375",
      use: { viewport: { width: 375, height: 812 } },
    },
    {
      name: "wechat-h5-430-reduced-motion",
      use: {
        viewport: { width: 430, height: 932 },
        reducedMotion: "reduce",
      },
    },
  ],
});
