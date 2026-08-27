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
  optionalClaims,
  requiredIdempotency,
  requiredRevision,
  requiredSpotId,
  requiredText,
  requiredUploadId,
} from "./admin-operations-support.ts";
import { envelope } from "./admin.controller.ts";
import { MiniappService } from "./miniapp-service.ts";

@Controller("v2/admin")
export class AdminOperationsController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  @Get("moderation/queue")
  async queue(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "QUEUE_READ",
    );
    return envelope({
      items: await context.repository.adminListModerationQueue(),
    });
  }

  @Get("moderation/cases/:caseId")
  async moderationCase(
    @Param("caseId") caseId: string,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "CASE_READ",
    );
    const result = await context.repository.adminGetModerationCase(
      decodeURIComponent(caseId),
    );
    if (!result) throw new Error("moderation_case_not_found");
    return envelope({ case: result });
  }

  @Post("moderation/cases/:caseId/request-changes")
  async requestChanges(
    @Param("caseId") caseId: string,
    @Body() body: { reason?: string; expectedRevision?: number },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "CASE_REVIEW",
    );
    const result = await context.repository.adminRequestContributionChanges({
      caseId: decodeURIComponent(caseId),
      reason: requiredText(body.reason, "moderation_reason", 500),
      expectedRevision: requiredRevision(body.expectedRevision, "revision"),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requiredIdempotency(idempotencyKey),
    });
    return envelope(result);
  }

  @Get("contribution-media/:uploadId/review")
  async mediaReview(
    @Param("uploadId") uploadId: string,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "MEDIA_READ",
    );
    const result = await context.repository.adminGetMediaReview(
      requiredUploadId(uploadId),
    );
    if (!result) throw new Error("contribution_upload_not_found");
    return envelope({ media: result });
  }

  @Post("contribution-media/:uploadId/review")
  async reviewMedia(
    @Param("uploadId") uploadId: string,
    @Body()
    body: { decision?: string; reason?: string; expectedRevision?: number },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
    caseId?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "MEDIA_REVIEW",
    );
    if (body.decision !== "ACCEPTED" && body.decision !== "REJECTED")
      throw new Error("admin_media_decision_invalid");
    const result = await context.repository.adminReviewContributionMedia({
      uploadId: requiredUploadId(uploadId),
      ...(caseId !== undefined ? { caseId: decodeURIComponent(caseId) } : {}),
      decision: body.decision,
      reason: requiredText(body.reason, "media_review_reason", 500),
      expectedRevision:
        body.expectedRevision === undefined
          ? null
          : requiredRevision(body.expectedRevision, "revision"),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requiredIdempotency(idempotencyKey),
    });
    return envelope(result);
  }

  @Post("moderation/cases/:caseId/media-decisions")
  mediaDecision(
    @Param("caseId") caseId: string,
    @Body() body: { mediaId?: string; decision?: string; reason?: string },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    if (body.decision !== "ACCEPT" && body.decision !== "REJECT")
      throw new Error("admin_media_decision_invalid");
    return this.reviewMedia(
      requiredUploadId(body.mediaId ?? ""),
      {
        decision: body.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
      },
      idempotencyKey,
      token,
      actor,
      caseId,
    );
  }

  @Post("moderation/cases/:caseId/merge-preview")
  async mergePreview(
    @Param("caseId") caseId: string,
    @Body()
    body: {
      spotId?: string;
      confirmedClaims?: readonly string[];
      expectedSubmissionRevision?: number;
      expectedSpotRevision?: number;
    },
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = adminOperationsContext(
      this.service,
      token,
      actor,
      "MERGE_PREVIEW",
    );
    const result = await context.repository.adminCreateMergePreview({
      caseId: decodeURIComponent(caseId),
      spotId: requiredSpotId(body.spotId ?? ""),
      confirmedClaims: optionalClaims(body.confirmedClaims),
      expectedSubmissionRevision: requiredRevision(
        body.expectedSubmissionRevision,
        "submission_revision",
      ),
      expectedSpotRevision: requiredRevision(
        body.expectedSpotRevision,
        "spot_revision",
      ),
    });
    return envelope({ preview: result });
  }
}
