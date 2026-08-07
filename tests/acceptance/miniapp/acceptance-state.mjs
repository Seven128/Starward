import { expect } from "@playwright/test";

export async function resetAcceptanceState(request) {
  const apiPort = Number(process.env.MINIAPP_API_PORT);
  const token = process.env.MINIAPP_ACCEPTANCE_TOKEN ?? "";
  expect(Number.isInteger(apiPort) && apiPort > 0).toBe(true);
  expect(token.length).toBeGreaterThanOrEqual(20);
  const response = await request.post(
    `http://127.0.0.1:${apiPort}/__acceptance/reset`,
    { headers: { "x-acceptance-token": token } },
  );
  expect(response.status(), "isolated in-memory acceptance reset").toBe(201);
}
