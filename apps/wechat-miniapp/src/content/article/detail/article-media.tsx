import { Text, View } from "@tarojs/components";
import type { RepresentativeMedia } from "@starward/miniapp-contracts";
import { ReadingImage } from "@/components/reading-image";
import { SourceEntry } from "@/components/source-entry";
import { mediaSource } from "@/utils/media-source";

/** Caption and complete rights metadata remain readable even when decoding fails. */
export function ArticleMedia({ media, caption, sourceId }: { media: RepresentativeMedia; caption: string; sourceId: string }) {
  return <View className="article-media">
    <ReadingImage src={mediaSource(media.localPath)} alt={media.alt} />
    <Text className="article-media__caption type-caption">{caption || media.caption} · {media.photographer || "来源未注明"} · {media.license}</Text>
    {!media.isSiteSpecific ? <Text className="status-tag status-tag--warning">代表媒体，不证明本点现场</Text> : null}
    <SourceEntry id={sourceId} label="照片来源与许可" sources={[]} sections={[
      { kind: "facts", items: [
        { label: "摄影者", value: media.photographer || "来源未注明" },
        { label: "许可", value: media.license },
        { label: "拍摄时间", value: media.capturedAt || "来源未提供" },
        { label: "现场归属", value: media.isSiteSpecific ? "本点现场媒体" : "代表媒体，不证明本点现场" },
        ...(!media.sourceUrl ? [{ label: "原始出处", value: "来源未提供" }] : []),
      ] },
      { kind: "links", items: [
        ...(media.sourceUrl ? [{ label: "原始出处", url: media.sourceUrl }] : []),
        ...(media.licenseUrl ? [{ label: "许可", url: media.licenseUrl }] : []),
      ] },
    ]} />
  </View>;
}
