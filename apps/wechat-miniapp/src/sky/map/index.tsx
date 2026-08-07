import Taro, { useReady, useRouter } from "@tarojs/taro";
import { Canvas, Slider, Text, View } from "@tarojs/components";
import { useEffect } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { SkySubnav } from "@/components/sky-subnav";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSkyReport } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./map.scss";

const CANVAS_ID = "starward-sky-map";
function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export default function SkyMapPage() {
  const router = useRouter();
  const selection = useAppStore((state) => state.skySelection);
  const setSelection = useAppStore((state) => state.setSkySelection);
  const spotId = safe(router.params.spotId) || selection.spotId || "";
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const nightThemeClass = themeClass.replace(
    /theme-(?:day|observation)/u,
    "theme-night",
  );
  const report = useResourceQuery({
    queryKey: ["sky-map", spotId, selection.localDate],
    queryFn: (signal) =>
      getSkyReport(spotId, selection.localDate, signal),
    enabled: spotId.startsWith("spot:") && Boolean(selection.localDate),
  });
  const draw = () => {
    const context = Taro.createCanvasContext(CANVAS_ID);
    const width = 343;
    const height = 343;
    const center = width / 2;
    context.setFillStyle("#050A14");
    context.fillRect(0, 0, width, height);
    context.setStrokeStyle("#29425F");
    context.setLineWidth(1);
    context.beginPath();
    context.arc(center, center, 142, 0, Math.PI * 2);
    context.stroke();
    context.setFillStyle("#A9BCD2");
    context.setFontSize(12);
    [
      ["北", center, 18],
      ["东", width - 18, center],
      ["南", center, height - 10],
      ["西", 8, center],
    ].forEach(([label, x, y]) =>
      context.fillText(String(label), Number(x), Number(y)),
    );
    const stars = [
      [0.14, 0.22, 2],
      [0.3, 0.36, 3],
      [0.48, 0.18, 2],
      [0.68, 0.3, 2],
      [0.78, 0.54, 3],
      [0.58, 0.68, 2],
      [0.34, 0.72, 2],
      [0.2, 0.56, 2],
    ];
    context.setFillStyle("#EEF5FF");
    stars.forEach(([x, y, radius]) => {
      context.beginPath();
      context.arc(
        Number(x) * width,
        Number(y) * height,
        Number(radius),
        0,
        Math.PI * 2,
      );
      context.fill();
    });
    context.setStrokeStyle("#5AA7FF");
    context.beginPath();
    context.moveTo(48, 76);
    context.lineTo(104, 124);
    context.lineTo(162, 88);
    context.lineTo(232, 132);
    context.lineTo(284, 92);
    context.stroke();
    const target = report.data?.data.targets[0];
    if (target?.altitudeDeg !== null && target) {
      const azimuth = Number.parseFloat(target.direction) || 0;
      const radius = 142 * (1 - Math.max(0, target.altitudeDeg ?? 0) / 90);
      const radians = ((azimuth - 90) * Math.PI) / 180;
      const x = center + Math.cos(radians) * radius;
      const y = center + Math.sin(radians) * radius;
      context.setFillStyle("#5AA7FF");
      context.beginPath();
      context.arc(x, y, 7, 0, Math.PI * 2);
      context.fill();
      context.setFillStyle("#EEF5FF");
      context.fillText(target.displayName, x + 10, y + 4);
    }
    context.draw(false);
  };
  useReady(draw);
  useEffect(draw, [report.data, selection.timeIndex]);
  useEffect(() => {
    if (mode !== "NIGHT") setMode("NIGHT");
  }, [mode, setMode]);

  if (!spotId.startsWith("spot:"))
    return (
      <View className={themeClass}>
        <CustomNav title="星空地图" back />
        <View className="page-inset">
          <StatusPanel state="ERROR" detail="星空地图必须绑定正式 spot_id。" />
        </View>
      </View>
    );
  return (
    <View className={`${nightThemeClass} sky-map-page`} data-route="sky-map">
      <CustomNav title="简化天图" subtitle="Canvas 2D · 非 AR" back />
      <SkySubnav active="MAP" spotId={spotId} />
      <View className="sky-map-content page-inset safe-bottom">
        <View className="sky-canvas-wrap card">
          <Canvas
            canvasId={CANVAS_ID}
            id={CANVAS_ID}
            className="sky-canvas"
            aria-label="方向环、地平线、亮星、主要星座线与当前计算目标的简版星空图"
          />
          <Text className="type-caption">
            方向环与亮星示意；蓝色目标仅来自当前
            SpotSkyContext。未渲染完整深空星表或 AR 相机。
          </Text>
        </View>
        <View className="sky-map-controls card">
          <Text className="type-section">时间</Text>
          <Slider
            min={0}
            max={Math.max(0, (report.data?.data.hourly.length ?? 1) - 1)}
            value={selection.timeIndex}
            step={1}
            activeColor="#5AA7FF"
            backgroundColor="#29425F"
            blockColor="#5AA7FF"
            aria-label="星空地图时间滑杆"
            onChanging={(event) =>
              setSelection({ timeIndex: event.detail.value })
            }
            onChange={(event) =>
              setSelection({ timeIndex: event.detail.value })
            }
          />
          <Text className="type-caption">
            拖动后从当前实时位置重绘；减少动态时立即更新，不使用弹跳或环境光。
          </Text>
        </View>
        <View className="accessible-sky card" aria-label="星空图等价列表">
          <Text className="type-section">可访问目标列表</Text>
          {report.data?.data.targets.length ? (
            report.data.data.targets.map((target) => (
              <View className="accessible-sky__row" key={target.targetId}>
                <Text className="type-label">{target.displayName}</Text>
                <Text className="type-caption">
                  方位 {target.direction}，高度 {target.altitudeDeg ?? "未知"}
                  °，{target.reason}
                </Text>
              </View>
            ))
          ) : (
            <StatusPanel
              state="EMPTY"
              detail="当前无可证明目标；画布装饰不冒充天文事实。"
            />
          )}
        </View>
        <SoftButton
          variant="primary"
          label="进入观测模式"
          onClick={() =>
            Taro.navigateTo({
              url: `/sky/observe/index?spotId=${encodeURIComponent(spotId)}`,
            })
          }
        >
          进入观测模式
        </SoftButton>
      </View>
    </View>
  );
}
