import { useRouter } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import type { FacilityType } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  getSpotGuides,
  getSpotOverview,
} from "@/services/api-client";
import {
  GUIDE_AUTHOR_LABELS,
  formatDisplayDate,
} from "@/utils/presentation";
import "./index.scss";

const FACILITY_LABEL: Readonly<Record<FacilityType, string>> = {
  PARKING: "停车",
  TOILET: "厕所",
  PLATFORM: "观测平台",
  CHARGING: "充电",
  CAMPING: "露营",
  ROAD: "末段道路",
  WALKING: "徒步",
  SIGNAL: "通信信号",
};

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
  const validRoute =
    spotId.startsWith("spot:") &&
    contextId.startsWith("ctx:") &&
    Boolean(articleId);
  const guides = useResourceQuery({
    queryKey: ["spot-guides", spotId],
    queryFn: (signal) => getSpotGuides(spotId, signal),
    enabled: validRoute,
  });
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId, contextId],
    queryFn: (signal) => getSpotOverview(spotId, contextId, signal),
    enabled: validRoute,
  });
  const detail = overview.data?.data;
  const article = guides.data?.data.guides.find(
    (item) => item.articleId === articleId,
  );
  const media = detail?.spot.media[0];
  const loading = guides.isPending || overview.isPending;

  return (
    <View className={themeClass + " article-page"}>
      <CustomNav
        title={article?.title ?? "攻略"}
        subtitle={detail?.spot.name}
        back
      />
      <View className="article-content page-inset safe-bottom">
        {!validRoute ? (
          <StatusPanel
            state="ERROR"
            detail="请从正式观星点详情中的攻略入口打开本文。"
          />
        ) : loading ? (
          <StatusPanel state="LOADING" detail="正在加载攻略与点位资料。" />
        ) : guides.isError || overview.isError || !detail || !article ? (
          <StatusPanel
            state="ERROR"
            detail="攻略或点位资料当前不可用；不会用通用清单替代。"
          />
        ) : (
          <>
            <View className="article-meta card">
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
            {article.blocks.map((block, index) =>
              block.type === "paragraph" ? (
                <Text className="article-paragraph type-body" key={index}>
                  {block.text}
                </Text>
              ) : block.type === "tip" ? (
                <View className="article-tip card" key={index}>
                  <Text className="type-section">{block.title}</Text>
                  <Text className="type-body">{block.text}</Text>
                </View>
              ) : block.type === "media" ? (
                <View className="article-media card" key={index}>
                  {media ? (
                    <>
                      <Image
                        src={media.localPath}
                        mode="aspectFill"
                        aria-label={media.alt}
                      />
                      <Text className="type-caption">
                        {block.caption} · {media.photographer} · {media.license}
                      </Text>
                      {!media.isSiteSpecific ? (
                        <Text className="status-tag status-tag--warning">
                          代表媒体，不证明本点现场
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="该内容没有符合授权与地点归属要求的媒体。"
                    />
                  )}
                </View>
              ) : (
                <View className="article-ref card" key={index}>
                  <Text className="type-label">
                    设施引用：{FACILITY_LABEL[block.facilityType]}
                  </Text>
                  <Text className="type-caption">
                    状态以场地分段的同一设施记录为准。
                  </Text>
                </View>
              ),
            )}
            <Provenance source={article.source} />
          </>
        )}
      </View>
    </View>
  );
}
