import { View, Text } from "@tarojs/components";
import type { SourceSummary } from "@starward/miniapp-contracts";
import "./provenance.scss";

export function Provenance({
  source,
  compact = false,
}: {
  source: SourceSummary;
  compact?: boolean;
}) {
  return (
    <View
      className={`provenance${compact ? " provenance--compact" : ""}`}
      aria-label={`来源：${source.provider}，状态：${source.state}`}
    >
      <View className="provenance__header">
        <Text className="type-label">{source.provider}</Text>
        <Text
          className={`status-tag${source.state === "UNAVAILABLE" || source.state === "EXPIRED" ? " status-tag--danger" : source.state !== "FRESH" ? " status-tag--warning" : ""}`}
        >
          {source.state}
        </Text>
      </View>
      <Text className="type-caption">{source.title}</Text>
      {!compact ? (
        <>
          <Text className="type-caption">获取：{source.retrievedAt}</Text>
          <Text className="type-caption">
            许可：{source.license || "未配置"}
          </Text>
          <Text className="type-caption">精度：{source.precision}</Text>
          {source.limitations.map((item) => (
            <Text className="type-caption" key={item}>
              · {item}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}
