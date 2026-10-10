import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { validateExternalUrl, type SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource, sourceAttributions } from "@/utils/source-presentation";
import { SoftButton } from "./soft-button";
import "./source-attribution.scss";

/** Required credits beside supplied content; detailed provenance stays with its disclosure. */
export function SourceAttribution({ sources, compact = false, presentation = "default" }: {
  sources: readonly SourceSummary[]; compact?: boolean; presentation?: "default" | "disclosure";
}) {
  const [message, setMessage] = useState("");
  const declared = sourceAttributions(sources).map(credit => ({ ...credit, declared: true }));
  const declaredKeys = new Set(declared.map(credit => JSON.stringify([credit.name, credit.url])));
  // An original-source reading link is metadata, never an invented mandatory notice.
  const reading = presentation === "disclosure" ? [...new Map(sources.filter(isProductSource)
    .filter(source => !source.attribution && source.sourceUrl)
    .map(source => {
      const value = { name: source.provider || source.title, url: source.sourceUrl, statements: [] as string[], declared: false };
      return [JSON.stringify([value.name, value.url]), value] as const;
    })).values()].filter(credit => !declaredKeys.has(JSON.stringify([credit.name, credit.url]))) : [];
  const credits = [...declared, ...reading];
  const copy = async (url: string) => {
    const value = validateExternalUrl(url).normalizedUrl;
    if (!value) { setMessage("来源链接暂不可用。"); return; }
    try { await Taro.setClipboardData({ data: value }); setMessage("来源链接已复制，可在浏览器中查看。"); }
    catch { setMessage("复制未成功，请重试。"); }
  };
  if (!credits.length) return null;
  return <View className={`source-attribution${presentation === "disclosure" ? " source-attribution--disclosure" : ""}`} aria-label={presentation === "disclosure" ? "资料来源与声明" : "数据来源声明"}>
    {credits.map(credit => <View className="source-attribution__credit" key={JSON.stringify([credit.name, credit.url])}>
      {presentation === "disclosure" ? <Text className="source-attribution__name" selectable>{credit.name}</Text> : null}
      <SoftButton className="source-attribution__link" variant="ghost" label={`复制${credit.name}${credit.declared ? "官方" : "原始出处"}链接`} onClick={() => void copy(credit.url)}>
        <Text className="source-attribution__link-text">{presentation === "disclosure" ? credit.declared ? "复制官方链接" : "复制原始出处" : compact ? "复制来源链接" : `复制链接 · ${credit.name} · ${credit.url}`}</Text>
      </SoftButton>
      {presentation === "disclosure" ? <Text className="source-attribution__url" selectable>{credit.url}</Text> : null}
      {credit.statements.map(statement => <Text className="type-caption" selectable key={statement}>{statement}</Text>)}
    </View>)}
    {message ? <View role="status"><Text className="type-caption">{message}</Text></View> : null}
  </View>;
}
