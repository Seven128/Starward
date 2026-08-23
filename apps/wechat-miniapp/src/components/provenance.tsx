import { View, Text } from "@tarojs/components";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { DATA_STATE_LABELS } from "./data-state-badge";
import "./provenance.scss";

function formatRetrievedAt(value: string) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) return "时间未知";
  const two = (part: number) => String(part).padStart(2, "0");
  return `${timestamp.getFullYear()}-${two(timestamp.getMonth() + 1)}-${two(timestamp.getDate())} ${two(timestamp.getHours())}:${two(timestamp.getMinutes())}`;
}

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
      aria-label={`来源：${source.provider}，状态：${DATA_STATE_LABELS[source.state]}`}
    >
      <View className="provenance__header">
        <Text className="type-label">{source.provider}</Text>
        <Text
          className={`status-tag${source.state === "UNAVAILABLE" || source.state === "EXPIRED" ? " status-tag--danger" : source.state !== "FRESH" ? " status-tag--warning" : ""}`}
        >
          {DATA_STATE_LABELS[source.state]}
        </Text>
      </View>
      <Text className="type-caption">{source.title}</Text>
      {!compact ? (
        <>
          <Text className="type-caption">
            更新时间：{formatRetrievedAt(source.retrievedAt)}
          </Text>
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
