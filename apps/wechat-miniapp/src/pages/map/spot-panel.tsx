import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import type {
  MapSpotEvaluation,
  MapSceneTimeFrame,
  ObservationContext,
  PageState,
  SpotDetail,
  SpotSummary,
} from "@starward/miniapp-contracts";
import { useState } from "react";
import { DataStateBadge } from "@/components/data-state-badge";
import { FavoriteStar } from "@/components/selected-card-star";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { MapTimeRuler } from "./time-ruler";

export type SpotPanelExtent = "small" | "medium" | "large";
export type SpotPanelPhase = "idle" | "closing";

const PANEL_SECTIONS = [
  { id: "spot-panel-overview", label: "概览" },
  { id: "spot-panel-astronomy", label: "天文" },
] as const;

function isPermissionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PERMISSION_DENIED"
  );
}

function isOfflineError(error: unknown) {
  const value = error instanceof Error ? error.message : String(error ?? "");
  return /network|offline|timeout|超时|网络/i.test(value);
}

function statusLabel(status: SpotSummary["status"]) {
  return {
    PUBLISHED: "已核验发布",
    TEMPORARILY_CLOSED: "暂时关闭",
    DATA_INSUFFICIENT: "资料不足",
    UNPUBLISHED: "未发布",
    RETIRED: "已下线",
  }[status];
}

function facilityLabel(type: string) {
  return (
    {
      PARKING: "停车",
      TOILET: "厕所",
      PLATFORM: "观测平台",
      CHARGING: "充电",
      CAMPING: "露营",
      ROAD: "末段道路",
      WALKING: "徒步",
      SIGNAL: "通信信号",
    } as Record<string, string>
  )[type] ?? type;
}

function facilityStatusLabel(status: string) {
  return (
    {
      AVAILABLE: "可用",
      UNAVAILABLE: "不可用",
      UNKNOWN: "待核验",
      SEASONAL: "季节性",
    } as Record<string, string>
  )[status] ?? "状态暂无数据";
}

function observationStatusLabel(value: string) {
  return (
    {
      EXCELLENT: "优秀",
      GOOD: "良好",
      FAIR: "一般",
      POOR: "较差",
      INSUFFICIENT_DATA: "资料不足",
      RECOMMENDED: "推荐",
      CONSIDER: "可考虑",
      NOT_RECOMMENDED: "不推荐",
      DATA_INSUFFICIENT: "资料不足",
    } as Record<string, string>
  )[value] ?? "暂无数据";
}

function mediaIsRenderable(media: SpotSummary["media"][number]) {
  return Boolean(
    media.state !== "EXPIRED" &&
      media.state !== "UNAVAILABLE" &&
      media.state !== "SAMPLE_DATA" &&
      media.license.trim() &&
      (media.thumbnailPath.trim() || media.localPath.trim()),
  );
}

export function SpotInformationPanel({
  spot,
  detail,
  detailPending,
  detailError,
  extent,
  phase,
  favorite,
  context,
  evaluation,
  timeFrames,
  timeSaving,
  onTimePreview,
  onTimeCommit,
  onHandleTouchStart,
  onHandleTouchMove,
  onHandleTouchEnd,
  onExtent,
  onClose,
  onRecover,
  onFavorite,
  onShare,
  onCloud,
  onNavigate,
  onContribution,
}: {
  spot: SpotSummary;
  detail: SpotDetail | null;
  detailPending: boolean;
  detailError: unknown;
  extent: SpotPanelExtent;
  phase: SpotPanelPhase;
  favorite: boolean;
  context: ObservationContext | null;
  evaluation: MapSpotEvaluation | null;
  timeFrames: readonly MapSceneTimeFrame[];
  timeSaving: boolean;
  onTimePreview: (index: number) => void;
  onTimeCommit: (index: number) => void;
  onHandleTouchStart: (event: unknown) => void;
  onHandleTouchMove: (event: unknown) => void;
  onHandleTouchEnd: () => void;
  onExtent: (extent: SpotPanelExtent) => void;
  onClose: () => void;
  onRecover: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCloud: () => void;
  onNavigate: () => void;
  onContribution: () => void;
}) {
  const [section, setSection] = useState<
    (typeof PANEL_SECTIONS)[number]["id"]
  >(PANEL_SECTIONS[0]!.id);
  const effectiveSpot = detail?.spot ?? spot;
  const media = effectiveSpot.media.filter(mediaIsRenderable);
  const route = detail?.route;
  const facilities = detail?.spot.facilities ?? effectiveSpot.facilities;
  const decision = detail?.decision;
  const detailPageState: PageState = isPermissionError(detailError)
    ? "PERMISSION_DENIED"
    : "ERROR";

  return (
    <View
      className={`spot-panel spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}${media.length ? " spot-panel--with-media" : ""}`}
      data-control="map-spot-information-panel"
      data-extent={extent}
      data-phase={phase}
      role="region"
      ariaLabel={`${effectiveSpot.name}观星点信息面板`}
    >
      <View className="spot-panel__handle-band">
        <Button
          className="spot-panel__handle focus-ring"
          data-control="map-spot-panel-handle"
          ariaLabel="拖动调整观星点信息面板大小"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onTouchCancel={onHandleTouchEnd}
        >
          <View className="spot-panel__handle-bar" aria-hidden="true" />
        </Button>
        <View className="spot-panel__extent-actions" role="group" ariaLabel="面板大小">
          {(["small", "medium", "large"] as const).map((value) => (
            <Button
              key={value}
              className={`spot-panel__extent-button${value === extent ? " spot-panel__extent-button--active" : ""}`}
              ariaLabel={`${value === "small" ? "小" : value === "medium" ? "中" : "大"}面板`}
              aria-pressed={value === extent}
              onClick={() => onExtent(value)}
            >
              {value === "small" ? "小" : value === "medium" ? "中" : "大"}
            </Button>
          ))}
          <Button
            className="spot-panel__extent-button spot-panel__extent-button--close"
            ariaLabel="关闭观星点信息面板"
            onClick={onClose}
          >
            <SemanticIcon name="chevron-down" />
          </Button>
        </View>
      </View>

      <ScrollView
        className="spot-panel__scroll"
        scrollY={extent === "large"}
        enhanced
        showScrollbar={false}
        scrollIntoView={section}
        ariaLabel="观星点信息"
      >
        <View className="spot-panel__document">
          {media.length ? (
            <View className="spot-panel__media" data-control="spot-media-gallery">
              <Image
                className="spot-panel__media-image"
                src={media[0]!.thumbnailPath || media[0]!.localPath}
                mode="aspectFill"
                lazyLoad
                ariaLabel={media[0]!.alt || `${effectiveSpot.name}现场照片`}
              />
              <Text className="spot-panel__media-caption">{media[0]!.caption || "已授权现场资料"}</Text>
              <Text className="spot-panel__media-credit type-caption">{media[0]!.photographer || "来源未注明"} · {media[0]!.license}</Text>
            </View>
          ) : null}

          <View className="spot-panel__identity">
            <Text className="spot-panel__eyebrow">正式观星点</Text>
            <Text className="spot-panel__title">{effectiveSpot.name}</Text>
            <Text className="spot-panel__region type-caption">{effectiveSpot.region || "区域暂无数据"} · {statusLabel(effectiveSpot.status)}</Text>
            <Text className="spot-panel__address type-caption">{effectiveSpot.address || "地址暂无数据"}</Text>
            <Text className="spot-panel__source type-caption">{effectiveSpot.source.title || "来源暂无数据"} · <DataStateBadge state={effectiveSpot.source.state} /></Text>
          </View>

          <View id="spot-panel-overview" className="spot-panel__section" ariaLabel="概览">
            {detailPending ? <StatusPanel state="LOADING" detail="正在加载正式点位概览；已保留地图选点。" /> : null}
            {detailError ? (
              <StatusPanel
                state={detailPageState}
                detail={isOfflineError(detailError) ? "当前网络不可用；已保留正式点位摘要，不把旧数据当作当前条件。" : "正式点位概览暂不可用；地图选点仍保留。"}
                recoveryLabel="重试概览"
                onRecover={onRecover}
              />
            ) : null}

            <View className="spot-panel__block spot-panel__block--route" data-control="spot-route-summary">
              <View className="spot-panel__block-heading">
                <Text className="type-label">路线与到达</Text>
                <Button className="spot-panel__text-action" data-control="spot-navigation-action" ariaLabel={`查看${effectiveSpot.name}路线`} onClick={onNavigate}>
                  <SemanticIcon name="compass" />
                  <Text>查看路线</Text>
                </Button>
              </View>
              <Text className="spot-panel__value">
                {route?.kind === "ROUTE_ESTIMATE"
                  ? [route.driveMinutes !== null ? `驾车约 ${route.driveMinutes} 分钟` : null, route.distanceKm !== null ? `路线约 ${route.distanceKm} km` : null].filter(Boolean).join(" · ") || "路线结果暂不完整"
                  : route?.kind === "STRAIGHT_LINE_ONLY"
                    ? route.distanceKm !== null ? `直线距离约 ${route.distanceKm} km` : "直线距离暂无数据"
                    : detail ? "路线服务暂不可用" : "等待正式点位概览"}
              </Text>
              <Text className="type-caption">{route?.parkingGuidance || "停车与末段道路信息以正式来源为准；没有路线估算时不以直线距离冒充。"}</Text>
            </View>

            <View className="spot-panel__block spot-panel__block--facility" data-control="spot-facility-evidence">
              <Text className="type-label">设施证据</Text>
              {facilities.length ? facilities.map((facility) => (
                <View className="spot-panel__evidence-row" key={`${facility.type}-${facility.summary}`}>
                  <Text>{facilityLabel(facility.type)}</Text>
                  <Text className="type-caption">{facilityStatusLabel(facility.status)}</Text>
                  <Text className="type-caption">{facility.summary || "详情暂无数据"}</Text>
                </View>
              )) : <Text className="type-caption">暂无设施证据，不推断为“没有设施”。</Text>}
            </View>

            <View className="spot-panel__block" ariaLabel="开放与安全">
              <Text className="type-label">开放与夜间安全</Text>
              <Text className="spot-panel__value">
                {detail?.accessAndSafety
                  ? `开放：${detail.accessAndSafety.openness === "OPEN" ? "开放" : detail.accessAndSafety.openness === "CONDITIONAL" ? "有条件开放" : detail.accessAndSafety.openness === "CLOSED" ? "暂时关闭" : "待核验"} · 夜间：${detail.accessAndSafety.nightSafety === "NO_KNOWN_HAZARD" ? "未发现明确危险" : detail.accessAndSafety.nightSafety === "CAUTION" ? "需谨慎" : detail.accessAndSafety.nightSafety === "DANGER" ? "存在明确危险" : "待核验"}`
                  : "安全与开放状态等待正式概览"}
              </Text>
              {detail?.accessAndSafety?.guidance.map((item) => <Text className="type-caption" key={item}>{item}</Text>)}
            </View>

            {detail?.guides.length ? (
              <View className="spot-panel__block" data-control="guide-article-viewer">
                <Text className="type-label">观星攻略</Text>
                {detail.guides.slice(0, 2).map((guide) => (
                  <View className="spot-panel__guide" key={guide.articleId}>
                    <Text>{guide.title}</Text>
                    <Text className="type-caption">{guide.summary}</Text>
                    <Text className="type-caption">{guide.verified ? "已核验" : "资料待核验"} · {guide.authorName}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="spot-panel__block spot-panel__contribution">
              <Text className="type-label">现场资料</Text>
              <Text className="type-caption">只提交可核验的现场变化或补充资料，不把提交内容当作已发布事实。</Text>
              <Button className="spot-panel__text-action spot-panel__text-action--contribution" data-control="spot-contribution-entry" onClick={onContribution}>
                <SemanticIcon name="images" />
                <Text>提交现场资料</Text>
              </Button>
            </View>
          </View>

          <View id="spot-panel-astronomy" className="spot-panel__section" ariaLabel="天文">
            <View className="spot-panel__block spot-panel__block--professional-matrix" data-control="sky-professional-matrix">
              <Text className="type-label">天空专业矩阵</Text>
              <Text className="spot-panel__value">{decision ? observationStatusLabel(decision.skyOpportunity.status) : "当前天文数据暂无"}</Text>
              <Text className="type-caption">{decision?.skyOpportunity.label || "没有加载到当前观测机会，不生成推荐。"}</Text>
              {decision?.factors.slice(0, 3).map((factor) => <Text className="type-caption" key={factor.code}>{factor.label}：{factor.detail}</Text>)}
            </View>
            <View className="spot-panel__block spot-panel__block--target-list" data-control="sky-target-list">
              <Text className="type-label">适合目标</Text>
              <Text className="type-caption">{decision?.skyOpportunity.suitableFor.length ? decision.skyOpportunity.suitableFor.join(" · ") : "暂无适合目标数据"}</Text>
            </View>
            <View className="spot-panel__block">
              <MapTimeRuler
                frames={timeFrames}
                selectedAt={context?.selectedAtUtc ?? ""}
                timezone={context?.timezone ?? "Asia/Shanghai"}
                disabled={!context || !timeFrames.length || timeSaving}
                onPreview={onTimePreview}
                onCommit={onTimeCommit}
                control="sky-time-scrubber"
              />
            </View>
            <View className="spot-panel__block spot-panel__map-reference">
              <Text className="type-label">地图视野</Text>
              <Text className="type-caption">当前点位与地图标记保持同一选中状态；地图拖动仍由原生地图负责。</Text>
              {evaluation ? <Text className="type-caption">当前云量：{evaluation.cloudPercent === null ? "暂无数据" : `${evaluation.cloudPercent}%`} · 月亮影响：{observationStatusLabel(evaluation.moonImpact)}</Text> : null}
            </View>
          </View>

          <View className="spot-panel__disclosure" data-control="data-source-disclosure">
            <Text className="type-caption">点位标识：{String(effectiveSpot.spotId)}</Text>
            <Text className="type-caption">精确坐标是否可外部使用由该点位的可见性策略决定；未授权时不复制或打开精确坐标。</Text>
            {detail?.dataDisclosure.slice(0, 3).map((source) => <Text className="type-caption" key={source.id}>{source.title} · {source.state}</Text>)}
          </View>
        </View>
      </ScrollView>

      <View
        className="spot-panel__section-rail"
        data-control="map-spot-panel-section-nav"
        role="tablist"
        ariaLabel="点位信息分区"
      >
        {PANEL_SECTIONS.map((item) => (
          <Button
            key={item.id}
            className={`spot-panel__section-tab${section === item.id ? " spot-panel__section-tab--active" : ""}`}
            aria-selected={section === item.id}
            ariaLabel={`查看${item.label}`}
            onClick={() => setSection(item.id)}
          >
            <SemanticIcon
              name={item.id === "spot-panel-overview" ? "info" : "horizon"}
            />
            <Text>{item.label}</Text>
          </Button>
        ))}
      </View>

      <View className="spot-panel__action-lane">
        <View
          className="spot-panel__action-bar"
          data-control="map-spot-panel-action-bar"
          role="toolbar"
          ariaLabel="点位动作"
        >
          <Button className={`spot-panel__action spot-panel__action--favorite${favorite ? " spot-panel__action--active" : ""}`} data-control="spot-favorite-action" ariaLabel={`${favorite ? "取消收藏" : "收藏"}${effectiveSpot.name}`} onClick={onFavorite}>
            <FavoriteStar active={favorite} />
            <Text>{favorite ? "已想去" : "想去"}</Text>
          </Button>
          <Button className="spot-panel__action spot-panel__action--share" data-control="spot-share-action" ariaLabel={`分享${effectiveSpot.name}`} onClick={onShare}>
            <SemanticIcon name="download" />
            <Text>分享</Text>
          </Button>
          <Button className="spot-panel__action spot-panel__action--cloud" data-control="spot-cloud-stargazing-action" ariaLabel={`打开${effectiveSpot.name}云观星`} onClick={onCloud}>
            <SemanticIcon name="conditions" />
            <Text>云观星</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
