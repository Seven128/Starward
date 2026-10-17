import { Text, View } from "@tarojs/components";
import type { RepresentativeMedia } from "@starward/miniapp-contracts";
import { ReadingImage } from "@/components/reading-image";
import { SourceDisclosure } from "@/components/source-disclosure";
import { mediaSource } from "@/utils/media-source";

/** Caption and complete rights metadata remain readable even when decoding fails. */
export function ArticleMedia({ media, caption, sourceId }: { media: RepresentativeMedia; caption: string; sourceId: string }) {
  return <View className="article-media">
    <ReadingImage src={mediaSource(media.localPath)} alt={media.alt} />
    <Text className="article-media__caption type-caption">{caption || media.caption} · {media.photographer || "来源未注明"} · {media.license}</Text>
    {!media.isSiteSpecific ? <Text className="status-tag status-tag--warning">代表媒体，不证明本点现场</Text> : null}
    <SourceDisclosure id={sourceId} label="照片来源与许可" sources={[]}>
      <Text className="type-caption" selectable>原始出处：{media.sourceUrl || "来源未提供"}</Text>
      <Text className="type-caption" selectable>许可：{media.license}</Text>
      {media.licenseUrl ? <Text className="type-caption" selectable>许可链接：{media.licenseUrl}</Text> : null}
      <Text className="type-caption">拍摄时间：{media.capturedAt || "来源未提供"}</Text>
    </SourceDisclosure>
  </View>;
}
