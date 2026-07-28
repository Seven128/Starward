import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertCompleteNativeDesignPopulation,
  createNativeDesignPlan,
  decodeNativeVerificationEvidence,
  encodeNativeVerificationEvidence,
  NativeVerificationCheckpointStore,
  nativeCheckpointReuseAllowed,
  nativeVerificationFingerprint,
  partitionNativeDesignUnits,
} from "./native-verification-session.mjs";

const conditions = [
  { key: "mobile-android-390-full", modes: ["planning", "night", "red-light"] },
  { key: "mobile-android-390-reduced", modes: ["planning", "night", "red-light"] },
];
const contract = {
  controls: {
    alpha: {
      acceptanceScenarios: [{ id: "alpha-success" }, { id: "alpha-recovery" }],
    },
    beta: {
      acceptanceScenarios: [{ id: "beta-success" }, { id: "beta-recovery" }],
    },
  },
};

test("native design plan preserves the full condition, mode, control and scenario population", () => {
  const plan = createNativeDesignPlan({
    conditions,
    contract,
    controlIds: ["alpha", "beta"],
  });
  assert.equal(plan.fullPopulation, true);
  assert.equal(plan.units.length, 6);
  assert.equal(plan.expectedFragmentKeys.length, 6 * (1 + 2 + 4));
  assert.deepEqual(
    assertCompleteNativeDesignPopulation(plan, plan.expectedFragmentKeys),
    {
      controlFragments: 12,
      fragments: 42,
      pageFragments: 6,
      scenarioFragments: 24,
      units: 6,
    },
  );
});

test("native design filters are diagnostic-only and retain attributable identities", () => {
  assert.throws(
    () => createNativeDesignPlan({
      conditions,
      contract,
      controlIds: ["alpha", "beta"],
      selection: { controls: ["alpha"] },
    }),
    /native_verification_filter_requires_diagnostic_mode/u,
  );
  const plan = createNativeDesignPlan({
    conditions,
    contract,
    controlIds: ["alpha", "beta"],
    diagnostic: true,
    selection: {
      conditions: ["mobile-android-390-reduced"],
      controls: ["beta"],
      modes: ["red-light"],
    },
  });
  assert.equal(plan.fullPopulation, false);
  assert.deepEqual(plan.conditionKeys, ["mobile-android-390-reduced"]);
  assert.deepEqual(plan.controlIds, ["beta"]);
  assert.deepEqual(plan.modeKeys, ["red-light"]);
  assert.equal(plan.units[0].scenarios.length, 2);
  assert.match(plan.units[0].scenarios[0].fragmentKey, /beta:beta-success$/u);
});

test("native design shards are deterministic, balanced and device-isolated", () => {
  const plan = createNativeDesignPlan({
    conditions,
    contract,
    controlIds: ["alpha", "beta"],
  });
  const first = partitionNativeDesignUnits(plan.units, ["emulator-5554", "emulator-5556"], 2);
  const second = partitionNativeDesignUnits(plan.units, ["emulator-5554", "emulator-5556"], 2);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
  assert.equal(new Set(first.flatMap((shard) => shard.units.map((unit) => unit.key))).size, 6);
  assert.ok(first.every((shard) => shard.units.length === 3));
});

test("native checkpoint evidence round-trips buffers and maps without losing attribution", () => {
  const original = {
    controls: new Map([["alpha", {
      png: Buffer.from([1, 2, 3, 4]),
      values: ["one", "two"],
    }]]),
    screen: Buffer.from("screen"),
  };
  const decoded = decodeNativeVerificationEvidence(
    encodeNativeVerificationEvidence(original),
  );
  assert.ok(decoded.controls instanceof Map);
  assert.deepEqual(decoded.controls.get("alpha").png, Buffer.from([1, 2, 3, 4]));
  assert.deepEqual(decoded.screen, Buffer.from("screen"));
});

test("native checkpoint store resumes only an identical candidate identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-native-session-test-"));
  try {
    const identity = {
      apk_sha256: "a".repeat(64),
      authority_identity: "authority-12",
      devices: [{ serial: "emulator-5554", fingerprint: "device-a" }],
      verifier_sha256: "b".repeat(64),
    };
    const store = new NativeVerificationCheckpointStore({ identity, root });
    assert.equal((await store.initialize()).created, true);
    await store.write("control:condition:mode:alpha", {
      crop: Buffer.from("crop"),
      nodes: new Map([["alpha", { enabled: "true" }]]),
    }, {
      condition_key: "condition",
      control_id: "alpha",
      mode: "mode",
      serial: "emulator-5554",
    });
    const resumed = new NativeVerificationCheckpointStore({ identity, root });
    assert.equal((await resumed.initialize({ reuse: true })).created, false);
    const fragment = await resumed.read("control:condition:mode:alpha");
    assert.deepEqual(fragment.value.crop, Buffer.from("crop"));
    assert.equal(fragment.value.nodes.get("alpha").enabled, "true");
    assert.deepEqual(await resumed.keys(), ["control:condition:mode:alpha"]);

    const changed = new NativeVerificationCheckpointStore({
      identity: { ...identity, verifier_sha256: "c".repeat(64) },
      root,
    });
    await assert.rejects(
      changed.initialize({ reuse: true }),
      /native_verification_checkpoint_identity_mismatch/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("native verification fingerprints are canonical and Final Gate forbids repair reuse", () => {
  assert.equal(
    nativeVerificationFingerprint({ nested: { beta: 2, alpha: 1 }, value: "same" }),
    nativeVerificationFingerprint({ value: "same", nested: { alpha: 1, beta: 2 } }),
  );
  assert.equal(
    nativeCheckpointReuseAllowed({ executionScope: "stage-candidate", resume: true }),
    true,
  );
  assert.throws(
    () => nativeCheckpointReuseAllowed({ executionScope: "final-gate", resume: true }),
    /native_verification_final_gate_checkpoint_reuse_forbidden/u,
  );
});

test("native population completeness fails on missing, extra and duplicate fragments", () => {
  const plan = createNativeDesignPlan({
    conditions,
    contract,
    controlIds: ["alpha", "beta"],
  });
  assert.throws(
    () => assertCompleteNativeDesignPopulation(plan, plan.expectedFragmentKeys.slice(1)),
    /native_verification_population_mismatch/u,
  );
  assert.throws(
    () => assertCompleteNativeDesignPopulation(
      plan,
      [...plan.expectedFragmentKeys, "foreign:fragment"],
    ),
    /native_verification_population_mismatch/u,
  );
  assert.throws(
    () => assertCompleteNativeDesignPopulation(
      plan,
      [...plan.expectedFragmentKeys, plan.expectedFragmentKeys[0]],
    ),
    /native_verification_observed_population_duplicate/u,
  );
});
