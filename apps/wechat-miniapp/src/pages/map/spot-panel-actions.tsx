import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FavoriteStar } from "@/components/selected-card-star";
import { SemanticIcon } from "@/components/semantic-asset";
import { useAppStore } from "@/state/app-store";
import "./spot-panel-actions.scss";

// The adopted scenes are decorative; they do not represent local weather.
const NIGHT_POINTS = {
  favorite: [[9, 20], [27, 75], [44, 16], [60, 83], [76, 25], [90, 68], [18, 49], [91, 10]],
  cloud: [[13, 76], [30, 20], [48, 79], [66, 15], [82, 65], [94, 30], [9, 36], [72, 86]],
} as const;
// Normal DAY labels use the center band; the existing large-text column needs
// a separate leading field. Verify both against the target's actual bounds.
const DAY_FAVORITE_POINTS = [[9, 20], [27, 75], [44, 2], [60, 94], [76, 2], [90, 94], [18, 49], [91, 2]] as const;
const DAY_LARGE_FAVORITE_POINTS = [[9, 20], [27, 75], [24, 16], [20, 83], [14, 25], [6, 68], [18, 49], [25, 10]] as const;

function ActionScene({ kind, progress, breathing, dayContrast = false, largeText = false }: {
  kind: keyof typeof NIGHT_POINTS;
  progress: number;
  breathing: boolean;
  dayContrast?: boolean;
  largeText?: boolean;
}) {
  // A uniform middle surface lets the ink switch without a low-contrast gap.
  // Decorations fade with their surface so none remain at the ink crossover.
  const readableDay = kind === "favorite" && dayContrast;
  const dayOpacity = readableDay ? Math.max(0, 1 - 2 * progress) : 1 - progress;
  const nightOpacity = readableDay ? Math.max(0, 2 * progress - 1) : progress;
  const points = readableDay ? largeText ? DAY_LARGE_FAVORITE_POINTS : DAY_FAVORITE_POINTS : NIGHT_POINTS[kind];
  return (
    <View className={`spot-action-scene spot-action-scene--${kind}${readableDay ? " spot-action-scene--readable-day" : ""}`} aria-hidden="true">
      {kind === "favorite" ? <View className="spot-action-scene__day" style={{ opacity: dayOpacity }}>
        <View className="spot-action-scene__cloud spot-action-scene__cloud--one" />
        <View className="spot-action-scene__cloud spot-action-scene__cloud--two" />
      </View> : null}
      <View className="spot-action-scene__night" style={{ opacity: nightOpacity }}>
        {points.map(([left, top], index) => <View
          key={index}
          className="spot-action-scene__spark"
          style={{
            left: `${left}%`, top: `${top}%`,
            width: `${index % 3 === 0 ? 1.6 : 1.1}px`, height: `${index % 3 === 0 ? 1.6 : 1.1}px`,
            animationDuration: `${2.7 + index * .27}s`, animationDelay: `${-index * .53}s`,
            animationPlayState: breathing ? "running" : "paused",
          } as CSSProperties}
        />)}
      </View>
    </View>
  );
}

/** Map action presentation only. Favorite persistence remains with its caller. */
export function SpotPanelActions({
  spotName, favorite, favoritePending, cloudReady, visible,
  onFavorite, onCloud, onShare,
}: {
  spotName: string;
  favorite: boolean;
  favoritePending: boolean;
  cloudReady: boolean;
  visible: boolean;
  onFavorite: () => void;
  onCloud: () => void;
  onShare: () => void;
}) {
  const reduced = useReducedMotion();
  const dayMode = useAppStore(state => state.mode === "DAY");
  const largeText = useAppStore(state => state.preferences.largeText);
  const [pageVisible, setPageVisible] = useState(true);
  const live = useRef(favorite ? 1 : 0);
  const [progress, setProgress] = useState(live.current);
  useDidHide(() => setPageVisible(false));
  useDidShow(() => setPageVisible(true));
  const shown = visible && pageVisible;
  useEffect(() => {
    const target = favorite ? 1 : 0;
    const from = live.current;
    // Background and meteor have separate adopted durations. Neither waits
    // for the other, and an interruption begins at the currently painted value.
    const duration = reduced || !shown ? 0 : 360 * Math.abs(target - from);
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = () => {
      const t = duration ? Math.min(1, (Date.now() - started) / duration) : 1;
      live.current = from + (target - from) * t * t * (3 - 2 * t);
      setProgress(live.current);
      if (t < 1) timer = setTimeout(frame, 16);
    };
    frame();
    return () => clearTimeout(timer);
  }, [favorite, reduced, shown]);
  const breathing = shown && !reduced;
  return (
    <View className={`spot-panel__action-bar${reduced ? " spot-panel__action-bar--reduced" : ""}`}
      data-control="map-spot-panel-action-bar" role="toolbar" ariaLabel="点位动作">
      <Button
        className={`spot-panel__action spot-panel__action--favorite${favorite ? " spot-panel__action--active" : ""}${(dayMode ? progress >= .5 : progress > .48) ? " spot-panel__action--night-contrast" : ""}${dayMode && progress > 0 && progress < .5 ? " spot-panel__action--transition-dark" : ""}`}
        data-control="spot-favorite-action"
        ariaLabel={`${favoritePending ? "正在保存" : favorite ? "已想去，取消收藏" : "未想去，收藏"}${spotName}`}
        onClick={onFavorite}
      >
        <ActionScene kind="favorite" progress={progress} breathing={breathing && favorite} dayContrast={dayMode} largeText={largeText} />
        <FavoriteStar active={favorite} visible={shown} />
        <Text>想去</Text>
      </Button>
      <Button className="spot-panel__action spot-panel__action--cloud" data-control="spot-cloud-stargazing-action"
        ariaLabel={`${cloudReady ? "打开" : "等待正式点位上下文后打开"}${spotName}云观星`} disabled={!cloudReady} onClick={onCloud}>
        <ActionScene kind="cloud" progress={1} breathing={breathing && cloudReady} />
        <SemanticIcon name={dayMode ? "telescope" : "eye"} />
        <Text>云观星</Text>
      </Button>
      <Button className="spot-panel__action spot-panel__action--share" data-control="spot-share-action" ariaLabel={`分享${spotName}`} onClick={onShare}>
        <SemanticIcon name="share" />
        <Text>分享</Text>
      </Button>
    </View>
  );
}
