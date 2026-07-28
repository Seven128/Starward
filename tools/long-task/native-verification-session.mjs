import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const nativeVerificationSessionSchema = "starward-native-verification-session-v1";
export const nativeVerificationFragmentSchema = "starward-native-verification-fragment-v1";
export const nativeDesignModes = Object.freeze(["planning", "night", "red-light"]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : canonicalJson(value),
  ).digest("hex");
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== "string" || !value)) {
    throw new Error(`native_verification_${label}_invalid`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`native_verification_${label}_duplicate`);
  }
  return [...values];
}

function selectedValues(requested, available, label) {
  if (requested === undefined || requested === null || requested === "all") return [...available];
  const values = Array.isArray(requested)
    ? requested
    : String(requested).split(",").map((value) => value.trim()).filter(Boolean);
  const selected = uniqueStrings(values, `${label}_selection`);
  const missing = selected.filter((value) => !available.includes(value));
  if (missing.length) throw new Error(`native_verification_${label}_unknown:${missing.join(",")}`);
  return selected;
}

export function nativeDesignUnitKey(conditionKey, mode) {
  return `unit:${conditionKey}:${mode}`;
}

export function nativeDesignPageFragmentKey(conditionKey, mode) {
  return `page:${conditionKey}:${mode}`;
}

export function nativeDesignControlFragmentKey(conditionKey, mode, controlId) {
  return `control:${conditionKey}:${mode}:${controlId}`;
}

export function nativeDesignScenarioFragmentKey(
  conditionKey,
  mode,
  controlId,
  scenarioId,
) {
  return `scenario:${conditionKey}:${mode}:${controlId}:${scenarioId}`;
}

export function createNativeDesignPlan({
  conditions,
  contract,
  controlIds,
  diagnostic = false,
  selection = {},
}) {
  if (!Array.isArray(conditions) || !conditions.length) {
    throw new Error("native_verification_conditions_invalid");
  }
  if (!contract?.controls || Array.isArray(contract.controls)) {
    throw new Error("native_verification_contract_invalid");
  }
  const availableConditionKeys = uniqueStrings(
    conditions.map((condition) => condition?.key),
    "condition_keys",
  );
  const availableControlIds = uniqueStrings(controlIds, "control_ids");
  for (const controlId of availableControlIds) {
    if (!contract.controls[controlId]) {
      throw new Error(`native_verification_control_contract_missing:${controlId}`);
    }
  }
  const conditionKeys = selectedValues(
    selection.conditions,
    availableConditionKeys,
    "condition",
  );
  const modeKeys = selectedValues(selection.modes, nativeDesignModes, "mode");
  const selectedControlIds = selectedValues(
    selection.controls,
    availableControlIds,
    "control",
  );
  const fullPopulation = conditionKeys.length === availableConditionKeys.length
    && modeKeys.length === nativeDesignModes.length
    && selectedControlIds.length === availableControlIds.length;
  if (!fullPopulation && !diagnostic) {
    throw new Error("native_verification_filter_requires_diagnostic_mode");
  }

  const conditionByKey = new Map(conditions.map((condition) => [condition.key, condition]));
  const units = [];
  for (const conditionKey of conditionKeys) {
    const condition = conditionByKey.get(conditionKey);
    for (const mode of modeKeys) {
      if (Array.isArray(condition.modes) && !condition.modes.includes(mode)) {
        throw new Error(`native_verification_mode_not_covered:${conditionKey}:${mode}`);
      }
      const scenarios = [];
      for (const controlId of selectedControlIds) {
        const controlScenarios = contract.controls[controlId].acceptanceScenarios;
        if (!Array.isArray(controlScenarios) || ![2, 4].includes(controlScenarios.length)) {
          throw new Error(`native_verification_scenarios_incomplete:${controlId}`);
        }
        for (const scenario of controlScenarios) {
          if (!scenario?.id || typeof scenario.id !== "string") {
            throw new Error(`native_verification_scenario_id_invalid:${controlId}`);
          }
          scenarios.push({
            controlId,
            fragmentKey: nativeDesignScenarioFragmentKey(
              conditionKey,
              mode,
              controlId,
              scenario.id,
            ),
            scenario,
          });
        }
      }
      units.push({
        condition,
        conditionKey,
        controlIds: [...selectedControlIds],
        controlFragments: selectedControlIds.map((controlId) => ({
          controlId,
          fragmentKey: nativeDesignControlFragmentKey(conditionKey, mode, controlId),
        })),
        index: units.length,
        key: nativeDesignUnitKey(conditionKey, mode),
        mode,
        pageFragmentKey: nativeDesignPageFragmentKey(conditionKey, mode),
        scenarios,
        weight: 1 + selectedControlIds.length + scenarios.length,
      });
    }
  }
  if (!units.length) throw new Error("native_verification_plan_empty");
  return {
    conditionKeys,
    controlIds: selectedControlIds,
    diagnostic,
    expectedFragmentKeys: units.flatMap((unit) => [
      unit.pageFragmentKey,
      ...unit.controlFragments.map((entry) => entry.fragmentKey),
      ...unit.scenarios.map((entry) => entry.fragmentKey),
    ]),
    fullPopulation,
    modeKeys,
    units,
  };
}

export function partitionNativeDesignUnits(units, serials, maxWorkers = serials?.length) {
  if (!Array.isArray(units) || !units.length) throw new Error("native_verification_units_invalid");
  const availableSerials = uniqueStrings(serials, "serials");
  const requestedWorkers = Number(maxWorkers);
  if (!Number.isInteger(requestedWorkers) || requestedWorkers < 1) {
    throw new Error("native_verification_max_workers_invalid");
  }
  const workerCount = Math.min(requestedWorkers, availableSerials.length, units.length);
  const shards = availableSerials.slice(0, workerCount).map((serial) => ({
    serial,
    totalWeight: 0,
    units: [],
  }));
  const ordered = [...units].sort((left, right) =>
    right.weight - left.weight || left.index - right.index);
  for (const unit of ordered) {
    const target = [...shards].sort((left, right) =>
      left.totalWeight - right.totalWeight
      || availableSerials.indexOf(left.serial) - availableSerials.indexOf(right.serial))[0];
    target.units.push(unit);
    target.totalWeight += unit.weight;
  }
  for (const shard of shards) shard.units.sort((left, right) => left.index - right.index);
  return shards;
}

export function nativeVerificationFingerprint(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new Error("native_verification_identity_invalid");
  }
  return sha256({
    schema_version: nativeVerificationSessionSchema,
    ...identity,
  });
}

function encodeEvidence(value, seen = new Set()) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      $starward_type: "buffer",
      base64: Buffer.from(value).toString("base64"),
    };
  }
  if (value instanceof Map) {
    return {
      $starward_type: "map",
      entries: [...value.entries()]
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
        .map(([key, entry]) => [key, encodeEvidence(entry, seen)]),
    };
  }
  if (Array.isArray(value)) return value.map((entry) => encodeEvidence(entry, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) throw new Error("native_verification_evidence_cycle");
    seen.add(value);
    const encoded = Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, encodeEvidence(value[key], seen)]),
    );
    seen.delete(value);
    return encoded;
  }
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new Error("native_verification_evidence_value_unsupported");
  }
  return value;
}

function decodeEvidence(value) {
  if (Array.isArray(value)) return value.map((entry) => decodeEvidence(entry));
  if (value && typeof value === "object") {
    if (value.$starward_type === "buffer") {
      if (typeof value.base64 !== "string") {
        throw new Error("native_verification_buffer_invalid");
      }
      return Buffer.from(value.base64, "base64");
    }
    if (value.$starward_type === "map") {
      if (!Array.isArray(value.entries)) throw new Error("native_verification_map_invalid");
      return new Map(value.entries.map(([key, entry]) => [key, decodeEvidence(entry)]));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, decodeEvidence(entry)]),
    );
  }
  return value;
}

export function encodeNativeVerificationEvidence(value) {
  return encodeEvidence(value);
}

export function decodeNativeVerificationEvidence(value) {
  return decodeEvidence(value);
}

function assertFragmentKey(key) {
  if (typeof key !== "string" || !key || key.length > 1_024 || /[\u0000-\u001f]/u.test(key)) {
    throw new Error("native_verification_fragment_key_invalid");
  }
  return key;
}

export class NativeVerificationCheckpointStore {
  constructor({ identity, root }) {
    if (!path.isAbsolute(root)) throw new Error("native_verification_checkpoint_root_not_absolute");
    this.root = path.normalize(root);
    this.fragmentsRoot = path.join(this.root, "fragments");
    this.identity = identity;
    this.identitySha256 = nativeVerificationFingerprint(identity);
    this.manifestPath = path.join(this.root, "session.json");
  }

  async initialize({ reuse = false } = {}) {
    await mkdir(this.fragmentsRoot, { recursive: true });
    let current = null;
    try {
      current = JSON.parse(await readFile(this.manifestPath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (current) {
      if (current.schema_version !== nativeVerificationSessionSchema
        || current.identity_sha256 !== this.identitySha256) {
        throw new Error("native_verification_checkpoint_identity_mismatch");
      }
      if (!reuse) throw new Error("native_verification_checkpoint_reuse_not_enabled");
      return { created: false, identitySha256: this.identitySha256 };
    }
    const manifest = {
      schema_version: nativeVerificationSessionSchema,
      created_at: new Date().toISOString(),
      identity: this.identity,
      identity_sha256: this.identitySha256,
    };
    await this.#atomicWrite(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { created: true, identitySha256: this.identitySha256 };
  }

  async #atomicWrite(target, content) {
    const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
    await writeFile(temporary, content, "utf8");
    await rename(temporary, target);
  }

  #fragmentPath(key) {
    return path.join(this.fragmentsRoot, `${sha256(assertFragmentKey(key))}.json`);
  }

  async read(key) {
    const fragmentPath = this.#fragmentPath(key);
    let fragment;
    try {
      fragment = JSON.parse(await readFile(fragmentPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    if (fragment.schema_version !== nativeVerificationFragmentSchema
      || fragment.identity_sha256 !== this.identitySha256
      || fragment.key !== key
      || fragment.payload_sha256 !== sha256(fragment.payload)) {
      throw new Error(`native_verification_checkpoint_fragment_invalid:${key}`);
    }
    return {
      attribution: fragment.attribution,
      completedAt: fragment.completed_at,
      value: decodeEvidence(fragment.payload),
    };
  }

  async write(key, value, attribution) {
    assertFragmentKey(key);
    if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) {
      throw new Error(`native_verification_fragment_attribution_invalid:${key}`);
    }
    const payload = encodeEvidence(value);
    const fragment = {
      schema_version: nativeVerificationFragmentSchema,
      attribution,
      completed_at: new Date().toISOString(),
      identity_sha256: this.identitySha256,
      key,
      payload,
      payload_sha256: sha256(payload),
    };
    await this.#atomicWrite(
      this.#fragmentPath(key),
      `${JSON.stringify(fragment)}\n`,
    );
    return { key, payloadSha256: fragment.payload_sha256 };
  }

  async keys() {
    const keys = [];
    for (const entry of await readdir(this.fragmentsRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const fragment = JSON.parse(await readFile(path.join(this.fragmentsRoot, entry.name), "utf8"));
      if (fragment.identity_sha256 !== this.identitySha256 || typeof fragment.key !== "string") {
        throw new Error(`native_verification_checkpoint_fragment_foreign:${entry.name}`);
      }
      keys.push(fragment.key);
    }
    return keys.sort();
  }
}

export function assertCompleteNativeDesignPopulation(plan, observedKeys) {
  const observed = Array.isArray(observedKeys)
    ? observedKeys
    : observedKeys instanceof Map || observedKeys instanceof Set
      ? [...observedKeys.keys()]
      : null;
  if (!observed) throw new Error("native_verification_observed_population_invalid");
  if (new Set(observed).size !== observed.length) {
    throw new Error("native_verification_observed_population_duplicate");
  }
  const expected = [...plan.expectedFragmentKeys].sort();
  const actual = [...observed].sort();
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));
  if (missing.length || extra.length) {
    throw new Error(
      `native_verification_population_mismatch:missing=${missing.join(",")}:extra=${extra.join(",")}`,
    );
  }
  return {
    controlFragments: plan.units.reduce((count, unit) => count + unit.controlFragments.length, 0),
    fragments: expected.length,
    pageFragments: plan.units.length,
    scenarioFragments: plan.units.reduce((count, unit) => count + unit.scenarios.length, 0),
    units: plan.units.length,
  };
}

export function nativeCheckpointReuseAllowed({ executionScope, resume }) {
  if (!resume) return false;
  if (executionScope === "final-gate") {
    throw new Error("native_verification_final_gate_checkpoint_reuse_forbidden");
  }
  if (!["diagnostic", "repair", "stage-candidate"].includes(executionScope)) {
    throw new Error(`native_verification_execution_scope_invalid:${executionScope}`);
  }
  return true;
}
