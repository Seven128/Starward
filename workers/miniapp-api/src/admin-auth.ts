import { createHash, timingSafeEqual } from "node:crypto";
import type { AdminOperation, AdminRole } from "@starward/miniapp-contracts";
import { configuredAdminCredentials, type AdminPrincipal, type ConfiguredCredential } from "./admin-credentials.ts";

const ROLE_OPERATIONS: Record<AdminRole, readonly AdminOperation[]> = {
  OWNER: [
    "SESSION_READ",
    "SPOT_CREATE",
    "SPOT_EDIT",
    "QUEUE_READ",
    "CASE_READ",
    "CASE_REVIEW",
    "MEDIA_READ",
    "MEDIA_REVIEW",
    "MERGE_PREVIEW",
    "MERGE_COMMIT",
    "PUBLICATION_ASSESS",
    "PUBLISH",
    "SUSPEND",
    "UNPUBLISH",
    "REPLACE",
    "RETIRE",
    "AUDIT_READ",
    "EVENT_CATALOG_READ",
    "EVENT_CATALOG_IMPORT",
    "EVENT_CATALOG_REVIEW",
    "EVENT_CATALOG_PUBLISH",
    "EVENT_CATALOG_ROLLBACK",
    "EVENT_CATALOG_SOURCE_MANAGE",
    "EVENT_CATALOG_RERUN",
  ],
  MODERATOR: [
    "SESSION_READ",
    "QUEUE_READ",
    "CASE_READ",
    "CASE_REVIEW",
    "MERGE_PREVIEW",
    "EVENT_CATALOG_READ",
    "EVENT_CATALOG_IMPORT",
    "EVENT_CATALOG_REVIEW",
  ],
  MEDIA_REVIEWER: ["SESSION_READ", "MEDIA_READ", "MEDIA_REVIEW"],
  PUBLISHER: [
    "SESSION_READ",
    "CASE_READ",
    "MERGE_PREVIEW",
    "PUBLICATION_ASSESS",
    "PUBLISH",
    "SUSPEND",
    "UNPUBLISH",
    "REPLACE",
    "RETIRE",
    "EVENT_CATALOG_READ",
    "EVENT_CATALOG_PUBLISH",
    "EVENT_CATALOG_ROLLBACK",
  ],
  AUDITOR: ["SESSION_READ", "QUEUE_READ", "CASE_READ", "MEDIA_READ", "AUDIT_READ", "EVENT_CATALOG_READ"],
};

export function authenticateAdmin(provided: string | undefined, assertedActor?: string): AdminPrincipal {
  const credentials = configuredAdminCredentials(process.env);
  if (!provided) throw new Error("admin_auth_required");
  const digest = createHash("sha256").update(provided).digest();
  let matched: ConfiguredCredential | undefined;
  for (const credential of credentials) {
    if (timingSafeEqual(Buffer.from(credential.tokenSha256, "hex"), digest)) matched = credential;
  }
  if (!matched) throw new Error("admin_auth_required");
  if (assertedActor !== undefined && assertedActor !== matched.actorId)
    throw new Error("admin_auth_actor_mismatch");
  return Object.freeze({ actorId: matched.actorId, roles: matched.roles });
}

export function adminOperations(principal: AdminPrincipal): readonly AdminOperation[] {
  return [...new Set(principal.roles.flatMap((role) => ROLE_OPERATIONS[role]))];
}

export function assertAdminOperation(principal: AdminPrincipal, operation: AdminOperation) {
  if (!principal.roles.some((role) => ROLE_OPERATIONS[role].includes(operation)))
    throw new Error("admin_permission_denied");
  return principal;
}
