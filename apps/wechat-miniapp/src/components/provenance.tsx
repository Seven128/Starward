import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { SoftButton } from "./soft-button";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { SOURCE_KIND_LABEL, isProductSource } from "@/utils/source-presentation";
export { SOURCE_KIND_LABEL, isProductSource } from "@/utils/source-presentation";
import { DATA_STATE_LABELS, DataStateBadge } from "./data-state-badge";
import "./provenance.scss";

function formatRetrievedAt(value: string) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) return "时间未知";
  try {
    return `${calendarDateInTimezone(timestamp, "Asia/Shanghai")} ${clockTimeInTimezone(timestamp, "Asia/Shanghai")}`;
  } catch { return "时间未知"; }
}

export function Provenance({
  source,
  compact = false,
  showKind = true,
}: {
  source: SourceSummary;
  compact?: boolean;
  showKind?: boolean;
}) {
  const [copyState, setCopyState] = useState("");
  const [copying, setCopying] = useState(false);
  const copyLink = async (value: string) => {
    if (copying) return;
    const result = validateExternalUrl(value);
    if (!result.ok || !result.normalizedUrl) {
      setCopyState("此链接暂不可用，可根据来源名称查找原始资料。");
      return;
    }
    setCopying(true);
    try {
      await Taro.setClipboardData({ data: result.normalizedUrl });
      setCopyState("链接已复制，可在浏览器中查看。");
    } catch {
      setCopyState("未能复制链接，请重试。");
    } finally { setCopying(false); }
  };
  if (!isProductSource(source)) return null;
  const stateLabel = DATA_STATE_LABELS[source.state];
  return (
    <View
      className={`provenance${compact ? " provenance--compact" : ""}`}
      aria-label={`来源：${source.provider}${stateLabel ? `，状态：${stateLabel}` : ""}`}
    >
      <View className="provenance__header">
        <Text className="type-label">{source.provider}</Text>
        <DataStateBadge state={source.state} />
      </View>
      {source.title && source.title !== source.provider ? <Text className="type-secondary">{source.title}</Text> : null}
      {!compact ? (
        <>
          {showKind ? <Text className="type-caption">
            类型：{SOURCE_KIND_LABEL[source.kind]}
          </Text> : null}
          <View className="provenance__timing">
          <Text className="type-caption">时间 · 北京时间</Text>
          <View className="provenance__fact">
            <Text className="type-caption">发布</Text>
            <Text className="type-secondary">{source.publishedAt ? formatRetrievedAt(source.publishedAt) : source.kind === "EDITORIAL_REFERENCE" ? "未提供精确时刻" : "来源未提供"}</Text>
          </View>
          <View className="provenance__fact">
            <Text className="type-caption">获取</Text>
            <Text className="type-secondary">{formatRetrievedAt(source.retrievedAt)}</Text>
          </View>
          <View className="provenance__fact">
            <Text className="type-caption">适用</Text>
            <Text className="type-secondary">{!source.validFrom && !source.validTo ? "来源未提供" : <>
              {source.validFrom ? formatRetrievedAt(source.validFrom) : "起始时间未提供"}
              {" 至 "}{source.validTo ? formatRetrievedAt(source.validTo) : "结束时间未提供"}
            </>}</Text>
          </View>
          </View>
          <Text className="type-caption">
            许可：{source.license || "暂无许可说明"}
          </Text>
          <Text className="type-secondary">精度：{source.precision}</Text>
          {source.limitations.map((item) => (
            <Text className="type-secondary" key={item}>
              · {item}
            </Text>
          ))}
          {source.sourceUrl || source.licenseUrl ? (
            <View className="provenance__links">
              {source.sourceUrl ? <SoftButton label={`复制${source.provider}的原始出处链接`} disabled={copying} onClick={() => void copyLink(source.sourceUrl)}>原始出处</SoftButton> : null}
              {source.licenseUrl ? <SoftButton label={`复制${source.provider}的许可链接`} disabled={copying} onClick={() => void copyLink(source.licenseUrl)}>许可说明</SoftButton> : null}
            </View>
          ) : null}
          {copyState ? <View role="status"><Text className="type-secondary">{copyState}</Text></View> : null}
        </>
      ) : null}
    </View>
  );
}
