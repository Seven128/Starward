import { Canvas, Text, View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import { useLayoutEffect, useMemo, useState } from "react";
import { SourceDisclosure } from "@/components/source-disclosure";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import type { useTerrainHorizon } from "@/hooks/use-terrain-horizon";
import { useAppStore } from "@/state/app-store";
import { drawTerrainHorizon, terrainHorizonChart } from "./terrain-horizon-chart";
import "./spot-terrain-horizon.scss";

let canvasSequence = 0;

export function SpotTerrainHorizon({ query, visible }: { query: ReturnType<typeof useTerrainHorizon>; visible: boolean }) {
  const mode = useAppStore(state => state.mode);
  const [foreground, setForeground] = useState(true);
  const [revision, setRevision] = useState(0);
  const [drawnId, setDrawnId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  useDidHide(() => setForeground(false));
  useDidShow(() => setForeground(true));
  useResize(() => setRevision(value => value + 1));
  const data = query.data?.data;
  const model = data?.state !== "UNAVAILABLE" ? data?.model : null;
  const chart = useMemo(() => model ? terrainHorizonChart(model) : null, [model]);
  // Each point/theme/lifecycle has its own node. An expired selector callback
  // can neither draw over the next station nor release its canvas buffer.
  const frame = useMemo(() => ({ id: `terrain-horizon-${++canvasSequence}`, chart, mode }),
    [chart, mode, visible, foreground, revision]);
  useLayoutEffect(() => {
    if (!visible || !foreground || !frame.chart) return;
    let retired = false, canvas: Taro.Canvas | null = null;
    const acquire = (attempt: number) => {
      if (retired) return;
      try {
        Taro.createSelectorQuery().select(`#${frame.id}`).fields({ node: true, size: true }, result => {
          if (retired) return;
          if (!result?.node || typeof result.node.getContext !== "function"
            || !Number.isFinite(result.width) || !Number.isFinite(result.height) || result.width <= 0 || result.height <= 0) {
            if (attempt === 0) Taro.nextTick(() => acquire(1));
            else setFailedId(frame.id);
            return;
          }
          try {
            canvas = result.node as Taro.Canvas;
            const pixelRatio = Taro.getWindowInfo().pixelRatio;
            const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
            canvas.width = Math.round(result.width * ratio); canvas.height = Math.round(result.height * ratio);
            const context = canvas.getContext("2d") as CanvasRenderingContext2D;
            if (!context || typeof context.setTransform !== "function") throw new Error("horizon_canvas_unavailable");
            // Pixel ratio only sizes this bitmap. It is unrelated to map
            // ground coverage or a physical centimetre measurement.
            context.setTransform(canvas.width / 326, 0, 0, canvas.height / 120, 0, 0);
            drawTerrainHorizon(context, frame.chart!, frame.mode);
            setDrawnId(frame.id);
          } catch { setFailedId(frame.id); }
        }).exec();
      } catch { if (!retired) setFailedId(frame.id); }
    };
    Taro.nextTick(() => acquire(0));
    return () => { retired = true; if (canvas) { canvas.width = 0; canvas.height = 0; canvas = null; } };
  }, [frame, visible, foreground]);

  const canvasFailed = failedId === frame.id;
  const failed = query.isError || Boolean(query.refreshError) || Boolean(data?.failureCode);
  const blocking = !chart || drawnId !== frame.id;
  const loading = query.isPending || (Boolean(chart) && !canvasFailed && drawnId !== frame.id);
  const retry = () => { if (chart && canvasFailed) setRevision(value => value + 1); else void query.refetch(); };
  const partial = data?.state === "PARTIAL";
  const chartLabel = model && chart ? `山体轮廓模型估算，真北顺时针，${model.knownSectors}个方向有高程采样，`
    + `最低${chart.minimumAngle?.toFixed(1)}度，最高${chart.maximumAngle?.toFixed(1)}度。${partial ? "斜线和断口表示未知方向。" : ""}` : "山体轮廓";
  return <View className="spot-horizon" data-control="spot-terrain-horizon-profile">
    <View className="spot-horizon__content" aria-hidden={blocking}>
      <View className="spot-horizon__header"><Text className="spot-horizon__title">山体遮挡</Text><Text className="spot-horizon__badge">模型估算</Text></View>
      <View className="spot-horizon__chart" role="img" ariaLabel={chartLabel}>
        {chart && visible && foreground ? <Canvas key={frame.id} id={frame.id} type="2d" className="spot-horizon__canvas" aria-hidden="true" /> : null}
      </View>
      {model ? <View className="spot-horizon__meta"><Text className="spot-horizon__range">分析范围 {model.radiusM / 1000} km</Text>
        <Text className={`spot-horizon__summary${partial ? " spot-horizon__summary--partial" : ""}`}>{partial ? "部分方向高程缺测" : "低空轮廓估算 · 近物情况待现场核对"}</Text></View> : null}
      <Text className="spot-horizon__disclaimer">依据历史高程估算；近处树木、围墙需结合现场资料。</Text>
      {data ? <SourceDisclosure key={data.publicationId ?? "unavailable"} id="spot-horizon-source" label="数据源：Copernicus DEM GLO-30" sources={data.source ? [data.source] : []}>
        <Text>{data.coverageLabel}</Text>
        {data.limitations.map(limitation => <Text key={limitation}>{limitation}</Text>)}
      </SourceDisclosure> : null}
      {chart && failed ? <View className="spot-horizon__recovery"><Text>部分轮廓暂时无法更新，已保留可用方向。</Text>
        <SoftButton label="重新读取山体轮廓" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "正在重试…" : "重新获取"}</SoftButton></View> : null}
    </View>
    {blocking ? <View className="spot-horizon__state"><StatusPanel state={loading ? "LOADING" : canvasFailed || failed ? "ERROR" : "EMPTY"}
      title={canvasFailed ? "山体轮廓暂时无法显示" : failed ? "山体轮廓暂时无法读取" : "暂无山体轮廓"}
      detail={loading ? "正在读取山体轮廓" : canvasFailed ? "可重新显示已读取的轮廓。" : failed ? "可重新尝试获取" : data?.coverageLabel ?? "当前站位暂无可用高程。"}
      recoveryLabel={!loading && (canvasFailed || failed) ? canvasFailed ? "重新显示" : "重新获取" : undefined}
      onRecover={!loading && (canvasFailed || failed) ? retry : undefined} /></View> : null}
  </View>;
}
