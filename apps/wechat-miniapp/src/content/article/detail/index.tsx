import { useRouter } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import { buildDemoSpotDetail } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import "./index.scss";

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
  const detail = buildDemoSpotDetail(safe(router.params.spotId));
  const article =
    detail?.guides.find(
      (item) => item.articleId === safe(router.params.articleId),
    ) ?? detail?.guides[0];
  return (
    <View className={`${themeClass} article-page`}>
      <CustomNav
        title={article?.title ?? "攻略"}
        subtitle={detail?.spot.name}
        back
      />
      <View className="article-content page-inset safe-bottom">
        {!detail || !article ? (
          <StatusPanel
            state="ERROR"
            detail="攻略必须绑定正式观星点和结构化文章 ID。"
          />
        ) : (
          <>
            <View className="article-meta card">
              <Text className="type-page-title">{article.title}</Text>
              <Text className="type-caption">
                {article.authorType} · {article.authorName}
              </Text>
              <Text className="type-caption">
                发布 {article.publishedAt} · 更新 {article.updatedAt} ·{" "}
                {article.verified ? "已核验" : "Demo 通用清单"}
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
                  <Image
                    src={detail.spot.media[0]!.localPath}
                    mode="aspectFill"
                    aria-label={detail.spot.media[0]!.alt}
                  />
                  <Text className="type-caption">
                    {block.caption} · {detail.spot.media[0]!.photographer} ·{" "}
                    {detail.spot.media[0]!.license}
                  </Text>
                  <Text className="status-tag status-tag--warning">
                    非本点位代表媒体
                  </Text>
                </View>
              ) : (
                <View className="article-ref card" key={index}>
                  <Text className="type-label">
                    设施引用：{block.facilityType}
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
