import type { FastifyRequest } from "fastify";
export interface LocalPocOwner { id: string; scope: "local-owner-poc" }
export type LocalPocOwnerResolver = (request: Pick<FastifyRequest, "ip" | "headers">) => Promise<LocalPocOwner | null>;
/** Single-owner local POC only. A supplied user/role header never establishes identity. */
export const resolveLocalPocOwner: LocalPocOwnerResolver = async request =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.ip) ? { id: "local-owner", scope: "local-owner-poc" } : null;

/** Optional client restriction after trusted resolution; legacy unheaded
 * requests retain the same resolver behavior and receive no new guarantee. */
export function restrictLocalPocOwner(actor: LocalPocOwner | null, expected: unknown,
  error: (reason: "required" | "mismatch") => Error): LocalPocOwner | null {
  if (expected === undefined) return actor;
  if (!actor?.id || actor.scope !== "local-owner-poc") throw error("required");
  if (typeof expected !== "string" || expected !== actor.id) throw error("mismatch");
  return actor;
}
