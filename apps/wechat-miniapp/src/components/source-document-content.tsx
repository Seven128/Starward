import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import type { SourceDocument, SourceSection } from "@/utils/source-document";
import { Provenance } from "./provenance";
import { ForecastCoverageNote } from "./forecast-coverage-note";
import { SoftButton } from "./soft-button";
import { publishedMediaSource } from "@/utils/media-source";

function SourceLinks({ section }: { section: Extract<SourceSection, { kind: "links" }> }) {
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const copy = async (url: string, download: boolean) => {
    if (copying) return;
    const result = validateExternalUrl(url);
    const value = publishedMediaSource(url) ?? result.normalizedUrl ?? (download && result.code === "SSRF_PRIVATE_DESTINATION" ? url : null);
    if (!value) { setMessage("链接暂不可用，可按来源名称查找。"); return; }
    setCopying(true);
    try { await Taro.setClipboardData({ data: value }); setMessage("链接已复制，可在浏览器中查看。"); }
    catch { setMessage("未能复制链接，请重试。"); }
    finally { setCopying(false); }
  };
  return <>{section.items.map((item, index) => <View className="source-document__link" key={index}>
    <Text className="type-caption" selectable>{item.label}：{publishedMediaSource(item.url) ?? (item.url || "来源未提供")}</Text>
    {item.url ? <SoftButton label={`复制${item.label}链接`} disabled={copying} onClick={() => void copy(item.url, Boolean(item.download))}>复制{item.label}</SoftButton> : null}
  </View>)}{message ? <View role="status"><Text className="type-caption">{message}</Text></View> : null}</>;
}

/** Common record, explanatory, rights and fixed-publication link templates. */
export function SourceDocumentContent({ document }: { document: SourceDocument }) {
  return <>{document.sources.map((source, index) => <Provenance source={source} presentation="reading" showKind={false} key={`${source.id}:${index}`} />)}
    {document.sections?.map((section, index) => <View className="source-document__section" key={index}>
      {"title" in section && section.title ? <Text className="type-label">{section.title}</Text> : null}
      {section.kind === "text" ? section.paragraphs.map((text, i) => <Text className="type-secondary" selectable key={i}>{text}</Text>)
        : section.kind === "facts" ? section.items.map((fact, i) => <View className="source-document__fact" key={i}><Text className="type-caption">{fact.label}</Text><Text className="type-secondary" selectable>{fact.value}</Text></View>)
        : section.kind === "links" ? <SourceLinks section={section} />
        : <ForecastCoverageNote starts={section.starts} timezone={section.timezone} scopeKey={`source:${index}`} {...(section.cloudIntervals === undefined ? {} : { cloudIntervals: section.cloudIntervals })} {...(section.scope === undefined ? {} : { scope: section.scope })} {...(section.stale === undefined ? {} : { stale: section.stale })} />}
    </View>)}
  </>;
}
