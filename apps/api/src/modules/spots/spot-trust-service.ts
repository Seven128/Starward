import type { Wgs84Coordinate } from "../../../../../packages/coordinate-system/src/index";

export type CoordinateVisibility = "public_exact" | "public_approximate" | "verified_only" | "invite_only" | "private" | "hidden";
export type SpotAction = "share" | "navigate" | "offline" | "itinerary";
export type FactState = "known" | "unknown" | "temporary-unavailable" | "conflict";

export interface SpotActor {
  userId: string | null;
  verified: boolean;
  roles: string[];
  invitedSpotIds: string[];
}

export interface SpotRecord {
  id: string;
  ownerId: string | null;
  name: string;
  coordinate: Wgs84Coordinate;
  visibility: CoordinateVisibility;
  status: "open" | "caution" | "closed";
  statusReason: string | null;
  updatedAt: string;
}

export interface SpotFact {
  id: string;
  key: string;
  value: string | number | boolean | null;
  state: Exclude<FactState, "conflict">;
  sourceType: "official" | "admin-verified" | "verified-contribution" | "community" | "model";
  sourceLabel: string;
  observedAt: string;
  expiresAt: string | null;
  version: string;
  safetyRelevant: boolean;
}

export interface ResolvedSpotFact {
  key: string;
  state: FactState;
  value: SpotFact["value"];
  sources: Array<Pick<SpotFact, "id" | "sourceType" | "sourceLabel" | "observedAt" | "expiresAt" | "version">>;
  conflict: boolean;
  safetyConservative: boolean;
}

export interface SpotTrustRepository {
  findSpot(id: string): Promise<SpotRecord | null>;
  listFacts(id: string): Promise<SpotFact[]>;
}

const SOURCE_PRIORITY: Record<SpotFact["sourceType"], number> = {
  official: 5,
  "admin-verified": 4,
  "verified-contribution": 3,
  community: 2,
  model: 1,
};

function canReadExact(spot: SpotRecord, actor: SpotActor): boolean {
  if (spot.visibility === "public_exact") return true;
  if (spot.visibility === "verified_only") return actor.verified;
  if (spot.visibility === "invite_only") return actor.invitedSpotIds.includes(spot.id);
  if (spot.visibility === "private") return actor.userId !== null && (actor.userId === spot.ownerId || actor.roles.includes("spot-admin"));
  return false;
}

function approximate(coordinate: Wgs84Coordinate): Wgs84Coordinate {
  return { lat: Math.round(coordinate.lat * 100) / 100, lon: Math.round(coordinate.lon * 100) / 100, system: "WGS84" };
}

export function discloseSpotCoordinate(spot: SpotRecord, actor: SpotActor) {
  const exact = canReadExact(spot, actor);
  if (spot.visibility === "hidden" && !actor.roles.includes("spot-admin")) {
    return { level: "hidden" as const, coordinate: null, exact: false, reason: "地点坐标因安全、生态或权利边界隐藏" };
  }
  if (exact || actor.roles.includes("spot-admin")) return { level: "exact" as const, coordinate: { ...spot.coordinate }, exact: true, reason: null };
  return { level: "approximate" as const, coordinate: approximate(spot.coordinate), exact: false, reason: spot.visibility === "invite_only" ? "需要地点邀请后才能取得精确坐标" : "仅公开近似区域" };
}

export function resolveSpotFacts(facts: SpotFact[], now: Date): ResolvedSpotFact[] {
  const grouped = new Map<string, SpotFact[]>();
  for (const fact of facts) grouped.set(fact.key, [...(grouped.get(fact.key) ?? []), fact]);
  return [...grouped.entries()].map(([key, values]) => {
    const active = values.filter((fact) => !fact.expiresAt || Date.parse(fact.expiresAt) > now.getTime());
    const candidates = active.length ? active : values;
    const ranked = [...candidates].sort((left, right) => SOURCE_PRIORITY[right.sourceType] - SOURCE_PRIORITY[left.sourceType] || right.observedAt.localeCompare(left.observedAt));
    const distinct = new Set(active.filter((fact) => fact.value !== null).map((fact) => JSON.stringify(fact.value)));
    const conflict = distinct.size > 1;
    const safetyRelevant = candidates.some((fact) => fact.safetyRelevant);
    const restrictive = safetyRelevant ? candidates.find((fact) => fact.state === "temporary-unavailable" || fact.value === false) : undefined;
    const selected = restrictive ?? ranked[0];
    const state: FactState = conflict ? "conflict" : selected?.state ?? "unknown";
    return {
      key,
      state,
      value: conflict && !safetyRelevant ? null : selected?.value ?? null,
      sources: values.map(({ id, sourceType, sourceLabel, observedAt, expiresAt, version }) => ({ id, sourceType, sourceLabel, observedAt, expiresAt, version })),
      conflict,
      safetyConservative: Boolean(conflict && safetyRelevant || restrictive),
    };
  }).sort((left, right) => left.key.localeCompare(right.key));
}

export class SpotTrustService {
  constructor(private readonly repository: SpotTrustRepository, private readonly now: () => Date = () => new Date()) {}

  async getDetail(id: string, actor: SpotActor) {
    const spot = await this.repository.findSpot(id);
    if (!spot) throw new Error("spot_not_found");
    const coordinate = discloseSpotCoordinate(spot, actor);
    const facts = resolveSpotFacts(await this.repository.listFacts(id), this.now());
    const safetyConflict = facts.some((fact) => fact.safetyConservative);
    const navigationBlocked = spot.status === "closed" || safetyConflict || !coordinate.exact;
    const actions = (["share", "navigate", "offline", "itinerary"] as SpotAction[]).map((action) => ({
      action,
      allowed: action === "share" ? coordinate.level !== "hidden" : !navigationBlocked,
      coordinateLevel: coordinate.level,
      reason: action !== "share" && navigationBlocked ? spot.status === "closed" ? spot.statusReason ?? "地点已关闭" : safetyConflict ? "存在未解决的安全冲突" : coordinate.reason : null,
    }));
    return {
      id: spot.id,
      name: spot.name,
      status: spot.status,
      statusReason: spot.statusReason,
      updatedAt: spot.updatedAt,
      coordinate,
      facts,
      actions,
      trust: {
        verifiedSources: facts.flatMap((fact) => fact.sources).filter((source) => ["official", "admin-verified", "verified-contribution"].includes(source.sourceType)).length,
        conflicts: facts.filter((fact) => fact.conflict).map((fact) => fact.key),
        fieldVerificationRequired: true,
      },
    };
  }
}
