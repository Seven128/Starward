import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import { articleMedia } from "@/features/spot/guide-media";
import { FacilityEvidenceDetails } from "@/components/facility-evidence";
import { FacilityCard } from "@/components/facility-card";
import { useFacilityGallery } from "@/features/spot/use-facility-gallery";
import { ArticleMedia } from "./article-media";
import { FACILITY_LABEL } from "@/utils/facility-presentation";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { SourceDisclosure } from "@/components/source-disclosure";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";
import {
  getSpotGuides,
  getSpotOverview,
  getSpotSite,
} from "@/services/api-client";
import {
  GUIDE_AUTHOR_LABELS,
  formatDisplayDate,
} from "@/utils/presentation";
import "./index.scss";
import { useEffect, useState } from "react";

function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export default function ArticlePage() {
  const router = useRouter();
  const themeClass = useThemeClass();
  const spotId = safe(router.params.spotId);
  const contextId = safe(router.params.contextId);
  const articleId = safe(router.params.articleId);
  const context = useAppStore((state) => state.observationContext);
  const notify = useAppStore((state) => state.notify);
  const navigation = usePageNavigation();
  const [pageVisible, setPageVisible] = useState(true);
  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));
  const validRoute =
    spotId.startsWith("spot:") &&
    context?.contextId === contextId &&
    context.location.kind === "FORMAL_SPOT" &&
    context.location.spotId === spotId &&
    Boolean(articleId);
  const guides = useResourceQuery({
    queryKey: ["spot-guides", spotId],
    queryFn: (signal) => getSpotGuides(spotId, signal),
    enabled: validRoute && pageVisible,
  });
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId, contextId, context?.contextFingerprint, context?.revision],
    queryFn: (signal) => getSpotOverview(spotId, contextId, signal),
    enabled: validRoute && pageVisible,
  });
  const detail = validRoute && overview.data?.data.spot.spotId === spotId ? overview.data.data : undefined;
  const article = guides.data?.data.guides.find(
    (item) => item.articleId === articleId && item.spotId === spotId,
  );
  const site = useResourceQuery({
    queryKey: ["spot-site", spotId],
    queryFn: (signal) => getSpotSite(spotId, signal),
    enabled: validRoute && pageVisible && Boolean(article?.blocks.some((block) => block.type === "facility_ref")),
  });
  const gallery = useFacilityGallery({ identity: `article:${spotId}:${articleId}`, name: detail?.spot.name ?? "场地设施",
    media: detail?.spot.media ?? [], formalMedia: detail?.formalMedia, enabled: validRoute && pageVisible });
  useEffect(() => {
    if (!pageVisible || !validRoute) return;
    const failed = guides.isError || guides.refreshError || guides.data?.dataState === "STALE_USABLE"
      ? ["攻略数据异常", "攻略正文暂时无法更新，可在页面中重试。", "guides"]
      : overview.isError || overview.refreshError || overview.data?.dataState === "STALE_USABLE"
        ? ["地点数据异常", "地点与媒体资料暂时无法更新，攻略正文仍会保留。", "overview"]
        : site.isError || site.refreshError || site.data?.dataState === "STALE_USABLE"
          ? ["设施数据异常", "攻略引用的设施资料暂时无法更新，可在对应内容中重试。", "site"]
          : null;
    if (!failed) return;
    notify({ owner: "article", placement: "floating", tone: "info",
      title: failed[0]!, body: failed[1]!, dedupeKey: `article-resource-failed:${articleId}:${failed[2]}` });
  }, [articleId, guides.data?.dataState, guides.isError, guides.refreshError, notify, overview.data?.dataState,
    overview.isError, overview.refreshError, pageVisible, site.data?.dataState, site.isError, site.refreshError, validRoute]);
  const returnToGuides = async () => {
    const attempt = navigation.begin({ valid: () => {
      const current = useAppStore.getState().observationContext;
      return current?.contextId === contextId && current.location.kind === "FORMAL_SPOT" && current.location.spotId === spotId;
    } });
    if (!attempt) return;
    try {
      const previous = attempt.stack.at(-2);
      if (previous?.route?.replace(/^\//, "") === "spot/guides/index" &&
        safe(previous.options?.spotId) === spotId && safe(previous.options?.contextId) === contextId) {
        await Taro.navigateBack();
      } else await Taro.redirectTo({ url: `/spot/guides/index?spotId=${encodeURIComponent(spotId)}&contextId=${encodeURIComponent(contextId)}` });
    } catch { attempt.fail(); }
    finally { attempt.release(); }
  };
  const loading = (guides.isPending || guides.isFetching) && !article;

  return (
    <><SystemMotionProbe /><View className={themeClass + " article-page"}>
      <FloatingNotificationHost />
      {gallery.view}
      <CustomNav
        title="攻略"
        subtitle={detail?.spot.name}
        back
      />
      <ScrollView scrollY={!gallery.visible} enhanced showScrollbar={false} className="article-scroll"
        {...(gallery.returnTop === undefined ? {} : { scrollTop: gallery.returnTop })} onScroll={event => gallery.record(event.detail.scrollTop)}>
      <View className="article-content page-inset safe-bottom">
        {navigation.navigationError && !article ? <View role="alert"><Text className="type-caption">攻略目录暂未打开，请重试。</Text></View> : null}
        {!validRoute ? (
          <StatusPanel
            state="ERROR"
            title="攻略入口不可用"
            detail="无法确认当前观星点或文章，请返回地图重新选择正式观星点。"
            recoveryLabel="返回地图"
            onRecover={() => void Taro.switchTab({ url: "/pages/map/index" })}
          />
        ) : loading ? (
          <StatusPanel state="LOADING" detail="正在加载攻略。" />
        ) : !article && guides.data?.data?.spotId === spotId &&
          !guides.isError && !guides.refreshError &&
          (guides.data.dataState === "FRESH" || guides.data.dataState === "PARTIAL") ? (
          <StatusPanel
            state="EMPTY"
            title="这篇文章已不可用"
            detail="这篇攻略不在当前观星点资料中，可查看本地点的其它攻略。"
            recoveryLabel="查看本地点攻略"
            onRecover={returnToGuides}
          />
        ) : !article ? (
          <StatusPanel
            state="ERROR"
            detail="攻略暂不可用，请重试。"
            recoveryLabel="重试攻略"
            onRecover={() => void guides.refetch()}
          />
        ) : (
          <View className="article-document">
            {guides.refreshError || guides.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE" detail="攻略尚未确认最新状态，以下保留上次读取的内容。" recoveryLabel="重试更新" onRecover={() => void guides.refetch()} /> : null}
            {(site.refreshError || site.data?.dataState === "STALE_USABLE") && article.blocks.some(block => block.type === "facility_ref") ? <StatusPanel
              state="STALE"
              detail="引用的设施资料尚未确认最新状态，使用条件可能已变化。"
              recoveryLabel="重试设施资料"
              onRecover={() => void site.refetch()}
            /> : null}
            {overview.isPending && !detail ? <StatusPanel state="LOADING" detail="地点与媒体资料正在加载，正文可先阅读。" />
              : overview.isError || !detail ? <StatusPanel state="PARTIAL" detail="地点与媒体资料暂不可用，正文仍可阅读。" recoveryLabel="重试地点资料" onRecover={() => void overview.refetch()} />
              : overview.refreshError || overview.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE" detail="地点与媒体资料尚未确认最新状态，以下保留上次读取的资料。" recoveryLabel="重试地点资料" onRecover={() => void overview.refetch()} /> : null}
            <View className="article-meta">
              {detail ? <Text className="type-caption">{detail.spot.name}{detail.spot.region ? ` · ${detail.spot.region}` : ""}</Text> : null}
              <Text className="type-page-title">{article.title}</Text>
              <Text className="type-caption">
                {GUIDE_AUTHOR_LABELS[article.authorType]} ·{" "}
                {article.authorName}
              </Text>
              <Text className="type-caption">
                发布 {formatDisplayDate(article.publishedAt)} · 更新{" "}
                {formatDisplayDate(article.updatedAt)} ·{" "}
                {article.verified ? "已核验" : "来源待核验"}
              </Text>
            </View>
            {article.blocks.map((block, index) => {
              const media = block.type === "media" && detail ? articleMedia(block.mediaId, detail.spot.media) : undefined;
              const facility = block.type === "facility_ref" ? site.data?.data.facilities.find((item) => item.type === block.facilityType) : undefined;
              return block.type === "paragraph" ? (
                <Text className="article-paragraph type-article" key={index}>
                  {block.text}
                </Text>
              ) : block.type === "tip" ? (
                <View className="article-tip" key={index}>
                  <Text className="type-section">{block.title}</Text>
                  <Text className="type-article">{block.text}</Text>
                </View>
              ) : block.type === "media" ? (
                <View className="article-media-block" key={index}>
                  {media ? <ArticleMedia key={`${articleId}:${media.id}:${media.localPath}`} media={media} caption={block.caption} sourceId={`article-media-${index}`} /> : (
                    <StatusPanel
                      state={detail ? "EMPTY" : "PARTIAL"}
                      detail={detail ? "该内容没有符合授权与地点归属要求的媒体。" : "媒体资料尚不可用，暂不显示图片。"}
                    />
                  )}
                </View>
              ) : (
                <View className="article-ref" key={index}>
                  {site.isPending || site.isError || !facility ? <Text className="type-label">
                    {FACILITY_LABEL[block.facilityType]}
                  </Text> : null}
                  {site.isPending ? <StatusPanel state="LOADING" detail="正在读取设施记录。" />
                    : site.isError ? <StatusPanel state="ERROR" detail="设施资料暂不可用，正文仍可阅读。" recoveryLabel="重试设施资料" onRecover={() => void site.refetch()} />
                    : facility ? <>
                      <FacilityCard id={`article-facility-${index}`} evidence={facility} photos={gallery.photos(block.facilityType)}
                        onOpenPhotos={() => gallery.open(block.facilityType, `#article-facility-${index}`)} />
                      <FacilityEvidenceDetails evidence={facility} showHeading={false} showDescription={false} showSource={false} />
                      <SourceDisclosure id={`article-facility-source-${index}`} label="引用设施来源与核验" sources={[facility.source]} />
                    </>
                    : site.refreshError || site.data?.dataState === "STALE_USABLE"
                      ? <StatusPanel state="PARTIAL" detail="设施记录尚未确认最新状态，暂不能判断是否缺失。" />
                    : <StatusPanel state="EMPTY" detail="暂无该设施的核验记录，不代表设施可用。" />}
                </View>
              );
            })}
            <Provenance source={article.source} presentation="disclosure" />
          </View>
        )}
      </View>
      </ScrollView>
      {validRoute && article ? <View className="article-footer">
        {navigation.navigationError ? <View role="alert"><Text className="type-caption">攻略目录暂未打开，正文已保留，请重试。</Text></View> : null}
        <SoftButton label="返回本地点攻略" onClick={returnToGuides}>返回本地点攻略</SoftButton>
      </View> : null}
    </View></>
  );
}
