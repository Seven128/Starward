import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const uiDir = path.dirname(fileURLToPath(import.meta.url));

export async function exerciseUiAcceptance({ page, baseUrl, outcome, assertion }) {
  if (!baseUrl) throw new Error("acceptance_base_url_missing");

  const driverPath = path.resolve(uiDir, "drivers", `${outcome}.mjs`);
  await access(driverPath).catch(() => {
    throw new Error(`Frozen production-route UI driver is not authored yet: ${outcome}`);
  });
  const driver = await import(`${pathToFileURL(driverPath).href}?v=1`);
  if (typeof driver.runAcceptanceCase !== "function") throw new Error(`Invalid UI driver: ${outcome}`);
  await driver.runAcceptanceCase({ page, baseUrl, assertion });
}
