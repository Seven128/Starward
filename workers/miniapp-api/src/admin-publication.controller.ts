import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import {
  adminOperationsContext,
  requiredIdempotency,
  requiredRevision,
  requiredSpotId,
  requiredText,
} from "./admin-operations-support.ts";
import { envelope } from "./admin.controller.ts";
import { MiniappService } from "./miniapp-service.ts";

type RevisionBody = {
  expectedSpotRevision?: number;
  expectedRevision?: number;
};

type LifecycleBody = RevisionBody & {
  reason?: string;
  assessmentDigest?: string;
};

type ReplacementBody = RevisionBody & {
  successorSpotId?: string | null;
  reason?: string;
};

@Controller("v2/admin")
export class AdminPublicationController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  @Post("spots/:spotId/publication-assessments")
  async assessPublication(
    @Param("spotId") spotId: string,
    @Body() body: LifecycleBody,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "PUBLICATION_ASSESS",
    );
    const expected = body.expectedSpotRevision ?? body.expectedRevision;
    const result = await context.repository.adminAssessPublication({
      spotId: requiredSpotId(spotId),
      expectedSpotRevision:
        expected === undefined
          ? null
          : requiredRevision(expected, "spot_revision"),
      reason: requiredText(body.reason, "publication_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requiredIdempotency(idempotencyKey),
    });
    return envelope(result);
  }

  @Get("spots/:spotId/revisions")
  async revisions(
    @Param("spotId") spotId: string,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "CASE_READ",
    );
    return envelope({
      revisions: await context.repository.adminListSpotRevisions(
        requiredSpotId(spotId),
      ),
    });
  }

  async #lifecycle(
    spotId: string,
    action: "UNPUBLISH" | "RETIRE",
    body: LifecycleBody,
    idempotencyKey: string | undefined,
    token: string | undefined,
    actor: string | undefined,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      action,
    );
    const result = await context.repository.adminChangeSpotLifecycle({
      spotId: requiredSpotId(spotId),
      action,
      expectedSpotRevision: requiredRevision(
        body.expectedSpotRevision ?? body.expectedRevision,
        "spot_revision",
      ),
      ...(body.assessmentDigest
        ? { assessmentDigest: body.assessmentDigest }
        : {}),
      reason: requiredText(body.reason, "lifecycle_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requiredIdempotency(idempotencyKey),
    });
    await this.service.cache.deleteByPrefix("map:");
    await this.service.cache.deleteByPrefix(`spot-overview:${spotId}`);
    return envelope(result);
  }

  @Post("spots/:spotId/unpublish")
  unpublish(
    @Param("spotId") spotId: string,
    @Body() body: LifecycleBody,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    return this.#lifecycle(
      spotId,
      "UNPUBLISH",
      body,
      idempotencyKey,
      token,
      actor,
    );
  }

  @Post("spots/:spotId/retire")
  retire(
    @Param("spotId") spotId: string,
    @Body() body: LifecycleBody,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    return this.#lifecycle(
      spotId,
      "RETIRE",
      body,
      idempotencyKey,
      token,
      actor,
    );
  }

  @Post("spots/:spotId/replacement-preview")
  async replacementPreview(
    @Param("spotId") spotId: string,
    @Body() body: ReplacementBody,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "REPLACE",
    );
    const successor = normalizeSuccessor(body.successorSpotId);
    const result = await context.repository.adminPreviewReplacement({
      spotId: requiredSpotId(spotId),
      successorSpotId: successor,
      expectedSpotRevision: requiredRevision(
        body.expectedSpotRevision ?? body.expectedRevision,
        "spot_revision",
      ),
    });
    return envelope({ impact: result });
  }

  @Post("spots/:spotId/replace")
  async replace(
    @Param("spotId") spotId: string,
    @Body() body: ReplacementBody,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "REPLACE",
    );
    const result = await context.repository.adminCommitReplacement({
      spotId: requiredSpotId(spotId),
      successorSpotId: normalizeSuccessor(body.successorSpotId),
      expectedSpotRevision: requiredRevision(
        body.expectedSpotRevision ?? body.expectedRevision,
        "spot_revision",
      ),
      reason: requiredText(body.reason, "replacement_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requiredIdempotency(idempotencyKey),
    });
    return envelope(result);
  }

  @Get("receipts/:receiptId")
  async receipt(
    @Param("receiptId") receiptId: string,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "AUDIT_READ",
    );
    const result = await context.repository.adminReadReceipt(
      decodeURIComponent(receiptId),
    );
    if (!result) throw new Error("operation_receipt_not_found");
    return envelope(result);
  }

  @Get("audit")
  async audit(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "AUDIT_READ",
    );
    return envelope({ entries: await context.repository.adminAuditLog() });
  }
}

function normalizeSuccessor(value: string | null | undefined) {
  return value === null || value === undefined ? null : requiredSpotId(value);
}
