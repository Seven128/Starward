import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createReviewNotes, inspectReviewNotes } from "./conformance-review.mjs";

async function fixture(t) {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "starward-notes-"));
  t.after(async () => {
    assert.equal(path.dirname(repositoryRoot), path.resolve(os.tmpdir()));
    assert.ok(path.basename(repositoryRoot).startsWith("starward-notes-"));
    await rm(repositoryRoot, { recursive: true, force: true });
  });
  await mkdir(path.join(repositoryRoot, "docs"));
  await writeFile(path.join(repositoryRoot, "docs/source.md"), "authoritative result");
  await writeFile(path.join(repositoryRoot, "module.ts"), "current source");
  await writeFile(path.join(repositoryRoot, "trace.txt"), "real observation");
  const session = {
    status: "failed",
    candidate_after: {
      sha256: "historical-candidate",
      files: { "module.ts": createHash("sha256").update("current source").digest("hex") },
    },
  };
  await writeFile(path.join(repositoryRoot, "session.json"), JSON.stringify(session));
  const options = { repositoryRoot, scope: "one actual boundary", authorityPaths: ["docs/source.md"] };
  return { repositoryRoot, options };
}
function reviewed(record, verdict = "failed", evidence = ["trace.txt"]) {
  return {
    ...record,
    reviewer: { identity: "test reviewer", method: "Compare expected and actual result", reviewed_at: "2026-09-12T13:00:00Z" },
    observations: [{
      claim: "Late response must not change another selection",
      verdict, observed: "Observed result or missing observation is explicitly described",
      reference_paths: ["docs/source.md"], evidence_paths: evidence,
      next_action: verdict === "passed" ? null : "Repair the owner or obtain the missing runtime evidence",
    }],
  };
}
test("backend and architecture notes need no DevTools, screenshots or fixed dimensions", async (t) => {
  const { options } = await fixture(t);
  const note = await createReviewNotes(options);
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.equal(result.record_validity, "valid");
  assert.equal(result.review_state, "unreviewed");
  assert.equal(result.candidate_applicability.state, "undetermined");
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
  assert.equal("dimensions" in note, false);
});
test("reviewed failure and missing evidence remain valid records with next actions", async (t) => {
  const { options } = await fixture(t);
  const note = await createReviewNotes({ ...options, evidencePaths: ["trace.txt"] });
  for (const verdict of ["failed", "unverified", "not_comparable", "passed"]) {
    const result = await inspectReviewNotes({
      ...options, review: reviewed(note, verdict, verdict === "unverified" ? [] : ["trace.txt"]),
    });
    assert.equal(result.record_validity, "valid");
    assert.equal(result.recorded_observations[0].verdict, verdict);
    assert.equal(result.product_acceptance, "not_assessed_by_tool");
    assert.equal("status" in result, false);
  }
});
test("failed collection can be investigated without being upgraded to product acceptance", async (t) => {
  const { options } = await fixture(t);
  const note = await createReviewNotes({ ...options, sessionPath: "session.json" });
  const result = await inspectReviewNotes({ ...options, review: reviewed(note, "failed", ["session.json"]) });
  assert.equal(result.record_validity, "valid");
  assert.equal(result.candidate_applicability.state, "undetermined");
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
});
test("changing recorded candidate source marks applicability different even with an intact session", async (t) => {
  const { options, repositoryRoot } = await fixture(t);
  const note = await createReviewNotes({ ...options, sessionPath: "session.json", evidencePaths: ["trace.txt"] });
  await writeFile(path.join(repositoryRoot, "module.ts"), "new source");
  const result = await inspectReviewNotes({ ...options, review: reviewed(note, "passed") });
  assert.equal(result.bound_inputs.state, "unchanged");
  assert.equal(result.candidate_applicability.state, "different");
  assert.deepEqual(result.candidate_applicability.changed_files, ["module.ts"]);
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
});
test("reference and output drift preserve the historical judgment while marking changed inputs", async (t) => {
  const { options, repositoryRoot } = await fixture(t);
  const note = reviewed(await createReviewNotes({ ...options, evidencePaths: ["trace.txt"] }), "passed");
  await writeFile(path.join(repositoryRoot, "docs/source.md"), "new requirement");
  await writeFile(path.join(repositoryRoot, "trace.txt"), "new observation");
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.equal(result.record_validity, "valid");
  assert.equal(result.bound_inputs.state, "changed");
  assert.equal(result.recorded_observations[0].verdict, "passed");
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
});
test("matching recorded files does not certify added files, build or candidate equivalence", async (t) => {
  const { options, repositoryRoot } = await fixture(t);
  const note = await createReviewNotes({ ...options, sessionPath: "session.json" });
  await writeFile(path.join(repositoryRoot, "new-module.ts"), "new consumer");
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.equal(result.candidate_applicability.state, "undetermined");
  assert.match(result.candidate_applicability.reason, /not_revalidated/u);
});
test("an overwritten session cannot silently retarget the recorded candidate", async (t) => {
  const { options, repositoryRoot } = await fixture(t);
  const note = await createReviewNotes({ ...options, sessionPath: "session.json" });
  await writeFile(path.join(repositoryRoot, "session.json"), "{}");
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.equal(result.bound_inputs.state, "changed");
  assert.equal(result.candidate_applicability.reason, "session_changed_or_missing");
});
test("records reject missing reviewers, unbound citations and missing unresolved actions", async (t) => {
  const { options } = await fixture(t);
  const note = reviewed(await createReviewNotes({ ...options, evidencePaths: ["trace.txt"] }));
  for (const [mutate, error] of [
    [(n) => { n.reviewer = null; }, /reviewer_required/u],
    [(n) => { n.observations[0].evidence_paths = ["other.txt"]; }, /reference_unbound/u],
    [(n) => { n.observations[0].next_action = null; }, /next_action_required/u],
  ]) {
    const changed = structuredClone(note); mutate(changed);
    await assert.rejects(inspectReviewNotes({ ...options, review: changed }), error);
  }
});
test("current source authorities outside DESIGN directories are admitted explicitly", async (t) => {
  const { options } = await fixture(t);
  const note = await createReviewNotes(options);
  assert.equal(note.references[0].path, "docs/source.md");
  await assert.rejects(createReviewNotes({ ...options, authorityPaths: ["../elsewhere.md"] }), /outside_repository/u);
});

test("a structurally valid mixed review surfaces unresolved work despite recorded passes", async (t) => {
  const { options } = await fixture(t);
  const note = reviewed(await createReviewNotes({ ...options, evidencePaths: ["trace.txt"] }), "passed");
  for (const verdict of ["failed", "unverified", "not_comparable"]) {
    note.observations.push({
      ...note.observations[0], claim: `boundary ${verdict}`, verdict,
      next_action: `resolve ${verdict}`,
    });
  }
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.equal(result.record_validity, "valid");
  assert.deepEqual(result.follow_up, note.observations.slice(1).map(({ claim, verdict, next_action }) => ({
    reason: "unresolved_observation", claim, verdict, next_action,
  })));
  assert.deepEqual(result.reviewer, note.reviewer);
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
});

test("unreviewed and stale passed notes retain explicit follow-up without rewriting history", async (t) => {
  const { options, repositoryRoot } = await fixture(t);
  const record = await createReviewNotes({ ...options, evidencePaths: ["trace.txt"], sessionPath: "session.json" });
  const initial = await inspectReviewNotes({ ...options, review: record });
  assert.ok(initial.follow_up.some((item) => item.reason === "no_recorded_review"));
  const note = reviewed(record, "passed");
  await writeFile(path.join(repositoryRoot, "trace.txt"), "replaced observation");
  await writeFile(path.join(repositoryRoot, "module.ts"), "changed implementation");
  const stale = await inspectReviewNotes({ ...options, review: note });
  assert.ok(stale.follow_up.some((item) => item.reason === "bound_inputs_changed"));
  assert.ok(stale.follow_up.some((item) => item.reason === "recorded_candidate_different"));
  assert.equal(stale.recorded_observations[0].verdict, "passed");
  assert.equal(stale.product_acceptance, "not_assessed_by_tool");
});

test("no recorded follow-up never certifies complete scope, review independence or acceptance", async (t) => {
  const { options } = await fixture(t);
  const note = reviewed(await createReviewNotes({ ...options, evidencePaths: ["trace.txt"] }), "passed");
  note.reviewer.method = "Author self-review";
  const result = await inspectReviewNotes({ ...options, review: note });
  assert.deepEqual(result.follow_up, []);
  assert.equal(result.reviewer.method, "Author self-review");
  assert.equal(result.candidate_applicability.state, "undetermined");
  assert.equal(result.product_acceptance, "not_assessed_by_tool");
});
