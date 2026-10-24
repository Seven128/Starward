/** Server-derived qualification for paired private-command API consumers.
 * A matching caller header restricts that principal; it never grants one. */
export interface PrivateCommandOwnerQualification {
  schemaVersion: "starward-private-command-owner-v1";
  ownerId: string;
}
export function isPrivateCommandOwnerQualification(value: unknown): value is PrivateCommandOwnerQualification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return Object.keys(item).length === 2 && item.schemaVersion === "starward-private-command-owner-v1"
    && typeof item.ownerId === "string" && !!item.ownerId.trim() && !/[\u0000-\u001f]/u.test(item.ownerId);
}
