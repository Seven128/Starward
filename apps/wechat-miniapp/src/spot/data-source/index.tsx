import { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { buildDemoSpotDetail } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import "./data-source.scss";
function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}
export default function DataSourcePage() {
  const detail = buildDemoSpotDetail(safe(useRouter().params.spotId));
  const themeClass = useThemeClass();
  const sources = detail
    ? [
        ...new Map(
          detail.dataDisclosure.map((source) => [source.id, source]),
        ).values(),
      ]
    : [];
  return (
    <View className={`${themeClass} sources-page`}>
      <CustomNav title="来源与更新时间" subtitle={detail?.spot.name} back />
      <View className="sources-content page-inset safe-bottom">
        {!detail ? (
          <StatusPanel state="ERROR" detail="来源页必须绑定正式 spot_id。" />
        ) : (
          <>
            <View className="source-principles card">
              <Text className="type-section">展示纪律</Text>
              <Text className="type-body">
                第三方预测、产品计算、官方核验、现场反馈与历史资料分开显示；缺失不显示为
                0；估算不包装为实测；过期关键数据不能产生推荐。
              </Text>
            </View>
            {sources.map((source) => (
              <Provenance source={source} key={source.id} />
            ))}
            <View className="source-principles card">
              <Text className="type-section">地图与许可边界</Text>
              <Text className="type-body">
                点位名称和 WGS84 几何来自 OpenStreetMap/ODbL；GCJ-02
                仅为中国大陆地图显示派生值。公开运营前仍需地图资质、审图号、天气署名、遥感许可和媒体台账逐项核验。
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
