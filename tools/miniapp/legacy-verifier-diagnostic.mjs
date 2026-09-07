// Optional historical protocol diagnostic. Not a current product/UI acceptance input.
// Run explicitly only when investigating the frozen verifier: node --test tools/miniapp/legacy-verifier-diagnostic.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (...segments) => path.join(root, ...segments);
const text = async (...segments) => (await readFile(at(...segments), "utf8")).replace(/\r\n?/gu, "\n");
const json = async (...segments) => JSON.parse(await text(...segments));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

test("Standalone candidate verifier derives actuals from the current candidate and fails closed", async () => {
  const rootPackage = await json("package.json");
  const deliveryContract = parseYaml(
    await text(".long-task", "delivery-contract.yaml"),
  );
  const verificationSpec = await json(
    "tools",
    "miniapp",
    "verification-spec-field-signal-i21.json",
  );
  const verifier = await text(
    "tools",
    "miniapp",
    "verifier-runtime",
    "verify-miniapp-target.mjs",
  );
  const launcher = await text(
    "tools",
    "miniapp",
    "verifier-runtime",
    "verify-miniapp-target-launcher.c",
  );
  for (const required of [
    "parseSourceAuthority",
    "runNative",
    "buildSemanticArtifact",
    "buildDesignArtifacts",
    "validateSnapshot",
    "runtime_quiescence",
    "assertExactEvidenceRecordShape",
    "evidence_record_shape_invalid",
    "failureInjectionRecord",
    "currentCheckEvidencePassed",
    "commandEvidenceSummary",
    "failedBooleanObservation",
    "counterfactualControlFor",
    "populationRequirementFor",
    "writeGlobalConformanceArtifact",
    "emitStaleCarrierResult",
    "delivery_carrier_snapshot_stale",
  ])
    assert.ok(verifier.includes(required), required);

  assert.doesNotMatch(verifier, /actual:\s*template\.expected\.value/u);
  assert.doesNotMatch(verifier, /actualSha\s*=\s*template\.expected\.sha256/u);
  assert.doesNotMatch(
    verifier,
    /environment_sha256:\s*expectation\.environment\.definition\.sha256/u,
  );
  assert.doesNotMatch(verifier, /failure_observed:\s*true/u);
  assert.doesNotMatch(verifier, /catalog\.matchAll\(\/\^\\s\+spotId:/u);
  assert.doesNotMatch(verifier, /sha256\(`\$\{check\.scope\}:before`\)/u);
  for (const unsupportedEvidenceField of [
    "artifact_path: native?.artifact_path",
    "artifact_sha256: native?.artifact_sha256",
    "journeys: native?.journeys",
    "probes,",
    "observed_ids: ids",
  ])
    assert.ok(
      !verifier
        .slice(
          verifier.indexOf("function recordsFor"),
          verifier.indexOf("async function verify"),
        )
        .includes(unsupportedEvidenceField),
      unsupportedEvidenceField,
    );
  assert.match(
    verifier,
    /const actual = sourceAuthority\.items\.get\(template\.source_item_key\)/u,
  );
  assert.match(verifier, /\[HANDOFF_SOURCE, handoff\]/u);
  assert.match(verifier, /handoff\.target === spec\.design_evidence\.design_target_ref/u);
  assert.match(verifier, /item\.key === locator\.resource_ref/u);
  assert.match(verifier, /locator\.kind === "json_pointer"/u);
  assert.match(verifier, /resourceSha === resource\?\.sha256/u);
  assert.match(verifier, /requestOneShotLocation\(Taro\)/u);
  assert.match(verifier, /platform\\\.getLocation/u);
  assert.match(verifier, /evidence_capabilities/u);
  assert.match(verifier, /counterfactualProjectionFiles/u);
  assert.match(verifier, /projection\.required_exact_paths/u);
  assert.match(verifier, /projection\.required_tree_roots/u);
  assert.match(verifier, /empty_required_tree_roots/u);
  for (const requiredSnapshotRoot of [
    "data-pipelines/src",
    "packages/astronomy-core/data",
    "packages/astronomy-core/src",
    "packages/astronomy-core/package.json",
    "packages/astronomy-core/tsconfig.json",
  ])
    assert.ok(
      verifier.includes(`\"${requiredSnapshotRoot}\"`),
      `${requiredSnapshotRoot} must be bound into the complete candidate snapshot`,
    );
  assert.match(verifier, /mode: "complete_candidate"/u);
  assert.match(verifier, /mode: "counterfactual_projection"/u);
  assert.match(verifier, /mismatched_files: mismatched\.slice\(0, 20\)/u);
  assert.match(
    verifier,
    /const snapshotValidation = await validateSnapshot\(spec, carrier, \{/u,
  );
  for (const requiredPath of [
    "package.json",
    "package-lock.json",
    ".codex/work-items/wechat-miniapp-field-signal-i21-long-task-input.md",
    "DESIGN.md",
    "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-06-r11/selected-handoff/miniapp-field-signal-i21-current.md",
    "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-06-r11/selected-source/miniapp-implementation-feasibility.json",
    "tools/miniapp/verification-spec-field-signal-i21.json",
    "tools/miniapp/run-wechat-devtools-session.mjs",
    "tools/miniapp/verifier-runtime/verify-miniapp-target.mjs",
    "tools/miniapp/verifier-runtime/verify-miniapp-target-launcher.c",
    "tools/miniapp/verifier-runtime/verify-miniapp-target.exe",
  ])
    assert.ok(
      verificationSpec.counterfactual_projection.required_exact_paths.includes(
        requiredPath,
      ),
      requiredPath,
    );
  assert.deepEqual(
    verificationSpec.counterfactual_projection.required_tree_roots,
    [
      "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r6/selected-source",
    ],
  );
  const verifyBody = verifier.slice(verifier.indexOf("async function verify"));
  assert.ok(
    verifyBody.indexOf("const counterfactualControl") <
      verifyBody.indexOf("const snapshotValidation"),
    "counterfactual projection mode must be selected only from the declared carrier mutation status",
  );
  assert.ok(
    verifyBody.indexOf("if (!snapshotValid)") <
      verifyBody.indexOf(
        "const sourceAuthority = await parseSourceAuthority()",
      ),
    "stale candidate carriers must fail before any expensive product execution",
  );
  const candidateCommand = rootPackage.scripts["prepare:miniapp:final-candidate"];
  for (const required of ["check:miniapp:fast", "design:system:verify", "test:miniapp:infrastructure", "check:miniapp:production", "--mode success", "--mode degradation"])
    assert.ok(candidateCommand.includes(required), required);
  assert.doesNotMatch(candidateCommand, /verifier-runtime|verification-spec|design-resources/u);
  const outcomeChecks = deliveryContract.outcomes.flatMap(
    (outcome) => outcome.acceptance.checks,
  );
  const degradationChecks = outcomeChecks.filter((check) =>
    check.key.endsWith("-degradation"),
  );
  assert.equal(degradationChecks.length, 5);
  for (const check of degradationChecks) {
    const specIndex = check.runner.argv.indexOf("--spec");
    assert.ok(specIndex >= 0, `${check.key} must select the I21 spec`);
    assert.equal(
      check.runner.argv[specIndex + 1],
      "tools/miniapp/verification-spec-field-signal-i21.json",
    );
  }
  assert.match(verifier, /extractFencedBlock\([\s\S]*?"yaml design-resource-handoff-v1"/u);
  assert.match(verifier, /handoffSha === spec\.authority\.handoff\.sha256/u);
  assert.match(verifier, /resourceResults\.every\(\(resource\) => resource\.passed\)/u);
  assert.doesNotMatch(verifier, /readJson\(DESIGN_BINDING_CURRENT\)/u);
  assert.match(
    verifier,
    /path\.dirname\(fileURLToPath\(import\.meta\.url\)\),\s*"\.\.",\s*"\.\.",\s*"\.\."/u,
    "the frozen verifier runtime must resolve paths from the repository root",
  );
  assert.match(verifier, /function extractFencedBlock\(content, header\)/u);
  assert.match(verifier, /RESOURCE_INTEGRITY = designEvidence\.resource_integrity_path/u);
  assert.match(verifier, /DESIGN_ACTUAL = designEvidence\.actual_artifact_path/u);
  assert.match(
    verifier,
    /const manifestText = extractFencedBlock\(\s*source,\s*"yaml semantic-fact-compact-carrier-v1"/u,
    "large Source carriers must be sliced by bounded markers instead of a recursive whole-text regexp",
  );
  assert.match(verifier, /if \(!failureObserved\) return null;/u);
  assert.match(verifier, /if \(record\) records\.push\(record\);/u);
  assert.match(verifier, /const current = await snapshotManifest\(spec\)/u);
  assert.match(verifier, /source_closure_passed: sourceClosure/u);
  assert.match(verifier, /zeroTemplateProjectionAccepted/u);
  assert.match(
    verifier,
    /manifestSourceKeys\.every\(\(item\) => parsed\.items\.has\(item\)\)/u,
  );
  assert.match(
    verifier,
    /templateKeys\.every\(\(item\) => uniqueManifestSourceKeys\.has\(item\)\)/u,
  );
  assert.match(
    verifier,
    /actualEnvironment = await readJson\(DESIGN_ENVIRONMENT\)/u,
  );
  assert.match(
    verifier,
    /actualParameters = await readJson\(DESIGN_PARAMETERS\)/u,
  );
  const crossSurfaceEvidence = verifier.slice(
    verifier.indexOf('else if (capability === "cross_surface_consistency")'),
    verifier.indexOf('else if (capability === "failure_injection")'),
  );
  assert.match(
    crossSurfaceEvidence,
    /const sharedStateSha256 = carrier\.source_snapshot\?\.sha256 \?\? null/u,
  );
  assert.equal(
    [...crossSurfaceEvidence.matchAll(/state_sha256: sharedStateSha256/gu)]
      .length,
    2,
    "native and browser observations must bind the same validated candidate-state identity",
  );
  assert.doesNotMatch(
    crossSurfaceEvidence,
    /candidate_sha256|stdout_sha256/u,
    "runtime-specific artifact hashes cannot impersonate one cross-surface state version",
  );
  const embeddedDigest = [
    ...(
      launcher.match(
        /expected_script_sha256\[32\]\s*=\s*\{([\s\S]*?)\};/u,
      )?.[1] ?? ""
    ).matchAll(/0x([0-9a-f]{2})/gu),
  ]
    .map((match) => match[1])
    .join("");
  assert.equal(
    embeddedDigest,
    sha256(Buffer.from(verifier)),
    "the frozen executable launcher must bind the exact verifier script bytes",
  );
  assert.match(launcher, /BCryptOpenAlgorithmProvider/u);
  assert.match(launcher, /return 125/u);
});

test("V2.1.1 semantic Source closure stays distinct from machine-observable templates", async () => {
  const source = await text("docs", "wechat-miniapp-v2-1-1-source.md");
  const handoff = await text(
    "docs",
    "design-resources",
    "miniapp-selected-handoff-2026-08-22-v3",
    "miniapp-drift-correction-selected-v3.md",
  );
  const spec = await json(
    "tools",
    "miniapp",
    "verification-spec-v2-1-1.json",
  );
  const manifestText =
    /```yaml semantic-fact-compact-carrier-v1\s*\r?\n([\s\S]*?)\r?\n```/u.exec(
      source,
    )?.[1];
  assert.ok(manifestText);
  const manifest = parseYaml(manifestText);
  const markerKeys = [...`${source}\n${handoff}`.matchAll(
    /<!--\s*ty-source-item:start\s+[^>]*?\bkey=([^\s>]+)/gu,
  )].map((match) => match[1]);
  const manifestKeys = manifest.scope.source_item_refs;
  const templateKeys = spec.semantic_templates.map(
    (item) => item.source_item_key,
  );
  assert.equal(new Set(markerKeys).size, markerKeys.length);
  assert.equal(new Set(manifestKeys).size, manifestKeys.length);
  assert.equal(new Set(templateKeys).size, templateKeys.length);
  assert.equal(manifestKeys.length, 460);
  assert.equal(markerKeys.length, 462);
  assert.deepEqual(templateKeys, []);
  assert.ok(manifestKeys.every((key) => markerKeys.includes(key)));
  assert.ok(templateKeys.every((key) => manifestKeys.includes(key)));
});

test("Project verification adapter projects exact counterfactual and population authority", async () => {
  const spec = await json("tools", "miniapp", "verification-spec.json");
  assert.ok(spec.counterfactual_controls.length > 0);
  assert.equal(
    new Set(spec.counterfactual_controls.map((row) => row.key)).size,
    spec.counterfactual_controls.length,
  );
  for (const control of spec.counterfactual_controls) {
    assert.match(control.status, /^semantic-failure/u);
    const check = spec.checks.find(
      (row) =>
        row.scope === control.scope &&
        row.surface === control.surface &&
        row.check_key === control.check_key,
    );
    assert.ok(check, `${control.scope}:${control.check_key}`);
    const assertionKeys = new Set(
      check.assertions.map((assertion) => assertion.key),
    );
    for (const key of [
      ...control.expected_assertion_failures,
      ...control.preserved_assertions,
    ])
      assert.ok(assertionKeys.has(key), `${control.key}:${key}`);
  }
  assert.deepEqual(spec.population_requirements, [
    {
      scope: "map-discovery",
      surface: "population_coverage",
      check_key: "map-population",
      observations: {
        universe_ids: "map-discovery.population.universe-ids",
        eligible_ids: "map-discovery.population.eligible-ids",
        observed_ids: "map-discovery.population.observed-ids",
        excluded_items: "map-discovery.population.excluded-items",
      },
    },
  ]);
});
