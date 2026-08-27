import { timingSafeEqual } from "node:crypto";
import type { AdminOperation, AdminRole } from "@starward/miniapp-contracts";

const ROLE_OPERATIONS: Record<AdminRole, readonly AdminOperation[]> = {
  OWNER: [
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
  ],
  MODERATOR: [
    "QUEUE_READ",
    "CASE_READ",
    "CASE_REVIEW",
    "MERGE_PREVIEW",
  ],
  MEDIA_REVIEWER: ["MEDIA_READ", "MEDIA_REVIEW"],
  PUBLISHER: [
    "CASE_READ",
    "MERGE_PREVIEW",
    "PUBLICATION_ASSESS",
    "PUBLISH",
    "SUSPEND",
    "UNPUBLISH",
    "REPLACE",
    "RETIRE",
  ],
  AUDITOR: ["QUEUE_READ", "CASE_READ", "MEDIA_READ", "AUDIT_READ"],
};

export function assertAdminToken(provided: string | undefined) {
  const expected = process.env.MINIAPP_ADMIN_TOKEN?.trim();
  if (!expected) throw new Error("admin_capability_disabled");
  if (!provided) throw new Error("admin_auth_required");
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  )
    throw new Error("admin_auth_required");
}

export function normalizeAdminActor(value: string | undefined) {
  const actor = value?.trim() || "admin:local";
  if (!/^admin:[a-zA-Z0-9._-]{1,64}$/u.test(actor))
    throw new Error("admin_actor_invalid");
  return actor;
}

function configuredRoles(actor: string): readonly AdminRole[] {
  const raw = process.env.MINIAPP_ADMIN_RBAC?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production")
      throw new Error("admin_rbac_disabled");
    return ["OWNER"];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("admin_rbac_invalid");
  }
  const roles =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)[actor]
      : undefined;
  if (
    !Array.isArray(roles) ||
    roles.some(
      (role) =>
        typeof role !== "string" ||
        !(["OWNER", "MODERATOR", "MEDIA_REVIEWER", "PUBLISHER", "AUDITOR"] as const).includes(
          role as AdminRole,
        ),
    )
  )
    throw new Error("admin_rbac_actor_not_configured");
  return roles as AdminRole[];
}

export function assertAdminOperation(
  actor: string,
  operation: AdminOperation,
) {
  const roles = configuredRoles(actor);
  if (!roles.some((role) => ROLE_OPERATIONS[role].includes(operation)))
    throw new Error("admin_permission_denied");
  return roles;
}
