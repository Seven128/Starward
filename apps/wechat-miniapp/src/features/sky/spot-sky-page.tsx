import Taro, { useRouter } from "@tarojs/taro";
import { Picker, ScrollView, Slider, Text, View } from "@tarojs/components";
import { useEffect } from "react";
import { DEMO_SPOTS } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { Provenance } from "@/components/provenance";
import { SkySubnav } from "@/components/sky-subnav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSkyReport } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./spot-sky-page.scss";

export type SkyView = "MAIN" | "DETAIL" | "TARGETS";
function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export function SpotSkyPage({ view = "MAIN" }: { view?: SkyView }) {
  const router = useRouter();
  const routeSpotId = safeParam(router.params.spotId);
  const selection = useAppStore((state) => state.skySelection);
  const setSelection = useAppStore((state) => state.setSkySelection);
  const selectedSpotId = useAppStore((state) => state.selectedSpotId);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const themeClass = useThemeClass();
  const nightThemeClass = themeClass.replace(
    /theme-(?:day|observation)/u,
    "theme-night",
  );
  const spotId = routeSpotId || selection.spotId || selectedSpotId || "";
  const localDate =
    selection.spotId === spotId && selection.localDate
      ? selection.localDate
      : localToday();
  const report = useResourceQuery({
    queryKey: ["spot-sky", spotId, localDate],
    queryFn: (signal) => getSkyReport(spotId, localDate, signal),
    enabled: spotId.startsWith("spot:"),
  });
  const spot = DEMO_SPOTS.find((item) => item.spotId === spotId);
  useEffect(() => {
    if (
      spotId.startsWith("spot:") &&
      (selection.spotId !== spotId || !selection.localDate)
    )
      setSelection({
        spotId: spotId as typeof selection.spotId,
        localDate,
        timeIndex: 0,
      });
  }, [localDate, selection.localDate, selection.spotId, setSelection, spotId]);
  useEffect(() => {
    if (mode !== "NIGHT") setMode("NIGHT");
  }, [mode, setMode]);

  if (!routeSpotId && !selection.spotId)
    return (
      <View className={themeClass}>
        <CustomNav title="夜空" back />
        <View className="page-inset">
          <StatusPanel
            state="ERROR"
            detail="夜空没有全局入口，必须从一个正式观星点详情携带 spot_id 进入。"
            recoveryLabel="返回地图"
            onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
          />
        </View>
      </View>
    );
  if (!spotId.startsWith("spot:") || !spot)
    return (
      <View className={themeClass}>
        <CustomNav title="夜空" back />
        <View className="page-inset">
          <StatusPanel
            state="ERROR"
            detail="spot_id 不是当前正式点位人口中的稳定 ID；没有回退到当前位置或普通 POI。"
            recoveryLabel="返回地图"
            onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
          />
        </View>
      </View>
    );

  const data = report.data?.data;
  const row = data?.hourly[selection.timeIndex] ?? data?.hourly[0];
  const heading =
    view === "DETAIL"
      ? "专业数据"
      : view === "TARGETS"
        ? "观测目标"
        : "本点位今晚夜空";
  const activeSubnav =
    view === "DETAIL" ? "DATA" : view === "TARGETS" ? "TARGETS" : "TONIGHT";
  const rowTime = row
    ? new Date(row.at).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: spot.timezone,
      })
    : "—";
  const navigate = (path: string) =>
    Taro.navigateTo({ url: `/${path}?spotId=${encodeURIComponent(spotId)}` });
  return (
    <View
      className={`${nightThemeClass} sky-page`}
      data-route={`sky-${view.toLowerCase()}`}
      data-spot-id={spotId}
    >
      <CustomNav
        title={heading}
        subtitle={`${spot.name} · ${spot.timezone}`}
        back
        right={
          <Text className="type-data" aria-label={`当前夜空时间 ${rowTime}`}>
            {rowTime}
          </Text>
        }
      />
      <SkySubnav active={activeSubnav} spotId={spotId} />
      <ScrollView
        scrollY
        className="sky-page__scroll"
        enhanced
        showScrollbar={false}
      >
        <View className="sky-content page-inset safe-bottom">
          <View className="sky-context card">
            <View>
              <Text className="type-section">{spot.name}</Text>
              <Text className="type-caption">
                {spotId} · WGS84 · {spot.timezone}
              </Text>
            </View>
            <Picker
              mode="date"
              value={localDate}
              onChange={(event) =>
                setSelection({ localDate: event.detail.value, timeIndex: 0 })
              }
            >
              <View
                className="date-control focus-ring"
                role="button"
                aria-label={`选择观测日期，当前 ${localDate}`}
              >
                <Text className="type-label">{localDate}</Text>
              </View>
            </Picker>
          </View>
          {report.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在按当前点位、当地日期、时区和版本化算法加载。"
            />
          ) : report.isError || !data ? (
            <StatusPanel
              state="ERROR"
              detail="夜空计算不可用；点位与日期上下文保留，没有回退到设计示例。"
              recoveryLabel="重试夜空"
              onRecover={() => void report.refetch()}
            />
          ) : (
            <>
              <View className="sky-decision card">
                <View className="sky-decision__top">
                  <View>
                    <Text className="type-section">今晚结论</Text>
                    <Text className="type-page-title">
                      {data.decision.label}
                    </Text>
                  </View>
                  <DataStateBadge state={report.data.dataState} />
                </View>
                <Text className="type-body">月亮：{data.moonSummary}</Text>
                <Text className="type-body">
                  银河：{data.milkyWayDirection}
                </Text>
                {data.decision.factors.map((factor) => (
                  <View
                    className={`sky-factor sky-factor--${factor.severity.toLowerCase()}`}
                    key={factor.code}
                  >
                    <Text className="type-label">{factor.label}</Text>
                    <Text className="type-caption">{factor.detail}</Text>
                  </View>
                ))}
              </View>
              {view !== "TARGETS" ? (
                <View className="time-card card">
                  <View className="time-card__header">
                    <View>
                      <Text className="type-section">时间</Text>
                      <Text className="type-data">
                        {row
                          ? new Date(row.at).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: spot.timezone,
                            })
                          : "暂无小时数据"}
                      </Text>
                    </View>
                    <Text className="status-tag">观测夜可跨午夜</Text>
                  </View>
                  <Slider
                    min={0}
                    max={Math.max(0, (data.hourly.length || 1) - 1)}
                    step={1}
                    value={Math.min(
                      selection.timeIndex,
                      Math.max(0, data.hourly.length - 1),
                    )}
                    activeColor="var(--primary)"
                    backgroundColor="var(--border)"
                    blockColor="var(--primary)"
                    blockSize={24}
                    disabled={data.hourly.length === 0}
                    aria-label="观测时间滑杆"
                    onChanging={(event) =>
                      setSelection({ timeIndex: event.detail.value })
                    }
                    onChange={(event) =>
                      setSelection({ timeIndex: event.detail.value })
                    }
                  />
                  <Text className="type-caption">
                    星空图、专业矩阵与目标列表共用此点位/日期/时间索引。
                  </Text>
                </View>
              ) : null}
              {view !== "DETAIL" ? (
                <View className="sky-targets card">
                  <View className="sky-section-header">
                    <Text className="type-section">今晚推荐观测目标</Text>
                    <Text className="type-caption">
                      当前计算，不使用示例冒充
                    </Text>
                  </View>
                  {data.targets.length ? (
                    data.targets.map((target) => (
                      <View className="sky-target" key={target.targetId}>
                        <View className="sky-target__top">
                          <View>
                            <Text className="type-section">
                              {target.displayName}
                            </Text>
                            <Text className="type-caption">
                              {target.type} · {target.targetId}
                            </Text>
                          </View>
                          <Text className="status-tag">
                            置信度{" "}
                            {target.confidence === null
                              ? "—"
                              : `${Math.round(target.confidence * 100)}%`}
                          </Text>
                        </View>
                        <Text className="type-data">
                          {target.window
                            ? `${target.window.start}—${target.window.end}`
                            : "可见窗口不足"}{" "}
                          · {target.direction} · {target.altitudeDeg ?? "—"}°
                        </Text>
                        <Text className="type-body">{target.reason}</Text>
                        <Provenance source={target.source} compact />
                      </View>
                    ))
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="当前能力未生成可推荐目标。猎户座、木星、金星、流星雨和伴月仅作为测试夹具类型，不会硬写为今天可见。"
                    />
                  )}
                </View>
              ) : null}
              {view !== "TARGETS" ? (
                <View className="hourly-card card">
                  <View className="sky-section-header">
                    <Text className="type-section">天气、云与黑暗</Text>
                    <DataStateBadge state={row?.state ?? "UNAVAILABLE"} />
                  </View>
                  {row ? (
                    <View className="metric-grid">
                      <View>
                        <Text className="type-caption">云量</Text>
                        <Text className="type-data">
                          {row.cloudPercent ?? "暂无"}
                          {row.cloudPercent === null ? "" : "%"}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">降水</Text>
                        <Text className="type-data">
                          {row.precipitationMm ?? "暂无"}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">风速</Text>
                        <Text className="type-data">
                          {row.windKph ?? "暂无"}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">能见度</Text>
                        <Text className="type-data">
                          {row.visibilityKm ?? "暂无"}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">月亮高度</Text>
                        <Text className="type-data">
                          {row.moonAltitudeDeg ?? "暂无"}°
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">黑暗</Text>
                        <Text className="type-data">{row.darkness}</Text>
                      </View>
                    </View>
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="没有可用小时数据；缺失不会显示为 0。"
                    />
                  )}
                </View>
              ) : null}
              {view === "DETAIL" ? (
                <View className="professional-card card">
                  <Text className="type-section">完整专业数据矩阵</Text>
                  <Text className="type-caption">
                    同一 SpotSkyContext · {data.context.algorithmVersion} ·{" "}
                    {data.context.catalogVersion}
                  </Text>
                  <ScrollView
                    scrollX
                    className="professional-table"
                    enhanced
                    aria-label="逐小时专业数据表"
                  >
                    <View className="professional-table__inner">
                      <View className="professional-row professional-row--head">
                        <Text>时间</Text>
                        <Text>云量</Text>
                        <Text>降水</Text>
                        <Text>风速</Text>
                        <Text>温度</Text>
                        <Text>能见度</Text>
                        <Text>月高</Text>
                        <Text>月相</Text>
                        <Text>黑暗</Text>
                      </View>
                      {data.hourly.map((item) => (
                        <View className="professional-row" key={item.at}>
                          <Text>
                            {new Date(item.at).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: spot.timezone,
                            })}
                          </Text>
                          <Text>{item.cloudPercent ?? "暂无"}</Text>
                          <Text>{item.precipitationMm ?? "暂无"}</Text>
                          <Text>{item.windKph ?? "暂无"}</Text>
                          <Text>{item.temperatureC ?? "暂无"}</Text>
                          <Text>{item.visibilityKm ?? "暂无"}</Text>
                          <Text>{item.moonAltitudeDeg ?? "暂无"}</Text>
                          <Text>
                            {item.moonIllumination === null
                              ? "暂无"
                              : `${Math.round(item.moonIllumination * 100)}%`}
                          </Text>
                          <Text>{item.darkness}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}
              <View className="sky-actions">
                <SoftButton
                  label="打开简版星空地图"
                  onClick={() => navigate("sky/map/index")}
                >
                  星空地图
                </SoftButton>
                {view !== "DETAIL" ? (
                  <SoftButton
                    label="查看完整专业数据"
                    onClick={() => navigate("sky/detail/index")}
                  >
                    详细数据
                  </SoftButton>
                ) : null}
                {view !== "TARGETS" ? (
                  <SoftButton
                    label="查看全部目标"
                    onClick={() => navigate("sky/targets/index")}
                  >
                    目标列表
                  </SoftButton>
                ) : null}
                <SoftButton
                  variant="primary"
                  label="进入黑红观测模式"
                  onClick={() => navigate("sky/observe/index")}
                >
                  观测模式
                </SoftButton>
              </View>
              <View className="sources-stack">
                <Text className="type-section">计算与数据来源</Text>
                {data.sources.map((source) => (
                  <Provenance source={source} key={source.id} />
                ))}
              </View>
              {report.data.warnings.length ? (
                <StatusPanel
                  state="PARTIAL"
                  detail={report.data.warnings.join(" ")}
                  recoveryLabel="重新计算"
                  onRecover={() => void report.refetch()}
                />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
