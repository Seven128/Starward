import {
  FILTER_GROUPS,
  type DataState,
  type FacilityType,
  type FilterGroupKey,
  type FilterState,
  type MapSceneData,
  type MapSpotEvaluation,
  type SpotDetail,
  type SpotFilterEvidence,
  type SpotSummary,
} from "@starward/miniapp-contracts";

const labelByGroup = Object.fromEntries(
  FILTER_GROUPS.map((group) => [group.key, group.title]),
) as Readonly<Record<FilterGroupKey, string>>;
const filterGroupKeys: readonly FilterGroupKey[] = FILTER_GROUPS.map(
  (group) => group.key,
);

function evidence(
  group: FilterGroupKey,
  state: SpotFilterEvidence[FilterGroupKey]["state"],
  detail: string,
): SpotFilterEvidence[FilterGroupKey] {
  return { state, reason: `${labelByGroup[group]}：${detail}` };
}

function usableState(state: DataState) {
  return state !== "EXPIRED" && state !== "UNAVAILABLE" && state !== "SAMPLE_DATA";
}

function facilityEvidence(
  spot: SpotSummary,
  type: FacilityType,
  group: FilterGroupKey,
): SpotFilterEvidence[FilterGroupKey] {
  const item = spot.facilities.find((candidate) => candidate.type === type);
  if (!item || !usableState(item.source.state))
    return evidence(group, "UNKNOWN", "缺少当前可用性资料");
  if (item.status === "AVAILABLE") return evidence(group, "MATCH", "资料明确可用");
  if (item.status === "UNAVAILABLE") return evidence(group, "NO_MATCH", "资料明确不可用");
  return evidence(group, "UNKNOWN", item.status === "SEASONAL" ? "季节性状态未能对应当前时刻" : "可用性尚未核验");
}

function renderableSiteMedia(spot: SpotSummary) {
  return spot.media.some(
    (media) =>
      media.isSiteSpecific &&
      usableState(media.state) &&
      Boolean(media.license.trim()) &&
      Boolean(media.thumbnailPath.trim() || media.localPath.trim()),
  );
}

export function evaluateSpotFilterEvidence(input: {
  spot: SpotSummary;
  detail: SpotDetail | null;
  evaluation: MapSpotEvaluation;
  filters: FilterState;
  eventCoverageKnown: boolean;
  evaluatedAtMs: number;
}): SpotFilterEvidence {
  const { spot, detail, evaluation, filters } = input;
  const route = filters.drivingRange.mode === "TIME"
    ? evaluation.driveMinutes === null
      ? evidence("DISTANCE_DRIVE_TIME", "UNKNOWN", "没有匹配当前起点的真实驾车时长")
      : evidence(
          "DISTANCE_DRIVE_TIME",
          evaluation.driveMinutes <= filters.drivingRange.maxMinutes ? "MATCH" : "NO_MATCH",
          `真实驾车时长为 ${Math.round(evaluation.driveMinutes)} 分钟`,
        )
    : evaluation.distanceKind !== "ROUTE" || evaluation.distanceKm === null
      ? evidence("DISTANCE_DRIVE_TIME", "UNKNOWN", "没有匹配当前起点的真实驾车距离")
      : evidence(
          "DISTANCE_DRIVE_TIME",
          evaluation.distanceKm <= filters.drivingRange.maxDistanceKm ? "MATCH" : "NO_MATCH",
          `真实驾车距离为 ${evaluation.distanceKm.toFixed(1)} 公里`,
        );

  const light = spot.lightPollution.state !== "ESTIMATED" || !usableState(spot.lightPollution.source.state) || spot.lightPollution.productBand === null
    ? evidence("LIGHT_POLLUTION", "UNKNOWN", "缺少可归属的夜光产品分级")
    : evidence(
        "LIGHT_POLLUTION",
        spot.lightPollution.productBand === "VERY_LOW" || spot.lightPollution.productBand === "LOW" ? "MATCH" : "NO_MATCH",
        `夜光产品分级为 ${spot.lightPollution.productBand}`,
      );

  const cloud = evaluation.cloudPercent === null
    ? evidence("LESS_CLOUD", "UNKNOWN", "当前观测时刻缺少总云量")
    : evidence("LESS_CLOUD", evaluation.cloudPercent <= 45 ? "MATCH" : "NO_MATCH", `当前总云量为 ${Math.round(evaluation.cloudPercent)}%`);
  const lowCloud = evaluation.lowCloudPercent === null
    ? evidence("LOW_CLOUD_THRESHOLD", "UNKNOWN", "当前观测时刻缺少低云量")
    : evidence("LOW_CLOUD_THRESHOLD", evaluation.lowCloudPercent <= 30 ? "MATCH" : "NO_MATCH", `当前低云量为 ${Math.round(evaluation.lowCloudPercent)}%`);
  const moon = evaluation.moonImpact === "UNKNOWN"
    ? evidence("MOON_IMPACT", "UNKNOWN", "当前时刻缺少月亮高度或照明比例")
    : evidence("MOON_IMPACT", evaluation.moonImpact === "LOW" ? "MATCH" : "NO_MATCH", `当前月亮影响为 ${evaluation.moonImpact}`);

  const accessBlocked = Boolean(
    detail &&
      (detail.accessAndSafety.openness === "CLOSED" ||
        detail.accessAndSafety.legalAccess === "PROHIBITED" ||
        detail.accessAndSafety.nightSafety === "DANGER" ||
        detail.accessAndSafety.explicitDanger === true),
  );
  const accessEvidence = (group: "DRIVE_UP_ACCESS" | "HIKING_DIFFICULTY", tag: "DRIVE_TO" | "NO_HIKE") =>
    accessBlocked
      ? evidence(group, "NO_MATCH", "当前开放、合法进入或安全资料明确阻断")
      : spot.accessTags.includes(tag)
        ? evidence(group, "MATCH", tag === "DRIVE_TO" ? "有明确驾车直达资料" : "有明确无需徒步资料")
        : evidence(group, "UNKNOWN", tag === "DRIVE_TO" ? "缺少驾车直达结论" : "缺少无需徒步结论");

  const media = renderableSiteMedia(spot)
    ? evidence("PHOTO_FOREGROUND", "MATCH", "有可归属且可展示的现场照片")
    : detail?.siteMediaState === "NO_SITE_MEDIA_VERIFIED"
      ? evidence("PHOTO_FOREGROUND", "NO_MATCH", "已核验没有可展示的现场照片")
      : evidence("PHOTO_FOREGROUND", "UNKNOWN", "现场照片状态尚未核验");
  const event = !input.eventCoverageKnown
    ? evidence("SPECIFIC_CELESTIAL_EVENT", "UNKNOWN", "当前日期或目录覆盖不可用")
    : evidence(
        "SPECIFIC_CELESTIAL_EVENT",
        evaluation.activeEventIds.length > 0 ? "MATCH" : "NO_MATCH",
        evaluation.activeEventIds.length > 0 ? "当前观测夜有适用的已发布天象" : "当前观测夜没有适用的已发布天象",
      );
  const verifiedAt = spot.lastVerifiedAt === null ? Number.NaN : Date.parse(spot.lastVerifiedAt);
  const recentBoundary = input.evaluatedAtMs - 180 * 24 * 60 * 60 * 1_000;
  const freshness = !Number.isFinite(verifiedAt)
    ? evidence("LAST_VERIFIED_AT", "UNKNOWN", "缺少有效核验时间")
    : verifiedAt > input.evaluatedAtMs
      ? evidence("LAST_VERIFIED_AT", "NO_MATCH", "核验时间位于未来，不能计入最近核验")
      : evidence(
          "LAST_VERIFIED_AT",
          verifiedAt >= recentBoundary ? "MATCH" : "NO_MATCH",
          verifiedAt >= recentBoundary ? "最近 180 天内已有核验" : "最近一次核验早于 180 天",
        );

  return {
    DISTANCE_DRIVE_TIME: route,
    LIGHT_POLLUTION: light,
    LESS_CLOUD: cloud,
    PARKING: facilityEvidence(spot, "PARKING", "PARKING"),
    RESTROOM: facilityEvidence(spot, "TOILET", "RESTROOM"),
    DRIVE_UP_ACCESS: accessEvidence("DRIVE_UP_ACCESS", "DRIVE_TO"),
    PHOTO_FOREGROUND: media,
    CAMPING_OVERNIGHT_PARKING: facilityEvidence(spot, "CAMPING", "CAMPING_OVERNIGHT_PARKING"),
    SPECIFIC_CELESTIAL_EVENT: event,
    LOW_CLOUD_THRESHOLD: lowCloud,
    MOON_IMPACT: moon,
    HIKING_DIFFICULTY: accessEvidence("HIKING_DIFFICULTY", "NO_HIKE"),
    SIGNAL: facilityEvidence(spot, "SIGNAL", "SIGNAL"),
    CHARGING: facilityEvidence(spot, "CHARGING", "CHARGING"),
    OPEN_SKY_DIRECTION: spot.clearDirections.length > 0
      ? evidence("OPEN_SKY_DIRECTION", "MATCH", `已记录 ${spot.clearDirections.join("、")} 开阔方向`)
      : evidence("OPEN_SKY_DIRECTION", "UNKNOWN", "缺少明确开阔方向资料"),
    LAST_VERIFIED_AT: freshness,
  };
}

export function passesActiveFilters(evaluation: SpotFilterEvidence, filters: FilterState) {
  return filterGroupKeys.every(
    (group) => filters[group].length === 0 || evaluation[group].state !== "NO_MATCH",
  );
}

export function summarizeFilterCoverage(
  evaluations: readonly SpotFilterEvidence[],
  group: FilterGroupKey,
): MapSceneData["filterCapabilities"]["byGroup"][FilterGroupKey] {
  if (evaluations.length === 0)
    return { state: "UNAVAILABLE", reason: "当前地图或搜索范围没有正式候选点，无法判断资料覆盖" };
  const known = evaluations.filter((item) => item[group].state !== "UNKNOWN").length;
  if (known === 0) return { state: "UNAVAILABLE", reason: `当前 ${evaluations.length} 个候选点都缺少“${labelByGroup[group]}”所需资料` };
  if (known === evaluations.length) return { state: "AVAILABLE", reason: `当前 ${evaluations.length} 个候选点的“${labelByGroup[group]}”资料均可判定` };
  return { state: "PARTIAL", reason: `当前 ${evaluations.length} 个候选点中有 ${known} 个可判定“${labelByGroup[group]}”` };
}
