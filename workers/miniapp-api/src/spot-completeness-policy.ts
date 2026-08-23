import { createHash } from "node:crypto";
import type {
  FactEvidence,
  FacilityType,
  SourceSummary,
  SpotDetail,
} from "@starward/miniapp-contracts";

const FACILITY_TYPES: readonly FacilityType[] = [
  "PARKING",
  "TOILET",
  "PLATFORM",
  "CHARGING",
  "CAMPING",
  "ROAD",
  "WALKING",
  "SIGNAL",
];

const REQUIRED_CLAIMS = [
  "SPOT_COORDINATE",
  "ACCESS_LAST_ROAD",
  "ACCESS_PARKING",
  "ACCESS_OPENNESS",
  "ACCESS_LEGAL_ENTRY",
  "SAFETY_NIGHT",
  "HORIZON_PROFILE",
] as const;

const MAX_CORE_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export interface SpotCompletenessIssue {
  code: string;
  field: string;
  message: string;
}

export interface SpotCompletenessAssessment {
  policy: "spot-completeness-current";
  complete: boolean;
  checkedAt: string;
  issues: readonly SpotCompletenessIssue[];
  satisfiedClaims: readonly string[];
  assessmentDigest: string;
}

export interface PublicationReview {
  actorId: string;
  reason: string;
}

export class SpotPublicationBlockedError extends Error {
  readonly assessment: SpotCompletenessAssessment;

  constructor(assessment: SpotCompletenessAssessment) {
    super("spot_publication_completeness_invalid");
    this.name = "SpotPublicationBlockedError";
    this.assessment = assessment;
  }
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isText(value: unknown, maximum = 500) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum
  );
}

function timestamp(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceUsable(source: SourceSummary, nowMs: number) {
  if (
    !isText(source.id, 240) ||
    !isText(source.provider, 240) ||
    !isText(source.title, 500) ||
    !isText(source.license, 500) ||
    source.kind === "TEST_FIXTURE" ||
    ["SAMPLE_DATA", "UNAVAILABLE", "EXPIRED"].includes(source.state)
  )
    return false;
  if (
    [
      "OPEN_DATA",
      "THIRD_PARTY_FORECAST",
      "THIRD_PARTY_ROUTE",
      "THIRD_PARTY_PLACE",
      "OFFICIAL_REFERENCE",
      "HISTORICAL_RECORD",
    ].includes(
      source.kind,
    ) &&
    !/^https:\/\//u.test(source.sourceUrl)
  )
    return false;
  const retrievedAt = timestamp(source.retrievedAt);
  if (retrievedAt === null || retrievedAt > nowMs + 5 * 60_000) return false;
  const validTo = timestamp(source.validTo);
  return source.validTo === null || (validTo !== null && validTo >= nowMs);
}

function evidenceUsable(
  evidence: FactEvidence,
  sourceIds: ReadonlySet<string>,
  nowMs: number,
) {
  if (
    evidence.state !== "CONFIRMED" ||
    !sourceIds.has(evidence.sourceId) ||
    !isText(evidence.evidenceId, 240) ||
    !isText(evidence.subjectId, 240)
  )
    return false;
  const verifiedAt = timestamp(evidence.verifiedAt);
  if (
    verifiedAt === null ||
    verifiedAt > nowMs + 5 * 60_000 ||
    nowMs - verifiedAt > MAX_CORE_EVIDENCE_AGE_MS
  )
    return false;
  const validTo = timestamp(evidence.validTo);
  return evidence.validTo === null || (validTo !== null && validTo >= nowMs);
}

function meaningfulOperationalText(value: string) {
  return (
    isText(value, 1_000) &&
    !/(未知|暂无|待核验|不确定|unknown|unavailable|todo)/iu.test(value)
  );
}

export function evaluateSpotCompleteness(input: {
  detail: SpotDetail;
  review: PublicationReview;
  now?: Date;
}): SpotCompletenessAssessment {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const issues: SpotCompletenessIssue[] = [];
  const spot = input.detail.spot;
  const add = (code: string, field: string, message: string) =>
    issues.push({ code, field, message });

  if (
    !/^spot:[a-zA-Z0-9._:-]+$/u.test(spot.spotId) ||
    !isText(spot.name, 120) ||
    !isText(spot.region, 120) ||
    !isText(spot.address, 500) ||
    !["Asia/Shanghai", "Asia/Hong_Kong"].includes(spot.timezone)
  )
    add(
      "identity_incomplete",
      "spot.identity",
      "名称、地址、地区、时区和稳定 spot_id 必须完整。",
    );

  if (
    spot.wgs84.system !== "WGS84" ||
    !Number.isFinite(spot.wgs84.latitude) ||
    !Number.isFinite(spot.wgs84.longitude) ||
    Math.abs(spot.wgs84.latitude) > 90 ||
    Math.abs(spot.wgs84.longitude) > 180 ||
    (spot.wgs84.latitude === 0 && spot.wgs84.longitude === 0)
  )
    add(
      "coordinate_invalid",
      "spot.wgs84",
      "正式点必须具有有效的 WGS84 权威坐标。",
    );

  const sources = [
    spot.source,
    spot.lightPollution.source,
    ...spot.facilities.map((facility) => facility.source),
    ...input.detail.dataDisclosure,
  ];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const invalidSourceIds = [...sourceById.values()]
    .filter((source) => !sourceUsable(source, nowMs))
    .map((source) => source.id);
  if (invalidSourceIds.length)
    add(
      "source_provenance_invalid",
      "spot.sources",
      `存在不可发布的来源：${invalidSourceIds.join(", ")}`,
    );

  const light = spot.lightPollution;
  if (
    light.state !== "ESTIMATED" ||
    light.productBand === null ||
    light.radiance === null ||
    !Number.isFinite(light.radiance.median) ||
    !Number.isFinite(light.radiance.p10) ||
    !Number.isFinite(light.radiance.p90) ||
    light.radiance.p10 > light.radiance.median ||
    light.radiance.median > light.radiance.p90 ||
    light.radiance.unit !== "nW/cm²/sr" ||
    light.minimumCloudFreeObservations === null ||
    light.minimumCloudFreeObservations < 1 ||
    light.datasetVersion === "UNAVAILABLE" ||
    !meaningfulOperationalText(light.method) ||
    !meaningfulOperationalText(light.precision)
  )
    add(
      "light_pollution_estimate_incomplete",
      "spot.lightPollution",
      "正式点必须具有版本化、带覆盖次数和来源的卫星夜光估算；不得以精确 Bortle 或现场 SQM 冒充。",
    );

  const evidenceIds = new Set<string>();
  for (const evidence of input.detail.evidence) {
    if (evidenceIds.has(evidence.evidenceId))
      add(
        "evidence_id_duplicate",
        "spot.evidence",
        `证据 ID 重复：${evidence.evidenceId}`,
      );
    evidenceIds.add(evidence.evidenceId);
  }
  const usableEvidence = input.detail.evidence.filter((evidence) =>
    evidenceUsable(evidence, new Set(sourceById.keys()), nowMs),
  );
  const satisfiedClaims = new Set(usableEvidence.map((evidence) => evidence.claim));
  for (const claim of REQUIRED_CLAIMS)
    if (!satisfiedClaims.has(claim))
      add(
        "required_evidence_missing_or_stale",
        `spot.evidence.${claim}`,
        `缺少当前有效且已确认的 ${claim} 证据。`,
      );

  const facilityTypes = spot.facilities.map((facility) => facility.type);
  const facilityTypeSet = new Set(facilityTypes);
  if (
    spot.facilities.length !== FACILITY_TYPES.length ||
    facilityTypeSet.size !== FACILITY_TYPES.length ||
    FACILITY_TYPES.some((type) => !facilityTypeSet.has(type))
  )
    add(
      "facility_closure_incomplete",
      "spot.facilities",
      "停车、厕所、平台、充电、露营、道路、徒步和信号必须各有且仅有一条状态。",
    );
  for (const facility of spot.facilities) {
    if (
      !isText(facility.summary, 500) ||
      !isText(facility.detail, 1_000) ||
      timestamp(facility.verifiedAt) === null ||
      !sourceUsable(facility.source, nowMs)
    )
      add(
        "facility_evidence_invalid",
        `spot.facilities.${facility.type}`,
        `${facility.type} 缺少状态说明、核验时间或可追溯来源。`,
      );
  }
  if (spot.facilities.every((facility) => facility.status === "UNKNOWN"))
    add(
      "facility_all_unknown",
      "spot.facilities",
      "八项设施不能全部以 UNKNOWN 通过发布门。",
    );
  const road = spot.facilities.find((facility) => facility.type === "ROAD");
  const parking = spot.facilities.find(
    (facility) => facility.type === "PARKING",
  );
  if (
    !road ||
    road.status === "UNKNOWN" ||
    !meaningfulOperationalText(input.detail.route.lastRoad)
  )
    add(
      "access_last_road_incomplete",
      "spot.access.road",
      "末段道路必须具有已核验状态和可执行说明。",
    );
  if (
    !parking ||
    parking.status === "UNKNOWN" ||
    !meaningfulOperationalText(input.detail.route.parkingGuidance)
  )
    add(
      "parking_incomplete",
      "spot.access.parking",
      "停车必须具有已核验状态和可执行说明。",
    );

  const access = input.detail.accessAndSafety;
  if (access.openness === "UNKNOWN")
    add(
      "openness_unknown",
      "spot.accessAndSafety.openness",
      "开放状态必须经过核验。",
    );
  if (access.legalAccess === "UNKNOWN")
    add(
      "legal_access_unknown",
      "spot.accessAndSafety.legalAccess",
      "合法进入条件必须经过核验。",
    );
  if (access.nightSafety === "UNKNOWN" || access.explicitDanger === null)
    add(
      "night_safety_unknown",
      "spot.accessAndSafety.nightSafety",
      "夜间安全和明确危险状态必须经过核验。",
    );
  if (
    access.restrictions.some((item) => !isText(item, 1_000)) ||
    access.guidance.some((item) => !isText(item, 1_000))
  )
    add(
      "access_safety_copy_invalid",
      "spot.accessAndSafety",
      "限制与安全指引不能包含空白或超长条目。",
    );
  if (
    spot.status === "PUBLISHED" &&
    (access.openness === "CLOSED" ||
      access.legalAccess === "PROHIBITED" ||
      access.nightSafety === "DANGER" ||
      access.explicitDanger)
  )
    add(
      "published_status_conflicts_with_blocker",
      "spot.status",
      "关闭、禁止进入或明确危险的地点不能保持 PUBLISHED。",
    );

  if (
    spot.obstructionPercent === null ||
    !Number.isFinite(spot.obstructionPercent) ||
    spot.obstructionPercent < 0 ||
    spot.obstructionPercent > 100 ||
    spot.clearDirections.length === 0
  )
    add(
      "horizon_incomplete",
      "spot.horizon",
      "遮挡比例和至少一个开阔方向必须具有现场证据。",
    );

  if (input.detail.siteMediaState === "UNKNOWN")
    add(
      "site_media_state_unknown",
      "spot.siteMediaState",
      "必须明确现场媒体已核验，或明确没有已核验现场媒体。",
    );
  if (input.detail.siteMediaState === "SITE_MEDIA_VERIFIED") {
    const siteMedia = spot.media.filter((media) => media.isSiteSpecific);
    if (
      siteMedia.length === 0 ||
      siteMedia.some(
        (media) =>
          ["SAMPLE_DATA", "UNAVAILABLE", "EXPIRED"].includes(media.state) ||
          !isText(media.alt, 500) ||
          !isText(media.caption, 1_000) ||
          !isText(media.photographer, 240) ||
          !isText(media.license, 500) ||
          !/^https:\/\//u.test(media.sourceUrl) ||
          timestamp(media.capturedAt) === null ||
          !isText(media.direction, 120),
      ) ||
      !satisfiedClaims.has("SITE_MEDIA_PROVENANCE")
    )
      add(
        "site_media_evidence_invalid",
        "spot.media",
        "实景声明必须绑定非示例的现场媒体、拍摄信息、许可、来源与当前证据。",
      );
  }
  if (
    input.detail.siteMediaState === "NO_SITE_MEDIA_VERIFIED" &&
    spot.media.some((media) => media.isSiteSpecific)
  )
    add(
      "site_media_state_conflict",
      "spot.siteMediaState",
      "无现场媒体声明与当前媒体标记冲突。",
    );

  const lastVerifiedAt = timestamp(spot.lastVerifiedAt);
  if (
    lastVerifiedAt === null ||
    lastVerifiedAt > nowMs + 5 * 60_000 ||
    nowMs - lastVerifiedAt > MAX_CORE_EVIDENCE_AGE_MS
  )
    add(
      "verification_stale",
      "spot.lastVerifiedAt",
      "点位最近核验时间必须处于当前 30 天有效窗口。",
    );

  if (
    !["PUBLIC_EXACT", "PUBLIC_APPROXIMATE", "RESTRICTED", "HIDDEN"].includes(
      spot.visibilityPolicy,
    )
  )
    add(
      "visibility_policy_invalid",
      "spot.visibilityPolicy",
      "坐标可见策略无效。",
    );

  if (
    !/^admin:[a-zA-Z0-9._-]{1,64}$/u.test(input.review.actorId) ||
    !isText(input.review.reason, 500)
  )
    add(
      "operator_review_missing",
      "publication.review",
      "发布必须绑定有效操作者和审核原因。",
    );

  const body = {
    policy: "spot-completeness-current" as const,
    complete: issues.length === 0,
    checkedAt: now.toISOString(),
    issues,
    satisfiedClaims: [...satisfiedClaims].sort(),
  };
  return Object.freeze({ ...body, assessmentDigest: digest(body) });
}
