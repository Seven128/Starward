import { Image, Text, View } from "@tarojs/components";
import type { RouteOverview, SpotSummary } from "@starward/miniapp-contracts";
import { DataStateBadge } from "./data-state-badge";
import { SoftButton } from "./soft-button";
import "./spot-card.scss";

const FACILITY_LABELS = {
  PARKING: "停车",
  TOILET: "厕所",
  PLATFORM: "平台",
  CHARGING: "充电",
  CAMPING: "露营",
  ROAD: "道路",
  WALKING: "徒步",
  SIGNAL: "信号",
} as const;

const STATUS_LABELS: Record<SpotSummary["status"], string> = {
  PUBLISHED: "可查看",
  TEMPORARILY_CLOSED: "临时关闭",
  DATA_INSUFFICIENT: "数据不足",
};

const PRECISION_LABELS: Record<SpotSummary["visibilityPolicy"], string> = {
  PUBLIC_EXACT: "公开点位",
  PUBLIC_APPROXIMATE: "近似区域",
  RESTRICTED: "位置受限",
  HIDDEN: "位置隐藏",
};

function valueOrUnavailable(value: number | null, unit: string) {
  return value === null ? (
    <Text className="spot-card__unavailable">不可用</Text>
  ) : (
    <Text>
      {value}
      <Text className="spot-card__unit">{unit}</Text>
    </Text>
  );
}

export function SpotCard({
  spot,
  favorite,
  density = "map",
  route = null,
  onOpen,
  onFavorite,
  onRecenter,
  onRoute,
}: {
  spot: SpotSummary;
  favorite: boolean;
  density?: "map" | "favorite";
  route?: RouteOverview | null;
  onOpen: () => void;
  onFavorite: () => void;
  onRecenter?: () => void;
  onRoute?: () => void;
}) {
  const media = spot.media[0];

  if (density === "map") {
    const routeTitle =
      route?.kind === "ROUTE_ESTIMATE"
        ? "路线概览可用"
        : route?.kind === "STRAIGHT_LINE_ONLY"
          ? "驾车路线尚未接入"
          : "路线当前不可用";
    const routeDetail =
      route?.kind === "ROUTE_ESTIMATE"
        ? route.lastRoad
        : route?.kind === "STRAIGHT_LINE_ONLY"
          ? "仅展示明确标注的直线距离，不绘制或猜测驾车路线"
          : "可继续查看点位静态资料；不会向外部地图发送未经确认的目标";

    return (
      <View
        className="spot-card spot-card--map card"
        aria-label={`${spot.name}，${spot.region}，${STATUS_LABELS[spot.status]}`}
      >
        <View className="spot-card__map-head">
          {media ? (
            <Image
              className="spot-card__map-media"
              src={media.thumbnailPath}
              mode="aspectFill"
              lazyLoad
              aria-label={media.alt}
            />
          ) : (
            <View className="spot-card__map-media spot-card__media--empty">
              <Text>无可用媒体</Text>
            </View>
          )}
          <View className="spot-card__map-copy">
            <View className="spot-card__map-title">
              <Text className="type-section">{spot.name}</Text>
              <Text
                className={`status-tag${
                  spot.status === "TEMPORARILY_CLOSED"
                    ? " status-tag--danger"
                    : spot.status === "DATA_INSUFFICIENT"
                      ? " status-tag--warning"
                      : ""
                }`}
              >
                {STATUS_LABELS[spot.status]}
              </Text>
            </View>
            <Text className="type-caption">{spot.region}</Text>
            <Text className="type-caption spot-card__freshness">
              {spot.lightPollution.dataDate} 更新 · {spot.lightPollution.state === "ESTIMATED" ? "产品估算" : "来源待核"}
            </Text>
          </View>
          <SoftButton
            variant="ghost"
            className="spot-card__favorite"
            label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
            onClick={onFavorite}
          >
            {favorite ? "★" : "☆"}
          </SoftButton>
        </View>

        <View className="spot-card__data-strip" aria-label="点位路线与位置数据">
          <View className="spot-card__datum">
            <Text className="type-caption">
              {route?.kind === "ROUTE_ESTIMATE" ? "驾车距离" : "直线距离"}
            </Text>
            <Text className="type-data">
              {valueOrUnavailable(route?.distanceKm ?? null, " km")}
            </Text>
          </View>
          <View className="spot-card__datum">
            <Text className="type-caption">预计用时</Text>
            <Text className="type-data">
              {valueOrUnavailable(route?.driveMinutes ?? null, " 分钟")}
            </Text>
          </View>
          <View className="spot-card__datum">
            <Text className="type-caption">位置精度</Text>
            <Text className="type-data">
              {PRECISION_LABELS[spot.visibilityPolicy]}
            </Text>
          </View>
        </View>

        <View className="spot-card__facilities" aria-label="核心设施状态">
          {spot.facilities.slice(0, 4).map((item) => (
            <Text
              className={`status-tag${item.status === "UNKNOWN" || item.status === "SEASONAL" ? " status-tag--warning" : item.status === "UNAVAILABLE" ? " status-tag--danger" : ""}`}
              key={item.type}
            >
              {FACILITY_LABELS[item.type]} {item.status === "AVAILABLE" ? "✓" : item.status === "UNAVAILABLE" ? "×" : item.status === "SEASONAL" ? "季" : "?"}
            </Text>
          ))}
        </View>

        <View className="spot-card__route-row">
          <Text className="spot-card__route-icon" aria-hidden="true">
            ↗
          </Text>
          <View className="spot-card__route-copy">
            <Text className="type-label">{routeTitle}</Text>
            <Text className="type-caption">{routeDetail}</Text>
          </View>
          <SoftButton
            variant="ghost"
            className="spot-card__route-action"
            label={`查看${spot.name}路线能力说明`}
            {...(onRoute ? { onClick: onRoute } : { disabled: true })}
          >
            路线
          </SoftButton>
        </View>

        <View className="spot-card__actions">
          <SoftButton
            label={`将地图中心移回${spot.name}`}
            {...(onRecenter ? { onClick: onRecenter } : { disabled: true })}
          >
            回到点位
          </SoftButton>
          <SoftButton
            variant="primary"
            label={`查看${spot.name}详情`}
            onClick={onOpen}
          >
            查看详情
          </SoftButton>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`spot-card spot-card--${density} card`}
      aria-label={`${spot.name}，${spot.region}`}
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
          <SoftButton
            variant="ghost"
            label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
            onClick={onFavorite}
          >
            {favorite ? "★" : "☆"}
          </SoftButton>
        </View>
        <View className="spot-card__meta">
          <DataStateBadge state={spot.lightPollution.state} />
          <Text className="type-label">{spot.lightPollution.label}</Text>
        </View>
        <Text className="type-caption spot-card__route">
          路线：需明确请求外部地图计算 · 直线距离不冒充驾车路线
        </Text>
        <View className="spot-card__facilities">
          {spot.facilities.slice(0, 4).map((item) => (
            <Text
              className={`status-tag${item.status === "UNKNOWN" ? " status-tag--warning" : ""}`}
              key={item.type}
            >
              {FACILITY_LABELS[item.type]}{" "}
              {item.status === "AVAILABLE"
                ? "✓"
                : item.status === "UNAVAILABLE"
                  ? "×"
                  : "?"}
            </Text>
          ))}
        </View>
        <SoftButton
          variant="primary"
          label={`查看${spot.name}详情`}
          onClick={onOpen}
        >
          查看详情
        </SoftButton>
      </View>
    </View>
  );
}
