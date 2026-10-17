import { PageContainer, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type MapLeaveCycle = { generation: number; commandSettled: boolean; exited: boolean };

/** One native Back command lifetime. Auxiliary layers mount shown and retire
 * after leave; Map retains its foreground subtree and before-leave protocol. */
export function NativeBackBoundary({ active, onBack, nativeMapContent }: {
  active: boolean;
  onBack: () => void | Promise<void>;
  /** Map's existing foreground container also carries its event modal. */
  nativeMapContent?: ReactNode;
}) {
  const isMap = nativeMapContent !== undefined;
  const live = useRef({ active, isMap, onBack, visible: true, alive: true, generation: 0, handled: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapLeave = useRef<MapLeaveCycle | null>(null);
  const [presentation, setPresentation] = useState({ generation: 0, armed: !isMap });
  const state = live.current;
  if (state.active !== active || state.isMap !== isMap) {
    state.generation++;
    state.handled = false;
    mapLeave.current = null;
  }
  Object.assign(state, { active, isMap, onBack });
  const clear = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  const current = (generation: number) => state.alive && state.active && state.visible && state.generation === generation;
  const arm = (generation: number, delay?: number) => {
    clear();
    const show = () => {
      timer.current = null;
      if (!current(generation)) return;
      if (!isMap || !mapLeave.current) state.handled = false;
      setPresentation({ generation, armed: true });
    };
    if (delay === undefined) show();
    else timer.current = setTimeout(show, delay);
  };
  useEffect(() => {
    state.alive = true;
    return () => { state.alive = false; state.generation++; mapLeave.current = null; clear(); };
  }, []);
  useEffect(() => {
    setPresentation({ generation: state.generation, armed: false });
    if (active && state.visible) arm(state.generation, isMap ? 32 : undefined);
    return clear;
  }, [active, isMap]);
  useDidHide(() => {
    state.visible = false; state.generation++; mapLeave.current = null; clear();
    setPresentation({ generation: state.generation, armed: false });
  });
  useDidShow(() => {
    state.visible = true;
    arm(state.generation, isMap ? 32 : undefined);
  });
  const generation = state.generation;
  const rearmMap = (cycle: MapLeaveCycle) => {
    if (mapLeave.current === cycle && current(cycle.generation)
      && cycle.commandSettled && cycle.exited && timer.current === null) arm(cycle.generation, 32);
  };
  const handleLeave = () => {
    if (!current(generation) || state.handled) return;
    state.handled = true;
    const consumed = ++state.generation;
    const cycle = isMap ? { generation: consumed, commandSettled: false, exited: false } : null;
    mapLeave.current = cycle;
    setPresentation({ generation: consumed, armed: false });
    let request: Promise<void>;
    try { request = Promise.resolve(state.onBack()); }
    catch { request = Promise.reject(new Error("native_back_command_failed")); }
    void request.catch(() => console.warn("native_back_command_failed")).finally(() => {
      if (cycle) { cycle.commandSettled = true; rearmMap(cycle); }
      else if (current(consumed)) arm(consumed, 0);
    });
  };
  const shown = active && state.visible && presentation.armed && presentation.generation === generation;
  const handleMapAfterLeave = () => {
    const cycle = mapLeave.current;
    // The callback may belong to the leaving render or its hidden successor.
    if (!cycle || (cycle.generation !== generation && cycle.generation !== generation + 1)) return;
    cycle.exited = true;
    rearmMap(cycle);
  };
  const handleMapAfterEnter = () => {
    if (shown && current(generation) && mapLeave.current?.generation === generation) {
      mapLeave.current = null;
      state.handled = false;
    }
  };
  if (!isMap && !shown) return null;
  return <PageContainer key={isMap ? "map" : generation} show={shown} duration={1}
    {...(isMap ? {} : { style: { position: "fixed" as const, left: 0, top: 0, width: 0, height: 0 } })}
    zIndex={isMap ? 1200 : 1} overlay={false} position={isMap ? "center" : "bottom"}
    round={false} closeOnSlideDown={false}
    customStyle={isMap
      ? "width:100vw;height:100vh;min-height:100vh;overflow:visible;background:transparent;pointer-events:none;"
      : "width:1px;height:1px;min-height:0;overflow:hidden;background:transparent;pointer-events:none;"}
    onBeforeLeave={handleLeave} {...(isMap
      ? { onAfterLeave: handleMapAfterLeave, onAfterEnter: handleMapAfterEnter }
      : { onAfterLeave: handleLeave })}>
    {nativeMapContent ?? <View aria-hidden="true" />}
  </PageContainer>;
}
