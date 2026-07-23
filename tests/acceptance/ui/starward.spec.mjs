import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";
import { exerciseUiAcceptance } from "./support.mjs";
import { validateUiContracts } from "./contracts.mjs";

const specDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "specs");
const opsOutcomes = new Set(["admin-data-operations", "quality-release-observability"]);
const files = (await readdir(specDir)).filter((name) => name.endsWith(".json") && name !== "global.json").sort();

for (const file of files) {
  const spec = JSON.parse(await readFile(path.join(specDir, file), "utf8"));
  if (opsOutcomes.has(spec.outcome)) continue;
  const uiAssertions = spec.assertions.filter((item) => item.surface === "ui_browser");
  validateUiContracts(spec.outcome, uiAssertions.map((item) => item.key));
  for (const assertion of uiAssertions) {
    test(`[outcome:${spec.outcome}] [ac:${assertion.key}] ${assertion.key}`, async ({ page, baseURL }) => {
      await test.step("[given:production-surface-ready]", async () => {
        if (!baseURL) throw new Error("acceptance_base_url_missing");
      });
      await test.step("[action:exercise-control-path]", async () => {
        await exerciseUiAcceptance({ page, baseUrl: baseURL, outcome: spec.outcome, assertion });
      });
    });
  }
}
