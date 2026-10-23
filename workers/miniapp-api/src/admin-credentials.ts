import { createHash } from "node:crypto";
import type { AdminRole } from "@starward/miniapp-contracts";

const ADMIN_ROLES: readonly AdminRole[] = ["OWNER", "MODERATOR", "MEDIA_REVIEWER", "PUBLISHER", "AUDITOR"];

export interface AdminPrincipal {
  readonly actorId: string;
  readonly roles: readonly AdminRole[];
}

export interface ConfiguredCredential extends AdminPrincipal {
  readonly tokenSha256: string;
}

function parseConfiguration(raw: string, code: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(code);
  }
}

function principal(actor: unknown, roles: unknown): AdminPrincipal {
  if (typeof actor !== "string" || !/^admin:[a-zA-Z0-9._-]{1,64}$/u.test(actor))
    throw new Error("admin_rbac_configuration_invalid");
  if (
    !Array.isArray(roles) || roles.length === 0 ||
    roles.some(
      (role) => typeof role !== "string" || !ADMIN_ROLES.includes(role as AdminRole),
    )
  )
    throw new Error("admin_rbac_actor_not_configured");
  return Object.freeze({ actorId: actor, roles: Object.freeze([...new Set(roles)] as AdminRole[]) });
}

export function configuredAdminCredentials(environment: Record<string, string | undefined>): readonly ConfiguredCredential[] {
  const raw = environment.MINIAPP_ADMIN_CREDENTIALS?.trim();
  if (raw) {
    const parsed = parseConfiguration(raw, "admin_rbac_configuration_invalid");
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new Error("admin_rbac_configuration_invalid");
    const digests = new Set<string>();
    return parsed.map((value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("admin_rbac_configuration_invalid");
      const record = value as Record<string, unknown>;
      const digest = record.tokenSha256;
      if (typeof digest !== "string" || !/^[a-f0-9]{64}$/u.test(digest) || digests.has(digest))
        throw new Error("admin_rbac_configuration_invalid");
      digests.add(digest);
      return { ...principal(record.actorId, record.roles), tokenSha256: digest };
    });
  }

  // Compatibility for one credential only. The server fixes its identity;
  // neither NODE_ENV nor a request header may select a more privileged actor.
  const token = environment.MINIAPP_ADMIN_TOKEN?.trim();
  if (!token) throw new Error("admin_capability_disabled");
  const actorId = environment.MINIAPP_ADMIN_ACTOR?.trim();
  if (!actorId) throw new Error("admin_rbac_principal_not_configured");
  const rbac = environment.MINIAPP_ADMIN_RBAC?.trim();
  if (!rbac) throw new Error("admin_rbac_disabled");
  const mapping = parseConfiguration(rbac, "admin_rbac_invalid");
  const roles = mapping && typeof mapping === "object" && !Array.isArray(mapping)
    ? (mapping as Record<string, unknown>)[actorId] : undefined;
  return [{ ...principal(actorId, roles), tokenSha256: createHash("sha256").update(token).digest("hex") }];
}
