// TASK ONLY CPU/page-only · frozen · synthetic. Never product acceptance.
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { r17Probe } from "./r17-phone-probe-runtime";
import { r17AttachPageBridge, r17CreatePageBridgeState, r17PageBridgeEnableDebug,
  r17ReadEnableDebug, r17ResetPageBridgeObservation, r17StopPageBridgeSampling,
  r17PageBridgeObservationStats } from "./r17-page-bridge-observer";
import { r17CpuPageOnlyStats } from "./r17-cpu-page-only";
const cases = ["wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;
type CaseKey = typeof cases[number];
let autoExport: ReturnType<typeof setTimeout> | undefined;
let terminatePlay: ReturnType<typeof setTimeout> | undefined;
let pauseCurrentRun: ((runStartAt: string) => boolean) | undefined;
let generation = 0, exporting = false, measurementStarted = false;
let armedPlay: CaseKey | null = null, status = "CPU/page-only · frozen · synthetic，尚未开始";
let cached: { payload: ReturnType<typeof r17Probe.snapshot>; serialized: string; counts: string } | null = null;
let subscriber: ((value: string) => void) | undefined;
const readDebug = () => r17ReadEnableDebug(typeof Taro.getAppBaseInfo === "function" ? () => Taro.getAppBaseInfo() : undefined);
const number = (value: number) => Math.round(value * 1000) / 1000;
const countText = () => {
  const v = r17PageBridgeObservationStats();
  const c = r17CpuPageOnlyStats();
  return `Z${Number(c.frozen)} R${Number(c.retired)} N${c.nativeCopies}/${c.readyNativeCopies} V${c.syntheticBegins}/${c.syntheticFinishes}/${c.syntheticPublications} T${c.discs}/${c.segments} J${c.images}/${c.readiness} A${v.available} D${v.enableDebug === null ? "UNKNOWN" : v.enableDebug} I${v.inheritedPending} S${v.submitted} C${v.completed} F${v.failed}/${v.failedBeforeCallback} P${v.pending} M${v.maxPending} X${v.duplicateCallback} L${number(v.latencyTotalMs)}/${number(v.latencyMaxMs)} K${v.keyCountTotal}/${v.maxKeyCount}/${v.keyCountFailures} B${v.sampledCalls}:${v.sampledBytes}/${v.maxSampledBytes}/${v.serializationFailures} Q${v.callbackMissing} G${v.bufferDataCalls}:${v.totalTypedUploadBytes}/${v.maxTypedUploadBytes}`;
};
const publishStatus = (value: string) => { status = value; subscriber?.(value); };
function clearAutoExport() { if (autoExport !== undefined) clearTimeout(autoExport); autoExport = undefined; }
function cancelDiagnostic() {
  generation++; clearAutoExport(); armedPlay = null; measurementStarted = false;
  if (terminatePlay !== undefined) clearTimeout(terminatePlay); terminatePlay = undefined;
  cached = null; r17Probe.stop(); r17StopPageBridgeSampling();
}
export function useR17CpuPageOnlyStop(stop: (runStartAt: string) => boolean) {
  const live = useRef(stop); live.current = stop;
  useEffect(() => {
    const current = (runStartAt: string) => live.current(runStartAt);
    pauseCurrentRun = current;
    return () => { if (pauseCurrentRun === current) pauseCurrentRun = undefined; };
  }, []);
}
export function useR17CpuPageOnlyLifecycle() {
  // Capture the Page while this Sky component renders. A later effect must not
  // attach to a different page just because Current.page changed meanwhile.
  const page = useRef(Taro.getCurrentInstance().page);
  const state = useRef<ReturnType<typeof r17CreatePageBridgeState> | null>(null);
  if (!state.current) state.current = r17CreatePageBridgeState();
  const release = useRef<(() => void) | undefined>(undefined);
  const attach = () => {
    if (release.current || Taro.getCurrentInstance().page !== page.current) return;
    r17PageBridgeEnableDebug(readDebug());
    release.current = r17AttachPageBridge(page.current as any, state.current!);
  };
  const detach = () => { release.current?.(); release.current = undefined; };
  useDidShow(attach);
  useDidHide(() => { cancelDiagnostic(); detach(); });
  useEffect(() => { attach(); return () => { cancelDiagnostic(); detach(); }; }, []);
}
async function exportDiagnostic() {
  if (exporting) return;
  if (armedPlay) { publishStatus(`CPU/page-only · frozen · synthetic ${countText()}，等待正常播放按钮`); return; }
  clearAutoExport();
  if (!cached) {
    if (!measurementStarted) { publishStatus("CPU/page-only · frozen · synthetic，尚未开始"); return; }
    const counts = countText();
    const payload = r17Probe.snapshot();
    if (!payload.runId) { publishStatus("CPU/page-only · frozen · synthetic，尚未开始"); return; }
    const serialized = JSON.stringify(payload);
    if (serialized.length > 32768) { publishStatus("CPU/page-only · frozen · synthetic，数据超过上限"); return; }
    cached = { payload, serialized, counts };
  }
  const current = cached, expected = generation;
  exporting = true;
  publishStatus(`CPU/page-only · frozen · synthetic ${current.counts} 导出中`);
  try {
    const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
      data: current.serialized, header: { "content-type": "application/json" }, timeout: 10000 });
    if (generation === expected) publishStatus(result.statusCode === 200 && (result.data as any)?.stored === true
      ? `CPU/page-only · frozen · synthetic ${current.counts} 已导出 ${current.payload.runId}；${Math.round(current.payload.window.elapsedMs)}ms/manual`
      : `CPU/page-only · frozen · synthetic ${current.counts} 导出失败，可重试`);
  } catch {
    if (generation === expected) publishStatus(`CPU/page-only · frozen · synthetic ${current.counts} 导出失败，可重试`);
  } finally { exporting = false; }
}
function beginMeasurement(caseKey: CaseKey) {
  measurementStarted = true;
  r17ResetPageBridgeObservation(readDebug());
  r17Probe.start(caseKey);
  publishStatus(`CPU/page-only · frozen · synthetic ${countText()}，15秒后自动导出`);
  const expected = generation;
  autoExport = setTimeout(() => { autoExport = undefined; if (generation === expected) void exportDiagnostic(); }, 15000);
}
function startDiagnostic(caseKey: CaseKey) {
  if (exporting) return false;
  cancelDiagnostic();
  if (caseKey.endsWith("-play")) { armedPlay = caseKey; publishStatus(`CPU/page-only · frozen · synthetic ${countText()}，等待正常播放按钮`); }
  else beginMeasurement(caseKey);
  return true;
}
// Only the original guarded normal Play start calls this; never autoplay.
export function r17CpuPageOnlyProductPlayStarted(runStartAt: string | null) {
  if (!armedPlay || exporting || !runStartAt) return false;
  const caseKey = armedPlay; armedPlay = null; beginMeasurement(caseKey);
  const expected = generation;
  // Bounded diagnostic termination invokes the latest guarded normal Pause.
  // Export remains at15s; termination at20s is neither cadence nor quality policy.
  terminatePlay = setTimeout(() => {
    terminatePlay = undefined;
    if (generation === expected) pauseCurrentRun?.(runStartAt);
  }, 20000);
  return true;
}
export function R17PhoneProbeControls({ onStart, onPrepareFov }: {
  onStart(caseKey: string): void; onPrepareFov(fov: number): void;
}) {
  const [open, setOpen] = useState(false), [visibleStatus, setStatus] = useState(status);
  const [headerCounts, setHeaderCounts] = useState(() => countText());
  useEffect(() => { subscriber = setStatus; setStatus(status); return () => { if (subscriber === setStatus) subscriber = undefined; }; }, []);
  return <View>
    <Button style={{ fontSize: "11px", padding: "0", width: "44px", height: "44px", lineHeight: "44px" }}
      id="r17-probe-menu" onClick={() => { if (!open) setHeaderCounts(countText()); setOpen(!open); }}>计量</Button>
    {open ? <View style={{ position: "fixed", zIndex: 10000, left: "8px", top: "100px", width: "260px", padding: "8px", background: "#172236", color: "#fff", borderRadius: "8px" }}>
      <Text style={{ fontSize: "12px" }}>R17 CPU/page-only · frozen · synthetic</Text>
      <Text style={{ display: "block", fontSize: "10px", overflowWrap: "anywhere" }}>{headerCounts}</Text>
      <Text style={{ display: "block", fontSize: "11px" }}>冻结画面，合成发布；禁止应用/选取/来源。正常Play计量，15秒导出，20秒正常暂停</Text>
      <View style={{ display: "flex" }}>{[45, 10.8].map(fov => <Button key={fov}
        style={{ fontSize: "12px", height: "44px", lineHeight: "44px", flex: 1 }}
        onClick={() => { if (exporting) return; cancelDiagnostic(); setOpen(false); onPrepareFov(fov); }}>准备 {fov}°</Button>)}</View>
      {cases.map(caseKey => <Button key={caseKey} id={`r17-probe-start-${caseKey}`} style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => { if (!startDiagnostic(caseKey)) return; setOpen(false); onStart(caseKey); }}>{caseKey} {caseKey.endsWith("-play") ? "待命" : "开始"}</Button>)}
      <Button id="r17-probe-export" style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }} onClick={() => void exportDiagnostic()}>停止计量并导出</Button>
      <Text style={{ fontSize: "10px", overflowWrap: "anywhere" }}>{visibleStatus}</Text>
    </View> : null}
  </View>;
}
