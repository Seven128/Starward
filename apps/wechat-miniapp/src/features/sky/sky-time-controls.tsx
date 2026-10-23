import { Input, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import Taro, { useDidHide } from "@tarojs/taro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localParts } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { createSkyTimeRepeat, skyCivilInstant, skyTimeInputAllowed, stepSkyCivilTime, type SkyTimeField } from "./sky-time-input";

type TimeStepRect = { left: number; right: number; top: number; bottom: number };

/** Civil text is an editing draft. The page's observation-time owner remains
 * authoritative for previews/playback and its Context owns explicit apply. */
export function SkyTimeControls({ at, timezone, active, current, playing, canPlay, previewPending, previewFailed,
  playbackPending, playbackFailed,
  onRetryPreview, onPreview, onApply, onTogglePlay, onPause }: {
  at: string; timezone: string; active: boolean; playing: boolean; canPlay: boolean;
  current: () => boolean;
  previewPending?: boolean; previewFailed?: boolean; onRetryPreview?: () => void;
  playbackPending?: boolean; playbackFailed?: boolean;
  onPreview: (at: string) => boolean; onApply: (at: string) => void;
  onTogglePlay: () => void; onPause: () => void;
}) {
  const [draft, setDraft] = useState(at), [error, setError] = useState("");
  const [inputText, setInputText] = useState<Partial<Record<SkyTimeField, string>>>({});
  const inputRef = useRef(inputText);
  const previewAccepted = useRef(true);
  const updateInput = (next: Partial<Record<SkyTimeField, string>>) => { inputRef.current = next; setInputText(next); };
  const live = useRef({ at: draft, active, current, onPreview }); live.current = { at: draft, active, current, onPreview };
  const repeat = useMemo(() => createSkyTimeRepeat({ schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) }), []);
  const hold = useRef({ revision: 0, measured: false, rect: null as null | TimeStepRect,
    point: null as null | { clientX: number; clientY: number } });
  const stopHold = useCallback(() => { hold.current.revision++; repeat.stop(); }, [repeat]);
  useEffect(() => { setDraft(at); updateInput({}); previewAccepted.current = true; setError(""); }, [at, timezone]);
  useEffect(() => { if (!active) { stopHold(); setDraft(at); updateInput({}); previewAccepted.current = true; setError(""); } }, [active]);
  useEffect(() => () => stopHold(), [stopHold]);
  useDidHide(stopHold);
  const moveOutside = () => {
    const { point, rect, measured } = hold.current;
    if (point && measured && (!rect || point.clientX < rect.left || point.clientX > rect.right ||
      point.clientY < rect.top || point.clientY > rect.bottom)) stopHold();
  };
  const startHold = (id: string, step: () => boolean) => {
    stopHold();
    if (!live.current.active || !live.current.current()) return;
    const revision = hold.current.revision;
    hold.current.measured = false; hold.current.rect = null; hold.current.point = null;
    onPause(); repeat.start(step);
    Taro.nextTick(() => {
      if (hold.current.revision !== revision) return;
      Taro.createSelectorQuery().select(`#${id}`).boundingClientRect().exec(results => {
        if (hold.current.revision !== revision) return;
        const rect = results[0] as TimeStepRect | null;
        hold.current.rect = rect && [rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite) ? rect : null;
        hold.current.measured = true; moveOutside();
      });
    });
  };
  const publish = (next: string) => {
    if (!live.current.active || !live.current.current() || !skyTimeInputAllowed(next, Date.now())) return false;
    live.current.at = next; setDraft(next); updateInput({});
    previewAccepted.current = live.current.onPreview(next);
    setError(previewAccepted.current ? "" : "此刻的天空暂不可用");
    return true;
  };
  const readInput = () => {
    const fields = Object.keys(inputRef.current) as SkyTimeField[];
    // An untouched six-field display must not truncate a live 1x instant.
    if (!fields.length) return live.current.at;
    const value = { ...localParts(new Date(live.current.at), timezone) };
    for (const field of fields) {
      const text = inputRef.current[field]!;
      value[field] = /^\d+$/.test(text) ? Number(text) : NaN;
    }
    return skyCivilInstant(value, timezone);
  };
  const step = (field: SkyTimeField, delta: number) => {
    if (!live.current.active || !live.current.current()) return false;
    const selected = readInput();
    if (!selected) { setError("日期或时间无效"); return false; }
    const next = stepSkyCivilTime(selected, timezone, field, delta, Date.now());
    if (!next) { setError("不能晚于当前时间"); return false; }
    return publish(next);
  };
  const parts = localParts(new Date(draft), timezone);
  const settleInput = () => {
    if (!live.current.active || !live.current.current()) return null;
    const next = readInput();
    if (!next) { setError("日期或时间无效"); return null; }
    if (!publish(next)) { setError("不能晚于当前时间"); return null; }
    return next;
  };
  const fieldLabels = { year: "年", month: "月", day: "日", hour: "时", minute: "分", second: "秒" };
  const group = (fields: SkyTimeField[], separator: string) => <View className="sky-time-fields">
    {fields.map((field, index) => <View key={field} className="sky-time-field-group">
      {index ? <Text className="sky-time-separator">{separator}</Text> : null}
      <View className="sky-time-field">
        {[1, -1].map(delta => <Button pressVariant="icon" key={delta} id={`sky-time-step-${field}-${delta > 0 ? "up" : "down"}`} className={`sky-time-step sky-time-step--${delta > 0 ? "up" : "down"}`}
          ariaLabel={`${delta > 0 ? "增加" : "减少"}${fieldLabels[field]}`} disabled={!active}
          onTouchStart={() => startHold(`sky-time-step-${field}-${delta > 0 ? "up" : "down"}`, () => step(field, delta))}
          onTouchMove={event => { hold.current.point = event.touches[0] ?? null; moveOutside(); }} onTouchEnd={stopHold} onTouchCancel={stopHold}
          onClick={() => repeat.click(() => { if (!live.current.active || !live.current.current()) return false; onPause(); return step(field, delta); })}>
          <SemanticIcon name={delta > 0 ? "sky-up" : "sky-down"} /></Button>)}
        <Input className="sky-time-value" ariaLabel={fieldLabels[field]} type="number" maxlength={field === "year" ? 4 : 2}
          disabled={!active} value={inputText[field] ?? String(parts[field]).padStart(field === "year" ? 4 : 2, "0")}
          onFocus={() => { stopHold(); if (live.current.active && live.current.current()) onPause(); }}
          onInput={event => { if (live.current.active && live.current.current()) { stopHold(); updateInput({ ...inputRef.current, [field]: event.detail.value }); } }}
          onBlur={event => {
            if (!live.current.active || !live.current.current()) return;
            // Touch-start/apply/play can already consume this edit. A native
            // blur from that older input cannot overwrite the newer result.
            if (inputRef.current[field] !== undefined && inputRef.current[field] === event.detail.value) settleInput();
          }} />
      </View>
    </View>)}
  </View>;
  return <View className="sky-time-controls">
    <View className="sky-time-controls__grid">
      {group(["year", "month", "day"], "-")}
      <View className="sky-time-center-actions">
        <Button pressVariant="icon" className="sky-time-icon-action sky-time-icon-action--primary" ariaLabel="应用所选时刻" disabled={!active}
          onClick={() => { stopHold(); const next = settleInput(); if (next) onApply(next); }}><SemanticIcon name="sky-apply" /></Button>
        <Button pressVariant="icon" className="sky-time-icon-action" ariaLabel={playing ? "暂停1倍播放" : "1倍播放"} disabled={!active || !playing && (!canPlay || draft !== at)}
          onClick={() => {
            stopHold(); if (!live.current.active || !live.current.current()) return;
            if (Object.keys(inputRef.current).length && !settleInput()) return;
            if (previewAccepted.current) onTogglePlay();
          }}><SemanticIcon name={playing ? "sky-pause" : "sky-play"} /></Button>
      </View>
      {group(["hour", "minute", "second"], ":")}
    </View>
    {/* Keep the bottom-anchored field targets stationary while a held arrow
        changes preview status. Moving an Input under the finger can focus it
        and open the native keyboard before the original touch is released. */}
    <View className="sky-time-feedback">
      <Text className="sky-time-input-error">
        {error || (playbackFailed ? "播放未开始，请重试"
          : playbackPending ? "正在准备播放"
          : previewFailed ? "此刻的天空未加载，当前星图时间见下方"
          : previewPending ? "正在更新天空，当前星图时间见下方" : "")}
      </Text>
      {(previewFailed || playbackFailed) && onRetryPreview ? <Button className="sky-time-retry" disabled={!active}
        onClick={onRetryPreview}>{playbackFailed ? "重试播放" : "重试星图"}</Button> : null}
    </View>
  </View>;
}
