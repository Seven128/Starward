import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import type {
  AdminOperation,
  ContributionUploadId,
  SpotId,
} from "@starward/miniapp-contracts";
import {
  assertAdminOperation,
  authenticateAdmin,
} from "./admin-auth.ts";
import type { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

/** Authenticate first, then admit the JSON object before reading any fields. */
export function assertAdminObjectBody(body: unknown): asserts body is Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body))
    throw new BadRequestException("admin_body_invalid");
}

export function requiredText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum)
    throw new BadRequestException(`admin_${field}_invalid`);
  return value.trim();
}

export function requiredRevision(value: unknown, field = "revision") {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    throw new BadRequestException(`admin_${field}_invalid`);
  return value;
}

export function requiredIdempotency(value: string | undefined) {
  return requiredText(value, "idempotency_key", 200);
}

export function requiredSpotId(value: string) {
  const spotId = decodeURIComponent(value);
  if (!/^spot:[a-zA-Z0-9._:-]+$/u.test(spotId))
    throw new Error("formal_spot_not_found");
  return spotId as SpotId;
}

export function requiredUploadId(value: string) {
  const uploadId = decodeURIComponent(value);
  if (!/^upload:[a-zA-Z0-9._:-]+$/u.test(uploadId))
    throw new Error("contribution_upload_not_found");
  return uploadId as ContributionUploadId;
}

function requiredClaims(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 8 ||
    value.some((claim) => typeof claim !== "string" || !claim.trim()) ||
    new Set(value).size !== value.length
  )
    throw new Error("contribution_merge_claims_invalid");
  return value.map((claim) => (claim as string).trim());
}

export function optionalClaims(value: unknown): readonly string[] {
  return value === undefined ? [] : requiredClaims(value);
}

export function adminOperationsContext(
  service: MiniappService,
  token: string | undefined,
  actor: string | undefined,
  operation: AdminOperation,
) {
  const principal = authenticateAdmin(token, actor);
  assertAdminOperation(principal, operation);
  if (!(service.repository instanceof PostgresMiniappRepository))
    throw new Error("admin_requires_postgres");
  return {
    repository: service.repository,
    principal,
    actorId: principal.actorId,
    requestId: randomUUID(),
  };
}
