import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Text, View, type ITouchEvent } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { DISPLAY_MODES, DISPLAY_MODE_LABEL, moveModeDrag, releasedMode, tappedMode, type ModeDrag } from "./display-mode-gesture";

export function DisplayModeControl({ mode, onSelect, onGestureCapture }: {
  mode: DisplayMode; onSelect: (mode: DisplayMode) => void;
  onGestureCapture: (captured: boolean) => void;
}) {
  const drag = useRef<ModeDrag | null>(null);
  const generation = useRef(0);
  const measuredStep = useRef(0);
  const suppressTap = useRef(false);
  const [position, setPosition] = useState<number | null>(null);
  const currentMode = useRef(mode);
  currentMode.current = mode;

  const cancel = () => {
    generation.current += 1;
    drag.current = null;
    setPosition(null);
    onGestureCapture(false);
  };
  useEffect(() => () => { generation.current += 1; drag.current = null; }, []);
  useEffect(() => { cancel(); }, [mode]);
  const prepareMeasurement = () => {
    const token = generation.current;
    Taro.nextTick(() => {
      Taro.createSelectorQuery().select("#settings-mode-thumb").boundingClientRect((rect) => {
        if (token !== generation.current || !rect || Array.isArray(rect)) return;
        if (rect.width > 0) measuredStep.current = rect.width;
      }).exec();
    });
  };
  useEffect(prepareMeasurement, []);
  useDidShow(prepareMeasurement);
  useDidHide(() => { suppressTap.current = true; cancel(); });

  const start = (input: unknown) => {
    const event = input as ITouchEvent;
    cancel();
    suppressTap.current = false;
    if (event.touches?.length !== 1) return;
    const point = event.touches[0]!;
    const token = generation.current;
    drag.current = {
      x: point.clientX, y: point.clientY, lastX: point.clientX,
      lastAt: Date.now(), origin: DISPLAY_MODES.indexOf(mode),
      position: DISPLAY_MODES.indexOf(mode), step: measuredStep.current, velocity: 0, axis: "pending",
    };
    const query = Taro.createSelectorQuery();
    query.select("#settings-mode-thumb").boundingClientRect();
    query.select("#settings-mode-day").boundingClientRect();
    query.exec((rects) => {
      if (token !== generation.current) return;
      const [thumb, first] = rects as { left: number; width: number }[];
      if (!thumb || !first || !(thumb.width > 0)) return;
      measuredStep.current = thumb.width;
      const origin = Math.max(0, Math.min(2, (thumb.left - first.left) / thumb.width));
      const active = drag.current;
      if (!active) return;
      active.origin = origin;
      active.step = thumb.width;
      active.position = Math.max(0, Math.min(2, origin + (active.lastX - active.x) / active.step));
      if (active.axis === "horizontal") setPosition(active.position);
    });
  };
  const move = (input: unknown) => {
    const event = input as ITouchEvent;
    if (event.touches?.length !== 1) { suppressTap.current = true; cancel(); return; }
    if (!drag.current) return;
    const point = event.touches[0]!;
    const next = moveModeDrag(drag.current, point.clientX, point.clientY, Date.now());
    if (next.axis !== "pending") suppressTap.current = true;
    if (next.axis === "horizontal") {
      onGestureCapture(true);
      if (next.step > 0) setPosition(next.position);
    }
  };
  const end = () => {
    const active = drag.current;
    cancel();
    if (active?.axis === "horizontal") onSelect(releasedMode(active, currentMode.current, Date.now()));
  };

  return (
    <View className="settings-section" data-od-id="display-mode-switcher" data-control="display-mode-switcher">
      <Text className="type-section">显示模式</Text>
      <View
        className={`settings-display-mode-track settings-display-mode-track--${mode.toLowerCase()}`}
        ariaRole="radiogroup" ariaLabel="显示模式"
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        onTouchCancel={() => { suppressTap.current = true; cancel(); }}
      >
        <View id="settings-mode-thumb" className="settings-display-mode-thumb" aria-hidden="true"
          style={position === null ? {} : { transform: `translateX(${position * 100}%)`, transition: "none" }} />
        {DISPLAY_MODES.map((item) => (
          <Button compileMode key={item} id={`settings-mode-${item.toLowerCase()}`}
            className={`settings-display-mode-choice focus-ring${mode === item ? " settings-display-mode-choice--selected" : ""}`}
            ariaLabel={`${DISPLAY_MODE_LABEL[item]}${mode === item ? "，当前已选，再次点击切换下一模式" : "，切换模式"}`}
            onClick={() => {
              if (suppressTap.current) { suppressTap.current = false; return; }
              onSelect(tappedMode(currentMode.current, item));
            }}
          >
            <SemanticIcon name={item === "DAY" ? "sun" : item === "NIGHT" ? "moon" : "star"} />
            <Text>{DISPLAY_MODE_LABEL[item]}</Text>
          </Button>
        ))}
      </View>
    </View>
  );
}
