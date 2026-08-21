import Taro, { useReady, useRouter } from "@tarojs/taro";
import { Canvas, ScrollView, Slider, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_SPOTS,
  type HourlySkyRow,
  type SkyReport,
  type SpotId,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSkyReport } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";

export type SkyView = "MAIN" | "DETAIL" | "TARGETS";

interface SpotNightRouteContext {
  spotId: string;
  localDate: string;
  selectedAt: string;
  timezone: string;
  dataRevision: string;
}

function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isSelectedAt(value: string) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function validTimezone(value: string) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function observationDateFor(selectedAt: string, timezone: string) {
  if (!isSelectedAt(selectedAt) || !validTimezone(timezone)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(Date.parse(selectedAt) - 12 * 60 * 60 * 1000));
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year ?? ""}-${values.month ?? ""}-${values.day ?? ""}`;
  } catch {
    return "";
  }
}

function formatTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "时间不可用";
  }
}

function formatDateTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "时间不可用";
  }
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}

function nearestHourIndex(hourly: readonly HourlySkyRow[], selectedAt: string) {
  if (!hourly.length || !isSelectedAt(selectedAt)) return 0;
  const target = Date.parse(selectedAt);
  return hourly.reduce((nearest, item, index) => {
    const distance = Math.abs(Date.parse(item.at) - target);
    const nearestDistance = Math.abs(
      Date.parse(hourly[nearest]?.at ?? item.at) - target,
    );
    return distance < nearestDistance ? index : nearest;
  }, 0);
}

function extractDegrees(direction: string) {
  const match = direction.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)\s*°?/u);
  if (!match) return null;
  const degrees = Number(match[1]);
  return Number.isFinite(degrees) && degrees >= 0 && degrees <= 360
    ? degrees
    : null;
}

function drawSkyScene(
  context: ReturnType<typeof Taro.createCanvasContext>,
  data: SkyReport | undefined,
  row: HourlySkyRow | undefined,
  orientationOffset: number,
) {
  const width = 343;
  const height = 300;
  const centerX = width / 2;
  const centerY = 150;
  const radius = 122;
  context.setFillStyle("#07101C");
  context.fillRect(0, 0, width, height);
  context.setStrokeStyle("#42617E");
  context.setLineWidth(1);
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX - radius, centerY);
  context.lineTo(centerX + radius, centerY);
  context.stroke();
  context.setFillStyle("#D5E4F3");
  context.setFontSize(12);
  context.fillText("北", centerX - 6, centerY - radius - 10);
  context.fillText("东", centerX + radius + 8, centerY + 4);
  context.fillText("南", centerX - 6, centerY + radius + 18);
  context.fillText("西", centerX - radius - 18, centerY + 4);
  context.setFillStyle("#87B8E8");
  context.setFontSize(11);
  context.fillText("当前计算目标（方向环，非 AR）", 16, 24);
  if (!data) {
    context.setFillStyle("#9EB2C8");
    context.fillText("等待版本化天空数据", 16, height - 18);
    context.draw(false);
    return;
  }
  data.targets.forEach((target, index) => {
    const degrees = extractDegrees(target.direction);
    if (degrees === null) return;
    const altitude =
      target.altitudeDeg === null
        ? 0
        : Math.max(0, Math.min(90, target.altitudeDeg));
    const distance = radius * (1 - altitude / 90);
    const radians = ((degrees + orientationOffset - 90) * Math.PI) / 180;
    const x = centerX + Math.cos(radians) * distance;
    const y = centerY + Math.sin(radians) * distance;
    context.setFillStyle(index % 2 === 0 ? "#E7C7FF" : "#82D6E6");
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
    context.setFillStyle("#F1F6FC");
    context.setFontSize(10);
    context.fillText(target.displayName.slice(0, 12), x + 8, y + 4);
  });
  context.setFillStyle("#A7BBD0");
  context.setFontSize(10);
  context.fillText(`银河方向：${data.milkyWayDirection}`, 16, height - 32);
  context.fillText(`当前时间：${row?.at ?? "暂无"}`, 16, height - 18);
  context.draw(false);
}

function contextQuery(context: SpotNightRouteContext, selectedAt: string) {
  const params: Array<[string, string]> = [
    ["spotId", context.spotId],
    ["date", context.localDate],
    ["selectedAt", selectedAt || context.selectedAt],
    ["timezone", context.timezone],
    ["dataRevision", context.dataRevision],
  ];
  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

function ContextError({ onBack }: { onBack: () => void }) {
  return (
    <View className="page-inset sky-context-error">
      <StatusPanel
        state="ERROR"
        detail="夜空必须由正式观星点详情携带 spot_id、当地日期、selectedAt、IANA 时区和数据版本进入；没有完整上下文不会回退到当前位置、普通 POI 或示例数据。"
        recoveryLabel="返回地图"
        onRecover={onBack}
      />
    </View>
  );
}

export function SpotSkyPage({ view = "MAIN" }: { view?: SkyView }) {
  const router = useRouter();
  const routeContext = useMemo<SpotNightRouteContext>(
    () => ({
      spotId: safeParam(router.params.spotId),
      localDate: safeParam(router.params.date || router.params.localDate),
      selectedAt: safeParam(router.params.selectedAt),
      timezone: safeParam(router.params.timezone),
      dataRevision: safeParam(router.params.dataRevision),
    }),
    [
      router.params.dataRevision,
      router.params.date,
      router.params.localDate,
      router.params.selectedAt,
      router.params.spotId,
      router.params.timezone,
    ],
  );
  const selection = useAppStore((state) => state.skySelection);
  const setSelection = useAppStore((state) => state.setSkySelection);
  const selectedAt = useAppStore((state) => state.selectedAt);
  const setSelectedAt = useAppStore((state) => state.setSelectedAt);
  const notify = useAppStore((state) => state.notify);
  const mode = useAppStore((state) => state.mode);
  const themeClass = useThemeClass();
  const presentationClass =
    mode === "OBSERVATION"
      ? themeClass
      : themeClass.replace(/theme-day/u, "theme-night");
  const spot = DEMO_SPOTS.find((item) => item.spotId === routeContext.spotId);
  const contextComplete =
    routeContext.spotId.startsWith("spot:") &&
    Boolean(spot) &&
    isDate(routeContext.localDate) &&
    isSelectedAt(routeContext.selectedAt) &&
    validTimezone(routeContext.timezone) &&
    observationDateFor(routeContext.selectedAt, routeContext.timezone) ===
      routeContext.localDate &&
    routeContext.timezone === spot?.timezone &&
    Boolean(routeContext.dataRevision);
  const report = useResourceQuery({
    queryKey: [
      "spot-sky",
      routeContext.spotId,
      routeContext.localDate,
      routeContext.timezone,
      routeContext.dataRevision,
    ],
    queryFn: (signal) =>
      getSkyReport(routeContext.spotId, routeContext.localDate, signal),
    enabled: contextComplete,
  });
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [orientationOffset, setOrientationOffset] = useState(0);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const syncedContextKey = useRef<string | null>(null);

  const data = report.data?.data;
  const contextMatches = Boolean(
    data &&
    data.context.spotId === routeContext.spotId &&
    data.context.localDate === routeContext.localDate &&
    data.context.timezone === routeContext.timezone,
  );
  const reportData = contextMatches ? data : undefined;
  const committedAt = selectedAt || routeContext.selectedAt;
  const committedIndex = clampIndex(
    reportData
      ? nearestHourIndex(reportData.hourly, committedAt)
      : selection.timeIndex,
    reportData?.hourly.length ?? 1,
  );
  const activeIndex = clampIndex(
    previewIndex ?? committedIndex,
    reportData?.hourly.length ?? 1,
  );
  const row = reportData?.hourly[activeIndex];
  const isPreviewing = previewIndex !== null && previewIndex !== committedIndex;

  const draw = useCallback(() => {
    if (view !== "MAIN") return;
    try {
      const context = Taro.createCanvasContext(CANVAS_ID);
      drawSkyScene(context, reportData, row, orientationOffset);
      setCanvasError(null);
    } catch (error) {
      setCanvasError(
        error instanceof Error ? error.message : "canvas_unavailable",
      );
    }
  }, [orientationOffset, reportData, row, view]);

  useReady(draw);
  useEffect(() => {
    if (view === "MAIN" && reportData) draw();
  }, [draw, reportData, view]);

  const contextKey = `${routeContext.spotId}|${routeContext.localDate}|${routeContext.selectedAt}|${routeContext.timezone}|${routeContext.dataRevision}`;
  useEffect(() => {
    if (!contextComplete || !spot || syncedContextKey.current === contextKey)
      return;
    syncedContextKey.current = contextKey;
    if (
      selection.spotId !== routeContext.spotId ||
      selection.localDate !== routeContext.localDate
    ) {
      setSelection({
        spotId: routeContext.spotId as SpotId,
        localDate: routeContext.localDate,
        timeIndex: 0,
      });
    }
    if (selectedAt !== routeContext.selectedAt)
      setSelectedAt(routeContext.selectedAt);
  }, [
    contextComplete,
    contextKey,
    routeContext.localDate,
    routeContext.selectedAt,
    routeContext.spotId,
    selectedAt,
    selection.localDate,
    selection.spotId,
    setSelectedAt,
    setSelection,
    spot,
  ]);

  useEffect(() => {
    if (!contextComplete || !spot || !reportData) return;
    const nextIndex = nearestHourIndex(reportData.hourly, committedAt);
    if (
      selection.spotId === routeContext.spotId &&
      selection.localDate === routeContext.localDate &&
      selection.timeIndex !== nextIndex
    ) {
      setSelection({ timeIndex: nextIndex });
    }
  }, [
    committedAt,
    contextComplete,
    reportData,
    routeContext.localDate,
    routeContext.spotId,
    selection.localDate,
    selection.spotId,
    selection.timeIndex,
    setSelection,
    spot,
  ]);

  useEffect(() => {
    setPreviewIndex(null);
  }, [committedAt, routeContext.localDate, routeContext.spotId]);

  useEffect(() => {
    const dataState = report.data?.dataState;
    if (!contextComplete || !dataState) return;
    const base = {
      owner: "spot-night",
      placement: "inline" as const,
      dismissible: true,
    };
    if (dataState === "UNAVAILABLE" || dataState === "EXPIRED") {
      notify({
        ...base,
        tone: "warning",
        title: "夜空数据不可用",
        body: "保留正式点位和观测上下文；当前不把缓存或示例当作今晚推荐。可在网络恢复后重试。",
        dedupeKey: `spot-night-unavailable:${routeContext.spotId}:${routeContext.localDate}`,
      });
    } else if (dataState !== "FRESH") {
      notify({
        ...base,
        tone: "warning",
        title: "夜空数据需要留意",
        body:
          report.data?.warnings.join(" ") ||
          "当前结果带有陈旧、部分或示例标记，请先查看来源与限制。",
        dedupeKey: `spot-night-state:${routeContext.spotId}:${routeContext.localDate}:${dataState}`,
      });
    }
  }, [
    contextComplete,
    notify,
    report.data?.dataState,
    report.data?.warnings,
    routeContext.localDate,
    routeContext.spotId,
  ]);

  useEffect(() => {
    if (!canvasError) return;
    notify({
      owner: "spot-night",
      placement: "inline",
      tone: "warning",
      title: "天空图暂不可绘制",
      body: "保留下方可访问目标列表、方向和专业数据；Canvas 能力恢复后可重试。",
      dismissible: true,
      dedupeKey: `spot-night-canvas:${routeContext.spotId}`,
    });
  }, [canvasError, notify, routeContext.spotId]);

  const navigateView = (nextView: SkyView) => {
    const route =
      nextView === "MAIN"
        ? "spot/sky/index"
        : nextView === "DETAIL"
          ? "sky/detail/index"
          : "sky/targets/index";
    void Taro.redirectTo({
      url: `/${route}?${contextQuery(routeContext, committedAt)}`,
    });
  };

  const commitIndex = (nextIndex: number) => {
    if (!reportData?.hourly.length) return;
    const safeIndex = clampIndex(nextIndex, reportData.hourly.length);
    const nextRow = reportData.hourly[safeIndex];
    if (!nextRow) return;
    setSelectedAt(nextRow.at);
    setSelection({
      spotId: routeContext.spotId as SpotId,
      localDate: routeContext.localDate,
      timeIndex: safeIndex,
    });
    setPreviewIndex(null);
  };

  const onPreview = (value: number) => {
    if (!reportData?.hourly.length) return;
    setPreviewIndex(clampIndex(value, reportData.hourly.length));
  };

  const goBack = () => {
    Taro.navigateBack().catch(() =>
      Taro.switchTab({ url: "/pages/map/index" }),
    );
  };

  if (!contextComplete || !spot)
    return (
      <View className={themeClass} data-route="spot-night-context-error">
        <CustomNav title="此处夜空" back />
        <ContextError
          onBack={() => Taro.switchTab({ url: "/pages/map/index" })}
        />
      </View>
    );

  const heading =
    view === "DETAIL"
      ? "专业数据"
      : view === "TARGETS"
        ? "观测目标"
        : "此处夜空";
  const usableData =
    reportData &&
    report.data?.dataState !== "EXPIRED" &&
    report.data?.dataState !== "UNAVAILABLE";
  const rowTime = formatTime(row?.at ?? committedAt, routeContext.timezone);
  const indexMax = Math.max(0, (reportData?.hourly.length ?? 1) - 1);

  return (
    <View
      className={`${presentationClass} sky-page`}
      data-route="spot-night"
      data-spot-id={routeContext.spotId}
      data-od-id="spot-night"
    >
      <CustomNav
        title={heading}
        subtitle={`${spot.name} · ${routeContext.localDate}`}
        back
        right={
          <Text className="type-data" aria-label={`当前夜空时间 ${rowTime}`}>
            {rowTime}
          </Text>
        }
      />
      <View className="sky-tabs" role="tablist" aria-label="点位夜空视图">
        {(
          [
            ["MAIN", "结论"],
            ["DETAIL", "数据"],
            ["TARGETS", "目标"],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            className={`sky-tabs__item focus-ring${view === key ? " sky-tabs__item--active" : ""}`}
            role="tab"
            aria-selected={view === key}
            onClick={() => navigateView(key)}
          >
            <Text>{label}</Text>
          </View>
        ))}
      </View>
      <NotificationRegion owner="spot-night" placement="inline" />
      <ScrollView
        scrollY
        className="sky-page__scroll"
        enhanced
        showScrollbar={false}
      >
        <View className="sky-content page-inset safe-bottom">
          <View className="sky-context card" data-od-id="spot-night-context">
            <View className="sky-context__identity">
              <Text className="type-section">{spot.name}</Text>
              <Text className="type-caption">
                正式点位 · {routeContext.spotId} · {routeContext.timezone}
              </Text>
              <Text className="type-caption">
                本地观测日 {routeContext.localDate} · WGS84 · 版本化天空计算
              </Text>
            </View>
            <DataStateBadge state={report.data?.dataState ?? "UNAVAILABLE"} />
          </View>
          {report.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在按正式点位、当地观测日、IANA 时区和版本化数据加载；不会用当前位置或示例结果顶替。"
            />
          ) : report.isError ? (
            <StatusPanel
              state="ERROR"
              detail="夜空计算请求失败；正式点位与完整上下文仍保留，未静默显示成功或合成数据。"
              recoveryLabel="重试夜空"
              onRecover={() => void report.refetch()}
            />
          ) : !reportData ? (
            <StatusPanel
              state="ERROR"
              detail="返回结果与当前正式点位、日期或时区上下文不一致；为避免混用版本，暂不展示该结果。"
              recoveryLabel="重新加载"
              onRecover={() => void report.refetch()}
            />
          ) : (
            <>
              {view === "MAIN" ? (
                <View className="sky-summary-stack">
                  <View
                    className="sky-decision card"
                    data-od-id="spot-night-summary"
                  >
                    <View className="sky-decision__top">
                      <View>
                        <Text className="type-caption">今晚适合度</Text>
                        <Text className="type-page-title">
                          {usableData
                            ? reportData.decision.label
                            : "数据不足，暂不判断"}
                        </Text>
                      </View>
                      <DataStateBadge
                        state={report.data?.dataState ?? "UNAVAILABLE"}
                      />
                    </View>
                    {usableData ? (
                      <>
                        <View className="sky-summary-grid">
                          <View>
                            <Text className="type-caption">连续窗口</Text>
                            <Text className="type-data">
                              {reportData.decision.bestWindow
                                ? `${reportData.decision.bestWindow.start}—${reportData.decision.bestWindow.end}`
                                : "暂无可证明窗口"}
                            </Text>
                          </View>
                          <View>
                            <Text className="type-caption">信心</Text>
                            <Text className="type-data">
                              {reportData.decision.confidence === null
                                ? "未知"
                                : `${Math.round(reportData.decision.confidence * 100)}%`}
                            </Text>
                          </View>
                          <View>
                            <Text className="type-caption">适合</Text>
                            <Text className="type-data">
                              {reportData.decision.suitableFor.length
                                ? reportData.decision.suitableFor.join(" · ")
                                : "暂无"}
                            </Text>
                          </View>
                        </View>
                        <Text className="type-body">
                          月亮：{reportData.moonSummary}
                        </Text>
                        <Text className="type-body">
                          银河方向：{reportData.milkyWayDirection}
                        </Text>
                        {reportData.decision.factors.map((factor) => (
                          <View
                            className={`sky-factor sky-factor--${factor.severity.toLowerCase()}`}
                            key={factor.code}
                          >
                            <Text className="type-label">{factor.label}</Text>
                            <Text className="type-caption">
                              {factor.detail}
                            </Text>
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text className="type-body">
                        当前没有可证明的天文或天气结论；来源和重试路径仍保留。
                      </Text>
                    )}
                  </View>
                  <View
                    className="time-card card"
                    data-od-id="spot-night-time-focus"
                  >
                    <View className="time-card__header">
                      <View>
                        <Text className="type-section">观测时间</Text>
                        <Text className="type-data">{rowTime}</Text>
                        <Text className="type-caption">
                          {isPreviewing
                            ? "预览中，松手提交；取消可恢复已提交时间"
                            : "已提交时间 · 可跨午夜"}
                        </Text>
                      </View>
                      {isPreviewing ? (
                        <SoftButton
                          variant="ghost"
                          label="取消观测时间预览"
                          onClick={() => setPreviewIndex(null)}
                        >
                          取消预览
                        </SoftButton>
                      ) : null}
                    </View>
                    <Slider
                      min={0}
                      max={indexMax}
                      step={1}
                      value={activeIndex}
                      activeColor="var(--primary)"
                      backgroundColor="var(--border)"
                      blockColor="var(--primary)"
                      blockSize={24}
                      disabled={!reportData.hourly.length}
                      aria-label="调整观测时间"
                      onChanging={(event) => onPreview(event.detail.value)}
                      onChange={(event) => commitIndex(event.detail.value)}
                    />
                    <View className="time-metrics">
                      <View>
                        <Text className="type-caption">云量</Text>
                        <Text className="type-data">
                          {row?.cloudPercent === null ||
                          row?.cloudPercent === undefined
                            ? "暂无"
                            : `${row.cloudPercent}%`}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">月亮</Text>
                        <Text className="type-data">
                          {row?.moonAltitudeDeg === null ||
                          row?.moonAltitudeDeg === undefined
                            ? "暂无"
                            : `${row.moonAltitudeDeg}°`}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">稳定性</Text>
                        <Text className="type-data">
                          {row?.state === "FRESH"
                            ? "当前"
                            : (row?.state ?? "暂无")}
                        </Text>
                      </View>
                    </View>
                    <Text className="type-caption">
                      当前时间、结论、天空图、目标列表和专业矩阵共享这一份已提交
                      selectedAt；预览不会改写全局时间。
                    </Text>
                  </View>
                  <View className="sky-scene card" data-od-id="sky-scene">
                    <View className="sky-section-header">
                      <View>
                        <Text className="type-section">版本化天空图</Text>
                        <Text className="type-caption">
                          方向环 · 地平线 · 当前计算目标 · 非 AR
                        </Text>
                      </View>
                      <DataStateBadge
                        state={report.data?.dataState ?? "UNAVAILABLE"}
                      />
                    </View>
                    <Canvas
                      canvasId={CANVAS_ID}
                      id={CANVAS_ID}
                      className="sky-scene__canvas"
                      aria-label="版本化方向环和当前计算目标的 Canvas 2D 天空图"
                    />
                    <View
                      className="orientation-control"
                      data-od-id="sky-orientation-control"
                    >
                      <View>
                        <Text className="type-label">方向输入</Text>
                        <Text className="type-caption">
                          {reportData.compass.state === "READY"
                            ? "传感器方向可用；仅改变呈现方向"
                            : reportData.compass.state === "LOW_ACCURACY"
                              ? "传感器精度较低；可手动校准"
                              : "传感器不可用或未授权；改用手动方向"}
                        </Text>
                      </View>
                      <View className="orientation-actions">
                        <SoftButton
                          variant="ghost"
                          label="手动方向向左 15 度"
                          onClick={() =>
                            setOrientationOffset((value) => value - 15)
                          }
                        >
                          −15°
                        </SoftButton>
                        <Text
                          className="type-data"
                          aria-label={`手动方向偏移 ${orientationOffset} 度`}
                        >
                          {orientationOffset}°
                        </Text>
                        <SoftButton
                          variant="ghost"
                          label="手动方向向右 15 度"
                          onClick={() =>
                            setOrientationOffset((value) => value + 15)
                          }
                        >
                          +15°
                        </SoftButton>
                        <SoftButton
                          variant="ghost"
                          label="重置手动方向"
                          onClick={() => setOrientationOffset(0)}
                        >
                          重置
                        </SoftButton>
                      </View>
                    </View>
                    {reportData.compass.state === "UNAVAILABLE" ? (
                      <StatusPanel
                        state="PERMISSION_DENIED"
                        detail="方向传感器不是天文真值来源；未授权或不可用时仍可用北/东/南/西方向环、文本目标列表和手动偏移。"
                      />
                    ) : reportData.compass.state === "LOW_ACCURACY" ? (
                      <StatusPanel
                        state="PARTIAL"
                        detail="方向传感器精度较低；天文计算不受影响，呈现可以用手动偏移修正。"
                      />
                    ) : null}
                  </View>
                  <View
                    className="sky-targets card"
                    data-od-id="sky-target-list"
                  >
                    <View className="sky-section-header">
                      <View>
                        <Text className="type-section">当前观测目标</Text>
                        <Text className="type-caption">
                          目标由当前正式点位、日期和版本化计算返回
                        </Text>
                      </View>
                      <Text className="status-tag">
                        {reportData.targets.length} 个
                      </Text>
                    </View>
                    {reportData.targets.length ? (
                      reportData.targets.map((target) => (
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
                              {target.confidence === null
                                ? "信心未知"
                                : `信心 ${Math.round(target.confidence * 100)}%`}
                            </Text>
                          </View>
                          <Text className="type-data">
                            {target.window
                              ? `${target.window.start}—${target.window.end}`
                              : "窗口不足"}{" "}
                            · {target.direction} · 高度{" "}
                            {target.altitudeDeg ?? "未知"}°
                          </Text>
                          <Text className="type-body">{target.reason}</Text>
                          <Provenance source={target.source} compact />
                        </View>
                      ))
                    ) : (
                      <StatusPanel
                        state="EMPTY"
                        detail="当前没有可证明目标；不会把猎户座、木星、金星、流星雨或伴月等夹具硬写成今晚可见。"
                      />
                    )}
                  </View>
                </View>
              ) : view === "TARGETS" ? (
                <View className="sky-targets card" data-od-id="sky-target-list">
                  <View className="sky-section-header">
                    <Text className="type-section">观测目标列表</Text>
                    <Text className="type-caption">
                      与 selectedAt 和当前观测夜同步
                    </Text>
                  </View>
                  {reportData.targets.length ? (
                    reportData.targets.map((target) => (
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
                            {target.confidence === null
                              ? "信心未知"
                              : `${Math.round(target.confidence * 100)}%`}
                          </Text>
                        </View>
                        <Text className="type-data">
                          {target.window
                            ? `${target.window.start}—${target.window.end}`
                            : "窗口不足"}{" "}
                          · {target.direction} · 高度{" "}
                          {target.altitudeDeg ?? "未知"}°
                        </Text>
                        <Text className="type-body">{target.reason}</Text>
                        <Provenance source={target.source} compact />
                      </View>
                    ))
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="当前没有可证明目标，不显示天文夹具。"
                    />
                  )}
                </View>
              ) : (
                <View
                  className="professional-card card"
                  data-od-id="sky-professional-matrix"
                >
                  <View className="sky-section-header">
                    <View>
                      <Text className="type-section">分小时专业数据</Text>
                      <Text className="type-caption">
                        云、降水、风、温度、能见度、月亮与黑暗；版本{" "}
                        {reportData.context.algorithmVersion} ·{" "}
                        {reportData.context.catalogVersion}
                      </Text>
                    </View>
                    <DataStateBadge
                      state={report.data?.dataState ?? "UNAVAILABLE"}
                    />
                  </View>
                  {reportData.hourly.length ? (
                    <ScrollView
                      scrollX
                      className="professional-table"
                      enhanced
                      showScrollbar={false}
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
                        {reportData.hourly.map((item) => (
                          <View className="professional-row" key={item.at}>
                            <Text>
                              {formatTime(item.at, routeContext.timezone)}
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
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="当前没有逐小时数据；缺失不会显示为 0。"
                    />
                  )}
                </View>
              )}
              {view !== "DETAIL" ? (
                <View className="sky-compact-data card">
                  <View className="sky-section-header">
                    <View>
                      <Text className="type-section">数据状态与边界</Text>
                      <Text className="type-caption">
                        更新时间{" "}
                        {formatDateTime(
                          report.data?.generatedAt,
                          routeContext.timezone,
                        )}
                      </Text>
                    </View>
                    <DataStateBadge
                      state={report.data?.dataState ?? "UNAVAILABLE"}
                    />
                  </View>
                  <Text className="type-body">
                    预缓存 {reportData.precachedHours} 小时 ·{" "}
                    {reportData.offlineReady
                      ? "声明可用的有限离线摘要"
                      : "没有离线摘要"}
                    ；硬过期或不可用时不显示当前推荐。
                  </Text>
                  <Text className="type-caption">
                    数据修订 {reportData.context.dataRevision} · 算法{" "}
                    {reportData.context.algorithmVersion} · 星表{" "}
                    {reportData.context.catalogVersion}
                  </Text>
                  {report.data?.warnings.map((warning) => (
                    <Text className="type-caption" key={warning}>
                      · {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View className="sources-stack" data-od-id="spot-source-evidence">
                <Text className="type-section">计算与数据来源</Text>
                {reportData.sources.map((source) => (
                  <Provenance source={source} key={source.id} />
                ))}
              </View>
              <View className="sky-actions">
                {view !== "DETAIL" ? (
                  <SoftButton
                    label="查看完整专业数据"
                    onClick={() => navigateView("DETAIL")}
                  >
                    专业数据
                  </SoftButton>
                ) : null}
                {view !== "TARGETS" ? (
                  <SoftButton
                    label="查看全部观测目标"
                    onClick={() => navigateView("TARGETS")}
                  >
                    目标列表
                  </SoftButton>
                ) : null}
                {view !== "MAIN" ? (
                  <SoftButton
                    variant="primary"
                    label="返回夜空结论"
                    onClick={() => navigateView("MAIN")}
                  >
                    返回结论
                  </SoftButton>
                ) : null}
                <SoftButton
                  variant="ghost"
                  label="返回正式观星点详情"
                  onClick={goBack}
                >
                  返回点位详情
                </SoftButton>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
