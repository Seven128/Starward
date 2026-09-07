import type { PanelCssMotion } from "./panel-spring-style";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import type {
  MapSpotEvaluation,
  MapSceneTimeFrame,
  ObservationContext,
  PageState,
  SpotDetail,
  SpotSummary,
  SkyOpportunity,
} from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import Taro, { useResize } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { DataStateBadge } from "@/components/data-state-badge";
import { FavoriteStar } from "@/components/selected-card-star";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { MapTimeRuler } from "./time-ruler";
import { panelAstronomyFacts } from "./panel-astronomy-facts";

export type SpotPanelExtent = "small" | "medium" | "large";
export type SpotPanelPhase = "idle" | "closing";

const PANEL_SECTIONS = [
  { id: "spot-panel-overview", label: "概览" },
  { id: "spot-panel-astronomy", label: "天文" },
] as const;

const SUITABLE_TARGET_LABELS: Readonly<Record<SkyOpportunity["suitableFor"][number], string>> = {
  NAKED_EYE: "肉眼观星",
  PHONE: "手机拍摄",
  MILKY_WAY: "银河",
  STAR_TRAIL: "星轨",
  DEEP_SKY: "深空天体",
};

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
  visible = true,
  settling = false,
  springMotion,
  detail,
  detailPending,
  detailError,
  detailStale = false,
  extent,
  phase,
  favorite,
  context,
  evaluation,
  timeFrames,
  timeSaving,
  onTimePreview,
  onTimeCommit,
  onTimeCancel,
  onHandleTouchStart,
  onHandleTouchMove,
  onHandleTouchEnd,
  onHandleTouchCancel,
  onExtent,
  onClose,
  onRecover,
  onFavorite,
  onShare,
  onCloud,
  onNavigate,
  onContribution,
  onEvidence,
}: {
  spot: SpotSummary;
  visible?: boolean;
  settling?: boolean;
  springMotion?: PanelCssMotion | null;
  detail: SpotDetail | null;
  detailPending: boolean;
  detailError: unknown;
  detailStale?: boolean;
  extent: SpotPanelExtent;
  phase: SpotPanelPhase;
  favorite: boolean;
  context: ObservationContext | null;
  evaluation: MapSpotEvaluation | null;
  timeFrames: readonly MapSceneTimeFrame[];
  timeSaving: boolean;
  onTimePreview: (index: number) => void;
  onTimeCommit: (index: number) => void;
  onTimeCancel: () => void;
  onHandleTouchStart: (event: unknown) => void;
  onHandleTouchMove: (event: unknown) => void;
  onHandleTouchEnd: (event?: unknown) => void;
  onHandleTouchCancel: () => void;
  onExtent: (extent: SpotPanelExtent) => void;
  onClose: () => void;
  onRecover: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCloud: () => void;
  onNavigate: () => void;
  onContribution: () => void;
  onEvidence: (kind: "guides" | "field" | "sources", articleId?: string) => void;
}) {
  const [section, setSection] = useState<
    (typeof PANEL_SECTIONS)[number]["id"]
  >(PANEL_SECTIONS[0]!.id);
  const [sectionRequest, setSectionRequest] = useState<{ id: string; spotId: string } | null>(null);
  const handledSectionRequest = useRef<typeof sectionRequest>(null);
  const [scrollAnchor, setScrollAnchor] = useState("");
  const astronomyOffset = useRef<number | null>(null);
  const lastScroll = useRef({ spotId: spot.spotId, top: 0 });
  const wasVisible = useRef(visible);
  const [restoredScrollTop, setRestoredScrollTop] = useState<number | undefined>(undefined);
  useEffect(() => {
    const returning = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!visible) {
      setScrollAnchor("");
      setRestoredScrollTop(undefined);
      return;
    }
    if (!returning || lastScroll.current.spotId !== spot.spotId) return;
    const top = lastScroll.current.top;
    const timer = setTimeout(() => setRestoredScrollTop(top), 200);
    return () => clearTimeout(timer);
  }, [visible, spot.spotId]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const scrollMeasureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollMeasureTimer.current !== null) clearTimeout(scrollMeasureTimer.current);
    scrollMeasureTimer.current = null;
  }, [visible, spot.spotId, extent]);
  const largeText = useAppStore(state => state.preferences.largeText);
  useResize(() => setLayoutVersion(value => value + 1));
  useEffect(() => {
    lastScroll.current = { spotId: spot.spotId, top: 0 };
    setRestoredScrollTop(undefined);
    setSection("spot-panel-overview");
    setSectionRequest({ id: "spot-panel-document-start", spotId: spot.spotId });
  }, [spot.spotId]);
  useEffect(() => {
    astronomyOffset.current = null;
    if (extent !== "large" || settling) return;
    let cancelled = false;
    // Wait for native settling to finish before measuring final scroll boundaries.
    const measurementTimer = setTimeout(() => {
      if (cancelled) return;
      const query = Taro.createSelectorQuery();
      query.select("#spot-panel-scroll").boundingClientRect();
      query.select("#spot-panel-astronomy").boundingClientRect();
      query.select("#spot-panel-scroll").scrollOffset();
      query.select("#spot-panel-document-start").boundingClientRect();
      query.select(".spot-panel__section-rail").boundingClientRect();
      query.exec(results => {
        if (cancelled) return;
        const [viewport, astronomy, scroll, document, tabs] = results as [{ top?: number; height?: number }?, { top?: number }?, { scrollTop?: number }?, { height?: number }?, { height?: number }?];
        if (!Number.isFinite(viewport?.top) || !Number.isFinite(astronomy?.top) || !Number.isFinite(scroll?.scrollTop)) return;
        astronomyOffset.current = astronomy!.top! - viewport!.top! + scroll!.scrollTop! - (tabs?.height ?? 44);
        // The final chapter may never reach the viewport top in a short document.
        const maximumScroll = (document?.height ?? NaN) - (viewport?.height ?? NaN);
        if (Number.isFinite(maximumScroll) && maximumScroll > 1) {
          astronomyOffset.current = Math.min(astronomyOffset.current, maximumScroll);
        }
        setSection(scroll!.scrollTop! >= astronomyOffset.current - 1 ? "spot-panel-astronomy" : "spot-panel-overview");
      });
    }, 200);
    return () => { clearTimeout(measurementTimer); cancelled = true; astronomyOffset.current = null; };
  }, [spot.spotId, detail, extent, settling, largeText, layoutVersion]);
  useEffect(() => {
    setScrollAnchor("");
    if (settling || !sectionRequest || sectionRequest.spotId !== spot.spotId || handledSectionRequest.current === sectionRequest) return;
    if (sectionRequest.id !== "spot-panel-document-start" && extent !== "large") return;
    let cancelled = false;
    setRestoredScrollTop(undefined);
    const timer = setTimeout(() => {
      if (sectionRequest.id !== "spot-panel-astronomy") {
        handledSectionRequest.current = sectionRequest;
        setScrollAnchor(sectionRequest.id);
        return;
      }
      const query = Taro.createSelectorQuery();
      query.select("#spot-panel-scroll").boundingClientRect();
      query.select("#spot-panel-scroll").scrollOffset();
      query.select("#spot-panel-astronomy").boundingClientRect();
      query.select(".spot-panel__section-rail").boundingClientRect();
      query.exec(results => {
        if (cancelled) return;
        const [viewport, scroll, target, tabs] = results as [{ top: number }?, { scrollTop: number }?, { top: number }?, { height: number }?];
        if (!viewport || !scroll || !target || !tabs) return;
        const top = target.top - viewport.top + scroll.scrollTop - tabs.height;
        if (!Number.isFinite(top)) return;
        handledSectionRequest.current = sectionRequest;
        setRestoredScrollTop(Math.max(0, top));
      });
    }, settling ? 200 : 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sectionRequest, extent, spot.spotId, settling]);
  const effectiveSpot = detail?.spot ?? spot;
  const media = effectiveSpot.media.filter(mediaIsRenderable);
  const route = detail?.route;
  const facilities = detail?.spot.facilities ?? effectiveSpot.facilities;
  const decision = detail?.decision;
  const cloudReady = Boolean(
    detail &&
      context?.location.kind === "FORMAL_SPOT" &&
      context.location.spotId === effectiveSpot.spotId,
  );
  const detailPageState: PageState = isPermissionError(detailError)
    ? "PERMISSION_DENIED"
    : "ERROR";

  return (
    <View
      id="spot-information-panel"
      className={`spot-panel${springMotion ? " spot-panel--spring" : ""} spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}${media.length ? " spot-panel--with-media" : ""}`}
      data-control="map-spot-information-panel"
      data-extent={extent}
      data-phase={phase}
      role="region"
      ariaLabel={`${effectiveSpot.name}观星点信息面板`}
    >
      <View className="spot-panel__snap-measures" aria-hidden="true">
        <View className="spot-panel__snap-small" />
        <View className="spot-panel__snap-medium" />
        <View className="spot-panel__snap-large" />
      </View>
      <View className="spot-panel__handle-band">
        <Button
          className="spot-panel__handle focus-ring"
          data-control="map-spot-panel-handle"
          ariaLabel="拖动调整观星点信息面板大小"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onTouchCancel={onHandleTouchCancel}
        >
          <View className="spot-panel__handle-bar" aria-hidden="true" />
        </Button>
        <View className="spot-panel__extent-actions" role="group" ariaLabel={`面板大小，当前${extent === "small" ? "小" : extent === "medium" ? "中" : "大"}档`}>
          <Button
            className="spot-panel__extent-button"
            ariaLabel={extent === "large" ? "收起为中档面板" : "收起为小档面板"}
            disabled={extent === "small"}
            onClick={() => onExtent(extent === "large" ? "medium" : "small")}
          >
            <SemanticIcon name="chevron-down" />
          </Button>
          <Button
            className="spot-panel__extent-button"
            ariaLabel={extent === "small" ? "展开为中档面板" : "展开为大档面板"}
            disabled={extent === "large"}
            onClick={() => onExtent(extent === "small" ? "medium" : "large")}
          >
            <SemanticIcon name="chevron-up" />
          </Button>
          <Button
            className="spot-panel__extent-button spot-panel__extent-button--close"
            ariaLabel="关闭观星点信息面板"
            onClick={onClose}
          >
            <SemanticIcon name="close" />
          </Button>
        </View>
      </View>

      <View className="spot-panel__scroll-frame">
        <ScrollView
          className="spot-panel__scroll"
          id="spot-panel-scroll"
          scrollY={extent === "large"}
          {...(restoredScrollTop === undefined ? {} : { scrollTop: restoredScrollTop })}
          scrollIntoView={scrollAnchor}
          scrollWithAnimation={false}
          onScroll={event => {
            const top = event.detail.scrollTop;
            if (!visible || !Number.isFinite(top)) return;
            lastScroll.current = { spotId: spot.spotId, top };
            // Native anchor scrolling can finish after the extent layout measurement.
            // Reconcile once after scrolling rests, never query geometry per frame.
            if (extent === "large") {
              if (scrollMeasureTimer.current !== null) clearTimeout(scrollMeasureTimer.current);
              scrollMeasureTimer.current = setTimeout(() => {
                scrollMeasureTimer.current = null;
                setLayoutVersion(value => value + 1);
              }, 80);
            }
            if (extent !== "large" || astronomyOffset.current === null) return;
            setSection(top >= astronomyOffset.current - 1 ? "spot-panel-astronomy" : "spot-panel-overview");
          }}
          enhanced
          showScrollbar={false}
          ariaLabel="观星点信息"
        >
          <View className="spot-panel__document" id="spot-panel-document-start">
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

          <View id="spot-panel-overview" className="spot-panel__identity" ariaLabel="地点概览">
            {__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ ? <Text className="spot-panel__eyebrow">测试数据</Text> : null}
            <Text className="spot-panel__title">{effectiveSpot.name}</Text>
            <View className="spot-panel__identity-meta">
              {effectiveSpot.region ? <Text className="type-caption">{effectiveSpot.region}</Text> : null}
              {effectiveSpot.status !== "PUBLISHED" ? <Text className="type-caption">{statusLabel(effectiveSpot.status)}</Text> : null}
              {!(__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ && effectiveSpot.source.state === "SAMPLE_DATA") ? <DataStateBadge state={effectiveSpot.source.state} /> : null}
            </View>
            {effectiveSpot.address && !(__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ && effectiveSpot.spotId === "spot:test-published") ? <Text className="spot-panel__address type-caption">{effectiveSpot.address}</Text> : null}
          </View>

      <View
        className="spot-panel__section-rail"
        data-control="map-spot-panel-section-nav"
        role="group"
        ariaLabel="定位点位信息章节"
      >
        {PANEL_SECTIONS.map((item) => (
          <Button
            key={item.id}
            className={`spot-panel__section-tab${section === item.id ? " spot-panel__section-tab--active" : ""}`}
            data-section={item.id}
            aria-pressed={section === item.id}
            ariaLabel={`查看${item.label}`}
            onClick={() => {
              setSection(item.id);
              setSectionRequest({ id: item.id, spotId: spot.spotId });
              onExtent("large");
            }}
          >
            <Text>{item.label}</Text>
          </Button>
        ))}
      </View>


          <View className="spot-panel__section" ariaLabel="场地资料">
            {detailPending ? <StatusPanel state="LOADING" detail="正在加载地点信息" /> : null}
            {detailError || detailStale ? (
              <StatusPanel
                state={detailError ? detailPageState : "STALE"}
                detail={detailError ? detail ? "更新失败，暂时显示上次资料，请重试。" : isOfflineError(detailError) ? "网络不可用，请连接网络后重试。" : "地点信息暂时无法加载，请重试。" : "地点资料尚未确认最新状态，暂时显示上次结果。"}
                recoveryLabel="重试概览"
                onRecover={onRecover}
              />
            ) : null}

            <View className="spot-panel__block spot-panel__block--route" data-control="spot-route-summary">
              <View className="spot-panel__block-heading">
              <Text className="spot-panel__value">
                {route?.kind === "ROUTE_ESTIMATE"
                  ? [route.driveMinutes !== null ? `驾车约 ${route.driveMinutes} 分钟` : null, route.distanceKm !== null ? `路线约 ${route.distanceKm} km` : null].filter(Boolean).join(" · ") || "路线结果暂不完整"
                  : route?.kind === "STRAIGHT_LINE_ONLY"
                    ? route.distanceKm !== null ? `直线距离约 ${route.distanceKm} km` : "直线距离暂无数据"
                    : detail ? "路线服务暂不可用" : "正在加载路线信息"}
              </Text>
                <Button className="spot-panel__text-action" data-control="spot-navigation-action" ariaLabel={`查看${effectiveSpot.name}路线`} onClick={onNavigate}>
                  <SemanticIcon name="compass" />
                  <Text>查看路线</Text>
                </Button>
              </View>
              <Text className="type-caption">{route?.parkingGuidance || "停车与末段道路信息待核验"}</Text>
            </View>

            <View className="spot-panel__block spot-panel__block--facility" data-control="spot-facility-evidence">
              <View className="spot-panel__block-heading">
              <Text className="type-label">场地设施</Text>
              <Button className="spot-panel__text-action" ariaLabel="查看完整场地资料" onClick={() => onEvidence("field")}>查看详情</Button>
              </View>
              <View className="spot-panel__facilities">
              {facilities.length ? facilities.map((facility) => (
                <View className={`spot-panel__facility${facility.summary && !(__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ && effectiveSpot.spotId === "spot:test-published") ? " spot-panel__facility--described" : ""}`} key={`${facility.type}-${facility.summary}`}>
                  <Text className="spot-panel__facility-name">{facilityLabel(facility.type)}</Text>
                  <Text className="spot-panel__facility-status type-secondary">{facilityStatusLabel(facility.status)}</Text>
                  {facility.summary && !(__MINIAPP_DEVELOPMENT_FIXTURE_MODE__ && effectiveSpot.spotId === "spot:test-published") ? <Text className="spot-panel__facility-summary type-caption">{facility.summary}</Text> : null}
                </View>
              )) : <Text className="type-caption">设施信息待核验</Text>}
              </View>
            </View>

            <View className="spot-panel__block" ariaLabel="开放与安全">
              <Text className="type-label">开放与夜间安全</Text>
              <View className="spot-panel__safety-facts">
                <View className="spot-panel__metric">
                  <Text className="type-secondary">开放状态</Text>
                  <Text className="type-body">{detail?.accessAndSafety?.openness === "OPEN" ? "当前开放" : detail?.accessAndSafety?.openness === "CONDITIONAL" ? "有条件开放" : detail?.accessAndSafety?.openness === "CLOSED" ? "暂时关闭" : "待核验"}</Text>
                </View>
                <View className="spot-panel__metric">
                  <Text className="type-secondary">夜间安全</Text>
                  <Text className="type-body">{detail?.accessAndSafety?.nightSafety === "NO_KNOWN_HAZARD" ? "未发现明确危险" : detail?.accessAndSafety?.nightSafety === "CAUTION" ? "需谨慎" : detail?.accessAndSafety?.nightSafety === "DANGER" ? "存在明确危险" : "待核验"}</Text>
                </View>
              </View>
              {detail?.accessAndSafety?.guidance.map((item) => <Text className="type-caption" key={item}>{item}</Text>)}
            </View>

            {detail?.guides.length ? (
              <View className="spot-panel__block" data-control="guide-article-viewer">
                <Text className="type-label">观星攻略</Text>
                {detail.guides.slice(0, 2).map((guide) => (
                  <View className="spot-panel__guide" key={guide.articleId}>
                    <View className="spot-panel__guide-heading">
                      <Text className="type-body">{guide.title}</Text>
                      <Button className="spot-panel__text-action" ariaLabel={`阅读攻略 ${guide.title}`} onClick={() => onEvidence("guides", guide.articleId)}>阅读</Button>
                    </View>
                    <Text className="type-caption">{guide.summary}</Text>
                    <Text className="type-caption">{guide.verified ? "已核验" : "资料待核验"} · {guide.authorName}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Button className="spot-panel__text-action" ariaLabel="查看全部攻略" onClick={() => onEvidence("guides")}>全部攻略</Button>

            <View className="spot-panel__block spot-panel__contribution">
              <Button className="spot-panel__text-action spot-panel__text-action--contribution" data-control="spot-contribution-entry" onClick={onContribution}>
                <SemanticIcon name="images" />
                <Text>提交现场资料</Text>
              </Button>
            </View>
          </View>
          <View id="spot-panel-astronomy" className="spot-panel__section" ariaLabel="天文">
            <Text className="type-section">天文信息</Text>
            <View className="spot-panel__block">
              <MapTimeRuler
                frames={timeFrames}
                selectedAt={context?.selectedAtUtc ?? ""}
                timezone={context?.timezone ?? "Asia/Shanghai"}
                disabled={!context || !timeFrames.length || timeSaving}
                onPreview={onTimePreview}
                onCommit={onTimeCommit}
                onCancel={onTimeCancel}
                control="sky-time-scrubber"
              />
            </View>
            <View className="spot-panel__block spot-panel__block--professional-matrix" data-control="sky-professional-matrix">
              <Text className="type-label">观测条件</Text>
              <View className="spot-panel__metrics">
              {panelAstronomyFacts(evaluation).filter(fact => fact.label === "总云量" || fact.label === "月光影响").map(fact => <View className="spot-panel__metric" key={fact.label}>
                <Text className="type-secondary">{fact.label}</Text>
                <Text className={`spot-panel__fact-value ${fact.value === "暂无数据" ? "type-secondary" : "type-data"}`}>{fact.value}</Text>
              </View>)}
              </View>
              <View className="spot-panel__cloud-layers">
              {panelAstronomyFacts(evaluation).filter(fact => ["低层云", "中层云", "高层云"].includes(fact.label)).map(fact => <View className="spot-panel__metric" key={fact.label}>
                <Text className="type-secondary">{fact.label}</Text>
                <Text className={`spot-panel__fact-value ${fact.value === "暂无数据" ? "type-secondary" : "type-data"}`}>{fact.value}</Text>
              </View>)}
              </View>
              {evaluation?.state === "STALE_USABLE" ? <Text className="type-caption">预报待更新，仅供参考</Text> : null}
              {decision?.factors.filter(factor => factor.severity === "CAUTION" || factor.severity === "BLOCKER").map(factor => <Text className="type-caption" key={factor.code}>{factor.label}：{factor.detail}</Text>)}
            </View>
            <View className="spot-panel__block spot-panel__block--target-list" data-control="sky-target-list">
              <Text className="type-label">适合目标</Text>
              <Text className="type-caption">{decision?.skyOpportunity.suitableFor.length ? decision.skyOpportunity.suitableFor.map(target => SUITABLE_TARGET_LABELS[target]).join(" · ") : "暂无适合目标数据"}</Text>
            </View>
          </View>

          <View className="spot-panel__disclosure" data-control="data-source-disclosure">
            <Button className="spot-panel__text-action" ariaLabel="查看完整来源与更新时间" onClick={() => onEvidence("sources")}>来源与更新时间</Button>
          </View>
          </View>
        </ScrollView>
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
          <Button className="spot-panel__action spot-panel__action--cloud" data-control="spot-cloud-stargazing-action" ariaLabel={`${cloudReady ? "打开" : "等待正式点位上下文后打开"}${effectiveSpot.name}云观星`} disabled={!cloudReady} onClick={onCloud}>
            <SemanticIcon name="conditions" />
            <Text>云观星</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
