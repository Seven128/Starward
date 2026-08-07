import Taro, { useDidHide, useRouter } from "@tarojs/taro";
import { Switch, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getSkyReport } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./observe.scss";

function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}
export default function ObservePage() {
  const router = useRouter();
  const selection = useAppStore((state) => state.skySelection);
  const enter = useAppStore((state) => state.enterObservation);
  const exit = useAppStore((state) => state.exitObservation);
  const spotId = safe(router.params.spotId) || selection.spotId || "";
  const [keepAwake, setKeepAwake] = useState(false);
  const [imagesEnabled, setImagesEnabled] = useState(false);
  const report = useResourceQuery({
    queryKey: ["observe", spotId, selection.localDate],
    queryFn: (signal) =>
      getSkyReport(spotId, selection.localDate, signal),
    enabled: spotId.startsWith("spot:") && Boolean(selection.localDate),
  });
  useEffect(() => {
    enter();
    return () => {
      exit();
      void Taro.setKeepScreenOn({ keepScreenOn: false });
    };
  }, [enter, exit]);
  useDidHide(() => {
    void Taro.setKeepScreenOn({ keepScreenOn: false });
  });
  const toggleAwake = async (value: boolean) => {
    setKeepAwake(value);
    try {
      await Taro.setKeepScreenOn({ keepScreenOn: value });
    } catch {
      setKeepAwake(false);
    }
  };
  const leave = () => {
    exit();
    void Taro.setKeepScreenOn({ keepScreenOn: false });
    void Taro.navigateBack();
  };
  if (!spotId.startsWith("spot:"))
    return (
      <View className="observe-page theme-observation">
        <StatusPanel
          state="ERROR"
          detail="观测模式必须从正式点位夜空进入。"
          recoveryLabel="返回"
          onRecover={leave}
        />
      </View>
    );
  const data = report.data?.data;
  return (
    <View
      className="observe-page theme-observation safe-top safe-bottom"
      data-route="observation"
      data-spot-id={spotId}
    >
      <View className="observe-header">
        <View>
          <Text className="type-section">现场观测</Text>
          <Text className="type-caption">
            {spotId} · {selection.localDate}
          </Text>
        </View>
        <SoftButton
          variant="ghost"
          label="退出观测模式并恢复之前上下文"
          onClick={leave}
        >
          退出
        </SoftButton>
      </View>
      {report.isPending ? (
        <StatusPanel
          state="LOADING"
          detail="黑红低亮度加载；不显示白色骨架或媒体。"
        />
      ) : report.isError || !data ? (
        <StatusPanel
          state="ERROR"
          detail="核心数据不足；保持点位、日期和返回路径。"
          recoveryLabel="重试"
          onRecover={() => void report.refetch()}
        />
      ) : (
        <>
          <View className="observe-decision">
            <Text className="type-caption">当前结论</Text>
            <Text className="observe-decision__label">
              {data.decision.label}
            </Text>
            {data.decision.factors.map((factor) => (
              <Text className="type-body" key={factor.code}>
                ! {factor.label}：{factor.detail}
              </Text>
            ))}
          </View>
          <View className="observe-grid">
            <View>
              <Text className="type-caption">时间索引</Text>
              <Text className="observe-data">{selection.timeIndex + 1}</Text>
            </View>
            <View>
              <Text className="type-caption">银河方向</Text>
              <Text className="observe-data">{data.milkyWayDirection}</Text>
            </View>
            <View>
              <Text className="type-caption">月亮</Text>
              <Text className="observe-data">{data.moonSummary}</Text>
            </View>
            <View>
              <Text className="type-caption">罗盘</Text>
              <Text className="observe-data">
                {data.compass.state === "READY" ? "已校准" : "手动方向"}
              </Text>
            </View>
          </View>
          <View className="observe-targets">
            <Text className="type-section">必要目标</Text>
            {data.targets.length ? (
              data.targets.slice(0, 3).map((target) => (
                <View className="observe-target" key={target.targetId}>
                  <Text className="observe-target__name">
                    {target.displayName}
                  </Text>
                  <Text className="type-body">
                    {target.direction} · {target.altitudeDeg ?? "—"}° ·{" "}
                    {target.window
                      ? `${target.window.start}—${target.window.end}`
                      : "窗口不足"}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="type-body">
                当前没有可证明目标；不显示设计夹具。
              </Text>
            )}
          </View>
          <View className="observe-offline">
            <Text className="type-section">离线与新鲜度</Text>
            <Text className="type-body">
              预缓存 {data.precachedHours} 小时 ·{" "}
              {data.offlineReady ? "离线摘要可用" : "离线摘要不可用"}
            </Text>
            <Text className="type-body">
              最后生成：{report.data.generatedAt} · {report.data.dataState}
            </Text>
          </View>
          <View className="observe-setting">
            <View>
              <Text className="type-label">保持屏幕常亮</Text>
              <Text className="type-caption">会增加耗电；离开页面自动关闭</Text>
            </View>
            <Switch
              checked={keepAwake}
              color="#FF514A"
              aria-label="保持屏幕常亮"
              onChange={(event) => void toggleAwake(event.detail.value)}
            />
          </View>
          <View className="observe-setting">
            <View>
              <Text className="type-label">现场媒体</Text>
              <Text className="type-caption">默认关闭，避免破坏暗适应</Text>
            </View>
            <Switch
              checked={imagesEnabled}
              color="#FF514A"
              aria-label="允许在观测模式打开媒体"
              onChange={(event) => setImagesEnabled(event.detail.value)}
            />
          </View>
          {imagesEnabled ? (
            <View className="observe-media-gate">
              <Text className="type-body">
                媒体能力已手动允许，但本模式仍不自动载入图片。请返回详情后主动查看。
              </Text>
            </View>
          ) : null}
          {report.data.warnings.length ? (
            <StatusPanel
              state="PARTIAL"
              detail={report.data.warnings.join(" ")}
            />
          ) : null}
          <View className="observe-actions">
            <SoftButton
              label="返回外部地图或复制坐标"
              onClick={() =>
                Taro.navigateBack({ delta: 2 }).catch(() =>
                  Taro.switchTab({ url: "/pages/map/index" }),
                )
              }
            >
              回程地图
            </SoftButton>
            <SoftButton variant="primary" label="退出观测模式" onClick={leave}>
              退出并恢复
            </SoftButton>
          </View>
        </>
      )}
    </View>
  );
}
