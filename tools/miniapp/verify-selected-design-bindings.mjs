import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const bindingRelative = "tools/miniapp/selected-design-bindings.json";
const defaultOutput =
  "artifacts/miniapp/design/selected-design-binding-conformance.json";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryPath(relative) {
  const absolute = path.resolve(root, ...relative.replaceAll("\\", "/").split("/"));
  const normalizedRoot = root.toLowerCase();
  const normalized = absolute.toLowerCase();
  if (
    normalized !== normalizedRoot &&
    !normalized.startsWith(`${normalizedRoot}${path.sep}`)
  )
    throw new Error(`path_outside_repository:${relative}`);
  return absolute;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

async function inspectFrozenPackage() {
  const inspector = repositoryPath(
    "docs/design-resources/miniapp-selected-source-2026-08-06-v1/frozen-inspector.mjs",
  );
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [inspector, root], {
      cwd: root,
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0)
        reject(new Error(`frozen_inspector_failed:${code}:${stderr.trim()}`));
      else {
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`frozen_inspector_invalid_json:${error.message}`));
        }
      }
    });
  });
}

const bindingBytes = await readFile(repositoryPath(bindingRelative));
const binding = JSON.parse(bindingBytes.toString("utf8"));
const failures = [];
const inspected = await inspectFrozenPackage();
const inspectorResources = new Map(
  inspected.resources.map((item) => [item.path, item]),
);

if (binding.schema_version !== "starward-miniapp-selected-design-bindings-v1")
  failures.push("binding_schema_invalid");
if (
  binding.design_target !==
  "target.system.wechat-miniapp-soft-instruments-2026-08-05"
)
  failures.push("design_target_invalid");

const authorityResults = [];
for (const authority of binding.authorities) {
  const bytes = await readFile(repositoryPath(authority.path)).catch(() => null);
  const actualSha = bytes ? sha256(bytes) : null;
  const passed = actualSha === authority.sha256;
  if (!passed) failures.push(`authority_mismatch:${authority.key}`);
  authorityResults.push({ ...authority, actual_sha256: actualSha, passed });
}

const expectedResourceIds = [
  "APP-01",
  "APP-02",
  "APP-03",
  "APP-04",
  "APP-05",
  "APP-06",
  "APP-07",
  "APP-08",
  "MAP-01",
  "MAP-02",
  "MAP-03",
  "MAP-04",
];
const actualResourceIds = binding.resources.map((item) => item.id);
if (
  JSON.stringify(actualResourceIds) !== JSON.stringify(expectedResourceIds) ||
  new Set(actualResourceIds).size !== expectedResourceIds.length
)
  failures.push("resource_binding_population_invalid");

const resourceResults = [];
const productionFiles = new Map();
for (const resource of binding.resources) {
  const sourceBytes = await readFile(repositoryPath(resource.path)).catch(
    () => null,
  );
  const sourceText = sourceBytes?.toString("utf8") ?? "";
  const actualSha = sourceBytes ? sha256(sourceBytes) : null;
  const inspector = inspectorResources.get(resource.path);
  const sourceIdentityPassed =
    actualSha === resource.sha256 && inspector?.sha256 === resource.sha256;
  const markerResults = resource.source_markers.map((marker) => ({
    marker,
    passed: sourceText.includes(marker),
  }));
  const probeResults = [];
  for (const probe of resource.production_probes) {
    let production = productionFiles.get(probe.path);
    if (production === undefined) {
      production = await readFile(repositoryPath(probe.path), "utf8").catch(
        () => null,
      );
      productionFiles.set(probe.path, production);
    }
    const all = (probe.all_of ?? []).map((marker) => ({
      marker,
      passed: typeof production === "string" && production.includes(marker),
    }));
    const none = (probe.none_of ?? []).map((marker) => ({
      marker,
      passed: typeof production === "string" && !production.includes(marker),
    }));
    probeResults.push({
      path: probe.path,
      passed: [...all, ...none].every((item) => item.passed),
      all_of: all,
      none_of: none,
    });
  }
  const passed =
    sourceIdentityPassed &&
    markerResults.every((item) => item.passed) &&
    probeResults.every((item) => item.passed);
  if (!passed) failures.push(`resource_binding_failed:${resource.id}`);
  resourceResults.push({
    id: resource.id,
    path: resource.path,
    expected_sha256: resource.sha256,
    actual_sha256: actualSha,
    inspector_sha256: inspector?.sha256 ?? null,
    source_identity_passed: sourceIdentityPassed,
    source_markers: markerResults,
    production_probes: probeResults,
    passed,
  });
}

const semanticManifestPath =
  "apps/wechat-miniapp/src/assets/semantic/semantic-asset-manifest.json";
const semanticManifest = JSON.parse(
  await readFile(repositoryPath(semanticManifestPath), "utf8"),
);
const semanticAssetPassed =
  semanticManifest.source_sha256 ===
    "09fe77bc7d6f52a84fea96fafc8d85adc1ab976fc5f43b58b16c50458bad8534" &&
  semanticManifest.subjects?.length === 8 &&
  semanticManifest.modes?.length === 3 &&
  semanticManifest.assets?.length === 24;
if (!semanticAssetPassed) failures.push("semantic_asset_closure_failed");

const outputRelative = argument("--output", defaultOutput);
if (!outputRelative) throw new Error("output_argument_missing");
const output = {
  schema_version: "starward-miniapp-selected-design-binding-result-v1",
  generated_at: new Date().toISOString(),
  status: failures.length === 0 ? "passed" : "failed",
  design_target: binding.design_target,
  binding_path: bindingRelative,
  binding_sha256: sha256(bindingBytes),
  frozen_inspector: {
    identity: inspected.inspector,
    traversal: inspected.traversal,
    dynamic_discovery: inspected.dynamic_discovery,
    resource_count: inspected.resources.length,
  },
  authorities: authorityResults,
  resources: resourceResults,
  semantic_asset_closure: {
    path: semanticManifestPath,
    source_sha256: semanticManifest.source_sha256,
    subject_count: semanticManifest.subjects?.length ?? 0,
    mode_count: semanticManifest.modes?.length ?? 0,
    asset_count: semanticManifest.assets?.length ?? 0,
    passed: semanticAssetPassed,
  },
  limitations: [
    "This result proves immutable selected-resource identity and explicit source-to-production probe bindings.",
    "It does not replace fresh H5 multi-viewport behavior, native WeChat DevTools journeys, accessibility observations, or Final Gate.",
  ],
  failures,
};
const outputPath = repositoryPath(outputRelative);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({ status: output.status, output: outputRelative, resources: resourceResults.length, failures })}\n`,
);
if (failures.length) process.exitCode = 1;
