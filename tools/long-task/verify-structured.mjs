import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { structuredContracts, validateStructuredContracts } from "../../tests/acceptance/structured/contracts.mjs";
import { structuredEvidenceCapabilities } from "../../tests/acceptance/structured/evidence-policy.mjs";
import { configureTypeScriptImporter, runStructuredProbe } from "../../tests/acceptance/structured/probes.mjs";

configureTypeScriptImporter(tsImport);

function argsOf(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || value === undefined) throw new Error(`invalid_argument:${name ?? "missing"}`);
    result[name.slice(2)] = value;
  }
  return result;
}

function repositoryPath(root, relative) {
  const resolved = path.resolve(root, ...relative.replaceAll("\\", "/").split("/"));
  const normalizedRoot = path.resolve(root).toLowerCase();
  const normalized = resolved.toLowerCase();
  if (normalized !== normalizedRoot && !normalized.startsWith(`${normalizedRoot}${path.sep}`)) throw new Error(`path_outside_repository:${relative}`);
  return resolved;
}

const options = argsOf(process.argv.slice(2));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scope = options.scope;
const requestedOutcome = options.outcome;
const surface = options.surface;
const carrier = options.carrier;
if (!scope || !requestedOutcome || !surface || !carrier) throw new Error("required_arguments_missing");

const specName = scope === "global" ? "global.json" : `${requestedOutcome}.json`;
const spec = JSON.parse(await readFile(repositoryPath(root, `tests/acceptance/specs/${specName}`), "utf8"));
validateStructuredContracts(spec);
if (carrier.replaceAll("\\", "/") !== spec.carrier.replaceAll("\\", "/")) throw new Error(`carrier_contract_mismatch:${carrier}:${spec.carrier}`);

const contractOutcome = spec.outcome;
const observations = {};
const evidenceRecords = [];
const diagnostics = [];
let population = null;
let carrierReady = false;
let carrierEvidence = null;

try {
  const carrierResult = await runStructuredProbe({ root, outcome: contractOutcome, carrier, probeName: "carrier-integrity" });
  carrierReady = carrierResult.passes === true;
  carrierEvidence = carrierResult.evidence ?? null;
} catch (error) {
  diagnostics.push(`carrier-integrity:${error instanceof Error ? error.message : String(error)}`);
}

function appendEvidence(assertion, capability) {
  const value = carrierEvidence?.[capability];
  if (!value) {
    diagnostics.push(`${assertion.key}:missing_${capability}_evidence`);
    return;
  }
  const base = { assertion_key: assertion.key, capability };
  if (capability === "boundary_invocation" || capability === "external_side_effect") {
    evidenceRecords.push({ ...base, ...value, observer_target_ref: "system-observer" });
    return;
  }
  evidenceRecords.push({ ...base, ...value });
}

for (const assertion of spec.assertions.filter((item) => item.surface === surface)) {
  let passes = false;
  if (carrierReady) {
    try {
      const probeName = structuredContracts[contractOutcome][assertion.key];
      const result = assertion.key === "carrier-integrity"
        ? { passes: true, evidence: carrierEvidence }
        : await runStructuredProbe({ root, outcome: requestedOutcome, carrier, probeName });
      passes = result.passes === true;
      if (result.population) population = result.population;
    } catch (error) {
      diagnostics.push(`${assertion.key}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  observations[assertion.observation] = assertion.observation.endsWith(".violated") ? !passes : passes;
  if (passes) {
    for (const capability of structuredEvidenceCapabilities({ outcome: contractOutcome, assertion })) {
      if (capability !== "presence") appendEvidence(assertion, capability);
    }
  }
}

if (surface === "population_coverage") {
  if (!population) diagnostics.push(`${requestedOutcome}:population_evidence_missing`);
  observations[`${requestedOutcome}.population.eligible_ids`] = population?.eligibleIds ?? [];
  observations[`${requestedOutcome}.population.observed_ids`] = population?.observedIds ?? [];
  observations[`${requestedOutcome}.population.excluded_items`] = population?.excludedItems ?? [];
}

process.stdout.write(`${JSON.stringify({
  schema_version: "long-task-check-result-v3",
  execution_status: "completed",
  observations,
  evidence_records: evidenceRecords,
  diagnostics,
})}\n`);
