import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bindingRelative = "tools/miniapp/selected-design-bindings.json";
const defaultOutput =
  "artifacts/miniapp/design/selected-design-binding-conformance.json";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryPath(relative) {
  const absolute = path.resolve(
    root,
    ...relative.replaceAll("\\", "/").split("/"),
  );
  const normalizedRoot = root.toLowerCase();
  const normalized = absolute.toLowerCase();
  if (
    normalized !== normalizedRoot &&
    !normalized.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    throw new Error(`path_outside_repository:${relative}`);
  }
  return absolute;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

function handoffPayload(markdown) {
  const match = markdown.match(
    /```yaml design-resource-handoff-v1\s*([\s\S]*?)```/u,
  );
  if (!match?.[1]) throw new Error("selected_handoff_payload_missing");
  return JSON.parse(match[1]);
}

async function inspectFrozenPackage(inspectorPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [repositoryPath(inspectorPath), root],
      { cwd: root, windowsHide: true, shell: false },
    );
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
      if (code !== 0) {
        reject(
          new Error(`frozen_inspector_failed:${code}:${stderr.trim()}`),
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new Error(`frozen_inspector_invalid_json:${error.message}`),
        );
      }
    });
  });
}

const bindingBytes = await readFile(repositoryPath(bindingRelative));
const binding = JSON.parse(bindingBytes.toString("utf8"));
const failures = [];
if (
  binding.schema_version !==
  "starward-sky-canvas-selected-design-bindings-v1"
) {
  failures.push("binding_schema_invalid");
}

const authorityResults = [];
for (const authority of binding.authorities ?? []) {
  const bytes = await readFile(repositoryPath(authority.path)).catch(
    () => null,
  );
  const actualSha = bytes ? sha256(bytes) : null;
  const passed = actualSha === authority.sha256;
  if (!passed) failures.push(`authority_mismatch:${authority.key}`);
  authorityResults.push({ ...authority, actual_sha256: actualSha, passed });
}

const handoffResults = [];
for (const selected of binding.handoffs ?? []) {
  const bytes = await readFile(repositoryPath(selected.path)).catch(() => null);
  const actualSha = bytes ? sha256(bytes) : null;
  const identityPassed = actualSha === selected.sha256;
  if (!identityPassed) {
    failures.push(`handoff_identity_mismatch:${selected.key}`);
  }
  if (!bytes) continue;

  const payload = handoffPayload(bytes.toString("utf8"));
  const targetPassed =
    payload.targets?.some((target) => target.key === selected.target) ?? false;
  if (!targetPassed) failures.push(`handoff_target_mismatch:${selected.key}`);
  const resources = payload.resources ?? [];
  const inspectorResource = resources.find((resource) =>
    resource.key.endsWith(".inspector"),
  );
  if (!inspectorResource) {
    throw new Error(`handoff_inspector_missing:${selected.key}`);
  }
  const inspected = await inspectFrozenPackage(inspectorResource.path);
  const inspectedResources = new Map(
    inspected.resources.map((resource) => [resource.path, resource.sha256]),
  );
  const resourceResults = [];
  for (const resource of resources) {
    const resourceBytes = await readFile(
      repositoryPath(resource.path),
    ).catch(() => null);
    const resourceSha = resourceBytes ? sha256(resourceBytes) : null;
    const inspectorSha = inspectedResources.get(resource.path) ?? null;
    const inspectorPassed =
      inspectorSha === null || inspectorSha === resource.sha256;
    const passed =
      resourceSha === resource.sha256 && inspectorPassed;
    if (!passed) failures.push(`resource_identity_failed:${resource.key}`);
    resourceResults.push({
      ...resource,
      actual_sha256: resourceSha,
      inspector_sha256: inspectorSha,
      passed,
    });
  }
  const declaredPaths = new Set(
    resources.map((resource) => resource.path),
  );
  const inspectorPopulationPassed = [...inspectedResources].every(
    ([resourcePath, digest]) =>
      declaredPaths.has(resourcePath) &&
      resources.some(
        (resource) =>
          resource.path === resourcePath && resource.sha256 === digest,
      ),
  );
  if (!inspectorPopulationPassed) {
    failures.push(`inspector_population_mismatch:${selected.key}`);
  }

  const manifestResource = resources.find(
    (resource) => resource.key === selected.manifest_key,
  );
  if (!manifestResource) {
    throw new Error(`handoff_manifest_missing:${selected.key}`);
  }
  const manifest = JSON.parse(
    await readFile(repositoryPath(manifestResource.path), "utf8"),
  );
  const census = Object.fromEntries(
    manifest.generation.collections.map((item) => [
      item.name,
      item.expected_count,
    ]),
  );
  const censusPassed = Object.entries(selected.expected_census).every(
    ([name, count]) => census[name] === count,
  );
  if (!censusPassed) {
    failures.push(`manifest_census_mismatch:${selected.key}`);
  }
  handoffResults.push({
    ...selected,
    actual_sha256: actualSha,
    identity_passed: identityPassed,
    target_passed: targetPassed,
    frozen_inspector: {
      identity: inspected.inspector,
      traversal: inspected.traversal,
      dynamic_discovery: inspected.dynamic_discovery,
      resource_count: inspected.resources.length,
      population_passed: inspectorPopulationPassed,
    },
    resources: resourceResults,
    manifest_census: census,
    manifest_census_passed: censusPassed,
  });
}

const probeResults = [];
for (const probe of binding.production_probes ?? []) {
  const production = await readFile(
    repositoryPath(probe.path),
    "utf8",
  ).catch(() => null);
  const allOf = (probe.all_of ?? []).map((marker) => ({
    marker,
    passed: production?.includes(marker) ?? false,
  }));
  const noneOf = (probe.none_of ?? []).map((marker) => ({
    marker,
    passed: production ? !production.includes(marker) : false,
  }));
  const passed = [...allOf, ...noneOf].every((item) => item.passed);
  if (!passed) failures.push(`production_probe_failed:${probe.key}`);
  probeResults.push({ ...probe, all_of: allOf, none_of: noneOf, passed });
}

const outputRelative = argument("--output", defaultOutput);
if (!outputRelative) throw new Error("output_argument_missing");
const output = {
  schema_version:
    "starward-sky-canvas-selected-design-binding-result-v1",
  generated_at: new Date().toISOString(),
  status: failures.length === 0 ? "passed" : "failed",
  binding_path: bindingRelative,
  binding_sha256: sha256(bindingBytes),
  authorities: authorityResults,
  handoffs: handoffResults,
  production_probes: probeResults,
  limitations: [
    "This result proves the immutable Sky Canvas Mini Program and Operations resource identities, frozen-inspector closure, manifest census, authority identities, and bounded production source probes.",
    "It does not replace fresh WEAPP or Operations journeys, layout/pixel/accessibility/motion observations, real-provider validation, authenticated writes, device sensor checks, or current-candidate conformance.",
  ],
  failures,
};
const outputPath = repositoryPath(outputRelative);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `${JSON.stringify({
    status: output.status,
    output: outputRelative,
    handoffs: handoffResults.length,
    failures,
  })}\n`,
);
if (failures.length) process.exitCode = 1;
