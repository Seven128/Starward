import { Button, Image, Text, View } from "@tarojs/components";
import type { RouteOverview, SpotSummary } from "@starward/miniapp-contracts";
import { DataStateBadge } from "./data-state-badge";
import { SoftButton } from "./soft-button";
import "./spot-card.scss";

const FACILITY_LABELS: Readonly<Record<string, string>> = {
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
      {FACILITY_LABELS[item.type] ?? item.type}{" "}
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

export function SpotCard({
  spot,
  favorite,
  density = "favorite",
  route: _route = null,
  onOpen,
  onSelect,
  onFavorite,
  onRecenter,
  onRoute: _onRoute,
}: {
  spot: SpotSummary;
  favorite: boolean;
  density?: "map" | "favorite" | "finder" | "callout";
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
        <View className="spot-card__callout-copy">
          <Text className="type-label">{spot.name}</Text>
          <Text className="type-caption">
            {spot.region} · {STATUS_LABELS[spot.status]}
          </Text>
        </View>
        {onFavorite ? (
          <View data-od-id="map-selected-spot-favorite">
            <SoftButton
              variant="ghost"
              className="spot-card__favorite"
              label={`${favorite ? "取消收藏" : "收藏"}${spot.name}`}
              icon={favorite ? "favorite-active" : "favorite"}
              onClick={onFavorite}
            />
          </View>
        ) : null}
        {canOpen ? (
          <SoftButton
            variant="primary"
            label={`查看${spot.name}详情`}
            onClick={() => onOpen?.()}
          >
            查看详情
          </SoftButton>
        ) : (
          <SoftButton
            variant="primary"
            label={`${spot.name}详情暂不可用`}
            disabled
          >
            暂不可用
          </SoftButton>
        )}
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
            icon={favorite ? "favorite-active" : "favorite"}
            onClick={onFavorite}
          />
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
              icon={favorite ? "favorite-active" : "favorite"}
              onClick={onFavorite}
            />
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
