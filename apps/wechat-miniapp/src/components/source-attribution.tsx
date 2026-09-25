import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { validateExternalUrl, type SourceSummary } from "@starward/miniapp-contracts";
import { sourceAttributions } from "@/utils/source-presentation";
import { SoftButton } from "./soft-button";
import "./source-attribution.scss";

/** Required credits beside supplied content; detailed provenance stays with its disclosure. */
export function SourceAttribution({ sources }: { sources: readonly SourceSummary[] }) {
  const [message, setMessage] = useState("");
  const credits = sourceAttributions(sources);
  const copy = async (url: string) => {
    const value = validateExternalUrl(url).normalizedUrl;
    if (!value) { setMessage("来源链接暂不可用。"); return; }
    try { await Taro.setClipboardData({ data: value }); setMessage("来源链接已复制，可在浏览器中查看。"); }
    catch { setMessage("复制未成功，请重试。"); }
  };
  if (!credits.length) return null;
  return <View className="source-attribution" aria-label="数据来源声明">
    {credits.map(credit => <View className="source-attribution__credit" key={JSON.stringify([credit.name, credit.url])}>
      <SoftButton variant="ghost" label={`复制${credit.name}官方链接`} onClick={() => void copy(credit.url)}>复制链接 · {credit.name} · {credit.url}</SoftButton>
      {credit.statements.map(statement => <Text className="type-caption" selectable key={statement}>{statement}</Text>)}
    </View>)}
    {message ? <View role="status"><Text className="type-caption">{message}</Text></View> : null}
  </View>;
}
