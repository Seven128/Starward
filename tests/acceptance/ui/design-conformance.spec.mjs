import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";
import YAML from "yaml";
import { exerciseOpsDesignAssertion } from "./design-conformance-support.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const handoffPath = path.join(repositoryRoot, "docs/design-resources/starward-residual-implementation-handoff.md");
const content = await readFile(handoffPath, "utf8");
const start = content.indexOf("```yaml design-resource-handoff-v1");
const yamlStart = content.indexOf("\n", start) + 1;
const end = content.indexOf("\n```", yamlStart);
if (start < 0 || yamlStart <= 0 || end < 0) throw new Error("design_handoff_fence_missing");
const handoff = YAML.parse(content.slice(yamlStart, end));
const opsOutcomes = ["admin-data-operations", "quality-release-observability"];
const subjectByKey = new Map(handoff.subjects.map((subject) => [subject.key, subject]));
const controlsByOutcome = new Map(opsOutcomes.map((outcome) => [outcome, handoff.subjects
  .filter((subject) => subject.kind === "control" && subject.target_refs.some((ref) => ref.endsWith(`-${outcome}`)))
  .map((subject) => subject.stable_keys[0])
  .sort()]));

function assertionDefinitions(outcome) {
  const values = [];
  const targets = handoff.targets.filter((target) => target.key.endsWith(`-${outcome}`)
    || (outcome === "quality-release-observability" && ["design-authority-reference", "product-source-reference"].includes(target.key)));
  for (const target of targets) {
    const short = target.key.replace(`-${outcome}`, "");
    values.push({ key: `${short}-conformance`, target, method: "conformance" });
    const methods = [...new Set(handoff.coverage
      .filter((row) => row.disposition === "covered" && row.target_refs.includes(target.key))
      .flatMap((row) => row.verification_methods))].sort();
    for (const method of methods) values.push({ key: `${short}-${method.replaceAll("_", "-")}`, target, method });
  }
  if (outcome === "quality-release-observability") {
    for (const match of content.matchAll(/<!--\s*ty-source-item:start\s+key=([a-z0-9-]+)\s+kind=acceptance\s*-->/gu)) {
      values.push({ key: match[1], target: targets.find((target) => target.key === "design-authority-reference") ?? targets[0], method: "interaction_trace" });
    }
  }
  return values;
}

for (const outcome of opsOutcomes) {
  const controls = controlsByOutcome.get(outcome);
  for (const definition of assertionDefinitions(outcome)) {
    test(`[outcome:${outcome}] [ac:${definition.key}] ${definition.key}`, async ({ page, browser, baseURL }) => {
      await test.step("[given:production-root-ready]", async () => {
        if (!baseURL) throw new Error("acceptance_base_url_missing");
      });
      await test.step("[action:enter-production-surface]", async () => {
        await exerciseOpsDesignAssertion({ page, browser, baseURL, outcome, target: definition.target, method: definition.method, controls });
      });
      await test.step("[action:exercise-bound-controls]", async () => {
        if (!controls.length) throw new Error(`design_controls_missing:${outcome}`);
      });
      await test.step("[action:compare-frozen-target]", async () => {
        if (!subjectByKey.size) throw new Error("design_subject_inventory_missing");
      });
    });
  }
}
