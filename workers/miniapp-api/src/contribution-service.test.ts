import assert from "node:assert/strict";
import test from "node:test";
import { crc32, deflateSync } from "node:zlib";
import type {
  ContributionDraftRequest,
  ContributionUploadId,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { MemoryMediaObjectStore } from "./media-object-store.ts";
import { assertReceiptNotErased, eraseContributionContent } from "./account-data-erasure.ts";

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, 8 + data.length);
  return output;
}

function privateMetadataPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = deflateSync(Buffer.from([0, 0x20, 0x40, 0x60, 0xff]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("tEXt", Buffer.from("GPS\0precise private location", "utf8")),
    pngChunk("IDAT", pixels),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function reportInput(rightsConfirmed = false): ContributionDraftRequest {
  return {
    kind: "FIELD_REPORT",
    spotId: TEST_PUBLISHED_SPOT.spotId,
    candidateLocation: null,
    observedAt: "2026-08-22T14:30:00.000Z",
    topics: ["LAST_ROAD", "PARKING", "NIGHT_SAFETY"],
    detail: "现场看到末段道路可通行，停车区仍开放；返程照明较弱，需要自备照明并结伴。",
    rightsConfirmed,
    preciseLocationConsent: false,
  };
}

async function identity(service: ReturnType<typeof createTestMiniappService>, suffix: string) {
  return (
    await service.login({ code: `local:contribution-${suffix.padEnd(12, "x")}` })
  ).data.userId;
}

test("account erasure keeps structural evidence but excludes private and future fields", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "erase");
    const draft = (await service.createContributionDraft(userId, reportInput(true), "erase:contribution-draft")).data;
    const original = {
      ...draft,
      detail: "PRIVATE_REPORT_TEXT",
      candidateLocation: { name: "PRIVATE_NAME", latitude: 22.123456, longitude: 113.654321 } as never,
      media: [{ originalName: "PRIVATE_PHOTO", objectKey: "PRIVATE_KEY" }] as never,
      futurePrivateField: "PRIVATE_FUTURE_FIELD",
      review: { resolution: "APPROVED" as const, reason: "PRIVATE_REASON", reviewedAt: draft.createdAt },
      statusHistory: [{
        eventId: "event:review", axis: "SUBMISSION" as const, from: "DRAFT", to: "PENDING_REVIEW",
        reason: "PRIVATE_HISTORY", actorType: "USER" as const, occurredAt: draft.createdAt,
        extra: "PRIVATE_NESTED_FUTURE_FIELD",
      }],
    };
    const snapshot = structuredClone(original);
    const erased = eraseContributionContent(original, "2026-08-28T12:00:00.000Z");
    assert.doesNotMatch(JSON.stringify(erased), /PRIVATE_|22\.123456|113\.654321/u);
    assert.equal(erased.candidateLocation, null);
    assert.equal(erased.observedAt, null);
    assert.equal(erased.statusHistory[0]?.to, "PENDING_REVIEW");
    assert.equal(erased.submissionId, draft.submissionId);
    assert.equal(erased.revision, draft.revision);
    assert.deepEqual(original, snapshot, "erasure must not mutate the input snapshot");
    assert.throws(() => assertReceiptNotErased(erased), /operation_receipt_privacy_erased/u);
    assert.doesNotThrow(() => assertReceiptNotErased({ submissionId: draft.submissionId }));
  } finally {
    await service.onModuleDestroy();
  }
});

test("draft save response-loss retry replays the original revision without an extra update", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "save-retry");
    const otherId = await identity(service, "save-other");
    const draft = (await service.createContributionDraft(userId, reportInput(), "save-retry:create")).data;
    const input = { ...reportInput(), detail: "这是更新后的现场情况说明，验证保存回执丢失时不会重复更新草稿。", expectedRevision: draft.revision };
    const saved = await service.updateContributionDraft(userId, draft.submissionId, input, "save-retry:update");
    const replay = await service.updateContributionDraft(userId, draft.submissionId, input, "save-retry:update");
    assert.deepEqual(replay.data, saved.data);
    assert.equal(saved.data.revision, draft.revision + 1);
    const listed = (await service.listContributions(userId)).data.submissions;
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.revision, saved.data.revision);
    await assert.rejects(service.updateContributionDraft(userId, draft.submissionId, input, "save-retry:new-key"), /contribution_revision_conflict/);
    await assert.rejects(service.updateContributionDraft(otherId, draft.submissionId, input, "save-retry:update"), /contribution_not_found/);
  } finally {
    await service.onModuleDestroy();
  }
});

test("field reports remain identity-scoped and pending review cannot change a formal spot", async () => {
  const service = createTestMiniappService();
  try {
    const first = await identity(service, "first");
    const second = await identity(service, "second");
    const created = await service.createContributionDraft(
      first,
      reportInput(),
      "contribution:create:first",
    );
    assert.equal(created.data.state, "DRAFT");
    assert.equal((await service.listContributions(first)).data.submissions.length, 1);
    assert.equal((await service.listContributions(second)).data.submissions.length, 0);

    const submitted = await service.submitContribution(
      first,
      created.data.submissionId,
      created.data.revision,
      "contribution:submit:first",
    );
    assert.equal(submitted.data.state, "PENDING_REVIEW");
    const replay = await service.submitContribution(first, created.data.submissionId, created.data.revision, "contribution:submit:first");
    assert.deepEqual(replay.data, submitted.data, "lost response retry returns the same submission receipt");
    await assert.rejects(service.submitContribution(first, created.data.submissionId, submitted.data.revision, "contribution:submit:new"), /contribution_not_editable/);
    await assert.rejects(service.submitContribution(second, created.data.submissionId, created.data.revision, "contribution:submit:first"), /contribution_not_found/);
    assert.equal(
      (await service.repository.getSpot(TEST_PUBLISHED_SPOT.spotId))?.status,
      TEST_PUBLISHED_SPOT.status,
      "submission never mutates or republishes the canonical spot",
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("first-time submission still validates incomplete draft evidence before writing", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "incomplete");
    const created = await service.createContributionDraft(userId, { ...reportInput(), detail: "简短记录" }, "contribution:create:incomplete");
    await assert.rejects(service.submitContribution(userId, created.data.submissionId, created.data.revision, "contribution:submit:incomplete"), /contribution_detail_too_short/);
    const records = (await service.listContributions(userId)).data.submissions;
    assert.equal(records[0]?.state, "DRAFT");
    assert.equal(records[0]?.revision, created.data.revision);
  } finally { await service.onModuleDestroy(); }
});

test("bounded media upload strips private PNG metadata before review", async (context) => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "media");
    const created = await service.createContributionDraft(
      userId,
      reportInput(true),
      "contribution:create:media",
    );
    const source = privateMetadataPng();
    const session = await service.createContributionUpload(
      userId,
      created.data.submissionId,
      {
        originalName: "现场.png",
        mimeType: "image/png",
        byteSize: source.length,
        expectedRevision: created.data.revision,
      },
      "contribution:upload:create",
    );
    const upload = session.data.media[0]!;
    const completed = await service.completeContributionUpload(
      userId,
      created.data.submissionId,
      upload.uploadId,
      { dataBase64: source.toString("base64") },
      "contribution:upload:complete",
    );
    assert.equal(completed.data.media[0]?.state, "UPLOADED");
    assert.ok((completed.data.media[0]?.byteSize ?? source.length) < source.length);
    const reviewed = await service.contributions.readForAdmin(
      upload.uploadId as ContributionUploadId,
    );
    const stored = Buffer.from(reviewed.dataBase64, "base64");
    assert.equal(stored.includes(Buffer.from("GPS")), false);
    assert.equal(stored.includes(Buffer.from("precise private location")), false);

    // A retry before the temporary-media deadline confirms the existing bytes.
    const clock = context.mock.method(Date, "now", () => Date.parse(upload.expiresAt) - 1);
    try {
      const retry = await service.completeContributionUpload(
        userId, created.data.submissionId, upload.uploadId,
        { dataBase64: source.toString("base64") }, "contribution:upload:complete-retry",
      );
      assert.deepEqual(retry.data, completed.data);
    } finally { clock.mock.restore(); }

    const submitted = await service.submitContribution(
      userId,
      created.data.submissionId,
      completed.data.revision,
      "contribution:submit:media",
    );
    assert.equal(submitted.data.media[0]?.state, "ATTACHED");
  } finally {
    await service.onModuleDestroy();
  }
});

test("actual encoded JPEG is stored without a private comment after its scan", async () => {
  const original = readFileSync(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
  const privateText = Buffer.from("synthetic-private-location-after-scan");
  const header = Buffer.from([0xff, 0xfe, 0, 0]);
  header.writeUInt16BE(privateText.length + 2, 2);
  const source = Buffer.concat([original.subarray(0, -2), header, privateText, original.subarray(-2)]);
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "actual-jpeg");
    const created = await service.createContributionDraft(userId, reportInput(true), "actual-jpeg:create");
    const session = await service.createContributionUpload(userId, created.data.submissionId, {
      originalName: "self-generated.jpg", mimeType: "image/jpeg", byteSize: source.length, expectedRevision: created.data.revision,
    }, "actual-jpeg:upload");
    const upload = session.data.media[0]!;
    const completed = await service.completeContributionUpload(userId, created.data.submissionId, upload.uploadId,
      { dataBase64: source.toString("base64") }, "actual-jpeg:complete");
    assert.equal(completed.data.media[0]?.state, "UPLOADED");
    assert.equal(completed.data.media[0]?.byteSize, original.length);
    const reviewed = await service.contributions.readForAdmin(upload.uploadId);
    assert.deepEqual(Buffer.from(reviewed.dataBase64, "base64"), original);
  } finally { await service.onModuleDestroy(); }
});

test("third upload receipt remains replayable while a fourth upload is rejected", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "three-media");
    let draft = (await service.createContributionDraft(userId, reportInput(true), "three:create")).data;
    let thirdInput;
    for (let index = 0; index < 3; index++) {
      const input = { originalName: `${index}.png`, mimeType: "image/png" as const, byteSize: privateMetadataPng().length, expectedRevision: draft.revision };
      if (index === 2) thirdInput = input;
      draft = (await service.createContributionUpload(userId, draft.submissionId, input, `three:upload:${index}`)).data;
    }
    assert.ok(thirdInput);
    const replay = await service.createContributionUpload(userId, draft.submissionId, thirdInput, "three:upload:2");
    assert.deepEqual(replay.data, draft);
    await assert.rejects(service.createContributionUpload(userId, draft.submissionId, { ...thirdInput, expectedRevision: draft.revision }, "three:fourth"), /contribution_media_count_invalid/);
    assert.equal((await service.listContributions(userId)).data.submissions[0]?.media.length, 3);
  } finally { await service.onModuleDestroy(); }
});

test("expired upload replacement preserves the other two slots and is replayable", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "replacement");
    let draft = (await service.createContributionDraft(userId, reportInput(true), "replacement:draft")).data;
    const file = { originalName: "photo.png", mimeType: "image/png" as const, byteSize: privateMetadataPng().length };
    for (let index = 0; index < 3; index++) draft = (await service.createContributionUpload(userId, draft.submissionId, { ...file, expectedRevision: draft.revision }, `replacement:slot:${index}`)).data;
    await assert.rejects(service.createContributionUpload(userId, draft.submissionId, { ...file, expectedRevision: draft.revision, replaceUploadId: draft.media[1]!.uploadId }, "replacement:pending"), /contribution_upload_replacement_invalid/);
    await service.repository.expireContributionUploads(new Date(Date.parse(draft.media[2]!.expiresAt) + 1000).toISOString());
    draft = (await service.listContributions(userId)).data.submissions[0]!;
    const request = { ...file, expectedRevision: draft.revision, replaceUploadId: draft.media[1]!.uploadId };
    const replaced = (await service.createContributionUpload(userId, draft.submissionId, request, "replacement:expired")).data;
    assert.equal(replaced.media.length, 3);
    assert.deepEqual(replaced.media[0], draft.media[0]);
    assert.deepEqual(replaced.media[2], draft.media[2]);
    assert.notEqual(replaced.media[1]!.uploadId, draft.media[1]!.uploadId);
    assert.equal(replaced.media[1]!.state, "PENDING");
    assert.deepEqual((await service.createContributionUpload(userId, draft.submissionId, request, "replacement:expired")).data, replaced);
  } finally { await service.onModuleDestroy(); }
});

test("unsubmitted uploaded media cannot be confirmed after its temporary deadline", async (context) => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "expiry");
    const draft = (await service.createContributionDraft(userId, reportInput(true), "expiry:create")).data;
    const bytes = privateMetadataPng();
    const session = await service.createContributionUpload(userId, draft.submissionId, {
      originalName: "expiry.png", mimeType: "image/png", byteSize: bytes.length, expectedRevision: draft.revision,
    }, "expiry:upload");
    const upload = session.data.media[0]!;
    await service.completeContributionUpload(userId, draft.submissionId, upload.uploadId, { dataBase64: bytes.toString("base64") }, "expiry:complete");
    const clock = context.mock.method(Date, "now", () => Date.parse(upload.expiresAt) + 1);
    try {
      await assert.rejects(service.completeContributionUpload(userId, draft.submissionId, upload.uploadId, { dataBase64: bytes.toString("base64") }, "expiry:retry"), /contribution_upload_expired/);
    } finally { clock.mock.restore(); }
  } finally { await service.onModuleDestroy(); }
});

test("failed private media deletion remains retryable after expiry state is committed", async () => {
  class FailingOnceStore extends MemoryMediaObjectStore {
    attempts = 0;
    override async delete(key: string) {
      this.attempts++;
      if (this.attempts === 1) throw new Error("temporary filesystem failure");
      return super.delete(key);
    }
  }
  const mediaStore = new FailingOnceStore();
  const service = createTestMiniappService({ mediaStore });
  try {
    const userId = await identity(service, "cleanup-retry");
    const draft = (await service.createContributionDraft(userId, reportInput(true), "cleanup:draft")).data;
    const bytes = privateMetadataPng();
    const session = (await service.createContributionUpload(userId, draft.submissionId, { originalName: "cleanup.png", mimeType: "image/png", byteSize: bytes.length, expectedRevision: draft.revision }, "cleanup:upload")).data;
    const upload = session.media[0]!;
    await service.completeContributionUpload(userId, draft.submissionId, upload.uploadId, { dataBase64: bytes.toString("base64") }, "cleanup:complete");
    const keys = await service.repository.expireContributionUploads(new Date(Date.parse(upload.expiresAt) + 1).toISOString());
    assert.equal(keys.length, 1);
    await assert.rejects(service.contributions.cleanupExpiredUploads(), /temporary filesystem failure/);
    assert.ok(await mediaStore.read(keys[0]!));
    assert.equal(await service.contributions.cleanupExpiredUploads(), 1);
    assert.equal(await mediaStore.read(keys[0]!), null);
    assert.equal(await service.contributions.cleanupExpiredUploads(), 0);
    assert.equal(mediaStore.attempts, 2);
  } finally { await service.onModuleDestroy(); }
});

test("media removal is scoped, revision checked, replayable and deletes only its private object", async () => {
  const mediaStore = new MemoryMediaObjectStore();
  const service = createTestMiniappService({ mediaStore });
  try {
    const userId = await identity(service, "remove");
    const otherUser = await identity(service, "remove-other");
    let draft = (await service.createContributionDraft(userId, reportInput(true), "remove:draft")).data;
    const bytes = privateMetadataPng();
    for (let index = 0; index < 2; index++) {
      draft = (await service.createContributionUpload(userId, draft.submissionId, { originalName: "photo.png", mimeType: "image/png", byteSize: bytes.length, expectedRevision: draft.revision }, `remove:upload:${index}`)).data;
      draft = (await service.completeContributionUpload(userId, draft.submissionId, draft.media[index]!.uploadId, { dataBase64: bytes.toString("base64") }, `remove:complete:${index}`)).data;
    }
    const target = draft.media[0]!;
    const object = await service.repository.getContributionUploadObject(target.uploadId);
    assert.ok(object);
    await assert.rejects(service.removeContributionUpload(otherUser, draft.submissionId, target.uploadId, draft.revision, "remove:foreign"), /contribution_not_found/);
    await assert.rejects(service.removeContributionUpload(userId, draft.submissionId, target.uploadId, draft.revision - 1, "remove:stale"), /contribution_revision_conflict/);
    const removed = await service.removeContributionUpload(userId, draft.submissionId, target.uploadId, draft.revision, "remove:target");
    assert.deepEqual(removed.data.media, [draft.media[1]]);
    assert.equal(await mediaStore.read(object.objectKey), null);
    assert.deepEqual((await service.removeContributionUpload(userId, draft.submissionId, target.uploadId, draft.revision, "remove:target")).data, removed.data);
    assert.ok(await service.contributions.readForAdmin(draft.media[1]!.uploadId));
    const submitted = await service.submitContribution(userId, draft.submissionId, removed.data.revision, "remove:submit");
    await assert.rejects(service.removeContributionUpload(userId, draft.submissionId, draft.media[1]!.uploadId, submitted.data.revision, "remove:submitted"), /contribution_not_editable/);
  } finally { await service.onModuleDestroy(); }
});

test("media cannot be uploaded before rights confirmation", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "rights");
    const created = await service.createContributionDraft(
      userId,
      reportInput(false),
      "contribution:create:rights",
    );
    await assert.rejects(
      service.createContributionUpload(
        userId,
        created.data.submissionId,
        {
          originalName: "现场.png",
          mimeType: "image/png",
          byteSize: privateMetadataPng().length,
          expectedRevision: created.data.revision,
        },
        "contribution:upload:rights",
      ),
      /contribution_media_rights_required/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("declared MIME cannot bypass server-side magic and pixel validation", async () => {
  const service = createTestMiniappService();
  try {
    const userId = await identity(service, "magic");
    const created = await service.createContributionDraft(
      userId,
      reportInput(true),
      "contribution:create:magic",
    );
    const jpegSignature = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const session = await service.createContributionUpload(
      userId,
      created.data.submissionId,
      {
        originalName: "现场.png",
        mimeType: "image/png",
        byteSize: jpegSignature.length,
        expectedRevision: created.data.revision,
      },
      "contribution:upload:magic",
    );
    await assert.rejects(
      service.completeContributionUpload(
        userId,
        created.data.submissionId,
        session.data.media[0]!.uploadId,
        { dataBase64: jpegSignature.toString("base64") },
        "contribution:upload:magic-complete",
      ),
      /contribution_media_(?:signature|png|dimensions)/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});
import { readFileSync } from "node:fs";
