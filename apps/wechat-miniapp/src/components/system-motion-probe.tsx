import { View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow, useReady } from "@tarojs/taro";
import { useId, useLayoutEffect, useRef } from "react";
import { systemMotionReader } from "@/theme/system-motion-state";
import "./system-motion-probe.scss";

/** Read-only page layout input; no visible content, storage, account or OS writes. */
export function SystemMotionProbe() {
  const id = `system-motion-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const alive = useRef(true), ready = useRef(false), visible = useRef(true);
  const release = useRef<(() => void) | undefined>(undefined);
  const stop = () => { release.current?.(); release.current = undefined; };
  const start = () => {
    if (!alive.current || !ready.current || !visible.current) return;
    stop();
    release.current = systemMotionReader.start(id, receive => {
      const query = Taro.createSelectorQuery();
      for (const suffix of ["control", "normal", "reduce"]) query.select(`#${id}-${suffix}`).fields({ size: true });
      query.exec(receive);
    });
  };
  useReady(() => { ready.current = true; start(); });
  useDidShow(() => { visible.current = true; start(); });
  useDidHide(() => { visible.current = false; stop(); });
  useLayoutEffect(() => {
    alive.current = true;
    start();
    return () => { alive.current = false; stop(); };
  }, []);
  return <>
    <View id={`${id}-control`} className="system-motion-probe system-motion-probe--control" aria-hidden="true" />
    <View id={`${id}-normal`} className="system-motion-probe system-motion-probe--normal" aria-hidden="true" />
    <View id={`${id}-reduce`} className="system-motion-probe system-motion-probe--reduce" aria-hidden="true" />
  </>;
}
