export type PackComponentKind = "manifest" | "coordinate" | "route" | "weather" | "astronomy" | "shooting" | "checklist" | "contact" | "map" | "media";
export type Freshness = "fresh" | "stale" | "expired";

export interface PackComponent {
  id: string;
  kind: PackComponentKind;
  version: string;
  bytes: number;
  sha256: string;
  observedSha256?: string;
  required: boolean;
  expiresAt?: string;
  coordinateGrant?: "none" | "approximate" | "exact-device-encrypted";
  licenseAllowsOffline: boolean;
}

export interface ObservationPack {
  id: string;
  revision: number;
  components: PackComponent[];
  activatedRevision?: number;
}

export const OFFLINE_POLICY = Object.freeze({ warningBytes: 500 * 1024 ** 2, packLimitBytes: 2 * 1024 ** 3, globalLimitBytes: 4 * 1024 ** 3, concurrentDownloads: 2, minimumReserveBytes: 1024 ** 3 });

export function validateObservationPack(pack: ObservationPack, input: { now: string; availableBytes: number; globalUsedBytes: number }) {
  const totalBytes = pack.components.reduce((sum, item) => sum + item.bytes, 0);
  const reserve = Math.max(OFFLINE_POLICY.minimumReserveBytes, Math.floor(input.availableBytes * 0.1));
  const componentResults = pack.components.map((item) => {
    const freshness: Freshness = !item.expiresAt ? "fresh" : Date.parse(item.expiresAt) <= Date.parse(input.now) ? "expired" : "fresh";
    const valid = item.licenseAllowsOffline && Boolean(item.sha256) && item.sha256 === item.observedSha256;
    return { ...item, freshness, valid, reason: !item.licenseAllowsOffline ? "license-blocked" : item.sha256 !== item.observedSha256 ? "checksum-mismatch" : null };
  });
  const requiredValid = componentResults.filter((item) => item.required).every((item) => item.valid);
  const storageValid = totalBytes <= OFFLINE_POLICY.packLimitBytes && input.globalUsedBytes + totalBytes <= OFFLINE_POLICY.globalLimitBytes && input.availableBytes - totalBytes >= reserve;
  return { totalBytes, warnLarge: totalBytes >= OFFLINE_POLICY.warningBytes, reserveBytes: reserve, componentResults, canActivate: requiredValid && storageValid, requiredValid, storageValid };
}

export interface QueueItem { id: string; idempotencyKey: string; revision: number; dependsOn: string[]; state: "queued" | "uploading" | "review" | "published" | "failed" | "conflict"; createdAt: string }

export interface PersistedQueueItem {
  id: string;
  idempotencyKey: string;
  revision?: number;
  dependsOn?: string[];
  state?: QueueItem["state"] | "pending";
  createdAt?: string;
}

const QUEUE_STATES = new Set<QueueItem["state"]>(["queued", "uploading", "review", "published", "failed", "conflict"]);

function normalizePersistedQueueItem(item: PersistedQueueItem, index: number): QueueItem {
  const persistedState = item.state === "pending" ? "queued" : item.state;
  const state = persistedState && QUEUE_STATES.has(persistedState) ? persistedState : "conflict";
  const revision = Number.isSafeInteger(item.revision) && (item.revision ?? 0) > 0 ? item.revision! : 1;
  const dependsOn = Array.isArray(item.dependsOn)
    ? [...new Set(item.dependsOn.filter((id): id is string => typeof id === "string" && id.length > 0 && id !== item.id))]
    : [];
  const createdAt = typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt))
    ? item.createdAt
    : new Date(index).toISOString();
  return { id: item.id, idempotencyKey: item.idempotencyKey, revision, dependsOn, state, createdAt };
}

export function planOfflineReplay(saved: readonly PersistedQueueItem[], completedKeys: Set<string> = new Set()) {
  const byIdempotencyKey = new Map<string, QueueItem>();
  saved.forEach((item, index) => {
    const normalized = normalizePersistedQueueItem(item, index);
    if (!byIdempotencyKey.has(normalized.idempotencyKey)) byIdempotencyKey.set(normalized.idempotencyKey, normalized);
  });
  const unique = [...byIdempotencyKey.values()];
  const pending = unique.filter((item) => item.state !== "published" && !completedKeys.has(item.idempotencyKey));
  const ordered: QueueItem[] = [];
  const remaining = new Map(pending.map((item) => [item.id, item]));
  while (remaining.size) {
    const ready = [...remaining.values()].filter((item) => item.dependsOn.every((id) => !remaining.has(id)));
    if (!ready.length) return { ordered, conflicts: [...remaining.values()], dataLoss: false };
    ready.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((item) => { ordered.push(item); remaining.delete(item.id); });
  }
  return { ordered, conflicts: [] as QueueItem[], dataLoss: false };
}

export function recoverOfflineQueue(input: { saved: readonly PersistedQueueItem[]; network: string; completedKeys?: Set<string> }) {
  const replay = planOfflineReplay(input.saved, input.completedKeys);
  return { restoredDrafts: input.saved.length, uploads: input.network === "restored" ? replay.ordered : [], conflictsVisible: true, conflicts: replay.conflicts, dataLoss: false };
}

export type SafetySession = { state: "foreground-timer" | "bounded-background" | "stopped"; startedAt: string; plannedEndAt: string; autoStopAt: string; permission: "granted" | "denied"; sampling: "foreground-high" | "balanced-5m-or-250m" | "stopped"; trackingClaim: boolean };
export function startSafetySession(input: { now: string; plannedEndAt: string; requestedHours?: number; backgroundPermission: boolean }): SafetySession {
  const requestedMs = Math.min(12, Math.max(0.25, input.requestedHours ?? 4)) * 3600_000;
  const autoStop = Math.min(Date.parse(input.plannedEndAt) + 30 * 60_000, Date.parse(input.now) + requestedMs);
  return { state: input.backgroundPermission ? "bounded-background" : "foreground-timer", startedAt: input.now, plannedEndAt: input.plannedEndAt, autoStopAt: new Date(autoStop).toISOString(), permission: input.backgroundPermission ? "granted" : "denied", sampling: input.backgroundPermission ? "balanced-5m-or-250m" : "foreground-high", trackingClaim: input.backgroundPermission };
}
export function stopSafetySession(session: SafetySession): SafetySession { return { ...session, state: "stopped", sampling: "stopped", trackingClaim: false }; }

export function buildLocationShare(input: { latitude: number; longitude: number; accuracyM: number; capturedAt: string; access: "public" | "approximate" | "invite_only"; recipient: string; expiresAt: string }) {
  const exact = input.access === "invite_only";
  return { recipient: input.recipient, expiresAt: input.expiresAt, capturedAt: input.capturedAt, accuracyM: exact ? input.accuracyM : Math.max(1000, input.accuracyM), latitude: exact ? input.latitude : Number(input.latitude.toFixed(2)), longitude: exact ? input.longitude : Number(input.longitude.toFixed(2)), deliveryState: "not-sent" as const, autoRetry: false };
}

export function switchOfflineBackup<T>(current: T, backup: T) { return { current: backup, rollback: current, atomic: true, confirmed: true }; }

export function restoreOfflineFieldState(input: { network: string; pack: { checksumValid: boolean; plan: unknown; route: unknown; toolbox: string[]; cachedAt?: string } }) {
  return { usable: input.pack.checksumValid, network: input.network, plan: input.pack.plan, route: input.pack.route, toolbox: input.pack.toolbox, cachedAt: input.pack.cachedAt, safetyNotice: "离线信息可能过期；出发前核对道路、天气与现场管理要求。" };
}
