import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DESIGN_RESOURCE_STANDARD_PROPERTIES,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-manifest-catalog.js";
import {
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_STANDARD_CONDITION_AXES,
  DESIGN_RESOURCE_VARIATION_AXES,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-enums.js";
import {
  DESIGN_RESOURCE_MANIFEST_COLLECTIONS,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-manifest-model.js";
import {
  manifestCollectionRows,
  manifestIdentityDigest,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-universe-helpers.js";

const repoRoot = process.cwd();
const selectedRel = "docs/design-resources/miniapp-selected-source-2026-08-06-v1";
const selectedDir = path.join(repoRoot, ...selectedRel.split("/"));
const draftRel = "docs/design-resources/miniapp-selected-handoff-draft-2026-08-06";
const draftDir = path.join(repoRoot, ...draftRel.split("/"));

const scopeKey = "scope-miniapp-complete-product-selected-v1";
const targetKey = "target-miniapp-complete-product-constraint-v1";
const conditionKey = "condition-authoring-source-v1";
const sourceItemRefs = [
  "requirement-constraint-source-closure",
  "control-selection-and-integrity",
];
const inspectorIdentity = "starward-dra-frozen-inspector";
const inspectorVersion = "1.0.0";
const oracleIdentity = "starward-dra-asset-integrity-oracle";
const oracleVersion = "1.0.0";

const subjects = [
  ["hub", "index.html", "surface.selected-suite-index", "constraint", "text/html"],
  ["app01", "artifacts/app-01-flow-route-map.html", "surface.app-flow-route-map", "constraint", "text/html"],
  ["app02", "artifacts/app-02-spot-detail-prototype.html", "surface.spot-detail-prototype", "constraint", "text/html"],
  ["app03", "artifacts/app-03-spot-night-prototype.html", "surface.spot-night-prototype", "constraint", "text/html"],
  ["app04", "artifacts/app-04-my-content-prototype.html", "surface.my-content-prototype", "constraint", "text/html"],
  ["app05", "artifacts/app-05-shared-component-control-atlas.html", "surface.shared-component-control-atlas", "constraint", "text/html"],
  ["app06", "artifacts/app-06-cross-app-interaction-motion-accessibility.html", "surface.cross-app-interaction-motion-accessibility", "constraint", "text/html"],
  ["app07", "artifacts/app-07-responsive-mode-state-matrix.html", "surface.responsive-mode-state-matrix", "constraint", "text/html"],
  ["app08", "artifacts/app-08-semantic-asset-atlas.html", "surface.semantic-asset-atlas", "constraint", "text/html"],
  ["map01", "artifacts/map-01-page-prototype.html", "surface.map-page-prototype", "constraint", "text/html"],
  ["map02", "artifacts/map-02-page-anatomy.html", "surface.map-page-anatomy", "constraint", "text/html"],
  ["map03", "artifacts/map-03-component-control-atlas.html", "surface.map-component-control-atlas", "constraint", "text/html"],
  ["map04", "artifacts/map-04-interaction-motion-accessibility.html", "surface.map-interaction-motion-accessibility", "constraint", "text/html"],
  ["design-system", "design-system-snapshot.md", "surface.design-system-snapshot", "supporting", "text/markdown"],
  ["qa", "selection-and-qa.md", "surface.selection-and-qa", "supporting", "text/markdown"],
].map(([id, relativePath, stableKey, role, mediaType]) => ({
  id,
  relativePath,
  stableKey,
  role,
  mediaType,
  key: `resource.${id}`,
  subjectKey: `subject.${id}`,
  variationKey: `variation.${id}`,
  censusKey: `census.resource.${id}`,
}));

const metadata = [
  ["meta-app01", "metadata/app-01-flow-route-map.artifact.json"],
  ["meta-app02", "metadata/app-02-spot-detail-prototype.artifact.json"],
  ["meta-app03", "metadata/app-03-spot-night-prototype.artifact.json"],
  ["meta-app04", "metadata/app-04-my-content-prototype.artifact.json"],
  ["meta-app05", "metadata/app-05-shared-component-control-atlas.artifact.json"],
  ["meta-app06", "metadata/app-06-cross-app-interaction-motion-accessibility.artifact.json"],
  ["meta-app07", "metadata/app-07-responsive-mode-state-matrix.artifact.json"],
  ["meta-app08", "metadata/app-08-semantic-asset-atlas.artifact.json"],
  ["meta-map01", "metadata/map-01-page-prototype.artifact.json"],
  ["meta-map02", "metadata/map-02-page-anatomy.artifact.json"],
  ["meta-map03", "metadata/map-03-component-control-atlas.artifact.json"],
  ["meta-map04", "metadata/map-04-interaction-motion-accessibility.artifact.json"],
].map(([id, relativePath]) => ({
  id,
  relativePath,
  role: "supporting",
  mediaType: "application/json",
  key: `resource.${id}`,
  censusKey: `census.resource.${id}`,
}));

const infrastructure = [
  ["integrity", "resource-integrity.json", "application/json"],
  ["proof-parameters", "proof-parameters.json", "application/json"],
  ["environment", "render-environment.json", "application/json"],
  ["inspector", "frozen-inspector.mjs", "application/javascript"],
  ["oracle", "frozen-oracle.mjs", "application/javascript"],
].map(([id, relativePath, mediaType]) => ({
  id,
  relativePath,
  role: "supporting",
  mediaType,
  key: `resource.${id}`,
  censusKey: `census.resource.${id}`,
}));

const manifestSpec = {
  id: "manifest",
  relativePath: "fact-manifest.json",
  role: "supporting",
  mediaType: "application/json",
  key: "resource.manifest",
};

const allInputSpecs = [...subjects, ...metadata, ...infrastructure];

await mkdir(selectedDir, { recursive: true });
await mkdir(draftDir, { recursive: true });

for (const spec of [...subjects, ...metadata]) {
  await readFile(path.join(selectedDir, ...spec.relativePath.split("/")));
}
await readFile(path.join(selectedDir, "proposal-reconciliation-index.md"));

const explicitInputPaths = allInputSpecs
  .map((spec) => `${selectedRel}/${spec.relativePath}`)
  .sort();

const inspectorSource = `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const INPUT_PATHS = ${JSON.stringify(explicitInputPaths, null, 2)};
const root = resolve(process.argv[2] || process.cwd());
const rows = [];
for (const relativePath of INPUT_PATHS) {
  const bytes = await readFile(resolve(root, ...relativePath.split("/")));
  rows.push({
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
process.stdout.write(JSON.stringify({
  inspector: "${inspectorIdentity}@${inspectorVersion}",
  traversal: "complete_enumeration",
  dynamic_discovery: "fully_enumerated",
  resources: rows,
}, null, 2) + "\\n");
`;

const oracleSource = `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [relativePath, expectedSha256, rootArgument] = process.argv.slice(2);
if (!relativePath || !/^[a-f0-9]{64}$/.test(expectedSha256 || "")) {
  throw new Error("usage: node frozen-oracle.mjs <repository-relative-path> <expected-sha256> [repository-root]");
}
const root = resolve(rootArgument || process.cwd());
const bytes = await readFile(resolve(root, ...relativePath.split("/")));
const actualSha256 = createHash("sha256").update(bytes).digest("hex");
const result = {
  oracle: "${oracleIdentity}@${oracleVersion}",
  method: "asset_integrity",
  comparator: "asset_equal",
  path: relativePath,
  expected_sha256: expectedSha256,
  actual_sha256: actualSha256,
  pass: actualSha256 === expectedSha256,
};
process.stdout.write(JSON.stringify(result, null, 2) + "\\n");
if (!result.pass) process.exitCode = 1;
`;

await writeUtf8("frozen-inspector.mjs", inspectorSource);
await writeUtf8("frozen-oracle.mjs", oracleSource);
await writeJson("proof-parameters.json", {
  asset_integrity: "sha256-exact-resource-bytes-v1",
});
await writeJson("render-environment.json", {
  identity: "canonical-source-bytes-no-render-v1",
  description: "Asset-integrity proof compares immutable canonical source bytes; it does not claim production rendering conformance.",
});

const subjectHashes = {};
for (const spec of subjects) {
  subjectHashes[spec.id] = await hashSelected(spec.relativePath);
}
await writeJson("resource-integrity.json", {
  schema_version: "starward-selected-resource-integrity-v1",
  algorithm: "sha256",
  resources: Object.fromEntries(subjects.map((spec) => [
    spec.id,
    {
      path: `${selectedRel}/${spec.relativePath}`,
      sha256: subjectHashes[spec.id],
    },
  ])),
});

const resourcesWithoutManifest = [];
for (const spec of allInputSpecs) {
  resourcesWithoutManifest.push(await buildResource(spec));
}
const resourcesByKey = new Map(resourcesWithoutManifest.map((resource) => [resource.key, resource]));

const condition = {
  key: conditionKey,
  platform: "wechat-mini-program",
  os_version: "source-constraint",
  device_profile: "mobile-review",
  form_factor: "phone",
  viewport: { key: "review-375x900", width: 375, height: 900, unit: "px" },
  orientation: "portrait",
  density: { key: "css-pixel", pixel_ratio: 1 },
  safe_area: { key: "source-simulated", top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
  window_state: "standalone-review",
  fold_state: "not-applicable",
  display_mode: "browser-review",
  color_scheme: "multi-mode-source",
  locale: "zh-cn",
  language: "zh",
  script: "hans",
  direction: "ltr",
  pseudo_localization: "none",
  content_case: "sample-data-labeled",
  data_case: "authored-state-matrix",
  text_scale: { key: "review-default", multiplier: 1 },
  input_method: "pointer-keyboard",
  assistive_technology: "semantic-snapshot",
  motion: "default-and-reduced-source",
  transparency: "default",
  contrast: "normal",
  bold_text: "default",
  button_shapes: "source-defined",
  system_ui: "simulated-wechat",
  ime: "not-applicable",
  permission: "authored-matrix",
  capability: "demo-commercial-matrix",
  connectivity: "authored-matrix",
  lifecycle: "authored-matrix",
  custom_axes: [],
};

const conditionValueByAxis = {
  platform: condition.platform,
  os_version: condition.os_version,
  device_profile: condition.device_profile,
  form_factor: condition.form_factor,
  viewport: condition.viewport.key,
  orientation: condition.orientation,
  density: condition.density.key,
  safe_area: condition.safe_area.key,
  window_state: condition.window_state,
  fold_state: condition.fold_state,
  display_mode: condition.display_mode,
  color_scheme: condition.color_scheme,
  locale: condition.locale,
  language: condition.language,
  script: condition.script,
  direction: condition.direction,
  pseudo_localization: condition.pseudo_localization,
  content_case: condition.content_case,
  data_case: condition.data_case,
  text_scale: condition.text_scale.key,
  input_method: condition.input_method,
  assistive_technology: condition.assistive_technology,
  motion: condition.motion,
  transparency: condition.transparency,
  contrast: condition.contrast,
  bold_text: condition.bold_text,
  button_shapes: condition.button_shapes,
  system_ui: condition.system_ui,
  ime: condition.ime,
  permission: condition.permission,
  capability: condition.capability,
  connectivity: condition.connectivity,
  lifecycle: condition.lifecycle,
};

const axisDispositions = DESIGN_RESOURCE_STANDARD_CONDITION_AXES.map((axis) => ({
  key: `axis.${axis}`,
  target_ref: targetKey,
  axis,
  disposition: conditionValueByAxis[axis] === "not-applicable" ? "not_applicable" : "applicable",
  values: [{ key: conditionValueByAxis[axis], census_refs: ["census.resource.hub"] }],
  source_item_refs: sourceItemRefs,
  basis_refs: [...sourceItemRefs, "census.resource.hub"],
  rationale: "This condition describes inspection of the selected constraint-source suite, not a production device claim.",
}));

const manifestSubjects = subjects.map((spec) => ({
  key: spec.subjectKey,
  kind: "surface",
  stable_keys: [spec.stableKey],
  target_refs: [targetKey],
  parent_ref: null,
  instance_of_ref: null,
  slot_key: null,
  override_of_ref: null,
  family_ref: null,
  presence: "always",
  presence_rule_ref: null,
  population_ref: null,
  portal_host_ref: null,
  relation_endpoints: [],
  census_refs: [spec.censusKey],
}));

const variationAxisDispositions = subjects.flatMap((spec) =>
  DESIGN_RESOURCE_VARIATION_AXES.map((axis) => ({
    key: `variation-axis.${spec.id}.${axis}`,
    subject_ref: spec.subjectKey,
    axis,
    disposition: "not_applicable",
    values: [{ key: "not-applicable", census_refs: [] }],
    source_item_refs: sourceItemRefs,
    basis_refs: [...sourceItemRefs, spec.censusKey],
    rationale: "The subject is an immutable whole-resource constraint; interactive variations remain inside the canonical HTML resource.",
  })),
);

const variations = subjects.map((spec) => ({
  key: spec.variationKey,
  subject_ref: spec.subjectKey,
  variant: "not-applicable",
  state: "not-applicable",
  interaction_phase: "not-applicable",
  presence_phase: "not-applicable",
  instance_case: "not-applicable",
}));

const standardProperties = structuredClone(DESIGN_RESOURCE_STANDARD_PROPERTIES);
const customProperty = {
  key: "custom.canonical-resource-sha256",
  family: "asset",
  dimension: "assets",
  value_kind: "digest",
  required_methods: ["asset_integrity"],
  standard: false,
  inspector_capability_refs: ["assets"],
  census_refs: ["census.resource.integrity"],
};
const properties = [...standardProperties, customProperty];

const factCells = [];
const facts = [];
const evidence = [];
const proofObligations = [];
const cellsBySubject = new Map();

const proofParameterValue = "sha256-exact-resource-bytes-v1";
const environmentIdentity = "canonical-source-bytes-no-render-v1";
const proofParameterLocated = locatedJsonString("resource.proof-parameters", "/asset_integrity", proofParameterValue);
const environmentLocated = locatedJsonString("resource.environment", "/identity", environmentIdentity);

for (const spec of subjects) {
  const localCells = [];
  for (let index = 0; index < standardProperties.length; index += 1) {
    const property = standardProperties[index];
    const cell = {
      key: `cell.${spec.id}.p${String(index).padStart(3, "0")}`,
      subject_ref: spec.subjectKey,
      target_ref: targetKey,
      condition_ref: conditionKey,
      variation_ref: spec.variationKey,
      property_ref: property.key,
      disposition: "not_applicable",
      fact_ref: null,
      source_item_refs: sourceItemRefs,
      basis_refs: [...sourceItemRefs, spec.censusKey],
      rationale: "The selected target is a resource-level implementation constraint, so this atomic production property is not asserted for the whole-resource subject.",
    };
    factCells.push(cell);
    localCells.push(cell.key);
  }

  const cellKey = `cell.${spec.id}.digest`;
  const factKey = `fact.${spec.id}.digest`;
  const evidenceKey = `evidence.${spec.id}.asset`;
  const proofKey = `proof.${spec.id}.asset`;
  const expectedResourceSha = subjectHashes[spec.id];
  const value = locatedJsonString("resource.integrity", `/resources/${escapeJsonPointer(spec.id)}/sha256`, expectedResourceSha);
  factCells.push({
    key: cellKey,
    subject_ref: spec.subjectKey,
    target_ref: targetKey,
    condition_ref: conditionKey,
    variation_ref: spec.variationKey,
    property_ref: customProperty.key,
    disposition: "covered",
    fact_ref: factKey,
    source_item_refs: sourceItemRefs,
    basis_refs: [...sourceItemRefs, spec.censusKey, "census.resource.integrity"],
    rationale: "The immutable selected resource is identified by its exact SHA-256 value in the canonical integrity index.",
  });
  localCells.push(cellKey);
  evidence.push({
    key: evidenceKey,
    resource_ref: spec.key,
    kind: "asset",
    locator: { kind: "whole_resource", value: "." },
    condition_refs: [conditionKey],
  });
  facts.push({
    key: factKey,
    cell_ref: cellKey,
    subject_ref: spec.subjectKey,
    target_ref: targetKey,
    condition_ref: conditionKey,
    variation_ref: spec.variationKey,
    property_ref: customProperty.key,
    dimension: "assets",
    observation_scope: "subject",
    observation_sensitivity: "plain",
    value_kind: "digest",
    value,
    evidence_refs: [evidenceKey],
    source_item_refs: sourceItemRefs,
    lineage: {
      design_system_ref: null,
      token_chain_refs: [],
      override_chain_refs: [],
      resolved_value: value,
      conflict_status: "none",
      conflict_resolution: "",
    },
  });
  proofObligations.push({
    key: proofKey,
    fact_ref: factKey,
    method: "asset_integrity",
    comparison: {
      comparator: "asset_equal",
      mode: "exact",
      parameters: proofParameterLocated,
      tolerance: null,
      mask: null,
    },
    oracle_ref: "oracle.asset-integrity",
    environment_ref: "environment.canonical-source-bytes",
  });
  cellsBySubject.set(spec.id, localCells);
}

const allFactRefs = facts.map((fact) => fact.key);
const allCellRefs = factCells.map((cell) => cell.key);

const census = allInputSpecs.map((spec) => {
  const subject = subjects.find((candidate) => candidate.id === spec.id);
  const integrity = spec.id === "integrity";
  const covered = Boolean(subject) || integrity;
  return {
    key: spec.censusKey,
    kind: "resource",
    resource_ref: spec.key,
    locator: { kind: "whole_resource", value: "." },
    disposition: covered ? "covered" : "non_material",
    fact_refs: integrity ? allFactRefs : subject ? [`fact.${spec.id}.digest`] : [],
    fact_cell_refs: integrity ? allCellRefs : subject ? cellsBySubject.get(spec.id) : [],
    source_item_refs: sourceItemRefs,
    basis_refs: sourceItemRefs,
    rationale: covered
      ? "Material immutable selected resource or its canonical integrity index."
      : "Supporting executable, parameter, environment or provider metadata resource with no independent UI fact subject.",
  };
});

const inspectorResource = resourcesByKey.get("resource.inspector");
const oracleResource = resourcesByKey.get("resource.oracle");
const designSystemResource = resourcesByKey.get("resource.design-system");

const inspector = {
  trust: "frozen_executable",
  identity: inspectorIdentity,
  version: inspectorVersion,
  implementation_sha256: inspectorResource.sha256,
  capability_refs: [...DESIGN_RESOURCE_INSPECTOR_CAPABILITIES],
  entry_resource_ref: "resource.hub",
  input_resources: resourcesWithoutManifest.map((resource) => ({
    resource_ref: resource.key,
    path: resource.path,
    sha256: resource.sha256,
  })),
  traversal: "complete_enumeration",
  dynamic_discovery: "fully_enumerated",
  census,
};

const oracles = [{
  key: "oracle.asset-integrity",
  trust: "frozen_executable",
  identity: oracleIdentity,
  version: oracleVersion,
  sha256: oracleResource.sha256,
  capability_refs: ["assets"],
}];

const environments = [{
  key: "environment.canonical-source-bytes",
  identity: environmentIdentity,
  definition: environmentLocated,
}];

const standardCellsByDimension = new Map();
for (const cell of factCells.filter((item) => item.disposition === "not_applicable")) {
  const property = standardProperties.find((item) => item.key === cell.property_ref);
  const rows = standardCellsByDimension.get(property.dimension) ?? [];
  rows.push(cell);
  standardCellsByDimension.set(property.dimension, rows);
}

const coverage = [...standardCellsByDimension.entries()].map(([dimension, cells]) => ({
  key: `coverage.${dimension}.not-applicable`,
  subject_refs: unique(cells.map((cell) => cell.subject_ref)),
  dimension,
  disposition: "not_applicable",
  target_refs: [targetKey],
  condition_refs: [conditionKey],
  variation_refs: unique(cells.map((cell) => cell.variation_ref)),
  property_refs: unique(cells.map((cell) => cell.property_ref)),
  evidence_refs: [],
  fact_cell_refs: cells.map((cell) => cell.key),
  fact_refs: [],
  proof_obligation_refs: [],
  source_item_refs: sourceItemRefs,
  verification_methods: [],
  rationale: "This handoff truthfully classifies the selected suite as an implementation constraint source; exact UI values remain in the acquired canonical resources rather than being re-owned as production facts.",
}));

coverage.push({
  key: "coverage.assets.covered-integrity",
  subject_refs: subjects.map((spec) => spec.subjectKey),
  dimension: "assets",
  disposition: "covered",
  target_refs: [targetKey],
  condition_refs: [conditionKey],
  variation_refs: subjects.map((spec) => spec.variationKey),
  property_refs: [customProperty.key],
  evidence_refs: evidence.map((item) => item.key),
  fact_cell_refs: factCells.filter((item) => item.disposition === "covered").map((item) => item.key),
  fact_refs: allFactRefs,
  proof_obligation_refs: proofObligations.map((item) => item.key),
  source_item_refs: sourceItemRefs,
  verification_methods: ["asset_integrity"],
  rationale: "Every selected canonical UI/UX resource has one exact byte-identity Fact and one asset-integrity proof obligation.",
});

const manifestWithoutGeneration = {
  schema_version: "design-resource-observable-fact-manifest-v1",
  scope_key: scopeKey,
  target_key: targetKey,
  inspector,
  design_system: {
    disposition: "used",
    id: "user:soft-instruments",
    revision: "5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6",
    resource_ref: "resource.design-system",
    sha256: designSystemResource.sha256,
  },
  axis_dispositions: axisDispositions,
  condition_exclusions: [],
  conditions: [condition],
  subjects: manifestSubjects,
  variation_axis_dispositions: variationAxisDispositions,
  variation_exclusions: [],
  variations,
  properties,
  lineage_nodes: [],
  fact_cells: factCells,
  facts,
  evidence,
  proof_obligations: proofObligations,
  oracles,
  environments,
  asset_bindings: [],
  acceptance_blockers: [],
};

const collectionRows = manifestCollectionRows(manifestWithoutGeneration);
const generation = {
  strategy: "complete_explicit",
  sampling: "forbidden",
  truncation: "forbidden",
  chunk_count: 1,
  chunk_indexes: [0],
  collections: DESIGN_RESOURCE_MANIFEST_COLLECTIONS.map((name) => {
    const rows = collectionRows.get(name);
    return {
      name,
      expected_count: rows.length,
      identity_sha256: manifestIdentityDigest(rows),
    };
  }),
};

const manifest = {
  schema_version: manifestWithoutGeneration.schema_version,
  generation,
  scope_key: scopeKey,
  target_key: targetKey,
  inspector,
  design_system: manifestWithoutGeneration.design_system,
  axis_dispositions: axisDispositions,
  condition_exclusions: [],
  conditions: [condition],
  subjects: manifestSubjects,
  variation_axis_dispositions: variationAxisDispositions,
  variation_exclusions: [],
  variations,
  properties,
  lineage_nodes: [],
  fact_cells: factCells,
  facts,
  evidence,
  proof_obligations: proofObligations,
  oracles,
  environments,
  asset_bindings: [],
  acceptance_blockers: [],
};
await writeJson(manifestSpec.relativePath, manifest);
const manifestResource = await buildResource(manifestSpec);
const resources = [...resourcesWithoutManifest, manifestResource];

const resourceFactClosure = resources.map((resource) => {
  let factRefs = [];
  const subject = subjects.find((spec) => spec.key === resource.key);
  if (subject) factRefs = [`fact.${subject.id}.digest`];
  if (["resource.integrity", "resource.proof-parameters", "resource.environment"].includes(resource.key)) {
    factRefs = allFactRefs;
  }
  return {
    key: `closure.${resource.key.slice("resource.".length)}`,
    resource_ref: resource.key,
    disposition: factRefs.length ? "material_with_facts" : "supporting_only",
    fact_refs: factRefs,
    inspection: { status: "complete", inspector: `${inspectorIdentity}@${inspectorVersion}` },
    rationale: factRefs.length
      ? "The resource owns or supports exact canonical byte-identity Facts."
      : "The resource supports acquisition, inspection, proof execution, provider metadata or manifest hydration without owning an independent Fact.",
  };
});

const handoff = {
  schema_version: "design-resource-handoff-v1",
  representation: "manifest_backed",
  intent: "implementation_handoff",
  scope: {
    key: scopeKey,
    style_dependency: "style-bearing",
    surface_keys: subjects.map((spec) => spec.stableKey),
    necessary_context: [
      "DESIGN.md",
      "docs/design-resources/miniapp-complete-product-2026-08-05/source-index.md",
      "docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-002-spot-detail-night-merge.md",
      "docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-003-my-profile-content-import.md",
      "docs/design-resources/miniapp-complete-product-2026-08-05/review-delta-004-map-filter-entry-flat-options.md",
      "docs/design-resources/miniapp-map-page-2026-08-05/review-delta-001-filter-hierarchy.md",
      `${selectedRel}/proposal-reconciliation-index.md`,
    ],
    exclusions: [
      "No production code or WeChat-native runtime is included.",
      "The suite is an implementation constraint, not a pixel-exact production target.",
      "Preflight proves acquired-source integrity and declared-universe closure, not production conformance.",
      "Third-party deep links, automated post parsing, astronomy truth and real spot facts remain capability/data integrations, not design-resource claims.",
    ],
  },
  provenance: {
    provider: "Open Design",
    provider_version: "0.16.1",
    project: "starward-miniapp-complete-product-2026-08-05 + starward-miniapp-map-page-2026-08-05",
    run: "053f8cb4-43c8-4eb7-a518-26b894d06193 + 0f1ba422-9844-419b-aa59-f022c8b82986 + efa214cb-d7bd-4d54-b031-28abd442d1ef",
    capability: "runnable implementation-oriented HTML prototypes, component/control studies, interaction/accessibility specifications, responsive matrices and semantic asset atlases",
    agent: "codex",
    model: "gpt-5.6-sol/xhigh",
    design_system_id: "user:soft-instruments",
  },
  resources,
  targets: [{
    key: targetKey,
    interpretation: "constraint",
    resource_refs: resources.map((resource) => resource.key),
    condition_refs: [conditionKey],
    source_profile: {
      kind: "reference",
      entry_resource_ref: "resource.hub",
      dependency_resource_refs: resources.filter((resource) => resource.key !== "resource.hub").map((resource) => resource.key),
      fact_manifest_resource_ref: manifestResource.key,
      acquisition: "complete",
    },
    selection_basis: "Delegated final selection: the suite satisfies the two V2.0 proposals, all accepted MAP/SPOT/NIGHT/MY deltas, the Soft Instruments binding, and independent multi-viewport/interaction/accessibility QA without inventing external platform, astronomy or real-place truth.",
  }],
  resource_fact_closure: resourceFactClosure,
  coverage,
  proposal: {
    reconciliation_status: "applied",
    path: `${selectedRel}/proposal-reconciliation-index.md`,
    revision: "V2.0-2026-08-06",
  },
};

const handoffMarkdown = `<!-- ty-source-item:start key=requirement-constraint-source-closure kind=requirement -->
The selected target is a complete, immutable implementation-constraint resource suite: exact UI/UX values remain in the acquired canonical resources, while this handoff claims source acquisition and integrity rather than pixel-exact production fidelity.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=control-selection-and-integrity kind=control -->
Implementation must use the frozen resource identities, preserve the Soft Instruments lineage and accepted MAP/SPOT/NIGHT/MY changes, and independently prove production behavior; unavailable third-party, astronomy and real-place capabilities must remain explicit gates or fallbacks.
<!-- ty-source-item:end -->

\`\`\`yaml design-resource-handoff-v1
${JSON.stringify(handoff, null, 2)}
\`\`\`
`;

await writeFile(path.join(draftDir, "miniapp-complete-product-selected-v1.md"), handoffMarkdown, "utf8");

process.stdout.write(JSON.stringify({
  selected_source: selectedRel,
  draft: `${draftRel}/miniapp-complete-product-selected-v1.md`,
  manifest: `${selectedRel}/${manifestSpec.relativePath}`,
  counts: {
    resources: resources.length,
    subjects: manifestSubjects.length,
    properties: properties.length,
    fact_cells: factCells.length,
    facts: facts.length,
    proofs: proofObligations.length,
    coverage: coverage.length,
  },
  manifest_sha256: manifestResource.sha256,
}, null, 2) + "\n");

async function writeUtf8(relativePath, content) {
  const destination = path.join(selectedDir, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}

async function writeJson(relativePath, value) {
  await writeUtf8(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function hashSelected(relativePath) {
  return sha256(await readFile(path.join(selectedDir, ...relativePath.split("/"))));
}

async function buildResource(spec) {
  const resourcePath = `${selectedRel}/${spec.relativePath}`;
  return {
    key: spec.key,
    role: spec.role,
    path: resourcePath,
    media_type: spec.mediaType,
    sha256: await hashSelected(spec.relativePath),
    editable_upstream: {
      owner: spec.id.startsWith("app") || spec.id.startsWith("map") || spec.id.startsWith("meta-")
        ? "Open Design project and DRA review deltas"
        : "design-resource-authoring finalization package",
      locator: spec.relativePath,
      update_route: spec.id.startsWith("app") || spec.id.startsWith("map") || spec.id.startsWith("meta-")
        ? "Revise the owning accepted delta, rerun the bound Open Design project, re-QA, then publish a new immutable selected package."
        : "Regenerate from the accepted proposals, final resource inventory and frozen authoring script; never overwrite this selected package after adoption.",
    },
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function locatedJsonString(resourceRef, pointer, resolvedString) {
  return {
    locator: { resource_ref: resourceRef, kind: "json_pointer", value: pointer },
    sha256: sha256(Buffer.from(resolvedString, "utf8")),
  };
}

function escapeJsonPointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function unique(values) {
  return [...new Set(values)];
}
