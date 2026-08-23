import { Button, Image, Text, View } from "@tarojs/components";
import type {
  FacilityType,
  MapSpotEvaluation,
  RouteOverview,
  SpotSummary,
} from "@starward/miniapp-contracts";
import { DataStateBadge } from "./data-state-badge";
import { SoftButton } from "./soft-button";
import "./spot-card.scss";

const FACILITY_LABELS: Readonly<Record<FacilityType, string>> = {
  PARKING: "停车",
  TOILET: "厕所",
  PLATFORM: "平台",
  CHARGING: "充电",
  CAMPING: "露营",
  ROAD: "道路",
  WALKING: "徒步",
  SIGNAL: "信号",
};

const STATUS_LABELS: Record<SpotSummary["status"], string> = {
  PUBLISHED: "正式点位",
  TEMPORARILY_CLOSED: "暂时关闭",
  DATA_INSUFFICIENT: "资料不完整",
};

const PRECISION_LABELS: Record<SpotSummary["visibilityPolicy"], string> = {
  PUBLIC_EXACT: "公开坐标",
  PUBLIC_APPROXIMATE: "近似区域",
  RESTRICTED: "位置受限",
  HIDDEN: "位置隐藏",
};

function facilitySummary(spot: SpotSummary) {
  return spot.facilities.slice(0, 3).map((item) => (
    <Text
      className={`status-tag${
        item.status === "UNKNOWN" || item.status === "SEASONAL"
          ? " status-tag--warning"
          : item.status === "UNAVAILABLE"
            ? " status-tag--danger"
            : ""
      }`}
      key={item.type}
    >
      {FACILITY_LABELS[item.type]}{" "}
      {item.status === "AVAILABLE"
        ? "✓"
        : item.status === "UNAVAILABLE"
          ? "×"
          : "?"}
    </Text>
  ));
}

function invokeSelection(
  onSelect: (() => void) | undefined,
  onOpen: (() => void) | undefined,
) {
  (onSelect ?? onOpen)?.();
}

function parkingLabel(spot: SpotSummary) {
  const parking = spot.facilities.find((item) => item.type === "PARKING");
  if (!parking) return "未登记";
  if (parking.status === "AVAILABLE") return parking.summary || "可停车";
  if (parking.status === "UNAVAILABLE") return "无停车位";
  if (parking.status === "SEASONAL") return "季节性";
  return "待核验";
}

function distanceLabel(
  evaluation: MapSpotEvaluation | null,
  route: RouteOverview | null,
) {
  const distanceKm = route?.distanceKm ?? evaluation?.distanceKm ?? null;
  const driveMinutes = route?.driveMinutes ?? evaluation?.driveMinutes ?? null;
  const distanceKind = route
    ? route.kind === "ROUTE_ESTIMATE"
      ? "ROUTE"
      : route.kind === "STRAIGHT_LINE_ONLY"
        ? "STRAIGHT_LINE"
        : "UNAVAILABLE"
    : (evaluation?.distanceKind ?? "UNAVAILABLE");

  if (distanceKind === "ROUTE" && distanceKm !== null) {
    return driveMinutes === null
      ? `${distanceKm.toFixed(1)} km`
      : `${distanceKm.toFixed(1)} km / ${driveMinutes} 分`;
  }
  if (distanceKind === "STRAIGHT_LINE" && distanceKm !== null) {
    return `直线 ${distanceKm.toFixed(1)} km`;
  }
  return "不可用";
}

function selectedTimeLabel(evaluation: MapSpotEvaluation | null) {
  if (!evaluation || evaluation.state === "UNAVAILABLE") return "动态不可用";
  if (evaluation.state === "STALE_USABLE") return "数据已过期";
  return evaluation.opportunityLabel;
}

function CalloutMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="spot-card__callout-metric">
      <Text className="spot-card__callout-metric-label">{label}</Text>
      <Text className="spot-card__callout-metric-value">{value}</Text>
    </View>
  );
}

export function SpotCard({
  spot,
  favorite,
  density = "favorite",
  evaluation = null,
  route = null,
  onOpen,
  onSelect,
  onFavorite,
  onRecenter,
  onRoute: _onRoute,
}: {
  spot: SpotSummary;
  favorite: boolean;
  density?: "map" | "favorite" | "finder" | "callout";
  evaluation?: MapSpotEvaluation | null;
  route?: RouteOverview | null;
  onOpen?: () => void;
  onSelect?: () => void;
  onFavorite?: () => void;
  onRecenter?: () => void;
  onRoute?: () => void;
}) {
  if (density === "callout") {
    const canOpen = Boolean(onOpen);
    return (
      <View
        className="spot-card spot-card--callout"
        data-od-id="map-selected-spot-callout"
      >
        <Button
          className="spot-card__callout-main focus-ring"
          aria-label={
            canOpen
              ? `查看${spot.name}详情`
              : `${spot.name}详情暂不可用`
          }
          {...(!canOpen ? { disabled: true } : {})}
          onClick={() => onOpen?.()}
        >
          <View className="spot-card__callout-head">
            <Text className="type-label spot-card__callout-name">
              {spot.name}
            </Text>
            <Text className="type-caption spot-card__callout-action">
              {STATUS_LABELS[spot.status]} · {canOpen ? "查看详情 ›" : "暂不可用"}
            </Text>
          </View>
          <View
            className="spot-card__callout-metrics"
            aria-label="当前点位摘要"
          >
            <CalloutMetric label="光害" value={spot.lightPollution.label} />
            <CalloutMetric label="停车" value={parkingLabel(spot)} />
            <CalloutMetric
              label="距离 / 车程"
              value={distanceLabel(evaluation, route)}
            />
            <CalloutMetric
              label="所选时段"
              value={selectedTimeLabel(evaluation)}
            />
          </View>
        </Button>
        {onFavorite ? (
          <View
            className="spot-card__callout-favorite"
            data-od-id="map-selected-spot-favorite"
          >
            <SoftButton
              variant="ghost"
              className="spot-card__favorite"
              label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
              onClick={onFavorite}
            >
              {favorite ? "★" : "☆"}
            </SoftButton>
          </View>
        ) : null}
      </View>
    );
  }

  if (density === "finder" || density === "map") {
    return (
      <View
        className={`spot-card spot-card--finder card${density === "map" ? " spot-card--map" : ""}`}
        data-od-id="spot-finder-result-card"
        aria-label={`${spot.name}，${spot.region}，${STATUS_LABELS[spot.status]}`}
      >
        <Button
          className="spot-card__result-main focus-ring"
          aria-label={`选择${spot.name}并回到地图${spot.region}`}
          onClick={() => invokeSelection(onSelect, onOpen)}
        >
          <View className="spot-card__result-copy">
            <View className="spot-card__result-title">
              <Text className="type-label">{spot.name}</Text>
              <Text
                className={`status-tag${spot.status !== "PUBLISHED" ? " status-tag--warning" : ""}`}
              >
                {STATUS_LABELS[spot.status]}
              </Text>
            </View>
            <Text className="type-caption">{spot.region}</Text>
            <Text className="type-caption spot-card__freshness">
              光害 {spot.lightPollution.label} · {spot.lightPollution.dataDate}{" "}
              更新
            </Text>
            <View className="spot-card__facilities" aria-label="设施状态">
              {facilitySummary(spot)}
            </View>
          </View>
          <Text className="spot-card__result-arrow" aria-hidden="true">
            →
          </Text>
        </Button>
        {onFavorite ? (
          <SoftButton
            variant="ghost"
            className="spot-card__favorite"
            label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
            onClick={onFavorite}
          >
            {favorite ? "★" : "☆"}
          </SoftButton>
        ) : null}
      </View>
    );
  }

  const media = spot.media[0];
  return (
    <View
      className="spot-card spot-card--favorite card"
      aria-label={`${spot.name}，${spot.region}，${STATUS_LABELS[spot.status]}`}
    >
      {media ? (
        <Image
          className="spot-card__media"
          src={media.thumbnailPath}
          mode="aspectFill"
          lazyLoad
          aria-label={media.alt}
        />
      ) : (
        <View className="spot-card__media spot-card__media--empty">
          <Text>无可用媒体</Text>
        </View>
      )}
      <View className="spot-card__body">
        <View className="spot-card__title-row">
          <View>
            <Text className="type-section">{spot.name}</Text>
            <Text className="type-caption">{spot.region}</Text>
          </View>
          {onFavorite ? (
            <SoftButton
              variant="ghost"
              className="spot-card__favorite"
              label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
              onClick={onFavorite}
            >
              {favorite ? "★" : "☆"}
            </SoftButton>
          ) : null}
        </View>
        <View className="spot-card__meta">
          <DataStateBadge state={spot.lightPollution.state} />
          <Text className="type-label">{spot.lightPollution.label}</Text>
        </View>
        <Text className="type-caption spot-card__route">
          {PRECISION_LABELS[spot.visibilityPolicy]} ·
          路线与夜空判断以详情页已核验资料为准
        </Text>
        <View className="spot-card__facilities" aria-label="设施状态">
          {facilitySummary(spot)}
        </View>
        {onOpen && spot.status === "PUBLISHED" ? (
          <SoftButton
            variant="primary"
            label={`查看${spot.name}详情`}
            onClick={() => onOpen()}
          >
            查看详情
          </SoftButton>
        ) : null}
        {onRecenter ? (
          <SoftButton
            variant="ghost"
            label={`将地图中心移回${spot.name}`}
            onClick={onRecenter}
          >
            回到点位
          </SoftButton>
        ) : null}
      </View>
    </View>
  );
}
