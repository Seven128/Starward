// TASK ONLY. Manual arm/seal and the existing R17 immutable single-flight POST.
import Taro, { useDidHide } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { r17Probe } from "./r17-phone-probe-runtime";
import { r17ProbePayloadBytes } from "./r17-ruler-entry-runtime";
import { d2Time } from "./d2-time-observation";

r17Probe.configureBinding({ mode: "normal", buildGeneration: __D2_TIME_GENERATION__, buildSourceSha256: "__D2_TIME_SOURCE_HASH__" });
let exporting = false, cached: { runId: string; serialized: string } | null = null, status = "";
export async function exportD2TimeObservation() {
  if (exporting) return;
  if (!cached) {
    const payload = d2Time.snapshot();
    if (!payload?.runId) { status = "等待真实时间输入"; return; }
    const serialized = JSON.stringify(payload);
    if (r17ProbePayloadBytes(serialized) > 32768) { status = "记录超过原字节上限，未发送"; return; }
    cached = { runId: payload.runId, serialized };
  }
  const current = cached; exporting = true; status = "保存中";
  try {
    const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
      data: current.serialized, header: { "content-type": "application/json" }, timeout: 10000 });
    if (cached !== current) return;
    if (result.statusCode === 200 && (result.data as { stored?: unknown })?.stored === true) {
      d2Time.markSaved(current.runId); cached = null; status = `已保存 ${current.runId}`;
    } else status = "保存未确认，可重试原记录";
  } catch { if (cached === current) status = "保存未确认，可重试原记录"; }
  finally { exporting = false; }
}
export function useD2TimeObservation(scope: object, visible: boolean) {
  d2Time.scope(scope, visible);
  useDidHide(() => d2Time.hide());
  useEffect(() => () => d2Time.hide(), []);
}
export function D2TimeControls({ scope }: { scope: object }) {
  const [, render] = useState(0);
  return <View style={{ padding: "8px", fontSize: "12px" }}>
    <Text>诊断：时间输入与呈现</Text>
    <Text style={{ display: "block" }}>{d2Time.status()}；{status}</Text>
    <Button className="d2-time-arm" onClick={() => {
      if (exporting || cached) return;
      status = d2Time.arm(scope) ? "沿正常时间控件操作" : "当前不可开始，保留未保存记录";
      render(value => value + 1);
    }}>准备观察</Button>
    <Button className="d2-time-export" onClick={() => {
      void exportD2TimeObservation().finally(() => render(value => value + 1));
    }}>结束观察 / 重试保存</Button>
  </View>;
}
