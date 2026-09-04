import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const packageRoot = path.join(
  root,
  "node_modules",
  "project-tiny-context-harness",
);
const checkOnly = process.argv.slice(2).includes("--check");
const expectedVersion = "0.11.0";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function occurrenceCount(value, needle) {
  return value.split(needle).length - 1;
}

function replaceExact(source, original, replacement, expectedOccurrences = 1) {
  const originalCount = occurrenceCount(source, original);
  if (originalCount !== expectedOccurrences) {
    throw new Error(
      `ty_context_harness_compatibility_transform_shape:${originalCount}:${expectedOccurrences}`,
    );
  }
  return source.split(original).join(replacement);
}

const DESIGN_IMPORTS = `import { canonicalApplicabilityIdentity, claimApplicabilityProfile } from "./long-task-applicability-identity.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
`;

const DESIGN_LOOKUP_IMPLEMENTATION = `export function findDesignFactObligation(contract, identity) {
    if (!identity || typeof identity !== "object" ||
        typeof identity.outcome_key !== "string" ||
        typeof identity.claim_ref !== "string" ||
        typeof identity.applicability_ref !== "string" ||
        typeof identity.fact_ref !== "string" ||
        typeof identity.proof_ref !== "string" ||
        typeof identity.method !== "string" ||
        typeof identity.proof_surface !== "string")
        return null;
    const sourceObligationRef = identity.source_obligation_ref ??
        identity.proof_ref;
    if (typeof sourceObligationRef !== "string" ||
        (identity.source_obligation_ref !== undefined &&
            identity.source_obligation_ref !== identity.proof_ref))
        return null;
    const capabilities = identity.evidence_capabilities ??
        identity.required_evidence_capabilities ??
        [];
    if (!validCapabilities(capabilities) ||
        (identity.evidence_capabilities !== undefined &&
            identity.required_evidence_capabilities !== undefined &&
            (!validCapabilities(identity.evidence_capabilities) ||
                !validCapabilities(identity.required_evidence_capabilities) ||
                !sameSet(identity.evidence_capabilities, identity.required_evidence_capabilities))))
        return null;
    const candidates = designFactObligationDescriptors(contract).filter((descriptor) => descriptor.source_obligation_ref === sourceObligationRef &&
        descriptor.outcome_key === identity.outcome_key &&
        descriptor.claim_ref === identity.claim_ref &&
        descriptor.applicability_ref === identity.applicability_ref &&
        descriptor.fact_ref === identity.fact_ref &&
        descriptor.method === identity.method &&
        descriptor.proof_surface === identity.proof_surface &&
        sameSet(descriptor.evidence_capabilities, capabilities) &&
        (identity.expected_authority_ref === undefined ||
            descriptor.expected_authority_ref === identity.expected_authority_ref));
    if (candidates.length === 1)
        return candidates[0];
    if (candidates.length > 1)
        return null;
    return compiledDesignFactObligation(contract, identity);
}
function compiledDesignFactObligation(contract, identity) {
    if (!contract || !Array.isArray(contract.outcomes) ||
        typeof identity.local_claim_ref !== "string" ||
        typeof identity.source_obligation_ref !== "string" ||
        identity.source_obligation_ref !== identity.proof_ref ||
        typeof identity.obligation_ref !== "string" ||
        typeof identity.confirmation_ref !== "string" ||
        typeof identity.target_ref !== "string" ||
        identity.authority !== "external_confirmation" ||
        typeof identity.expected_authority_ref !== "string" ||
        identity.expected_authority_ref !==
            "design-proof:" + identity.source_obligation_ref ||
        identity.required_polarity !== "positive" ||
        !isSha256Digest(identity.semantic_identity))
        return null;
    const capabilities = identity.evidence_capabilities ??
        identity.required_evidence_capabilities;
    if (!validCapabilities(capabilities) ||
        !validCapabilities(identity.required_evidence_capabilities) ||
        (identity.evidence_capabilities !== undefined &&
            !sameSet(identity.evidence_capabilities, identity.required_evidence_capabilities)))
        return null;
    const normalizedCapabilities = [...capabilities].sort();
    const outcomeCandidates = contract.outcomes.filter((candidate) => candidate &&
        candidate.key === identity.outcome_key);
    if (outcomeCandidates.length !== 1)
        return null;
    const outcome = outcomeCandidates[0];
    const applicabilityCandidates = outcome.applicability?.filter((candidate) => candidate &&
        candidate.key === identity.applicability_ref) ?? [];
    if (!Array.isArray(outcome.applicability) ||
        applicabilityCandidates.length !== 1 ||
        !outcome.acceptance || !Array.isArray(outcome.acceptance.checks))
        return null;
    const applicability = claimApplicabilityProfile(
        contract,
        identity.outcome_key,
        identity.applicability_ref,
    );
    if (!isApplicabilityProfile(applicability) ||
        applicability.target_ref !== identity.target_ref)
        return null;
    const confirmations = contract.global?.acceptance?.external_confirmations;
    if (!Array.isArray(confirmations))
        return null;
    const confirmationCandidates = confirmations.filter((confirmation) => confirmation &&
        confirmation.key === identity.confirmation_ref);
    if (confirmationCandidates.length !== 1)
        return null;
    const confirmation = confirmationCandidates[0];
    if (confirmation.blocks_target !== true ||
        confirmation.target_ref !== identity.target_ref ||
        !Array.isArray(confirmation.obligations))
        return null;
    const globalObligationCandidates = confirmations
        .flatMap((candidate) => Array.isArray(candidate?.obligations)
        ? candidate.obligations
        : [])
        .filter((obligation) => obligation &&
        obligation.key === identity.obligation_ref);
    const obligationCandidates = confirmation.obligations.filter((obligation) => obligation &&
        obligation.key === identity.obligation_ref);
    if (globalObligationCandidates.length !== 1 ||
        obligationCandidates.length !== 1)
        return null;
    const declaredObligation = obligationCandidates[0];
    if (declaredObligation.result_kind !== "actual" ||
        declaredObligation.judgment_basis !== undefined ||
        declaredObligation.claim_ref !== identity.claim_ref ||
        declaredObligation.applicability_ref !== identity.applicability_ref ||
        declaredObligation.fact_ref !== identity.fact_ref ||
        declaredObligation.proof_ref !== identity.proof_ref ||
        declaredObligation.method !== identity.method ||
        declaredObligation.proof_surface !== identity.proof_surface ||
        !validCapabilities(declaredObligation.evidence_capabilities) ||
        !sameSet(declaredObligation.evidence_capabilities, capabilities) ||
        declaredObligation.expected_authority_ref !== identity.expected_authority_ref ||
        !optionalExact(declaredObligation.confirmation_ref, confirmation.key) ||
        !optionalExact(declaredObligation.source_obligation_ref, identity.source_obligation_ref) ||
        !optionalExact(declaredObligation.local_claim_ref, identity.local_claim_ref) ||
        !optionalExact(declaredObligation.target_ref, identity.target_ref) ||
        !optionalExact(declaredObligation.required_polarity, identity.required_polarity) ||
        !optionalExact(declaredObligation.semantic_identity, identity.semantic_identity))
        return null;
    const candidates = [];
    for (const check of outcome.acceptance.checks) {
        if (!check || typeof check.key !== "string" ||
            typeof check.proof_surface !== "string" ||
            !Array.isArray(check.design_conformance_targets) ||
            !Array.isArray(check.observation_authorities))
            return null;
        for (const target of check.design_conformance_targets) {
            if (!target || typeof target.key !== "string" ||
                typeof target.conformance_assertion_ref !== "string" ||
                target.conformance_check_ref !== check.key ||
                typeof target.target_ref !== "string" ||
                !Array.isArray(target.claim_refs) ||
                !target.claim_refs.every((claimRef) => typeof claimRef === "string") ||
                !Array.isArray(target.verification_method_bindings) ||
                (target.symbolic_method_bindings !== undefined &&
                    !Array.isArray(target.symbolic_method_bindings)))
                return null;
            if ((target.symbolic_method_bindings ?? []).length > 0)
                return null;
            for (const binding of target.verification_method_bindings) {
                if (!binding || typeof binding.assertion_ref !== "string" ||
                    typeof binding.method !== "string" ||
                    !Array.isArray(binding.evidence_artifacts))
                    return null;
                for (const artifact of binding.evidence_artifacts) {
                    if (!artifact || typeof artifact.condition_key !== "string" ||
                        !Array.isArray(artifact.fact_expectations))
                        return null;
                    for (const expectation of artifact.fact_expectations) {
                        if (!validDesignExpectation(expectation))
                            return null;
                        const comparison = expectation.comparison;
                        const comparisonIdentity = {
                            comparator: comparison.comparator,
                            mode: comparison.mode,
                            parameters_sha256: comparison.parameters.sha256,
                            tolerance_sha256: comparison.tolerance?.sha256 ?? null,
                            mask_sha256: comparison.mask?.sha256 ?? null,
                        };
                        const sourceObligationRef = designGroundObligationRef(
                            target.key,
                            binding.method,
                            artifact.condition_key,
                            expectation.fact_ref,
                        );
                        if (sourceObligationRef !== identity.source_obligation_ref ||
                            target.target_ref !== identity.target_ref ||
                            check.proof_surface !== identity.proof_surface)
                            continue;
                        const expectedIdentity = sha256Hex(canonicalValueJson({
                            obligation_ref: sourceObligationRef,
                            fact_ref: expectation.fact_ref,
                            method: binding.method,
                            expected_value_sha256: expectation.expected.sha256,
                            comparison: comparisonIdentity,
                            actual_projection: "raw_exact",
                            carrier_refs: [],
                        }));
                        const observations = check.observation_authorities.filter((observation) => observation &&
                            observation.authority === "external_confirmation" &&
                            observation.expected_identity === expectedIdentity &&
                            observation.expected_value_sha256 === expectation.expected.sha256 &&
                            observation.actual_projection === "raw_exact" &&
                            observation.obligation_ref === sourceObligationRef &&
                            observation.assertion_ref === binding.assertion_ref &&
                            observation.method === binding.method &&
                            observation.fact_ref === expectation.fact_ref &&
                            observation.proof_surface === check.proof_surface &&
                            observation.target_ref === target.target_ref &&
                            Array.isArray(observation.claim_refs) &&
                            observation.claim_refs.length === 1 &&
                            typeof observation.claim_refs[0] === "string" &&
                            validCapabilities(observation.evidence_capabilities) &&
                            sameSet(observation.evidence_capabilities, capabilities) &&
                            sameComparison(observation.comparison, comparisonIdentity) &&
                            observation.observation_identity === expectation.fact_ref &&
                            observation.locator_policy?.kind === "fixed_json_pointer" &&
                            observation.locator_policy.value ===
                                "/observations/" + expectation.fact_ref &&
                            Array.isArray(observation.carrier_refs) &&
                            observation.carrier_refs.length === 0);
                        if (observations.length !== 1)
                            continue;
                        const observation = observations[0];
                        const localClaimRef = observation.claim_refs[0];
                        const claimRef = outcome.key + "." + localClaimRef;
                        const semanticIdentity = sha256Hex(canonicalValueJson({
                            kind: "design_fact",
                            source_obligation_ref: sourceObligationRef,
                            claim_ref: claimRef,
                            local_claim_ref: localClaimRef,
                            applicability_identity: canonicalApplicabilityIdentity(applicability),
                            target_ref: applicability.target_ref,
                            required_polarity: identity.required_polarity,
                            expected_authority_ref: "design-proof:" + sourceObligationRef,
                            method: binding.method,
                            required_evidence_capabilities: normalizedCapabilities,
                            design_obligation_ref: sourceObligationRef,
                            design_target_ref: target.key,
                            fact_ref: expectation.fact_ref,
                            proof_ref: sourceObligationRef,
                            expected_design_sha256: expectation.expected.sha256,
                            actual_projection: "raw_exact",
                            comparison: comparisonIdentity,
                        }));
                        if (identity.claim_ref !== claimRef ||
                            identity.local_claim_ref !== localClaimRef ||
                            identity.semantic_identity !== semanticIdentity ||
                            identity.confirmation_ref !== confirmation.key ||
                            identity.method !== binding.method ||
                            declaredObligation.claim_ref !== claimRef ||
                            declaredObligation.proof_ref !== sourceObligationRef ||
                            observation.obligation_ref !== sourceObligationRef ||
                            (identity.assertion_ref !== undefined &&
                                identity.assertion_ref !== binding.assertion_ref) ||
                            (declaredObligation.assertion_ref !== undefined &&
                                declaredObligation.assertion_ref !== binding.assertion_ref))
                            continue;
                        candidates.push({
                            source_obligation_ref: sourceObligationRef,
                            outcome_key: outcome.key,
                            check_key: check.key,
                            target_key: target.key,
                            assertion_ref: binding.assertion_ref,
                            local_claim_ref: localClaimRef,
                            claim_ref: claimRef,
                            applicability_ref: identity.applicability_ref,
                            fact_ref: expectation.fact_ref,
                            method: binding.method,
                            proof_surface: check.proof_surface,
                            evidence_capabilities: normalizedCapabilities,
                            expected_authority_ref: "design-proof:" + sourceObligationRef,
                            expected: expectation.expected,
                            comparison,
                            observation_sensitivity: expectation.observation_sensitivity,
                        });
                    }
                }
            }
        }
    }
    return candidates.length === 1 ? candidates[0] : null;
}
function validDesignExpectation(expectation) {
    const comparison = expectation?.comparison;
    return Boolean(expectation &&
        typeof expectation.fact_ref === "string" &&
        expectation.expected &&
        typeof expectation.expected === "object" &&
        !Array.isArray(expectation.expected) &&
        isSha256Digest(expectation.expected.sha256) &&
        comparison &&
        typeof comparison.comparator === "string" &&
        typeof comparison.mode === "string" &&
        comparison.parameters &&
        typeof comparison.parameters === "object" &&
        !Array.isArray(comparison.parameters) &&
        isSha256Digest(comparison.parameters.sha256) &&
        (comparison.tolerance === null ||
            (comparison.tolerance &&
                typeof comparison.tolerance === "object" &&
                !Array.isArray(comparison.tolerance) &&
                isSha256Digest(comparison.tolerance.sha256))) &&
        (comparison.mask === null ||
            (comparison.mask &&
                typeof comparison.mask === "object" &&
                !Array.isArray(comparison.mask) &&
                isSha256Digest(comparison.mask.sha256))) &&
        typeof expectation.observation_sensitivity === "string");
}
function sameComparison(actual, expected) {
    return Boolean(actual &&
        actual.comparator === expected.comparator &&
        actual.mode === expected.mode &&
        actual.parameters_sha256 === expected.parameters_sha256 &&
        actual.tolerance_sha256 === expected.tolerance_sha256 &&
        actual.mask_sha256 === expected.mask_sha256);
}
function validCapabilities(capabilities) {
    return (Array.isArray(capabilities) &&
        capabilities.every((capability) => typeof capability === "string") &&
        new Set(capabilities).size === capabilities.length);
}
function isSha256Digest(value) {
    return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
function isApplicabilityProfile(profile) {
    return Boolean(profile &&
        typeof profile.target_ref === "string" &&
        typeof profile.journey_role === "string" &&
        Array.isArray(profile.dimensions) &&
        profile.dimensions.every((dimension) => dimension &&
            typeof dimension.key === "string" &&
            typeof dimension.value === "string") &&
        Array.isArray(profile.given_refs) &&
        profile.given_refs.every((reference) => typeof reference === "string") &&
        Array.isArray(profile.when_refs) &&
        profile.when_refs.every((reference) => typeof reference === "string"));
}
function optionalExact(actual, expected) {
    return actual === undefined || actual === expected;
}`;

function transformWorkspaceSnapshot(source) {
  return replaceExact(
    source,
    "rm(temporary, { recursive: true, force: true })",
    "rm(temporary, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })",
    3,
  );
}

function transformCounterfactualSandbox(source) {
  const retryLimit = replaceExact(
    source,
    'const REMOVE_RETRY_LIMIT = process.platform === "win32" ? 6 : 2;',
    'const REMOVE_RETRY_LIMIT = process.platform === "win32" ? 20 : 2;',
  );
  return replaceExact(
    retryLimit,
    "const REMOVE_RETRY_DELAY_MS = 100;",
    "const REMOVE_RETRY_DELAY_MS = 250;",
  );
}

function transformDesignObligation(source) {
  let transformed = source;
  if (!transformed.startsWith(DESIGN_IMPORTS)) {
    transformed = replaceExact(
      transformed,
      "export function designGroundObligationRef",
      `${DESIGN_IMPORTS}export function designGroundObligationRef`,
    );
  }
  const startMarker = "export function findDesignFactObligation";
  const endMarker = "function descriptorForExpectation";
  if (
    occurrenceCount(transformed, startMarker) !== 1 ||
    occurrenceCount(transformed, endMarker) !== 1
  ) {
    throw new Error("ty_context_harness_compatibility_transform_design_range");
  }
  const start = transformed.indexOf(startMarker);
  const end = transformed.indexOf(endMarker, start);
  if (start < 0 || end <= start) {
    throw new Error("ty_context_harness_compatibility_transform_design_order");
  }
  return `${transformed.slice(0, start)}${DESIGN_LOOKUP_IMPLEMENTATION}\n${transformed.slice(end)}`;
}

function transformExternalExpected(source) {
  return replaceExact(
    source,
    `    return {
        passed: sha256Hex(canonicalValueJson(actual)) === design.expected.sha256,
    };`,
    `    return {
        passed: (typeof actual === "string"
            ? sha256Hex(actual)
            : sha256Hex(canonicalValueJson(actual))) === design.expected.sha256,
    };`,
  );
}

const overlaySpecs = [
  {
    relativePath: "dist/lib/long-task-workspace-snapshot.js",
    acceptedInputHashes: [
      "585297a410321bc6bb2593c4654afd296b71c17bf4ed81e52e2b9ddff8e815ce",
    ],
    finalHash:
      "2a2f4283d98ce8e011f1c18cc57abc96b077cf01a82363fb45554ae21a0ca4b9",
    transform: transformWorkspaceSnapshot,
  },
  {
    relativePath: "dist/lib/long-task-counterfactual-sandbox.js",
    acceptedInputHashes: [
      "0cb7a593089ad6c47732f5230a83b63fdcf683ce22e27d7445f31463c2e00036",
    ],
    finalHash:
      "bbd256e55c18623f3839a465aec02a9d60a69fcbeedcdfe92cee1ca25585fb1f",
    transform: transformCounterfactualSandbox,
  },
  {
    relativePath: "dist/lib/long-task-design-obligation.js",
    acceptedInputHashes: [
      "129e50017cd12ef0f68b8ca78af5e112cd2dcc871bc969567202fec908e8fd3f",
      "bbf621e9d3abc307e769f11d742fa6b04d627f43a55fc1a9a89ed2cc8e827fe9",
      "026e524e916382e0b82970b8ba64c149720644242ae6768350b57e7351e97c75",
    ],
    finalHash:
      "d157451ed6cff71989281db189206a5b422f3c915556e40d652cba88d89eb09d",
    transform: transformDesignObligation,
  },
  {
    relativePath: "dist/lib/long-task-external-confirmation-expected.js",
    acceptedInputHashes: [
      "c0253a2e414689f38dbda8819a08ce5a2482391ab44d57eb037645de9920f636",
    ],
    finalHash:
      "9466925090eb58fe76e1f6af877aaf79f75bcd40aef3755839323f6cd886123c",
    transform: transformExternalExpected,
  },
];

async function applyExactOverlay(spec) {
  const target = path.join(packageRoot, ...spec.relativePath.split("/"));
  const before = await readFile(target);
  const beforeHash = sha256(before);
  if (beforeHash === spec.finalHash) {
    return {
      file: spec.relativePath,
      disposition: "already_applied",
      sha256: beforeHash,
    };
  }
  if (!spec.acceptedInputHashes.includes(beforeHash)) {
    throw new Error(
      `ty_context_harness_compatibility_unknown_source_shape:${spec.relativePath}:${beforeHash}`,
    );
  }
  if (checkOnly) {
    throw new Error(
      `ty_context_harness_compatibility_not_applied:${spec.relativePath}`,
    );
  }
  const after = Buffer.from(spec.transform(before.toString("utf8")), "utf8");
  const afterHash = sha256(after);
  if (afterHash !== spec.finalHash) {
    throw new Error(
      `ty_context_harness_compatibility_final_hash_mismatch:${spec.relativePath}:${afterHash}:${spec.finalHash}`,
    );
  }
  await writeFile(target, after);
  const readbackHash = sha256(await readFile(target));
  if (readbackHash !== spec.finalHash) {
    throw new Error(
      `ty_context_harness_compatibility_readback_failed:${spec.relativePath}:${readbackHash}`,
    );
  }
  return {
    file: spec.relativePath,
    disposition: "applied",
    sha256: readbackHash,
  };
}

const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);
if (packageJson.version !== expectedVersion) {
  throw new Error(
    `ty_context_harness_compatibility_version_mismatch:${packageJson.version ?? "missing"}:${expectedVersion}`,
  );
}

const results = [];
for (const spec of overlaySpecs) {
  results.push(await applyExactOverlay(spec));
}

process.stdout.write(
  `${JSON.stringify({
    status: "passed",
    mode: checkOnly ? "check" : "apply",
    package: `project-tiny-context-harness@${expectedVersion}`,
    purpose:
      "bounded Windows cleanup retry, exact compiled external-design descriptor recovery, and exact design string-comparison compatibility on Harness-owned temporary roots",
    acceptance_semantics_changed: false,
    operations: results,
    files: results.map(({ file, sha256: digest }) => ({
      file,
      sha256: digest,
    })),
  })}\n`,
);
