import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ContributionSubmission, SpotId } from "@starward/miniapp-contracts";
import { privateContributionSelectionTransition } from "./private-contribution-transition.ts";

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

test("later map intent invalidates an in-flight private-to-formal transition", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  assert.match(source, /const openDetail = async[\s\S]*?privateTransitionGeneration\.current \+= 1;[\s\S]*?const requestGeneration/);
  assert.match(source, /const closeSpotPanel = \(\) => \{\s*privateTransitionGeneration\.current \+= 1;/);
  assert.match(source, /const openLayerSheet = \(\) => \{\s*privateTransitionGeneration\.current \+= 1;/);
  assert.match(source, /if \(!entry\) return;[\s\S]*?confirmEditorLeave\(\)[\s\S]*?privateTransitionGeneration\.current \+= 1;/);
});
