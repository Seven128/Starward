// Task-only GPU backpressure diagnosis. Never imported by ordinary source.
import Taro, { useDidHide } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { r17Probe } from "./r17-phone-probe-runtime";
import { r17GpuFinishStats } from "./sky-canvas-surface";
const cases = ["wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;
type CaseKey = typeof cases[number];

// The case menu unmounts when the original time panel opens. This bounded
// diagnostic state follows the page, with no interval or per-frame React work.
let autoExport: ReturnType<typeof setTimeout> | undefined;
let generation = 0, exporting = false, measurementStarted = false;
let armedPlay: CaseKey | null = null, status = "candidate/gpu-finish，尚未开始";
let cached: { payload: ReturnType<typeof r17Probe.snapshot>; serialized: string; counts: string } | null = null;
let subscriber: ((value: string) => void) | undefined;
const countText = () => {
  const value = r17GpuFinishStats();
  return `S${value.surfaces} F${value.completedFinishes} C${value.actualCopies}`;
};
const publishStatus = (value: string) => { status = value; subscriber?.(value); };
function clearAutoExport() {
  if (autoExport !== undefined) clearTimeout(autoExport);
  autoExport = undefined;
}
function cancelDiagnostic() {
  generation++; clearAutoExport(); armedPlay = null; measurementStarted = false;
  cached = null; r17Probe.stop();
}
export function useR17GpuFinishLifecycle() {
  useDidHide(cancelDiagnostic);
  useEffect(() => () => cancelDiagnostic(), []);
}
async function exportDiagnostic() {
  if (exporting) return;
  if (armedPlay) { publishStatus(`candidate/gpu-finish ${countText()}，等待正常播放按钮`); return; }
  clearAutoExport();
  if (!cached) {
    if (!measurementStarted) { publishStatus("candidate/gpu-finish，尚未开始"); return; }
    // Original protocol retains 45000ms. This is an early manual snapshot,
    // nominally 14000 active milliseconds after the existing one-second arm.
    const payload = r17Probe.snapshot();
    if (!payload.runId) { publishStatus("candidate/gpu-finish，尚未开始"); return; }
    const serialized = JSON.stringify(payload);
    if (serialized.length > 32768) { publishStatus("candidate/gpu-finish，数据超过上限"); return; }
    cached = { payload, serialized, counts: countText() };
  }
  const current = cached, expected = generation;
  exporting = true;
  publishStatus(`candidate/gpu-finish ${current.counts} 导出中`);
  try {
    const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
      data: current.serialized, header: { "content-type": "application/json" }, timeout: 10000 });
    if (generation === expected) publishStatus(result.statusCode === 200 && (result.data as any)?.stored === true
      ? `candidate/gpu-finish ${current.counts} 已导出 ${current.payload.runId}；${Math.round(current.payload.window.elapsedMs)}ms/manual`
      : `candidate/gpu-finish ${current.counts} 导出失败，可重试`);
  } catch {
    if (generation === expected) publishStatus(`candidate/gpu-finish ${current.counts} 导出失败，可重试`);
  } finally { exporting = false; }
}
function beginMeasurement(caseKey: CaseKey) {
  measurementStarted = true;
  r17Probe.start(caseKey);
  publishStatus(`candidate/gpu-finish ${countText()}，15秒后自动导出`);
  const expected = generation;
  autoExport = setTimeout(() => {
    autoExport = undefined;
    if (generation === expected) void exportDiagnostic();
  }, 15000);
}
function startDiagnostic(caseKey: CaseKey) {
  if (exporting) return false;
  cancelDiagnostic();
  if (caseKey.endsWith("-play")) {
    armedPlay = caseKey;
    publishStatus(`candidate/gpu-finish ${countText()}，等待正常播放按钮`);
  } else beginMeasurement(caseKey);
  return true;
}
// Called only after the original guarded product Play owner accepts starting.
// This function never starts, pauses or replaces the product time owner.
export function r17GpuFinishProductPlayStarted() {
  if (!armedPlay || exporting) return false;
  const caseKey = armedPlay;
  armedPlay = null;
  beginMeasurement(caseKey);
  return true;
}

export function R17PhoneProbeControls({ onStart, onPrepareFov }: {
  onStart(caseKey: string): void; onPrepareFov(fov: number): void;
}) {
  const [open, setOpen] = useState(false), [visibleStatus, setStatus] = useState(status);
  useEffect(() => { subscriber = setStatus; setStatus(status); return () => { if (subscriber === setStatus) subscriber = undefined; }; }, []);
  return <View>
    <Button style={{ fontSize: "11px", padding: "0", width: "44px", height: "44px", lineHeight: "44px" }}
      id="r17-probe-menu" onClick={() => setOpen(value => !value)}>计量</Button>
    {open ? <View style={{ position: "fixed", zIndex: 10000, left: "8px", top: "100px", width: "260px", padding: "8px", background: "#172236", color: "#fff", borderRadius: "8px" }}>
      <Text style={{ fontSize: "12px" }}>R17 candidate/gpu-finish · {countText()}</Text>
      <Text style={{ display: "block", fontSize: "11px" }}>play待正常播放；1秒后计量，15秒导出；不暂停</Text>
      <View style={{ display: "flex" }}>{[45, 10.8].map(fov => <Button key={fov}
        style={{ fontSize: "12px", height: "44px", lineHeight: "44px", flex: 1 }}
        onClick={() => { if (exporting) return; cancelDiagnostic(); setOpen(false); onPrepareFov(fov); }}>准备 {fov}°</Button>)}</View>
      {cases.map(caseKey => <Button key={caseKey} id={`r17-probe-start-${caseKey}`} style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => { if (!startDiagnostic(caseKey)) return; setOpen(false); onStart(caseKey); }}>{caseKey} {caseKey.endsWith("-play") ? "待命" : "开始"}</Button>)}
      <Button id="r17-probe-export" style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => void exportDiagnostic()}>停止计量并导出</Button>
      <Text style={{ fontSize: "11px", overflowWrap: "anywhere" }}>{visibleStatus}</Text>
    </View> : null}
  </View>;
}
