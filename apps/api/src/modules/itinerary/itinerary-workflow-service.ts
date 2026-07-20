import { createHash } from "node:crypto";
import { applyItineraryPatch, mergeOfflinePatches, projectSharedItinerary, validateTimeline, type Itinerary, type ItineraryStage } from "../../../../../packages/domain/src/itinerary/index";

export type ItineraryCommand = "generate" | "overview" | "add-candidate" | "select-route" | "refresh" | "share-offline" | "merge-collaboration" | "astronomy-timeline";
interface RouteOption { id: string; label: string; distanceKm: number; driveMinutes: number; walkMinutes: number; toll: string; road: string; facilities: string; arrivalAt: string; windowState: string; risk: string }
interface ConflictView { field: string; original: unknown; incoming: unknown; originalActor: string; incomingActor: string }
export interface ItineraryWorkflowSnapshot {
  schemaVersion: "starward-itinerary-v1"; state: "draft" | "generated"; generatedAt: string; itinerary: Itinerary;
  inputs: { date: string; origin: string; people: number; transport: string; target: string; latestReturn: string; overnight: boolean; collaborative: boolean };
  generation: { confirmedDeparture: boolean; primary: string; backup: string; equipment: string[]; risks: string[]; sources: Array<{ part: string; version: string; generatedAt: string; state: string }> };
  candidates: Array<{ id: string; name: string; source: string; state: "candidate" | "added" }>;
  routes: RouteOption[]; selectedRouteId: string;
  refresh: { state: "idle" | "previewed" | "accepted"; previousRevision: number | null; preservedUserEdits: string[]; differences: string[]; recoveryRevision: number | null };
  share: null | { expiresAt: string; publicProjection: ReturnType<typeof projectSharedItinerary>; exportedSections: string[] };
  offlinePack: null | { revision: number; sizeBytes: number; checksum: string; state: "ready"; items: Array<{ kind: string; version: string; state: string }> };
  collaboration: { cursor: number; conflicts: ConflictView[]; mergedFields: string[]; recoveryRevision: number; state: "idle" | "needs-resolution" };
  timeline: { valid: boolean; conflicts: string[]; observingNight: string; events: Array<{ kind: string; label: string; startsAt: string; endsAt: string; reachable: boolean }> };
}

function stages(): ItineraryStage[] { return [
  { id: "departure", kind: "departure", startsAt: "2026-08-12T11:40:00Z", endsAt: "2026-08-12T12:40:00Z" },
  { id: "scouting", kind: "scouting", startsAt: "2026-08-12T12:50:00Z", endsAt: "2026-08-12T13:30:00Z", stopId: "main" },
  { id: "blue", kind: "blue-hour", startsAt: "2026-08-12T13:30:00Z", endsAt: "2026-08-12T14:00:00Z", stopId: "main" },
  { id: "moonless", kind: "moonless", startsAt: "2026-08-12T16:20:00Z", endsAt: "2026-08-12T16:35:00Z", stopId: "main" },
  { id: "milky-way", kind: "target-window", startsAt: "2026-08-12T16:35:00Z", endsAt: "2026-08-12T18:20:00Z", stopId: "main" },
  { id: "return", kind: "return", startsAt: "2026-08-12T18:30:00Z", endsAt: "2026-08-12T19:35:00Z" },
]; }

export class ItineraryWorkflowService {
  private plan: Itinerary;
  private state: ItineraryWorkflowSnapshot["state"] = "draft";
  private selectedRouteId = "fastest";
  private candidateState: "candidate" | "added" = "candidate";
  private refresh: ItineraryWorkflowSnapshot["refresh"] = { state: "idle", previousRevision: null, preservedUserEdits: [], differences: [], recoveryRevision: null };
  private share: ItineraryWorkflowSnapshot["share"] = null;
  private offlinePack: ItineraryWorkflowSnapshot["offlinePack"] = null;
  private collaboration: ItineraryWorkflowSnapshot["collaboration"] = { cursor: 12, conflicts: [], mergedFields: [], recoveryRevision: 7, state: "idle" };
  constructor(private readonly now: () => string = () => new Date().toISOString()) {
    const generatedAt = this.now();
    this.plan = { id: "plan-west-coast", title: "西涌银河观测夜", timezone: "Asia/Shanghai", revision: 7, sequence: 12, ownerId: "user-demo",
      stops: [{ id: "main", spotId: "西涌公开观测点", role: "primary", source: "user", coordinateVisibility: "public" }, { id: "backup", spotId: "大鹏受邀备选点", role: "backup", source: "system", coordinateVisibility: "invite_only" }], stages: stages(),
      routeSnapshot: { id: "route-cache-7", generatedAt, driveMinutes: 58, walkMinutes: 18 }, weatherSnapshot: { id: "forecast-cache-7", generatedAt }, operationLog: [] };
  }
  get(): ItineraryWorkflowSnapshot {
    const check = validateTimeline(this.plan.stages);
    return { schemaVersion: "starward-itinerary-v1", state: this.state, generatedAt: this.now(), itinerary: this.plan,
      inputs: { date: "2026-08-12", origin: "深圳市区", people: 2, transport: "驾车", target: "银河核心", latestReturn: "03:35", overnight: false, collaborative: true },
      generation: { confirmedDeparture: false, primary: "西涌公开观测点", backup: "大鹏受邀备选点", equipment: ["头灯", "保暖层", "三脚架", "备用电源"], risks: ["地点开放状态需出发前复核", "最后一公里与返程状态可能变化", "天气快照过期后需刷新"], sources: [
        { part: "地点", version: "spot-trust/current", generatedAt: this.plan.weatherSnapshot.generatedAt, state: "candidate-unverified" }, { part: "路线", version: this.plan.routeSnapshot.id, generatedAt: this.plan.routeSnapshot.generatedAt, state: "cached" },
        { part: "天气", version: this.plan.weatherSnapshot.id, generatedAt: this.plan.weatherSnapshot.generatedAt, state: "cached" }, { part: "天文", version: "astronomy-engine/2.1.19", generatedAt: this.plan.weatherSnapshot.generatedAt, state: "computed" },
      ] },
      candidates: [{ id: "candidate-salt", name: "盐田好友候选点", source: "好友分享", state: this.candidateState }], routes: this.routeOptions(), selectedRouteId: this.selectedRouteId,
      refresh: this.refresh, share: this.share, offlinePack: this.offlinePack, collaboration: this.collaboration,
      timeline: { valid: check.valid, conflicts: check.conflicts, observingNight: "2026-08-12 Asia/Shanghai", events: [
        { kind: "twilight", label: "天文昏影结束", startsAt: "2026-08-12T13:18:00Z", endsAt: "2026-08-12T13:18:00Z", reachable: true }, { kind: "moonset", label: "月落", startsAt: "2026-08-12T16:20:00Z", endsAt: "2026-08-12T16:20:00Z", reachable: true },
        { kind: "target", label: "银河核心窗口", startsAt: "2026-08-12T16:35:00Z", endsAt: "2026-08-12T18:20:00Z", reachable: true }, { kind: "return", label: "返程", startsAt: "2026-08-12T18:30:00Z", endsAt: "2026-08-12T19:35:00Z", reachable: true },
      ] } };
  }
  command(command: ItineraryCommand): ItineraryWorkflowSnapshot {
    if (command === "generate") this.state = "generated";
    if (command === "add-candidate" && this.candidateState === "candidate") { this.apply("add-candidate", { stops: [...this.plan.stops, { id: "candidate-salt", spotId: "盐田好友候选点", role: "backup", source: "friend", coordinateVisibility: "members" }] }); this.candidateState = "added"; }
    if (command === "select-route") { this.selectedRouteId = "safer"; this.apply("route-safer", { stages: this.plan.stages }); this.plan = { ...this.plan, routeSnapshot: { id: `route-safer-${this.plan.revision}`, generatedAt: this.now(), driveMinutes: 76, walkMinutes: 8 } }; }
    if (command === "refresh") { const previous = this.plan.revision; this.apply("refresh-weather", { stages: this.plan.stages }); this.plan = { ...this.plan, weatherSnapshot: { id: `forecast-refresh-${this.plan.revision}`, generatedAt: this.now() } }; this.refresh = { state: "accepted", previousRevision: previous, preservedUserEdits: ["手动阶段顺序", "主地点选择"], differences: ["低云上升 12%", "路线未变", "银河窗口未变"], recoveryRevision: previous }; }
    if (command === "share-offline") { const generatedAt = this.now(); const expiresAt = new Date(Date.parse(generatedAt) + 86_400_000).toISOString(); const publicProjection = projectSharedItinerary(this.plan, "anonymous"); this.share = { expiresAt, publicProjection, exportedSections: ["公开摘要", "阶段", "装备", "风险"] }; const items = [{ kind: "plan", version: String(this.plan.revision), state: "ready" }, { kind: "route", version: this.plan.routeSnapshot.id, state: "ready" }, { kind: "weather", version: this.plan.weatherSnapshot.id, state: "ready" }, { kind: "astronomy", version: "astronomy-engine/2.1.19", state: "ready" }, { kind: "tools", version: "field-tools-v1", state: "ready" }]; this.offlinePack = { revision: this.plan.revision, sizeBytes: 2_846_720, checksum: createHash("sha256").update(JSON.stringify({ plan: this.plan.id, revision: this.plan.revision, items })).digest("hex"), state: "ready", items }; }
    if (command === "merge-collaboration") { const merged = mergeOfflinePatches(this.plan, { id: "offline-left", actorId: "小林", baseRevision: this.plan.revision, sequence: this.plan.sequence + 1, at: this.now(), patch: { title: "西涌银河观测夜 · 20:10 出发", stops: this.plan.stops } }, { id: "offline-right", actorId: "阿辰", baseRevision: this.plan.revision, sequence: this.plan.sequence + 2, at: this.now(), patch: { title: "西涌银河观测夜 · 20:30 出发", stages: this.plan.stages } }); this.collaboration = { cursor: this.plan.sequence, conflicts: merged.conflicts, mergedFields: Object.keys(merged.mergedPatch), recoveryRevision: merged.recoveryRevision, state: merged.requiresResolution ? "needs-resolution" : "idle" }; }
    return this.get();
  }
  private apply(id: string, patch: Parameters<typeof applyItineraryPatch>[1]["patch"]) { const result = applyItineraryPatch(this.plan, { idempotencyKey: `${id}:${this.plan.revision}`, actorId: "user-demo", role: "owner", baseRevision: this.plan.revision, patch, at: this.now() }); if (result.status !== "applied") throw new Error(`itinerary_patch_${result.status}`); this.plan = result.value; }
  private routeOptions(): RouteOption[] { return [
    { id: "fastest", label: "最省时间", distanceKm: 42, driveMinutes: 58, walkMinutes: 18, toll: "¥18", road: "末段山路", facilities: "停车/洗手间待核", arrivalAt: "20:38", windowState: "可赶上", risk: "徒步较长，末段山路风险较高" },
    { id: "less-walk", label: "最少徒步", distanceKm: 48, driveMinutes: 69, walkMinutes: 5, toll: "¥24", road: "铺装路", facilities: "停车待核", arrivalAt: "20:49", windowState: "可赶上", risk: "停车容量未知" },
    { id: "darker", label: "光污染更低", distanceKm: 57, driveMinutes: 84, walkMinutes: 14, toll: "¥26", road: "县道", facilities: "无已核洗手间", arrivalAt: "21:04", windowState: "可赶上", risk: "暗度仅遥感估计" },
    { id: "facilities", label: "设施更完整", distanceKm: 53, driveMinutes: 82, walkMinutes: 3, toll: "¥22", road: "铺装路", facilities: "停车/洗手间候选", arrivalAt: "21:02", windowState: "蓝调已错过", risk: "可能错过前景勘察" },
    { id: "safer", label: "天气/道路备选", distanceKm: 53, driveMinutes: 76, walkMinutes: 8, toll: "¥20", road: "避开末段山路", facilities: "停车候选", arrivalAt: "20:56", windowState: "可赶上银河窗口", risk: "多 11 km、晚 18 分钟" },
  ]; }
}
