import { randomUUID } from "node:crypto";
import { authorizeCoordinate, buildExportProjection, createDeletionRequest, revokeSession, sanitizeAnalyticsPayload, type DeviceSession } from "@starward/domain/identity";

export type ProfileCommand = "merge-guest" | "revoke-session" | "inspect-content" | "request-export" | "request-deletion" | "open-sources" | "restrict-location";

export interface ProfileSnapshot {
  schemaVersion: "starward-profile-v1";
  revision: number;
  user: { id: string; displayName: string; observerTypes: string[]; activePreset: string };
  localGuestData: { total: number; retainedUntilAcknowledged: boolean; items: Array<{ id: string; kind: string; revision: number; selected: boolean; conflict?: string }> };
  merge: { state: "not-started" | "completed"; selectedCount: number; conflictCount: number; idempotencyKeys: string[] };
  sessions: Array<{ id: string; label: string; current: boolean; revokedAt: string | null; lastActiveAt: string }>;
  content: { contributions: Record<string, number>; offlinePacks: number; equipment: Array<{ id: string; label: string; referencedByPlans: number; state: "active" | "archived" }> };
  exportJob: ReturnType<typeof buildExportProjection> | null;
  deletion: ReturnType<typeof createDeletionRequest> | null;
  privacy: { analyticsConsent: boolean; consentRevision: number; locationHistoryState: "retained" | "deleting"; sharedCoordinate: ReturnType<typeof authorizeCoordinate>; sanitizedAnalytics: Record<string, unknown> };
  sources: { appBuild: string; registryVersion: string; items: Array<{ category: string; source: string; version: string; licenseState: string; updatedAt: string }> };
  boundaries: string[];
}

const nowDefault = () => new Date().toISOString();

export class ProfileService {
  private revision = 1;
  private readonly sessions: DeviceSession[] = [
    { id: "session-current", userId: "user-demo", refreshTokenHash: "redacted-current", current: true, revokedAt: null, rotation: 2 },
    { id: "session-windows", userId: "user-demo", refreshTokenHash: "redacted-other", current: false, revokedAt: null, rotation: 1 },
  ];
  private merge: ProfileSnapshot["merge"] = { state: "not-started", selectedCount: 0, conflictCount: 0, idempotencyKeys: [] };
  private exportJob: ProfileSnapshot["exportJob"] = null;
  private deletion: ProfileSnapshot["deletion"] = null;
  private privacy: ProfileSnapshot["privacy"];

  constructor(private readonly now: () => string = nowDefault) {
    this.privacy = {
      analyticsConsent: true,
      consentRevision: 1,
      locationHistoryState: "retained",
      sharedCoordinate: authorizeCoordinate({ visibility: "invite_only", viewer: "anonymous", lat: 22.529, lon: 113.9468 }),
      sanitizedAnalytics: {},
    };
  }

  get(): ProfileSnapshot {
    return {
      schemaVersion: "starward-profile-v1", revision: this.revision,
      user: { id: "user-demo", displayName: "星野用户", observerTypes: ["目视观测", "星空摄影"], activePreset: "城郊轻装" },
      localGuestData: { total: 4, retainedUntilAcknowledged: true, items: [
        { id: "pref-local", kind: "偏好", revision: 3, selected: true }, { id: "fav-local", kind: "收藏", revision: 2, selected: true, conflict: "keep-both" },
        { id: "trip-draft", kind: "行程草稿", revision: 1, selected: true }, { id: "report-pending", kind: "待上传实况", revision: 1, selected: false },
      ] },
      merge: this.merge,
      sessions: this.sessions.map((session) => ({ ...session, label: session.current ? "当前设备 · iPhone" : "Windows Chrome", lastActiveAt: session.current ? "2 分钟前" : "7 月 18 日", refreshTokenHash: undefined })).map(({ refreshTokenHash: _secret, userId: _userId, rotation: _rotation, ...safe }) => safe),
      content: { contributions: { pending: 1, published: 3, rejected: 1 }, offlinePacks: 2, equipment: [
        { id: "camera-full-frame", label: "全画幅相机", referencedByPlans: 0, state: "active" }, { id: "lens-20", label: "20 mm 镜头", referencedByPlans: 2, state: "active" },
        { id: "scope-80", label: "80 mm 望远镜", referencedByPlans: 1, state: "active" }, { id: "tripod", label: "三脚架", referencedByPlans: 0, state: "active" },
      ] },
      exportJob: this.exportJob, deletion: this.deletion, privacy: this.privacy,
      sources: { appBuild: "0.1.0", registryVersion: "source-registry-v1", items: [
        { category: "天气", source: "Open-Meteo POC", version: "GFS/ECMWF run-time", licenseState: "非商业 POC；生产合同待确认", updatedAt: this.now() },
        { category: "光污染", source: "EOG Annual VNL", version: "v2.2 candidate", licenseState: "生产许可待外部确认", updatedAt: "2026-07-20T00:00:00Z" },
        { category: "天文", source: "Astronomy Engine", version: "2.1.19 adapter", licenseState: "算法版本化；权威校准待确认", updatedAt: "2026-07-20T00:00:00Z" },
      ] },
      boundaries: ["受限地点坐标由服务端按接收者裁剪", "分析事件不接收精确位置、轨迹或 EXIF", "令牌只存哈希且不会进入响应或审计"],
    };
  }

  command(command: ProfileCommand): ProfileSnapshot {
    if (command === "merge-guest") this.merge = { state: "completed", selectedCount: 3, conflictCount: 1, idempotencyKeys: ["guest-merge:preferences:pref-local:3", "guest-merge:favorites:fav-local:2", "guest-merge:drafts:trip-draft:1"] };
    if (command === "revoke-session") {
      if (this.sessions.find((session) => session.id === "session-windows")?.revokedAt) return this.get();
      const result = revokeSession(this.sessions, "session-windows", "user-demo", true);
      if (!result.ok) throw new Error(result.reason);
      this.sessions.splice(0, this.sessions.length, ...result.sessions);
    }
    if (command === "request-export") this.exportJob = buildExportProjection({ userId: "user-demo", generatedAt: this.now(), payload: { account: { id: "user-demo" }, preferences: { active: "城郊轻装" }, equipment: this.get().content.equipment, favorites: ["spot-public"], itineraries: [{ id: "plan-7", role: "owner" }], contributions: { own: true }, shooting: { versions: 2 }, notifications: { enabled: true }, consents: { analytics: this.privacy.analyticsConsent }, otherUserPrivateFields: "excluded" } });
    if (command === "request-deletion") this.deletion = createDeletionRequest({ id: randomUUID(), userId: "user-demo", requestedAt: this.now(), reauthenticated: true, publicContributionChoice: "anonymize-facts" });
    if (command === "restrict-location") this.privacy = { analyticsConsent: false, consentRevision: this.privacy.consentRevision + 1, locationHistoryState: "deleting", sharedCoordinate: authorizeCoordinate({ visibility: "invite_only", viewer: "anonymous", lat: 22.529, lon: 113.9468 }), sanitizedAnalytics: sanitizeAnalyticsPayload({ event: "privacy_updated", grid: "cn-44-rough", latitude: 22.529, longitude: 113.9468, exif: { gps: true } }) };
    this.revision += 1;
    return this.get();
  }
}
