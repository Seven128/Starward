// Task-only frozen-image diagnosis; never imported by ordinary product source.
import Taro, { useDidHide } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { r17Probe } from "./r17-phone-probe-runtime";
import { r17NativeCopySuppressionStats } from "./sky-canvas-surface";
const cases = ["wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;
type CaseKey = typeof cases[number];

// The menu unmounts when a case opens the time panel. Keep one bounded timer
// with the page lifetime, not the temporary menu's lifetime. No render loop.
let autoExport: ReturnType<typeof setTimeout> | undefined;
let generation = 0, exporting = false, status = "synthetic，尚未开始";
let cached: { payload: ReturnType<typeof r17Probe.snapshot>; serialized: string; counts: string } | null = null;
let subscriber: ((value: string) => void) | undefined;
const countText = () => {
  const value = r17NativeCopySuppressionStats();
  return `S${value.surfaces} C${value.actualCopies} X${value.suppressedCopies}`;
};
const publishStatus = (value: string) => { status = value; subscriber?.(value); };
function clearAutoExport() {
  if (autoExport !== undefined) clearTimeout(autoExport);
  autoExport = undefined;
}
function cancelDiagnostic() {
  generation++; clearAutoExport(); r17Probe.stop();
}
export function useR17NativeSuppressionLifecycle() {
  useDidHide(cancelDiagnostic);
  useEffect(() => () => cancelDiagnostic(), []);
}
async function exportDiagnostic() {
  if (exporting) return;
  clearAutoExport();
  if (!cached) {
    // snapshot uses stop("manual"). durationLimitMs remains 45000; this early
    // receipt is never represented as a complete 45-second measurement.
    const payload = r17Probe.snapshot();
    if (!payload.runId) { publishStatus("synthetic，尚未开始"); return; }
    const serialized = JSON.stringify(payload);
    if (serialized.length > 32768) { publishStatus("synthetic，数据超过上限"); return; }
    cached = { payload, serialized, counts: countText() };
  }
  const current = cached, expected = generation;
  exporting = true;
  publishStatus(`synthetic ${current.counts} 导出中`);
  try {
    const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
      data: current.serialized, header: { "content-type": "application/json" }, timeout: 10000 });
    if (generation === expected) publishStatus(result.statusCode === 200 && (result.data as any)?.stored === true
      ? `synthetic ${current.counts} 已导出 ${current.payload.runId}；${Math.round(current.payload.window.elapsedMs)}ms/manual`
      : `synthetic ${current.counts} 导出失败，可重试`);
  } catch {
    if (generation === expected) publishStatus(`synthetic ${current.counts} 导出失败，可重试`);
  } finally { exporting = false; }
}
function startDiagnostic(caseKey: CaseKey) {
  if (exporting) return false;
  clearAutoExport(); generation++; cached = null;
  r17Probe.start(caseKey);
  publishStatus(`synthetic ${countText()}，15秒后自动导出`);
  const expected = generation;
  autoExport = setTimeout(() => {
    autoExport = undefined;
    if (generation === expected) void exportDiagnostic();
  }, 15000);
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
      <Text style={{ fontSize: "12px" }}>冻结画面诊断 / synthetic · {countText()}</Text>
      <Text style={{ display: "block", fontSize: "11px" }}>1秒后计量，15秒自动导出；不暂停播放</Text>
      <View style={{ display: "flex" }}>{[45, 10.8].map(fov => <Button key={fov}
        style={{ fontSize: "12px", height: "44px", lineHeight: "44px", flex: 1 }}
        onClick={() => { if (exporting) return; cancelDiagnostic(); setOpen(false); onPrepareFov(fov); }}>准备 {fov}°</Button>)}</View>
      {cases.map(caseKey => <Button key={caseKey} id={`r17-probe-start-${caseKey}`} style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => { if (!startDiagnostic(caseKey)) return; setOpen(false); onStart(caseKey); }}>{caseKey} 开始</Button>)}
      <Button id="r17-probe-export" style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => void exportDiagnostic()}>停止计量并导出</Button>
      <Text style={{ fontSize: "11px", overflowWrap: "anywhere" }}>{visibleStatus}</Text>
    </View> : null}
  </View>;
}
