import { timingSafeEqual } from "node:crypto";

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
