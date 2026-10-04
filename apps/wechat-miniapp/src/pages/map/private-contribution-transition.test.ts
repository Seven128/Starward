import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ContributionSubmission, SpotId, ObservationContext } from "@starward/miniapp-contracts";
import { privateContributionSelectionTransition, samePendingProposalIntent } from "./private-contribution-transition.ts";

const pending = {
  submissionId: "contribution:one",
  publicationImpact: "CANDIDATE_UPDATED",
  spotId: "spot:one",
} as unknown as ContributionSubmission;

test("private selection follows authoritative revisions and becomes its canonical formal identity", () => {
  const revised = { ...pending, revision: 7 };
  assert.deepEqual(privateContributionSelectionTransition(pending, [revised]), { kind: "PRIVATE", submission: revised });
  const published = { ...revised, publicationImpact: "SPOT_PUBLISHED" as const };
  assert.deepEqual(privateContributionSelectionTransition(revised, [published]), {
    kind: "FORMAL",
    spotId: "spot:one" as SpotId,
  });
});

test("private selection disappears when the current account no longer owns it", () => {
  assert.deepEqual(privateContributionSelectionTransition(pending, []), { kind: "REMOVE" });
});

test("a mapped Context belongs only to the same owner's current frozen attempt and cannot replace a successor", () => {
  const selected = { ...pending, kind: "NEW_SPOT_PROPOSAL", preciseLocationConsent: true, revision: 2, submissionState: "PENDING_REVIEW",
    attempts: [{ attemptId: "contribution-attempt:one", baseRevision: 1, snapshot: { preciseLocationConsent: true, candidateLocation: {} } }] } as unknown as ContributionSubmission;
  const context = { schemaVersion: "observation-context-v3", privacyClass: "ACCOUNT_PRIVATE",
    privateProposal: { ownerId: "user:a", submissionId: selected.submissionId, attemptId: "contribution-attempt:one", attemptBaseRevision: 1 },
    location: { kind: "FORMAL_SPOT", spotId: "spot:mapped", locationVersion: 1 } } as ObservationContext;
  assert.deepEqual(privateContributionSelectionTransition(selected, [selected], context, "user:a"), { kind: "FORMAL", spotId: "spot:mapped" });
  assert.equal(privateContributionSelectionTransition(selected, [selected], context, "user:b").kind, "PRIVATE");
  const successor = { ...selected, revision: 6, attempts: [...selected.attempts, { ...selected.attempts[0]!, attemptId: "contribution-attempt:two", baseRevision: 5 }] };
  assert.equal(privateContributionSelectionTransition(successor, [successor], context, "user:a").kind, "PRIVATE");
  assert.equal(samePendingProposalIntent(selected, successor, "user:a", "user:a"), false);
});

test("later map intent invalidates an in-flight private-to-formal transition", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  assert.match(source, /const openDetail = async[\s\S]*?privateTransitionGeneration\.current \+= 1;[\s\S]*?const requestGeneration/);
  assert.match(source, /const closeSpotPanel = \(\) => \{\s*privateTransitionGeneration\.current \+= 1;/);
  assert.match(source, /const openLayerSheet = \(\) => \{\s*privateTransitionGeneration\.current \+= 1;/);
  assert.match(source, /if \(!entry\) return;[\s\S]*?confirmEditorLeave\(\)[\s\S]*?privateTransitionGeneration\.current \+= 1;/);
});
