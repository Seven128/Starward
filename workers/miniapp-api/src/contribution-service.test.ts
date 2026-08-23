import assert from "node:assert/strict";
import test from "node:test";
import { crc32, deflateSync } from "node:zlib";
import type {
  ContributionDraftRequest,
  ContributionUploadId,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

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
