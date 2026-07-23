import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const expectedHashes = Object.freeze({
  "docs/design-targets/mobile-product-pages-v2/index.html": "21838ed2a28f218fb4b37a05827b1be1d6993b23a02fa97847e78fdaa0af4271",
  "docs/design-targets/mobile-product-pages-v2/coverage-manifest.json": "6f99c5a965f167db39babacb853c984aa01e7805095dc9350b7126e36a1ed46f",
  "docs/design-targets/mobile-product-pages-v2/README.md": "4c95723f217be83d22b0b3b86f34787a4d455408a3b3e863b817ca8cd4c53801",
  "docs/design-targets/ops-product-pages-v1/index.html": "40510c23a88c00cb614cddeeaf9f4c895bc6d70c365b6ded7c5a2e286c4a55b5",
  "docs/design-targets/ops-product-pages-v1/coverage-manifest.json": "0362730488ec82620979a3ae317b8c3ad89081000071c6deb1901973e426d8e2",
  "docs/design-targets/ops-product-pages-v1/README.md": "196220d3c3b800d41badb3e3ec97095321454309e6e96780f059a482e3fc546b",
  "docs/design-targets/mobile-controls-v3/index.html": "c29beac7c41549478544beadef96810fb662487480032c15be5db6e536991b2a",
  "docs/design-targets/mobile-controls-v3/control-atlas-manifest.json": "50acbe4417de45a75c6d5855b5b39fd1edd2c2ef345648f497654017d7f21aab",
  "docs/design-targets/mobile-controls-v3/implementation-contract.json": "01f4eae8bb5e01b126480669d79f168508fcf2c821b9edce916dc77fdaae12c4",
  "docs/design-targets/mobile-controls-v3/README.md": "425f998f414efad7a2b870583d0e5e4fb0872babb22e6774e39bc7c1a0f120fc",
  "docs/design-targets/ops-controls-v2/index.html": "dc82a4865b3f5fd235a1dadecc736430100a59599d1e439b406c23c18a9f645b",
  "docs/design-targets/ops-controls-v2/control-atlas-manifest.json": "0a93f4f96fcb3419e3b7394ab5bc30db7b50ea8d16baebb840425b7a03f45586",
  "docs/design-targets/ops-controls-v2/implementation-contract.json": "13f0d0f50224e61045ad859bbd43d26da15689603121929907c44fe15fabb388",
  "docs/design-targets/ops-controls-v2/README.md": "2fe73b0ac41c5bfe6ce4903123eebfd48ebdd4f6f07dc33e6a8ec327dbc2a76a",
});

function repoPath(relative) {
  return path.join(root, ...relative.split("/"));
}

async function read(relative) {
  return readFile(repoPath(relative));
}

async function json(relative) {
  return JSON.parse((await read(relative)).toString("utf8"));
}

function values(value) {
  return Array.isArray(value) ? value : Object.values(value ?? {});
}

function unique(items, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  if (duplicates.size) throw new Error(`${label}_duplicates:${[...duplicates].sort().join(",")}`);
  return seen;
}

function sameSet(actualItems, expectedItems, label) {
  const actual = unique(actualItems, `${label}_actual`);
  const expected = unique(expectedItems, `${label}_expected`);
  const missing = [...expected].filter((item) => !actual.has(item)).sort();
  const extra = [...actual].filter((item) => !expected.has(item)).sort();
  if (missing.length || extra.length) {
    throw new Error(`${label}_mismatch:missing=${missing.join(",")}:extra=${extra.join(",")}`);
  }
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

const actualHashes = {};
for (const [relative, expected] of Object.entries(expectedHashes)) {
  const digest = createHash("sha256").update(await read(relative)).digest("hex");
  requireCondition(digest === expected, `target_hash_mismatch:${relative}:${digest}:${expected}`);
  actualHashes[relative] = digest;
}

const [
  mobilePages,
  opsPages,
  mobileAtlas,
  opsAtlas,
  sourcePlan,
  design,
  screenContracts,
] = await Promise.all([
  json("docs/design-targets/mobile-product-pages-v2/coverage-manifest.json"),
  json("docs/design-targets/ops-product-pages-v1/coverage-manifest.json"),
  json("docs/design-targets/mobile-controls-v3/implementation-contract.json"),
  json("docs/design-targets/ops-controls-v2/implementation-contract.json"),
  read("docs/source-plan.md").then((buffer) => buffer.toString("utf8")),
  read("DESIGN.md").then((buffer) => buffer.toString("utf8")),
  read("project_context/areas/main/screen-contracts.md").then((buffer) => buffer.toString("utf8")),
]);

const mobilePageOutcomes = mobilePages.outcomes.map((outcome) => outcome.id);
const mobilePageControls = mobilePages.outcomes.flatMap((outcome) => outcome.controls.map((control) => control.id));
const opsPageOutcomes = opsPages.outcomes.map((outcome) => outcome.id);
const opsPageControls = opsPages.stableControls.map((control) => control.id);

const mobileControls = values(mobileAtlas.controls);
const mobileContractIds = mobileControls.map((control) => control.identity.stableControlId);
const mobileAssemblies = values(mobileAtlas.pageAssemblyContracts);
const mobileAssemblyOutcomes = mobileAssemblies.map((assembly) => assembly.outcome);
const mobileAssemblyControls = mobileAssemblies.flatMap((assembly) =>
  assembly.controlComposition.map((entry) => entry.stableControlId),
);

const opsControls = values(opsAtlas.controls);
const opsContractIds = opsControls.map((control) => control.identity.stableControlId);
const opsAssemblies = values(opsAtlas.pageAssemblyContracts);
const opsAssemblyControls = opsAssemblies.flatMap((assembly) => assembly.stableControls);

const planOutcomeIds = [...sourcePlan.matchAll(/<a id="outcome\.([a-z0-9-]+)"><\/a>/g)].map((match) => match[1]);
const planControlIds = [...sourcePlan.matchAll(/^- \*\*CTRL ([a-z0-9-]+)\*\*/gm)].map((match) => match[1]);
const selectedOutcomeIds = [...mobilePageOutcomes, ...opsPageOutcomes];
const selectedControlIds = [...mobilePageControls, ...opsPageControls];

requireCondition(mobilePageOutcomes.length === 12, `mobile_page_outcome_count:${mobilePageOutcomes.length}`);
requireCondition(mobilePageControls.length === 83, `mobile_page_control_count:${mobilePageControls.length}`);
requireCondition(opsPageOutcomes.length === 2, `ops_page_outcome_count:${opsPageOutcomes.length}`);
requireCondition(opsPageControls.length === 12, `ops_page_control_count:${opsPageControls.length}`);
sameSet(mobileContractIds, mobilePageControls, "mobile_page_control_contract");
sameSet(mobileAssemblyControls, mobilePageControls, "mobile_assembly_control_contract");
sameSet(mobileAssemblyOutcomes, mobilePageOutcomes, "mobile_assembly_outcomes");
sameSet(opsContractIds, opsPageControls, "ops_page_control_contract");
sameSet(opsAssemblyControls, opsPageControls, "ops_assembly_control_contract");
sameSet(planOutcomeIds, selectedOutcomeIds, "source_plan_outcomes");
sameSet(planControlIds, selectedControlIds, "source_plan_controls");

requireCondition(mobileControls.every((control) => Object.keys(control).length === 15), "mobile_contract_field_count");
requireCondition(opsControls.every((control) => Object.keys(control).length === 16), "ops_contract_field_count");
requireCondition(mobileControls.reduce((count, control) => count + control.acceptanceScenarios.length, 0) === 208, "mobile_acceptance_scenario_count");
requireCondition(opsControls.reduce((count, control) => count + control.acceptanceScenarios.length, 0) === 32, "ops_acceptance_scenario_count");
requireCondition(mobileAssemblies.length === 12, `mobile_page_assembly_count:${mobileAssemblies.length}`);
requireCondition(opsAssemblies.length === 7, `ops_page_assembly_count:${opsAssemblies.length}`);

const mobileUnresolved = mobileControls.filter((control) => control.unresolved.length > 0);
const mobileHapticNotApplicable = mobileControls.filter((control) => control.haptics.notApplicable === true);
requireCondition(mobileUnresolved.length === 9, `mobile_unresolved_control_count:${mobileUnresolved.length}`);
requireCondition(mobileHapticNotApplicable.length === 34, `mobile_haptic_not_applicable_count:${mobileHapticNotApplicable.length}`);
requireCondition(mobileControls.length - mobileHapticNotApplicable.length === 49, "mobile_haptic_applicable_count");
requireCondition(
  opsControls.every((control) => control.ownershipVersion.unresolvedDecisions.length > 0),
  "ops_backend_authority_gap_missing",
);

for (const outcomeId of selectedOutcomeIds) {
  requireCondition(screenContracts.includes(`## \`${outcomeId}\``), `screen_contract_surface_missing:${outcomeId}`);
}
for (const controlId of selectedControlIds) {
  requireCondition(screenContracts.includes(`\`${controlId}\``), `screen_contract_control_missing:${controlId}`);
}

for (const targetId of [
  "target.mobile-product-pages-v2",
  "target.ops-product-pages-v1",
  "target.mobile-controls-v3",
  "target.ops-controls-v2",
]) {
  requireCondition(design.includes(`\`${targetId}\``), `design_target_registry_missing:${targetId}`);
}
for (const [relative, expected] of Object.entries(expectedHashes)) {
  if (relative.endsWith("README.md") || relative.endsWith("control-atlas-manifest.json")) continue;
  requireCondition(design.includes(relative) || design.includes(expected), `design_target_identity_missing:${relative}`);
}

process.stdout.write(`${JSON.stringify({
  schema_version: "starward-design-target-verification-v1",
  status: "passed",
  target_files: Object.keys(actualHashes).length,
  outcomes: selectedOutcomeIds.length,
  controls: selectedControlIds.length,
  mobile: {
    outcomes: mobilePageOutcomes.length,
    controls: mobilePageControls.length,
    page_assemblies: mobileAssemblies.length,
    acceptance_scenarios: 208,
    haptic_applicable: 49,
    haptic_not_applicable: 34,
    unresolved_controls: mobileUnresolved.map((control) => control.identity.stableControlId),
  },
  operations: {
    outcomes: opsPageOutcomes.length,
    controls: opsPageControls.length,
    page_assemblies: opsAssemblies.length,
    acceptance_scenarios: 32,
    backend_authority_pending_controls: opsControls.length,
  },
})}\n`);
