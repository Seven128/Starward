// Copied only into the disposable source staging by build-r17-phone-probe.mjs.
import Taro from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useState } from "react";
import { r17Probe } from "./r17-phone-probe-runtime";
const cases = ["wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;
export function R17PhoneProbeControls({ onStart, onPrepareFov }: {
  onStart(caseKey: string): void; onPrepareFov(fov: number): void;
}) {
  const [open, setOpen] = useState(false), [status, setStatus] = useState("");
  return <View>
    <Button style={{ fontSize: "11px", padding: "0", width: "44px", height: "44px", lineHeight: "44px" }}
      id="r17-probe-menu" onClick={() => setOpen(value => !value)}>计量</Button>
    {open ? <View style={{ position: "fixed", zIndex: 10000, left: "8px", top: "100px", width: "260px", padding: "8px", background: "#172236", color: "#fff", borderRadius: "8px" }}>
      <Text style={{ fontSize: "12px" }}>R17 __VARIANT__ · {r17Probe.status()} · 1秒后计45秒</Text>
      <View style={{ display: "flex" }}>{[45, 10.8].map(fov => <Button key={fov}
        style={{ fontSize: "12px", height: "44px", lineHeight: "44px", flex: 1 }}
        onClick={() => { r17Probe.stop(); setOpen(false); onPrepareFov(fov); }}>准备 {fov}°</Button>)}</View>
      {cases.map(caseKey => <Button key={caseKey} id={`r17-probe-start-${caseKey}`} style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }}
        onClick={() => { r17Probe.start(caseKey); setOpen(false); onStart(caseKey); }}>{caseKey} 开始</Button>)}
      <Button id="r17-probe-export" style={{ fontSize: "12px", height: "44px", lineHeight: "44px" }} onClick={async () => {
        const payload = r17Probe.snapshot();
        if (!payload.runId) { setStatus("尚未开始"); return; }
        const serialized = JSON.stringify(payload);
        if (serialized.length > 32768) { setStatus("数据超过上限"); return; }
        setStatus("导出中");
        try {
          const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
            data: serialized, header: { "content-type": "application/json" }, timeout: 10000 });
          setStatus(result.statusCode === 200 && (result.data as any)?.stored === true ? `已导出 ${payload.runId}` : "导出失败");
        } catch { setStatus("导出失败，可重试"); }
      }}>停止并导出</Button>
      <Text style={{ fontSize: "11px" }}>{status}</Text>
    </View> : null}
  </View>;
}
