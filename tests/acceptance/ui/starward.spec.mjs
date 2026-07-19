import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";
import { exerciseUiAcceptance } from "./support.mjs";
import { validateUiContracts } from "./contracts.mjs";

const specDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "specs");
const files = (await readdir(specDir)).filter((name) => name.endsWith(".json") && name !== "global.json").sort();

for (const file of files) {
  const spec = JSON.parse(await readFile(path.join(specDir, file), "utf8"));
  const uiAssertions = spec.assertions.filter((item) => item.surface === "ui_browser");
  validateUiContracts(spec.outcome, uiAssertions.map((item) => item.key));
  for (const assertion of uiAssertions) {
    test(`[outcome:${spec.outcome}] [ac:${assertion.key}] ${assertion.key}`, async ({ page, baseURL }) => {
      await exerciseUiAcceptance({ page, baseUrl: baseURL, outcome: spec.outcome, assertion });
    });
  }
}
