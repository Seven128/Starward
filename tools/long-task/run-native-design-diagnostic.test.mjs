import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  parseDiagnosticArgs,
  diagnosticSourceIdentity,
  resolveRepositorySubdirectory,
} from "./run-native-design-diagnostic.mjs";

test("diagnostic identity works without Git workflow state and invalidates changed or missing sources", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-diagnostic-source-"));
  try {
    const inputs = [
      "DESIGN.md",
      "docs/design-resources/starward-residual-implementation-handoff.md",
      "tests/acceptance/native/contracts.json",
    ];
    for (const input of inputs) {
      await mkdir(path.dirname(path.join(root, input)), { recursive: true });
      await writeFile(path.join(root, input), input);
    }
    const first = await diagnosticSourceIdentity(root);
    assert.deepEqual(await diagnosticSourceIdentity(root), first);
    for (const input of inputs) {
      await writeFile(path.join(root, input), `${input}:changed`);
      assert.notEqual((await diagnosticSourceIdentity(root)).identity, first.identity);
      await writeFile(path.join(root, input), input);
    }
    await rm(path.join(root, inputs[0]));
    await assert.rejects(diagnosticSourceIdentity(root), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("native diagnostic arguments preserve exact attributable filters", () => {
  assert.deepEqual(parseDiagnosticArgs([
    "--outcome", "tonight-decision",
    "--control", "decision-hero,recommendation-card",
    "--mode", "planning,night",
    "--condition", "mobile-android-390-full",
    "--serials", "emulator-5556,emulator-5558",
    "--max-workers", "2",
    "--resume", "true",
  ]), {
    condition: "mobile-android-390-full",
    control: "decision-hero,recommendation-card",
    "max-workers": "2",
    mode: "planning,night",
    outcome: "tonight-decision",
    resume: "true",
    serials: "emulator-5556,emulator-5558",
  });
  assert.throws(
    () => parseDiagnosticArgs(["--formal", "true"]),
    /native_diagnostic_argument_unknown:formal/u,
  );
});

test("native diagnostic output and checkpoint roots stay below the repository", () => {
  const resolved = resolveRepositorySubdirectory(
    "artifacts/verification/native-diagnostics/custom",
    "output",
  );
  assert.equal(
    resolved.endsWith(path.join("artifacts", "verification", "native-diagnostics", "custom")),
    true,
  );
  assert.throws(
    () => resolveRepositorySubdirectory("..", "output"),
    /native_diagnostic_output_outside_repository/u,
  );
  assert.throws(
    () => resolveRepositorySubdirectory(".", "checkpoint_root"),
    /native_diagnostic_checkpoint_root_outside_repository/u,
  );
});
