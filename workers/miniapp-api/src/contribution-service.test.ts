import assert from "node:assert/strict";
import test from "node:test";
import { crc32, deflateSync } from "node:zlib";
import type {
  ContributionDraftRequest,
  ContributionUploadId,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
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
    assert.equal(
      (await service.repository.getSpot(TEST_PUBLISHED_SPOT.spotId))?.status,
      TEST_PUBLISHED_SPOT.status,
      "submission never mutates or republishes the canonical spot",
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("bounded media upload strips private PNG metadata before review", async () => {
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
