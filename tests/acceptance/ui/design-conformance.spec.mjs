import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";
import YAML from "yaml";
import {
  exerciseDesignResourceAcceptance,
  exerciseGlobalDesignMethodAcceptance,
  exerciseOpsDesignAssertion,
} from "./design-conformance-support.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const handoffPath = path.join(repositoryRoot, "docs/design-resources/starward-residual-implementation-handoff.md");
const handoffContent = await readFile(handoffPath, "utf8");
const start = handoffContent.indexOf("```yaml design-resource-handoff-v1");
const yamlStart = handoffContent.indexOf("\n", start) + 1;
const end = handoffContent.indexOf("\n```", yamlStart);
if (start < 0 || yamlStart <= 0 || end < 0) throw new Error("design_handoff_fence_missing");
const handoff = YAML.parse(handoffContent.slice(yamlStart, end));
const opsControlContract = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/design-targets/ops-controls-v2/implementation-contract.json"),
  "utf8",
));
const opsOutcomes = ["admin-data-operations", "quality-release-observability"];
const opsConditions = handoff.conditions.filter((condition) => condition.key.startsWith("ops-web-"));
const subjectByKey = new Map(handoff.subjects.map((subject) => [subject.key, subject]));
const contractByControl = new Map(opsControlContract.controls.map((control) => [control.identity.stableControlId, control]));
const resourceAcceptanceKeys = [
  "dr-provider-provenance",
  "dr-condition-matrix",
  "dr-upstream-update-route",
  "dr-proposal-reconciliation",
  "dr-resource-integrity",
  "dr-source-profile-closure",
  "dr-stable-key-bijection",
];
const globalDesignMethodAcceptanceKeys = [
  "dr-surface-flow",
  "dr-visual-content",
  "dr-component-control",
  "dr-state-interaction",
  "dr-motion-full",
  "dr-motion-reduced",
  "dr-adaptation-input",
  "dr-accessibility",
  "dr-assets-license",
  "dr-design-conformance",
  "dr-ops-backend-effect",
];
const controlsByOutcome = new Map(opsOutcomes.map((outcome) => [outcome, handoff.subjects
  .filter((subject) => subject.kind === "control" && subject.target_refs.some((ref) => ref.endsWith(`-${outcome}`)))
  .flatMap((subject) => subject.stable_keys)
  .sort()]));

function assertionDefinitions(outcome) {
  const values = [];
  const targets = handoff.targets.filter((target) => target.key.endsWith(`-${outcome}`)
    || (outcome === "quality-release-observability" && ["design-authority-reference", "product-source-reference"].includes(target.key)));
  for (const target of targets) {
    const short = target.key.replace(`-${outcome}`, "");
    const rows = handoff.coverage.filter((row) => row.disposition === "covered" && row.target_refs.includes(target.key));
    const methods = [...new Set(rows.flatMap((row) => row.verification_methods))].sort();
    values.push({ key: `${short}-conformance`, target, method: "conformance", methods, rows });
    for (const method of methods) {
      values.push({
        key: `${short}-${method.replaceAll("_", "-")}`,
        target,
        method,
        methods,
        rows: rows.filter((row) => row.verification_methods.includes(method)),
      });
    }
  }
  return values;
}

for (const outcome of opsOutcomes) {
  const controls = controlsByOutcome.get(outcome);
  const controlContracts = new Map(controls.map((control) => [control, contractByControl.get(control)]));
  if ([...controlContracts.values()].some((contract) => !contract)) throw new Error(`ops_control_contract_missing:${outcome}`);
  for (const definition of assertionDefinitions(outcome)) {
    test(`[outcome:${outcome}] [ac:${definition.key}] ${definition.key}`, async ({ browser, baseURL }) => {
      test.setTimeout(900_000);
      await test.step("[given:production-root-ready]", async () => {
        if (!baseURL) throw new Error("acceptance_base_url_missing");
      });
      await test.step("[action:enter-production-surface]", async () => {
        await exerciseOpsDesignAssertion({
          browser,
          baseURL,
          conditions: definition.target.condition_refs[0] === "reference-authority"
            ? opsConditions
            : opsConditions.filter((condition) => definition.target.condition_refs.includes(condition.key)),
          controlContracts,
          controls,
          methods: definition.methods,
          outcome,
          rows: definition.rows,
          target: definition.target,
          method: definition.method,
        });
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

for (const key of resourceAcceptanceKeys) {
  test(`[outcome:quality-release-observability] [ac:${key}] ${key}`, async () => {
    await test.step("[given:frozen-design-inputs-ready]", async () => {
      if (!handoff.resources.length || !handoff.targets.length) throw new Error("design_resource_inventory_missing");
    });
    await test.step("[action:verify-frozen-design-inputs]", async () => {
      await exerciseDesignResourceAcceptance({ handoff, handoffContent, key });
    });
  });
}

for (const key of globalDesignMethodAcceptanceKeys) {
  test(`[outcome:quality-release-observability] [ac:${key}] ${key}`, async ({ browser, baseURL }) => {
    test.setTimeout(900_000);
    await test.step("[given:production-root-ready]", async () => {
      if (!baseURL) throw new Error("acceptance_base_url_missing");
    });
    await test.step("[action:enter-production-surface]", async () => {
      await exerciseGlobalDesignMethodAcceptance({
        baseURL,
        browser,
        contractByControl,
        handoff,
        key,
      });
    });
    await test.step("[action:exercise-bound-controls]", async () => {
      if (contractByControl.size !== 12) throw new Error("ops_control_population_incomplete");
    });
    await test.step("[action:compare-frozen-target]", async () => {
      if (!handoff.targets.length || !handoff.coverage.length) throw new Error("design_handoff_population_missing");
    });
  });
}
