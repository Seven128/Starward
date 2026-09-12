import assert from "node:assert/strict";
import test from "node:test";
import { buildTestSpotDetail, TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { contributionFormalBaseline } from "./contribution-formal-baseline.ts";
import { assertContributionBaselineMatches } from "./contribution-validation.ts";

test("formal contribution baseline projects only current canonical facts", () => {
  const detail = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!;
  const baseline = contributionFormalBaseline(detail, 7);
  assert.equal(baseline.spotId, TEST_PUBLISHED_SPOT.spotId);
  assert.equal(baseline.revision, 7);
  assert.equal(baseline.fields.name, TEST_PUBLISHED_SPOT.name);
  assert.equal(baseline.fields.address, TEST_PUBLISHED_SPOT.address);
  assert.equal(baseline.fields.parking, "有");
  assert.ok(baseline.fields.parkingNote);
  assert.equal(baseline.fields.light, null);
  assert.ok(baseline.media.site.every((id) => TEST_PUBLISHED_SPOT.media.some((item) => item.id === id)));
});

test("baseline revision must be a positive canonical revision", () => {
  assert.throws(() => contributionFormalBaseline(buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!, 0), /revision_invalid/u);
});

test("baseline comparison accepts PostgreSQL jsonb key reordering", () => {
  const authoritative = contributionFormalBaseline(buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!, 7);
  const jsonbRoundTrip = {
    media: Object.fromEntries(Object.entries(authoritative.media).reverse()),
    fields: Object.fromEntries(Object.entries(authoritative.fields).reverse()),
    revision: authoritative.revision,
    spotId: authoritative.spotId,
  } as typeof authoritative;
  assert.notEqual(JSON.stringify(jsonbRoundTrip), JSON.stringify(authoritative));
  assert.doesNotThrow(() => assertContributionBaselineMatches(jsonbRoundTrip, authoritative));
  assert.throws(
    () => assertContributionBaselineMatches({ ...jsonbRoundTrip, revision: 8 }, authoritative),
    /contribution_baseline_snapshot_invalid/u,
  );
});

test("moderated formal facts and reference media override legacy projections, including explicit clears", () => {
  const detail = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!;
  detail.formalFacts = { parking: null, signal: "4G 信号较弱", hours: "19:00—次日05:00" };
  detail.formalMedia = { parking: ["upload:parking-reviewed"], site: ["upload:site-reviewed"] };
  const baseline = contributionFormalBaseline(detail, 8);
  assert.equal(baseline.fields.parking, null);
  assert.equal(baseline.fields.signal, "4G 信号较弱");
  assert.equal(baseline.fields.hours, "19:00—次日05:00");
  assert.deepEqual(baseline.media.parking, ["upload:parking-reviewed"]);
  assert.deepEqual(baseline.media.site, ["upload:site-reviewed"]);
});
