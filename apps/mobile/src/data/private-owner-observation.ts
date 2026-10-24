export interface PrivateOwnerAuthority { status: "unknown" | "ready" | "denied"; ownerId: string | null }
/** Current private-read authority. Original command readback is deliberately
 * not a new current-owner observation. */
export function createPrivateOwnerObservation() {
  let authority: PrivateOwnerAuthority = { status: "unknown", ownerId: null }, generation = 0;
  const listeners = new Set<() => void>();
  const publish = (value: PrivateOwnerAuthority) => {
    if (authority.status === value.status && authority.ownerId === value.ownerId) return;
    authority = value; for (const listener of listeners) listener();
  };
  return {
    authority: () => authority,
    subscribeAuthority: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    currentOwner: () => authority.status === "ready" ? authority.ownerId ?? undefined : undefined,
    begin: () => ({ generation: ++generation, authority }),
    unconfirm: (token: { generation: number }) => { if (token.generation === generation) publish({ status: "unknown", ownerId: null }); },
    accept: (ownerId: string, token: { generation: number; authority: PrivateOwnerAuthority }, requestedOwnerId?: string) => {
      if (token.generation !== generation || requestedOwnerId && requestedOwnerId !== ownerId
        || token.authority !== authority && requestedOwnerId && requestedOwnerId !== authority.ownerId) return false;
      publish({ status: "ready", ownerId }); return true;
    },
    deny: (statusCode: number | undefined, startedAt: PrivateOwnerAuthority, requestedOwnerId?: string) => {
      if ([401, 403].includes(statusCode ?? 0) && startedAt === authority && (!requestedOwnerId || requestedOwnerId === authority.ownerId)) {
        // Reads started before this denial cannot confirm or unconfirm it.
        generation += 1;
        publish({ ...authority, status: "denied" });
      }
    },
    canPublish: (value: { ownerId: string }) => authority.status === "ready" && value.ownerId === authority.ownerId,
  };
}
