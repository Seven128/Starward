import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { structuredContracts, validateStructuredContracts } from "../../tests/acceptance/structured/contracts.mjs";
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
const diagnostics = [];
let population = null;
let carrierReady = false;

try {
  carrierReady = (await runStructuredProbe({ root, outcome: requestedOutcome, carrier, probeName: "carrier-integrity" })).passes === true;
} catch (error) {
  diagnostics.push(`carrier-integrity:${error instanceof Error ? error.message : String(error)}`);
}

for (const assertion of spec.assertions.filter((item) => item.surface === surface)) {
  let passes = false;
  if (carrierReady) {
    try {
      const probeName = structuredContracts[contractOutcome][assertion.key];
      const result = assertion.key === "carrier-integrity"
        ? { passes: true }
        : await runStructuredProbe({ root, outcome: requestedOutcome, carrier, probeName });
      passes = result.passes === true;
      if (result.population) population = result.population;
    } catch (error) {
      diagnostics.push(`${assertion.key}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  observations[assertion.observation] = assertion.observation.endsWith(".violated") ? !passes : passes;
}

if (surface === "population_coverage") {
  observations[`${requestedOutcome}.population.eligible_ids`] = population?.eligibleIds ?? ["fixture-eligible"];
  observations[`${requestedOutcome}.population.observed_ids`] = population?.observedIds ?? [];
  observations[`${requestedOutcome}.population.excluded_items`] = population?.excludedItems ?? [{ id: "fixture-eligible", rule: "explicit-ineligible-only" }];
}

process.stdout.write(`${JSON.stringify({
  schema_version: "long-task-check-result-v2",
  execution_status: "completed",
  observations,
  diagnostics,
})}\n`);
