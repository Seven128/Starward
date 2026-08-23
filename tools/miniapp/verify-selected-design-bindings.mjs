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
const expectedTarget = "target-miniapp-drift-correction-selected-constraint-v3";

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
  )
    throw new Error(`path_outside_repository:${relative}`);
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
      {
        cwd: root,
        windowsHide: true,
        shell: false,
      },
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
if (binding.schema_version !== "starward-miniapp-selected-design-bindings-v2")
  failures.push("binding_schema_invalid");
if (binding.design_target !== expectedTarget)
  failures.push("design_target_invalid");

const handoffBytes = await readFile(repositoryPath(binding.handoff.path)).catch(
  () => null,
);
const handoffIdentityPassed =
  Boolean(handoffBytes) && sha256(handoffBytes) === binding.handoff.sha256;
if (!handoffIdentityPassed) failures.push("handoff_identity_mismatch");
const handoff = handoffBytes
  ? handoffPayload(handoffBytes.toString("utf8"))
  : null;
if (!handoff?.targets?.some((target) => target.key === expectedTarget))
  failures.push("handoff_target_mismatch");

const handoffResources = handoff?.resources ?? [];
const inspectorPath = handoffResources.find(
  (item) => item.key === "resource.inspector",
)?.path;
if (!inspectorPath) throw new Error("handoff_inspector_missing");
const inspected = await inspectFrozenPackage(inspectorPath);
const inspectorResources = new Map(
  inspected.resources.map((item) => [item.path, item]),
);

const expectedResources = handoffResources.map(
  ({ key, role, path: resourcePath, sha256: digest }) => ({
    key,
    role,
    path: resourcePath,
    sha256: digest,
  }),
);
if (JSON.stringify(binding.resources) !== JSON.stringify(expectedResources))
  failures.push("resource_binding_population_or_identity_invalid");
if (
  new Set(binding.resources.map((item) => item.key)).size !==
  binding.resources.length
)
  failures.push("resource_binding_key_duplicate");

const resourceResults = [];
for (const resource of binding.resources) {
  const bytes = await readFile(repositoryPath(resource.path)).catch(() => null);
  const actualSha = bytes ? sha256(bytes) : null;
  const inspectorSha = inspectorResources.get(resource.path)?.sha256 ?? null;
  const inspectorPassed =
    resource.key === "resource.manifest"
      ? inspectorSha === null
      : inspectorSha === resource.sha256;
  const passed = actualSha === resource.sha256 && inspectorPassed;
  if (!passed) failures.push(`resource_identity_failed:${resource.key}`);
  resourceResults.push({
    ...resource,
    actual_sha256: actualSha,
    inspector_sha256: inspectorSha,
    passed,
  });
}
if (inspectorResources.size !== binding.resources.length - 1)
  failures.push("inspector_resource_population_mismatch");

const authorityResults = [];
for (const authority of binding.authorities) {
  const bytes = await readFile(repositoryPath(authority.path)).catch(
    () => null,
  );
  const actualSha = bytes ? sha256(bytes) : null;
  const passed = actualSha === authority.sha256;
  if (!passed) failures.push(`authority_mismatch:${authority.key}`);
  authorityResults.push({ ...authority, actual_sha256: actualSha, passed });
}

const probeResults = [];
for (const probe of binding.production_probes) {
  const production = await readFile(repositoryPath(probe.path), "utf8").catch(
    () => null,
  );
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

const manifestResource = binding.resources.find(
  (item) => item.key === "resource.manifest",
);
const manifest = JSON.parse(
  await readFile(repositoryPath(manifestResource.path), "utf8"),
);
const census = new Map(
  manifest.generation.collections.map((item) => [
    item.name,
    item.expected_count,
  ]),
);
const manifestCensusPassed =
  census.get("fact_cells") === 1090 &&
  census.get("facts") === 5 &&
  census.get("proof_obligations") === 5 &&
  census.get("acceptance_blockers") === 0;
if (!manifestCensusPassed) failures.push("selected_manifest_census_mismatch");

const outputRelative = argument("--output", defaultOutput);
if (!outputRelative) throw new Error("output_argument_missing");
const output = {
  schema_version: "starward-miniapp-selected-design-binding-result-v2",
  generated_at: new Date().toISOString(),
  status: failures.length === 0 ? "passed" : "failed",
  design_target: binding.design_target,
  binding_path: bindingRelative,
  binding_sha256: sha256(bindingBytes),
  handoff: { ...binding.handoff, passed: handoffIdentityPassed },
  frozen_inspector: {
    identity: inspected.inspector,
    traversal: inspected.traversal,
    dynamic_discovery: inspected.dynamic_discovery,
    resource_count: inspected.resources.length,
  },
  authorities: authorityResults,
  resources: resourceResults,
  production_probes: probeResults,
  manifest_census: Object.fromEntries(census),
  manifest_census_passed: manifestCensusPassed,
  limitations: [
    "This result proves complete immutable v3 selected-resource identity and declared production probe bindings.",
    "It does not replace fresh native journeys, layout/pixel/accessibility/motion observations, real-provider validation, or current-candidate conformance.",
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
