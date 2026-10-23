import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { ContributionSubmission, ContributionUploadSessionRequest } from "@starward/miniapp-contracts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { contributionMediaObjectKey } from "./contribution-media-object.ts";
import { projectContributionUploadLifetime } from "./contribution-upload-lifetime.ts";

const bytes = readFileSync(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
const file = { originalName: "photo.jpg", mimeType: "image/jpeg" as const, byteSize: bytes.length };

for (const initialState of ["PENDING", "UPLOADED"] as const) {
  test(`${initialState} expiry recovers through the existing client without a maintenance sweep`, async t => {
    const service = createTestMiniappService();
    const startedAt = Date.now();
    let now = startedAt, deletes = 0;
    t.mock.method(Date, "now", () => now);
    const remove = service.contributions.mediaStore.delete.bind(service.contributions.mediaStore);
    t.mock.method(service.contributions.mediaStore, "delete", async (key: string) => { deletes++; await remove(key); });
    try {
      const userId = (await service.login({ code: `local:expiry-client-${initialState}` })).data.userId;
      let draft = (await service.createContributionDraft(userId, {
        kind: "FIELD_REPORT", spotId: TEST_PUBLISHED_SPOT.spotId, candidateLocation: null,
        observedAt: "2026-08-22T14:30:00.000Z", topics: ["LAST_ROAD"],
        detail: "现场看到末段道路可通行，返程照明较弱，需要自备照明并结伴。",
        rightsConfirmed: true, preciseLocationConsent: false,
      }, "expiry-client:draft")).data;
      draft = (await service.createContributionUpload(userId, draft.submissionId,
        { ...file, expectedRevision: draft.revision }, "expiry-client:first")).data;
      const original = draft.media[0]!;
      const oldKey = contributionMediaObjectKey(userId, original.uploadId, original.mimeType);
      if (initialState === "UPLOADED") draft = (await service.completeContributionUpload(userId, draft.submissionId,
        original.uploadId, { dataBase64: bytes.toString("base64") }, "expiry-client:first-complete")).data;
      now += 10 * 60_000;
      for (let i = 0; i < 2; i++) draft = (await service.createContributionUpload(userId, draft.submissionId,
        { ...file, expectedRevision: draft.revision }, `expiry-client:other:${i}`)).data;
      const untouched = structuredClone(draft.media.slice(1));
      now = Date.parse(original.expiresAt) + 1;
      await assert.rejects(service.completeContributionUpload(userId, draft.submissionId, original.uploadId,
        { dataBase64: bytes.toString("base64") }, "expiry-client:expired-complete"), /contribution_upload_expired/);
      const noCleanup = t.mock.method(service.repository, "expireContributionUploads", async () => {
        assert.fail("ordinary recovery reads must not sweep media");
      });
      const current = (await service.listContributions(userId)).data.submissions[0]!;
      assert.equal(current.media[0]!.state, "EXPIRED");
      assert.equal(current.revision, draft.revision);
      assert.equal(deletes, 0);
      now = startedAt;
      assert.equal((await service.repository.getContribution(userId, draft.submissionId))!.media[0]!.state,
        initialState, "the read projection did not rewrite durable media state");
      now = Date.parse(original.expiresAt) + 1;
      noCleanup.mock.restore();

      // Reuse the actual production recovery function with service-backed API
      // calls; its existing EXPIRED branch must replace this slot and upload.
      const source = ts.createSourceFile("commands.ts", readFileSync(new URL(
        "../../../apps/wechat-miniapp/src/content/contribution/use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
      const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "uploadSelectedFile");
      assert.ok(declaration);
      let replacementInput: ContributionUploadSessionRequest | undefined;
      const upload = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nuploadSelectedFile;", {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
      }).outputText, {
        validateMediaFile: () => file,
        createContributionUpload: async (id: typeof draft.submissionId, input: ContributionUploadSessionRequest) => {
          replacementInput = input;
          return service.createContributionUpload(userId, id, input, "expiry-client:replacement");
        },
        readBase64: async () => bytes.toString("base64"),
        completeContributionUpload: (id: typeof draft.submissionId, uploadId: typeof original.uploadId, input: { dataBase64: string }) =>
          service.completeContributionUpload(userId, id, uploadId, input, "expiry-client:replacement-complete"),
      });
      const form = { detail: "尚未保存的文字", applyMediaDraft(_next: ContributionSubmission) {},
        applyDraft() { assert.fail("media recovery must not overwrite the complete form"); } };
      const recovered: ContributionSubmission = await upload(form, current, { path: "photo.jpg" }, current.media[0], { assertCurrent() {} });
      assert.equal(replacementInput?.replaceUploadId, original.uploadId);
      assert.equal(recovered.media.length, 3);
      assert.notEqual(recovered.media[0]!.uploadId, original.uploadId);
      assert.equal(recovered.media[0]!.state, "UPLOADED");
      assert.deepEqual(recovered.media.slice(1), untouched);
      assert.equal(form.detail, "尚未保存的文字");
      assert.equal(deletes, 0, "the user's replacement does not run physical cleanup");
      const replay = (await service.createContributionUpload(userId, draft.submissionId,
        replacementInput!, "expiry-client:replacement")).data;
      assert.equal(replay.media[0]!.uploadId, recovered.media[0]!.uploadId);
      assert.equal(await service.contributions.cleanupExpiredUploads(), 1);
      assert.equal(await service.contributions.mediaStore.read(oldKey), null);
      assert.ok(await service.contributions.mediaStore.read(contributionMediaObjectKey(userId, recovered.media[0]!.uploadId, "image/jpeg")));
    } finally { t.mock.restoreAll(); await service.onModuleDestroy(); }
  });
}

test("expiry projection preserves attached media, frozen attempts and formal intent revision", async t => {
  const service = createTestMiniappService();
  const now = Date.now();
  try {
    const userId = (await service.login({ code: "local:expiry-read-boundaries" })).data.userId;
    const baseline = await service.repository.getContributionFormalBaseline(TEST_PUBLISHED_SPOT.spotId);
    assert.ok(baseline);
    let intent = await service.contributions.createFormalUploadIntent(userId,
      { spotId: baseline.spotId, baselineRevision: baseline.revision }, "expiry-boundary:intent");
    intent = await service.contributions.createFormalUpload(userId, intent.intentId,
      { ...file, kind: "site", expectedRevision: intent.revision }, "expiry-boundary:slot");
    const expiredAt = Date.parse(intent.expiresAt) + 1;
    const clock = t.mock.method(Date, "now", () => expiredAt);
    const projected = await service.repository.getFormalUploadIntent(userId, intent.intentId);
    assert.equal(projected!.uploads[0]!.state, "EXPIRED");
    assert.equal(projected!.revision, intent.revision);
    clock.mock.restore();
    assert.equal((await service.repository.getFormalUploadIntent(userId, intent.intentId))!.uploads[0]!.state, "PENDING");
    const draft = (await service.createContributionDraft(userId, { kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: null, observedAt: null, topics: [], detail: "", rightsConfirmed: false,
      preciseLocationConsent: false, candidateProfile: { fields: {}, media: {} } }, "expiry-boundary:draft")).data;
    const attached = { ...intent.uploads[0]!, state: "ATTACHED" as const };
    const frozen = { ...draft, media: [attached], attempts: [{ attemptId: "attempt:1", attemptNo: 1,
      baseRevision: draft.revision, submittedAt: new Date(now).toISOString(), review: null,
      snapshot: { ...draft, media: [intent.uploads[0]!] } }] };
    const result = projectContributionUploadLifetime(frozen, expiredAt);
    assert.deepEqual(result.media, [attached]);
    assert.deepEqual(result.attempts, frozen.attempts);
    assert.equal(result.revision, frozen.revision);
  } finally { t.mock.restoreAll(); await service.onModuleDestroy(); }
});
