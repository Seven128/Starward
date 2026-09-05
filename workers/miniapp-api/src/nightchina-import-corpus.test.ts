import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { ImportDraft, SpotSummary } from "@starward/miniapp-contracts";
import {
  TEST_PUBLISHED_SPOT,
  TEST_SPOTS,
} from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

interface NightChinaCase {
  key: string;
  regionBucket: "guangdong" | "outside_guangdong";
  title: string;
  sourceUrl: string;
  reportedLocation: string;
  reportedCaptureDate: string;
  importText: string;
  rightsDisposition: "unconfirmed_source_photo_not_reused";
  expectedAssociation:
    | { kind: "new_place_proposal"; reason: string }
    | {
        kind: "existing_formal_spot";
        spotId: string;
        spotName: string;
        confirmation: "manual_required";
      };
}

interface NightChinaCorpus {
  schemaVersion: "starward-nightchina-import-cases-v1";
  cases: NightChinaCase[];
}

async function loadCorpus(): Promise<NightChinaCorpus> {
  return JSON.parse(
    await readFile(
      new URL("../../../tools/miniapp/fixtures/nightchina-import-cases.json", import.meta.url),
      "utf8",
    ),
  ) as NightChinaCorpus;
}

async function update(
  service: ReturnType<typeof createTestMiniappService>,
  userId: Parameters<typeof service.updateImportDraft>[0],
  draft: ImportDraft,
  input: Omit<Parameters<typeof service.updateImportDraft>[2], "expectedRevision">,
  key: string,
) {
  return (
    await service.updateImportDraft(
      userId,
      draft.importDraftId,
      { ...input, expectedRevision: draft.revision },
      key,
    )
  ).data;
}

test("fixed NightChina corpus traverses the real rights-safe import state owner", async () => {
  const corpus = await loadCorpus();
  assert.equal(corpus.schemaVersion, "starward-nightchina-import-cases-v1");
  assert.equal(corpus.cases.length, 10);
  assert.equal(
    corpus.cases.filter((item) => item.regionBucket === "guangdong").length,
    5,
  );
  assert.equal(
    corpus.cases.filter((item) => item.regionBucket === "outside_guangdong").length,
    5,
  );

  const formalAssociation = corpus.cases.find(
    (item) => item.expectedAssociation.kind === "existing_formal_spot",
  );
  if (
    !formalAssociation ||
    formalAssociation.expectedAssociation.kind !== "existing_formal_spot"
  )
    throw new Error("nightchina_formal_association_case_missing");
  const formalSpotId = formalAssociation.expectedAssociation.spotId;
  const catalogAssociation = TEST_SPOTS.find(
    (spot) => spot.spotId === formalSpotId,
  );
  assert.ok(catalogAssociation);
  const publishedCatalogAssociation: SpotSummary = {
    ...catalogAssociation,
    status: "PUBLISHED",
  };
  const formalSpots: readonly SpotSummary[] = [
    ...TEST_SPOTS.filter(
      (spot) => spot.spotId !== publishedCatalogAssociation.spotId,
    ),
    publishedCatalogAssociation,
    TEST_PUBLISHED_SPOT,
  ];
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository(formalSpots),
  });
  try {
    const principal = (
      await service.login({ code: "local:nightchina-corpus-owner" })
    ).data;
    const completed: ImportDraft[] = [];

    for (const [index, item] of corpus.cases.entries()) {
      assert.equal(item.rightsDisposition, "unconfirmed_source_photo_not_reused");
      let draft = (
        await service.createImportDraft(
          principal.userId,
          {
            platform: "OTHER",
            originalUrl: item.sourceUrl,
            rightsConfirmed: true,
          },
          `nightchina:${index}:create`,
        )
      ).data;
      assert.equal(draft.parseState, "GATED");
      assert.equal(draft.parseReason, "CAPABILITY_DISABLED_UNLICENSED");

      draft = await update(
        service,
        principal.userId,
        draft,
        {
          stage: "EDIT_DRAFT",
          title: item.title,
          body: item.importText,
          sourceNote: `${item.reportedLocation}；页面报告拍摄日期 ${item.reportedCaptureDate}；仅保留来源身份与独立短释义。`,
          visibility: "PRIVATE",
        },
        `nightchina:${index}:edit`,
      );
      assert.equal(draft.title.editedByUser, true);
      assert.equal(draft.body.editedByUser, true);
      assert.equal(draft.originalUrl, item.sourceUrl);

      draft = await update(
        service,
        principal.userId,
        draft,
        { stage: "ASSOCIATE_SPOT" },
        `nightchina:${index}:associate-stage`,
      );
      draft = await update(
        service,
        principal.userId,
        draft,
        item.expectedAssociation.kind === "existing_formal_spot"
          ? { spotId: item.expectedAssociation.spotId }
          : { createProposal: true },
        `nightchina:${index}:associate-choice`,
      );
      if (item.expectedAssociation.kind === "existing_formal_spot") {
        assert.equal(item.expectedAssociation.confirmation, "manual_required");
        assert.equal(draft.spotId, item.expectedAssociation.spotId);
        assert.equal(
          formalSpots.find((spot) => spot.spotId === draft.spotId)?.name,
          item.expectedAssociation.spotName,
        );
        assert.equal(
          formalSpots.find((spot) => spot.spotId === draft.spotId)?.status,
          "PUBLISHED",
        );
        assert.equal(draft.spotProposalId, null);
        assert.equal(draft.proposalReviewState, "NOT_APPLICABLE");
      } else {
        assert.equal(draft.spotId, null);
        assert.match(draft.spotProposalId ?? "", /^spot-proposal:/u);
        assert.equal(draft.proposalReviewState, "DRAFT");
      }

      const associatedProposalId = draft.spotProposalId;
      const repeatedAssociation = item.expectedAssociation.kind === "new_place_proposal"
        ? { spotId: null, createProposal: true }
        : {};
      draft = await update(
        service,
        principal.userId,
        draft,
        repeatedAssociation,
        `nightchina:${index}:repeat-save`,
      );
      assert.equal(draft.spotProposalId, associatedProposalId);
      draft = await update(
        service,
        principal.userId,
        draft,
        { ...repeatedAssociation, stage: "PREVIEW" },
        `nightchina:${index}:preview`,
      );
      draft = await update(
        service,
        principal.userId,
        draft,
        { ...repeatedAssociation, stage: "SUBMIT" },
        `nightchina:${index}:submit`,
      );
      assert.equal(draft.moderationState, "PENDING");
      assert.equal(draft.spotProposalId, associatedProposalId);
      assert.equal(
        draft.proposalReviewState,
        item.expectedAssociation.kind === "new_place_proposal"
          ? "PENDING"
          : "NOT_APPLICABLE",
      );
      completed.push(draft);
    }

    const persisted = (await service.listImportDrafts(principal.userId)).data.imports;
    assert.equal(persisted.length, corpus.cases.length);
    assert.deepEqual(
      persisted.map((draft) => draft.importDraftId).sort(),
      completed.map((draft) => draft.importDraftId).sort(),
    );
    assert.equal(persisted.filter((draft) => draft.spotId !== null).length, 1);
    assert.equal(persisted.filter((draft) => draft.spotProposalId !== null).length, 9);
    assert.ok(persisted.every((draft) => draft.moderationState === "PENDING"));
  } finally {
    await service.onModuleDestroy();
  }
});

test("import association rejects a catalog candidate that is not a current formal spot", async () => {
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository(TEST_SPOTS),
  });
  try {
    const principal = (
      await service.login({ code: "local:nightchina-non-formal-rejection" })
    ).data;
    let draft = (
      await service.createImportDraft(
        principal.userId,
        {
          platform: "OTHER",
          originalUrl: "https://nightchina.net/non-formal-boundary",
          rightsConfirmed: true,
        },
        "nightchina:non-formal:create",
      )
    ).data;
    draft = await update(
      service,
      principal.userId,
      draft,
      {
        stage: "EDIT_DRAFT",
        title: "非正式点关联边界",
        body: "仅验证资料不足的目录候选不能被导入流程冒充为正式观星点。",
      },
      "nightchina:non-formal:edit",
    );
    draft = await update(
      service,
      principal.userId,
      draft,
      { stage: "ASSOCIATE_SPOT" },
      "nightchina:non-formal:associate",
    );
    await assert.rejects(
      service.updateImportDraft(
        principal.userId,
        draft.importDraftId,
        {
          expectedRevision: draft.revision,
          spotId: TEST_SPOTS[0]!.spotId,
        },
        "nightchina:non-formal:reject",
      ),
      /formal_spot_not_found/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});
