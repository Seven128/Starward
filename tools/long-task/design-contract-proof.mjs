import { createHash } from "node:crypto";

const DESIGN_METHODS = Object.freeze([
  "accessibility_semantics",
  "asset_integrity",
  "component_state",
  "content",
  "design_token",
  "input_method",
  "interaction_trace",
  "layout_geometry",
  "motion_timeline",
  "responsive_reflow",
  "visual_pixel",
]);

const METHOD_WITNESS_SOURCE = "production-bound-design-section";
const PROFILE_WITNESS_SOURCE = "production-bound-design-profile";

const METHOD_CORROBORATION = Object.freeze({
  accessibility_semantics: "accessibility-tree",
  asset_integrity: "runtime-asset-identity",
  component_state: "state-delta",
  content: "rendered-text",
  design_token: "raster-or-computed-style",
  input_method: "input-activation",
  interaction_trace: "ordered-action-trace",
  layout_geometry: "target-bounds",
  motion_timeline: "frame-trace",
  responsive_reflow: "viewport-bounds",
  visual_pixel: "actual-target-pixel-comparison",
});

const PROFILE_SPECS = Object.freeze({
  mobile: {
    rootKeys: [
      "componentFamilies",
      "controls",
      "hapticRecipes",
      "highRiskFlows",
      "iconRegistry",
      "meta",
      "motionRecipes",
      "pageAssemblyContracts",
      "stateSemantics",
      "tokenDictionary",
      "traceability",
      "verification",
    ],
    sectionMethods: {
      acceptanceScenarios: ["component_state", "interaction_trace"],
      accessibility: ["accessibility_semantics", "input_method"],
      assets: ["asset_integrity"],
      component: ["component_state", "interaction_trace"],
      contentLocalization: ["content"],
      dataPrivacySafety: ["content", "interaction_trace"],
      haptics: ["motion_timeline", "interaction_trace"],
      identity: ["content", "interaction_trace"],
      interactionStateMachine: ["component_state", "interaction_trace"],
      motion: ["motion_timeline"],
      observabilityPerformance: ["interaction_trace", "motion_timeline"],
      platformAndSystem: ["input_method", "interaction_trace", "responsive_reflow"],
      states: ["component_state"],
      unresolved: [],
      visual: ["design_token", "layout_geometry", "responsive_reflow", "visual_pixel"],
    },
    rootSectionMethods: {
      meta: [],
      tokenDictionary: ["design_token", "visual_pixel"],
      iconRegistry: ["asset_integrity", "design_token", "visual_pixel"],
      componentFamilies: ["component_state", "input_method", "interaction_trace"],
      stateSemantics: ["accessibility_semantics", "component_state", "content"],
      motionRecipes: ["motion_timeline"],
      hapticRecipes: ["input_method", "interaction_trace", "motion_timeline"],
      pageAssemblyContracts: [
        "accessibility_semantics",
        "component_state",
        "content",
        "input_method",
        "interaction_trace",
        "layout_geometry",
        "responsive_reflow",
        "visual_pixel",
      ],
      highRiskFlows: ["component_state", "interaction_trace"],
      traceability: [],
      verification: [],
    },
  },
  ops: {
    rootKeys: [
      "artifact",
      "authorityModel",
      "componentFamilies",
      "controls",
      "pageAssemblyContracts",
      "schemaVersion",
      "tokenDictionary",
      "traceability",
      "verification",
    ],
    sectionMethods: {
      acceptanceScenarios: ["component_state", "interaction_trace"],
      accessibility: ["accessibility_semantics", "input_method"],
      assets: ["asset_integrity"],
      component: ["component_state", "interaction_trace"],
      contentLocalization: ["content"],
      contractKey: ["component_state"],
      dataPermissionPrivacySafety: ["content", "interaction_trace"],
      identity: ["content", "interaction_trace"],
      interactionStateMachine: ["component_state", "interaction_trace"],
      motion: ["motion_timeline"],
      navigationSystemIntegration: ["input_method", "interaction_trace", "responsive_reflow"],
      observabilityPerformance: ["interaction_trace", "motion_timeline"],
      ownershipVersion: ["component_state"],
      platform: ["input_method", "responsive_reflow"],
      states: ["component_state"],
      visual: ["design_token", "layout_geometry", "responsive_reflow", "visual_pixel"],
    },
    rootSectionMethods: {
      schemaVersion: [],
      artifact: [],
      authorityModel: [],
      tokenDictionary: ["design_token", "visual_pixel"],
      componentFamilies: ["component_state", "input_method", "interaction_trace"],
      pageAssemblyContracts: [
        "accessibility_semantics",
        "component_state",
        "content",
        "input_method",
        "interaction_trace",
        "layout_geometry",
        "responsive_reflow",
        "visual_pixel",
      ],
      traceability: [],
      verification: [],
    },
  },
});

const EXPECTED_PROFILE_COUNTS = Object.freeze({
  mobile: {
    controlCount: 83,
    controlFieldCount: 62_347,
    fieldCount: 67_537,
    pageAssemblyCount: 12,
    rootFieldCount: 5_190,
    runtimeFieldCount: 59_406,
    unresolvedBlockerCount: 10,
  },
  ops: {
    controlCount: 12,
    controlFieldCount: 5_962,
    fieldCount: 7_043,
    pageAssemblyCount: 7,
    rootFieldCount: 1_081,
    runtimeFieldCount: 6_049,
    unresolvedBlockerCount: 0,
  },
});

const PROVENANCE_POINTER_PATTERNS = Object.freeze({
  mobile: [
    /^\/identity\/(?:atlasLocator|candidateStatus|prototypeLocator|selectionStatus|sourceHashVersion|specimenKey)(?:\/|$)/u,
    /^\/unresolved(?:\/|$)/u,
  ],
  ops: [
    /^\/identity\/(?:atlasLocator|prototypeLocator|specimenKey)(?:\/|$)/u,
    /^\/ownershipVersion\/(?:notApplicablePolicy|resourceHashScope|resourceVersion|status|unresolvedDecisions|upstream)(?:\/|$)/u,
  ],
});

function profileSpec(profile) {
  const spec = PROFILE_SPECS[profile];
  if (!spec) throw new Error(`design_contract_profile_unknown:${profile}`);
  return spec;
}

function pointerEscape(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPointer(parent, key) {
  return `${parent}/${pointerEscape(key)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameValue(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function enumerateLeaves(value, pointer = "", inheritedNotApplicable = false) {
  const currentNotApplicable = inheritedNotApplicable || Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && (value.notApplicable === true || value.status === "not-applicable"),
  );
  if (Array.isArray(value)) {
    const leaves = [{
      pointer: childPointer(pointer, "$length"),
      value: value.length,
      notApplicable: currentNotApplicable,
    }];
    value.forEach((item, index) => leaves.push(...enumerateLeaves(
      item,
      childPointer(pointer, index),
      currentNotApplicable,
    )));
    return leaves;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) {
      return [{
        pointer: childPointer(pointer, "$empty"),
        value: true,
        notApplicable: currentNotApplicable,
      }];
    }
    return keys.flatMap((key) => enumerateLeaves(value[key], childPointer(pointer, key), currentNotApplicable));
  }
  return [{ pointer, value, notApplicable: currentNotApplicable }];
}

function isProvenancePointer(profile, pointer) {
  return PROVENANCE_POINTER_PATTERNS[profile].some((pattern) => pattern.test(pointer));
}

function isNotApplicableReason(pointer, notApplicable) {
  return notApplicable && /\/(?:reason|visualDelta|semanticDelta|allowedActions|entryConditions?|exitConditions?)\b/u.test(pointer);
}

function contractControlId(profile, control) {
  const id = control?.identity?.stableControlId
    ?? (profile === "ops" ? String(control?.contractKey ?? "").replace(/^control\./u, "") : null);
  if (!id || !/^[a-z0-9-]+$/u.test(id)) throw new Error(`design_contract_control_id_invalid:${profile}`);
  return id;
}

function controlsById(profile, contract) {
  const values = Array.isArray(contract?.controls)
    ? contract.controls
    : Object.values(contract?.controls ?? {});
  const result = new Map();
  for (const control of values) {
    const id = contractControlId(profile, control);
    if (result.has(id)) throw new Error(`design_contract_control_duplicate:${profile}:${id}`);
    result.set(id, control);
  }
  if (!result.size) throw new Error(`design_contract_controls_empty:${profile}`);
  return result;
}

function validateRootShape(profile, contract) {
  const spec = profileSpec(profile);
  const actual = Object.keys(contract ?? {}).sort();
  const expected = [...spec.rootKeys].sort();
  if (!sameValue(actual, expected)) {
    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));
    throw new Error(`design_contract_root_shape_changed:${profile}:missing=${missing.join(",")}:extra=${extra.join(",")}`);
  }
  if (!Array.isArray(contract.pageAssemblyContracts) || !contract.pageAssemblyContracts.length) {
    throw new Error(`design_contract_page_assemblies_missing:${profile}`);
  }
  const plannedRoots = Object.keys(spec.rootSectionMethods).sort();
  const expectedPlannedRoots = spec.rootKeys.filter((key) => key !== "controls").sort();
  if (!sameValue(plannedRoots, expectedPlannedRoots)) {
    throw new Error(`design_contract_root_field_routing_changed:${profile}`);
  }
}

function validateControlShape(profile, controlId, control) {
  const spec = profileSpec(profile);
  const actual = Object.keys(control).sort();
  const expected = Object.keys(spec.sectionMethods).sort();
  if (!sameValue(actual, expected)) {
    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));
    throw new Error(`design_contract_control_shape_changed:${profile}:${controlId}:missing=${missing.join(",")}:extra=${extra.join(",")}`);
  }
  if (profile === "mobile") {
    if (!Array.isArray(control.unresolved)) throw new Error(`design_contract_control_unresolved_invalid:${controlId}`);
    for (const blocker of control.unresolved) {
      if (!blocker?.id || !blocker.item || !blocker.owner || blocker.blocksNativeAcceptance !== true) {
        throw new Error(`design_contract_control_blocker_invalid:${controlId}`);
      }
    }
  }
}

function validatePageAssemblies(profile, contract, controls) {
  const observed = new Set();
  for (const assembly of contract.pageAssemblyContracts) {
    const ids = profile === "mobile"
      ? (assembly.controlComposition ?? []).map((item) => item.stableControlId)
      : assembly.stableControls ?? [];
    const auxiliary = profile === "ops" ? assembly.auxiliaryControls ?? [] : [];
    if ((!ids.length && !auxiliary.length) || new Set([...ids, ...auxiliary]).size !== ids.length + auxiliary.length) {
      throw new Error(`design_contract_page_assembly_invalid:${profile}:${assembly.outcome ?? assembly.workspaceId ?? "unknown"}`);
    }
    for (const id of ids) {
      if (!controls.has(id)) throw new Error(`design_contract_page_control_unknown:${profile}:${id}`);
      observed.add(id);
    }
    const declaredOrder = profile === "mobile"
      ? (assembly.controlComposition ?? []).map((item) => item.order)
      : assembly.compositionOrder?.map((id) => ids.indexOf(id) + 1);
    if (declaredOrder?.some((order, index) => order !== index + 1)) {
      throw new Error(`design_contract_page_order_invalid:${profile}:${assembly.outcome ?? assembly.workspaceId ?? "unknown"}`);
    }
  }
  const missing = [...controls.keys()].filter((id) => !observed.has(id));
  if (missing.length) throw new Error(`design_contract_page_control_unbound:${profile}:${missing.join(",")}`);
}

function resolveDesignReference(contract, root, suffix) {
  const value = contract[root];
  if (value === undefined) return false;
  if (value && typeof value === "object" && !Array.isArray(value)
    && Object.prototype.hasOwnProperty.call(value, suffix)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => [entry?.id, entry?.key, entry?.name].includes(suffix));
  }
  let current = value;
  for (const segment of suffix.split(".")) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }
    current = current[segment];
  }
  return true;
}

export function assertDesignReferenceClosure(profile, contract) {
  const roots = [
    "componentFamilies",
    "hapticRecipes",
    "iconRegistry",
    "motionRecipes",
    "stateSemantics",
    "tokenDictionary",
  ].filter((root) => contract[root] !== undefined);
  const leaves = enumerateLeaves(contract);
  let referenceCount = 0;
  for (const leaf of leaves) {
    if (typeof leaf.value !== "string") continue;
    const references = [...leaf.value.matchAll(
      /\b(componentFamilies|hapticRecipes|iconRegistry|motionRecipes|stateSemantics|tokenDictionary)\.([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\b/gu,
    )];
    for (const match of references) {
      referenceCount += 1;
      if (!roots.includes(match[1]) || !resolveDesignReference(contract, match[1], match[2])) {
        throw new Error(`design_contract_reference_unresolved:${profile}:${leaf.pointer}:${match[0]}`);
      }
    }
    if (profile === "ops" && /\/[^/]*token(?:id|refs?)(?:\/|$)/iu.test(leaf.pointer)) {
      referenceCount += 1;
      if (!resolveDesignReference(contract, "tokenDictionary", leaf.value)) {
        throw new Error(`design_contract_token_reference_unresolved:${profile}:${leaf.pointer}:${leaf.value}`);
      }
    }
  }
  for (const control of controlsById(profile, contract).values()) {
    const family = control.component?.componentFamily;
    if (!family || !resolveDesignReference(contract, "componentFamilies", family)) {
      throw new Error(`design_contract_component_family_unresolved:${profile}:${family ?? "missing"}`);
    }
    referenceCount += 1;
  }
  if (!referenceCount) throw new Error(`design_contract_reference_population_empty:${profile}`);
  return referenceCount;
}

export function exactControlFieldPlan(profile, control) {
  const spec = profileSpec(profile);
  const controlId = contractControlId(profile, control);
  validateControlShape(profile, controlId, control);
  const plan = [];
  for (const [section, methods] of Object.entries(spec.sectionMethods)) {
    for (const leaf of enumerateLeaves(control[section], `/${pointerEscape(section)}`)) {
      const provenance = isProvenancePointer(profile, leaf.pointer)
        || isNotApplicableReason(leaf.pointer, leaf.notApplicable);
      const effectiveMethods = provenance ? [] : methods;
      if (!provenance && !effectiveMethods.length) {
        throw new Error(`design_contract_field_unrouted:${profile}:${controlId}:${leaf.pointer}`);
      }
      for (const method of effectiveMethods) {
        if (!DESIGN_METHODS.includes(method)) {
          throw new Error(`design_contract_method_unknown:${profile}:${controlId}:${method}`);
        }
      }
      plan.push({
        controlId,
        methods: [...effectiveMethods],
        notApplicable: leaf.notApplicable,
        pointer: leaf.pointer,
        runtimeRequired: !provenance,
        value: leaf.value,
      });
    }
  }
  if (!plan.length) throw new Error(`design_contract_field_plan_empty:${profile}:${controlId}`);
  return plan;
}

export function exactProfileFieldPlan(profile, contract) {
  validateRootShape(profile, contract);
  const spec = profileSpec(profile);
  const plan = [];
  for (const [section, methods] of Object.entries(spec.rootSectionMethods)) {
    for (const method of methods) {
      if (!DESIGN_METHODS.includes(method)) {
        throw new Error(`design_contract_profile_method_unknown:${profile}:${section}:${method}`);
      }
    }
    for (const leaf of enumerateLeaves(contract[section], `/${pointerEscape(section)}`)) {
      plan.push({
        methods: [...methods],
        notApplicable: leaf.notApplicable,
        pointer: leaf.pointer,
        profile,
        runtimeRequired: methods.length > 0,
        section,
        value: leaf.value,
      });
    }
  }
  if (!plan.length) throw new Error(`design_contract_profile_field_plan_empty:${profile}`);
  return plan;
}

export function assertExactContractPopulation(profile, contract, expectedControlIds = null) {
  validateRootShape(profile, contract);
  const controls = controlsById(profile, contract);
  const referenceCount = assertDesignReferenceClosure(profile, contract);
  if (expectedControlIds) {
    const expected = [...expectedControlIds].sort();
    const actual = [...controls.keys()].sort();
    if (!sameValue(actual, expected)) {
      const missing = expected.filter((id) => !actual.includes(id));
      const extra = actual.filter((id) => !expected.includes(id));
      throw new Error(`design_contract_control_population_mismatch:${profile}:missing=${missing.join(",")}:extra=${extra.join(",")}`);
    }
  }
  validatePageAssemblies(profile, contract, controls);
  const methodCounts = Object.fromEntries(DESIGN_METHODS.map((method) => [method, 0]));
  let controlFieldCount = 0;
  let controlRuntimeFieldCount = 0;
  let unresolvedBlockerCount = 0;
  for (const [controlId, control] of controls) {
    const plan = exactControlFieldPlan(profile, control);
    controlFieldCount += plan.length;
    controlRuntimeFieldCount += plan.filter((entry) => entry.runtimeRequired).length;
    unresolvedBlockerCount += Array.isArray(control.unresolved) ? control.unresolved.length : 0;
    for (const entry of plan) {
      for (const method of entry.methods) methodCounts[method] += 1;
    }
    if (!plan.some((entry) => entry.pointer.endsWith("/acceptanceScenarios/$length") && entry.value >= 2)) {
      throw new Error(`design_contract_acceptance_scenarios_incomplete:${profile}:${controlId}`);
    }
  }
  const profilePlan = exactProfileFieldPlan(profile, contract);
  for (const entry of profilePlan) {
    for (const method of entry.methods) methodCounts[method] += 1;
  }
  const rootFieldCount = profilePlan.length;
  const rootRuntimeFieldCount = profilePlan.filter((entry) => entry.runtimeRequired).length;
  for (const [method, count] of Object.entries(methodCounts)) {
    if (count === 0) throw new Error(`design_contract_method_population_empty:${profile}:${method}`);
  }
  const summary = {
    controlCount: controls.size,
    controlFieldCount,
    controlRuntimeFieldCount,
    controls,
    fieldCount: controlFieldCount + rootFieldCount,
    methodCounts,
    pageAssemblyCount: contract.pageAssemblyContracts.length,
    profilePlan,
    referenceCount,
    rootFieldCount,
    rootRuntimeFieldCount,
    runtimeFieldCount: controlRuntimeFieldCount + rootRuntimeFieldCount,
    unresolvedBlockerCount,
  };
  for (const [key, expected] of Object.entries(EXPECTED_PROFILE_COUNTS[profile])) {
    if (summary[key] !== expected) {
      throw new Error(`design_contract_profile_count_changed:${profile}:${key}:${summary[key]}:${expected}`);
    }
  }
  return summary;
}

function requireWitnessContext(record, context) {
  for (const key of ["condition_key", "control_id", "mode", "outcome", "sample_id", "session_id"]) {
    const expected = context[key];
    if (expected !== undefined && record[key] !== expected) {
      throw new Error(`design_runtime_witness_context_mismatch:${context.control_id}:${context.method}:${key}`);
    }
  }
  if (record.schema_version !== "starward-design-section-witness-v1") {
    throw new Error(`design_runtime_witness_schema_invalid:${context.control_id}:${context.method}`);
  }
  if (!["production-component", "production-state-owner"].includes(record.origin)) {
    throw new Error(`design_runtime_witness_origin_invalid:${context.control_id}:${context.method}`);
  }
}

export function assertExactRuntimeFieldWitnesses({
  corroboration,
  control,
  method,
  profile,
  records,
  ...context
}) {
  if (!DESIGN_METHODS.includes(method)) throw new Error(`design_runtime_witness_method_unknown:${method}`);
  if (corroboration !== METHOD_CORROBORATION[method]) {
    throw new Error(`design_runtime_witness_corroboration_missing:${context.control_id}:${method}`);
  }
  const expected = exactControlFieldPlan(profile, control)
    .filter((entry) => entry.runtimeRequired && entry.methods.includes(method));
  const expectedSections = [...new Set(expected.map((entry) => entry.pointer.split("/")[1]))].sort();
  const matching = records.filter((record) =>
    record.control_id === context.control_id
    && Array.isArray(record.methods)
    && record.methods.includes(method)
    && (context.condition_key === undefined || record.condition_key === context.condition_key)
    && (context.mode === undefined || record.mode === context.mode)
    && (context.outcome === undefined || record.outcome === context.outcome)
    && (context.sample_id === undefined || record.sample_id === context.sample_id)
    && (context.session_id === undefined || record.session_id === context.session_id));
  const observed = new Map();
  for (const record of matching) {
    requireWitnessContext(record, { ...context, method });
    if (!record.section || observed.has(record.section)) {
      throw new Error(`design_runtime_witness_duplicate:${context.control_id}:${method}:${record.section ?? "missing"}`);
    }
    if (record.source !== METHOD_WITNESS_SOURCE) {
      throw new Error(`design_runtime_witness_source_invalid:${context.control_id}:${method}:${record.section}`);
    }
    const declaredMethods = profileSpec(profile).sectionMethods[record.section];
    if (!declaredMethods || !sameValue([...record.methods].sort(), [...declaredMethods].sort())) {
      throw new Error(`design_runtime_witness_methods_mismatch:${context.control_id}:${method}:${record.section}`);
    }
    observed.set(record.section, record.value);
  }
  for (const section of expectedSections) {
    if (!observed.has(section)) {
      throw new Error(`design_runtime_witness_missing:${context.control_id}:${method}:${section}`);
    }
    if (!sameValue(observed.get(section), control[section])) {
      throw new Error(`design_runtime_witness_value_mismatch:${context.control_id}:${method}:${section}`);
    }
  }
  const expectedSet = new Set(expectedSections);
  const extras = [...observed.keys()].filter((section) => !expectedSet.has(section));
  if (extras.length) throw new Error(`design_runtime_witness_extra:${context.control_id}:${method}:${extras[0]}`);
  return { fieldCount: expected.length, sectionCount: expectedSections.length };
}

export function assertExactRuntimeProfileWitnesses({
  contract,
  corroboration,
  method,
  profile,
  records,
  ...context
}) {
  if (!DESIGN_METHODS.includes(method)) throw new Error(`design_runtime_profile_method_unknown:${method}`);
  if (corroboration !== METHOD_CORROBORATION[method]) {
    throw new Error(`design_runtime_profile_corroboration_missing:${profile}:${method}`);
  }
  const expected = exactProfileFieldPlan(profile, contract)
    .filter((entry) => entry.runtimeRequired && entry.methods.includes(method));
  const expectedSections = [...new Set(expected.map((entry) => entry.section))].sort();
  const matching = records.filter((record) =>
    record.profile === profile
    && Array.isArray(record.methods)
    && record.methods.includes(method)
    && (context.condition_key === undefined || record.condition_key === context.condition_key)
    && (context.mode === undefined || record.mode === context.mode)
    && (context.outcome === undefined || record.outcome === context.outcome)
    && (context.sample_id === undefined || record.sample_id === context.sample_id)
    && (context.session_id === undefined || record.session_id === context.session_id));
  const observed = new Map();
  for (const record of matching) {
    if (record.schema_version !== "starward-design-profile-section-witness-v1") {
      throw new Error(`design_runtime_profile_witness_schema_invalid:${profile}:${method}`);
    }
    if (!["production-root", "production-screen-owner"].includes(record.origin)) {
      throw new Error(`design_runtime_profile_witness_origin_invalid:${profile}:${method}`);
    }
    for (const key of ["condition_key", "mode", "outcome", "sample_id", "session_id"]) {
      if (context[key] !== undefined && record[key] !== context[key]) {
        throw new Error(`design_runtime_profile_witness_context_mismatch:${profile}:${method}:${key}`);
      }
    }
    if (!record.section || observed.has(record.section)) {
      throw new Error(`design_runtime_profile_witness_duplicate:${profile}:${method}:${record.section ?? "missing"}`);
    }
    if (record.source !== PROFILE_WITNESS_SOURCE) {
      throw new Error(`design_runtime_profile_witness_source_invalid:${profile}:${method}:${record.section}`);
    }
    const declaredMethods = profileSpec(profile).rootSectionMethods[record.section];
    if (!declaredMethods || !sameValue([...record.methods].sort(), [...declaredMethods].sort())) {
      throw new Error(`design_runtime_profile_witness_methods_mismatch:${profile}:${method}:${record.section}`);
    }
    observed.set(record.section, record.value);
  }
  for (const section of expectedSections) {
    if (!observed.has(section)) {
      throw new Error(`design_runtime_profile_witness_missing:${profile}:${method}:${section}`);
    }
    if (!sameValue(observed.get(section), contract[section])) {
      throw new Error(`design_runtime_profile_witness_value_mismatch:${profile}:${method}:${section}`);
    }
  }
  const expectedSet = new Set(expectedSections);
  const extras = [...observed.keys()].filter((section) => !expectedSet.has(section));
  if (extras.length) throw new Error(`design_runtime_profile_witness_extra:${profile}:${method}:${extras[0]}`);
  return { fieldCount: expected.length, sectionCount: expectedSections.length };
}

function parseWitnessRecord(payload) {
  let record;
  try {
    record = JSON.parse(payload);
  } catch {
    throw new Error("design_runtime_witness_json_invalid");
  }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("design_runtime_witness_record_invalid");
  }
  return record;
}

export function parseDesignFieldWitnessLog(output) {
  const records = [];
  const chunkGroups = new Map();
  for (const line of String(output ?? "").split(/\r?\n/u)) {
    const chunkMarker = "STARWARD_DESIGN_FIELD_CHUNK ";
    const chunkIndex = line.indexOf(chunkMarker);
    if (chunkIndex >= 0) {
      const chunk = parseWitnessRecord(line.slice(chunkIndex + chunkMarker.length));
      if (chunk.schema_version !== "starward-design-section-witness-chunk-v1"
        || typeof chunk.group_id !== "string"
        || !/^[A-Za-z0-9._:-]{1,240}$/u.test(chunk.group_id)
        || !Number.isInteger(chunk.chunk_index)
        || !Number.isInteger(chunk.chunk_count)
        || chunk.chunk_index < 0
        || chunk.chunk_count < 1
        || chunk.chunk_count > 4_096
        || chunk.chunk_index >= chunk.chunk_count
        || typeof chunk.payload_base64url !== "string"
        || chunk.payload_base64url.length < 1
        || chunk.payload_base64url.length > 3_000
        || !/^[A-Za-z0-9_-]+$/u.test(chunk.payload_base64url)
        || !/^[a-f0-9]{64}$/u.test(chunk.payload_sha256 ?? "")) {
        throw new Error("design_runtime_witness_chunk_invalid");
      }
      const group = chunkGroups.get(chunk.group_id) ?? {
        chunks: new Map(),
        count: chunk.chunk_count,
        sha256: chunk.payload_sha256,
      };
      if (group.count !== chunk.chunk_count || group.sha256 !== chunk.payload_sha256
        || group.chunks.has(chunk.chunk_index)) {
        throw new Error(`design_runtime_witness_chunk_conflict:${chunk.group_id}`);
      }
      group.chunks.set(chunk.chunk_index, chunk.payload_base64url);
      chunkGroups.set(chunk.group_id, group);
      continue;
    }
    const marker = "STARWARD_DESIGN_FIELD ";
    const index = line.indexOf(marker);
    if (index >= 0) records.push(parseWitnessRecord(line.slice(index + marker.length)));
  }
  const completeGroups = new Map();
  for (const [groupId, group] of chunkGroups) {
    if (group.chunks.size !== group.count) continue;
    const encoded = Array.from({ length: group.count }, (_, index) => {
      const value = group.chunks.get(index);
      if (!value) throw new Error(`design_runtime_witness_chunk_missing:${groupId}`);
      return value;
    }).join("");
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const digest = createHash("sha256").update(payload).digest("hex");
    if (digest !== group.sha256) {
      throw new Error(`design_runtime_witness_chunk_digest_mismatch:${groupId}`);
    }
    const key = `${group.count}:${group.sha256}`;
    const existing = completeGroups.get(key);
    if (existing && existing.payload !== payload) {
      throw new Error(`design_runtime_witness_chunk_conflict:${groupId}`);
    }
    if (!existing) completeGroups.set(key, { group, payload });
  }
  for (const [groupId, group] of chunkGroups) {
    if (group.chunks.size === group.count) continue;
    const complete = completeGroups.get(`${group.count}:${group.sha256}`);
    if (!complete) throw new Error(`design_runtime_witness_chunk_missing:${groupId}`);
    for (const [index, value] of group.chunks) {
      if (complete.group.chunks.get(index) !== value) {
        throw new Error(`design_runtime_witness_chunk_conflict:${groupId}`);
      }
    }
  }
  for (const { payload } of completeGroups.values()) {
    records.push(parseWitnessRecord(payload));
  }
  return records;
}

function scenarioTransitionExpectation(profile, control, scenario) {
  if (profile !== "mobile") return null;
  const ids = scenario.transitionIds;
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error(`design_scenario_transition_ids_missing:${scenario.id}`);
  }
  const transitions = control.interactionStateMachine?.transitions ?? [];
  const byId = new Map(transitions.map((transition) => [transition.id, transition]));
  const selected = ids.map((id) => {
    const transition = byId.get(id);
    if (!transition) throw new Error(`design_scenario_transition_unknown:${scenario.id}:${id}`);
    return transition;
  });
  return {
    event_names: selected.map((transition) => transition.event?.name ?? null),
    outputs: selected.map((transition) => transition.output ?? null),
    states: selected.map((transition) => transition.to ?? null),
    transition_ids: [...ids],
  };
}

function declaresStableDelta(value) {
  return /\b(?:unchanged|same|none)\b|不变|无变化|不改变/iu.test(String(value ?? ""));
}

export function assertScenarioTrace({ control, controlId, observed, profile, scenario, trace }) {
  if (trace?.schema_version !== "starward-design-scenario-trace-v1") {
    throw new Error(`design_scenario_trace_schema_invalid:${controlId}:${scenario.id}`);
  }
  if (trace.control_id !== controlId || trace.scenario_id !== scenario.id) {
    throw new Error(`design_scenario_trace_identity_mismatch:${controlId}:${scenario.id}`);
  }
  if (trace.origin !== "production-state-owner" || trace.journey_origin !== "production-root") {
    throw new Error(`design_scenario_trace_origin_invalid:${controlId}:${scenario.id}`);
  }
  for (const [key, expected] of [
    ["given", scenario.given],
    ["when", scenario.when],
    ["then", scenario.then],
  ]) {
    if (trace[key] !== expected) throw new Error(`design_scenario_trace_${key}_mismatch:${controlId}:${scenario.id}`);
  }
  for (const key of ["given_satisfied", "when_executed", "then_observed"]) {
    if (trace[key] !== true) throw new Error(`design_scenario_trace_${key}_false:${controlId}:${scenario.id}`);
  }
  if (!trace.before_state_sha256 || !trace.after_state_sha256
    || trace.before_state_sha256 === trace.after_state_sha256) {
    throw new Error(`design_scenario_trace_state_delta_missing:${controlId}:${scenario.id}`);
  }
  if (observed?.visual_observed !== true || observed?.semantic_observed !== true
    || observed?.production_root !== true) {
    throw new Error(`design_scenario_trace_independent_observation_missing:${controlId}:${scenario.id}`);
  }
  const expectedTransitions = scenarioTransitionExpectation(profile, control, scenario);
  if (expectedTransitions) {
    for (const [key, expected] of Object.entries(expectedTransitions)) {
      if (!sameValue(trace[key], expected)) {
        throw new Error(`design_scenario_trace_${key}_mismatch:${controlId}:${scenario.id}`);
      }
    }
  } else if (!Array.isArray(trace.transition_trace) || !trace.transition_trace.length) {
    throw new Error(`design_scenario_trace_transition_missing:${controlId}:${scenario.id}`);
  }
  if (!Number.isInteger(trace.commit_count) || trace.commit_count < 0 || trace.commit_count > 1) {
    throw new Error(`design_scenario_trace_commit_count_invalid:${controlId}:${scenario.id}`);
  }
  return true;
}

export function applicableControlStates(profile, control) {
  const entries = profile === "mobile"
    ? Object.entries(control.states?.records ?? {})
    : Object.entries(control.states ?? {});
  if (!entries.length) throw new Error(`design_control_states_missing:${contractControlId(profile, control)}`);
  return entries.filter(([, state]) => profile === "mobile"
    ? state.applicable === true
    : state.status === "applicable");
}

export function assertStateTrace({ control, controlId, observed, profile, stateKey, trace }) {
  const state = profile === "mobile" ? control.states?.records?.[stateKey] : control.states?.[stateKey];
  const applicable = profile === "mobile" ? state?.applicable === true : state?.status === "applicable";
  if (!applicable) throw new Error(`design_state_trace_not_applicable:${controlId}:${stateKey}`);
  if (trace?.schema_version !== "starward-design-state-trace-v1"
    || trace.control_id !== controlId
    || trace.state !== stateKey) {
    throw new Error(`design_state_trace_identity_mismatch:${controlId}:${stateKey}`);
  }
  const expectedStateOwner = control.component?.stateOwner;
  const expectedEntry = state.entryConditions ?? state.entryCondition;
  const expectedExit = state.exitConditions ?? state.exitCondition;
  if (trace.origin !== "production-state-owner"
    || !expectedStateOwner
    || trace.state_owner !== expectedStateOwner
    || trace.entry_condition !== expectedEntry
    || trace.exit_condition !== expectedExit) {
    throw new Error(`design_state_trace_owner_lifecycle_mismatch:${controlId}:${stateKey}`);
  }
  if (trace.visual_delta !== state.visualDelta || trace.semantic_delta !== state.semanticDelta) {
    throw new Error(`design_state_trace_contract_mismatch:${controlId}:${stateKey}`);
  }
  if (!sameValue(trace.allowed_actions, state.allowedActions ?? [])) {
    throw new Error(`design_state_trace_actions_mismatch:${controlId}:${stateKey}`);
  }
  if (trace.entry_observed !== true || trace.exit_observed !== true) {
    throw new Error(`design_state_trace_lifecycle_missing:${controlId}:${stateKey}`);
  }
  if (observed?.visual_present !== true || observed?.semantic_present !== true
    || observed?.production_root !== true) {
    throw new Error(`design_state_trace_independent_observation_missing:${controlId}:${stateKey}`);
  }
  if (stateKey !== "default") {
    const expectedVisualKey = declaresStableDelta(state.visualDelta) ? "visual_stable" : "visual_changed";
    const expectedSemanticKey = declaresStableDelta(state.semanticDelta) ? "semantic_stable" : "semantic_changed";
    if (observed[expectedVisualKey] !== true || observed[expectedSemanticKey] !== true) {
      throw new Error(`design_state_trace_independent_delta_missing:${controlId}:${stateKey}`);
    }
  }
  if (stateKey !== "default") {
    if (!trace.before_state_sha256 || !trace.after_state_sha256
      || trace.before_state_sha256 === trace.after_state_sha256) {
      throw new Error(`design_state_trace_delta_missing:${controlId}:${stateKey}`);
    }
    if (trace.visual_observed !== true || trace.semantic_observed !== true) {
      throw new Error(`design_state_trace_observation_missing:${controlId}:${stateKey}`);
    }
  }
  return true;
}

export function parseStructuredEvidenceValue(value, expectedSchema) {
  const text = String(value ?? "").trim();
  let payload = text;
  if (payload.startsWith("base64url:")) {
    payload = Buffer.from(payload.slice("base64url:".length), "base64url").toString("utf8");
  }
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error(`design_structured_evidence_json_invalid:${expectedSchema}`);
  }
  if (parsed?.schema_version !== expectedSchema) {
    throw new Error(`design_structured_evidence_schema_invalid:${expectedSchema}`);
  }
  return parsed;
}

export function designWitnessCorroboration(method) {
  const value = METHOD_CORROBORATION[method];
  if (!value) throw new Error(`design_method_corroboration_unknown:${method}`);
  return value;
}

export function designWitnessSource(method) {
  if (!DESIGN_METHODS.includes(method)) throw new Error(`design_method_witness_source_unknown:${method}`);
  return METHOD_WITNESS_SOURCE;
}

export function designProfileWitnessSource(method) {
  if (!DESIGN_METHODS.includes(method)) throw new Error(`design_profile_witness_source_unknown:${method}`);
  return PROFILE_WITNESS_SOURCE;
}

export { DESIGN_METHODS };
