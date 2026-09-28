import { Image, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAppStore } from "@/state/app-store";
import "./selected-card-star.scss";

const MODE_FILE: Record<DisplayMode, string> = {
  DAY: "day",
  NIGHT: "night",
  OBSERVATION: "observation",
};

/** The selected-design half-clipped solid star shared by choice cards. */
export function SelectedCardStar({ className = "" }: { className?: string }) {
  const mode = useAppStore((state) => state.mode);
  return (
    <Image
      className={`selected-card-star ${className}`}
      src={`/assets/ornaments/selected-card-star-${MODE_FILE[mode]}.svg`}
      mode="aspectFit"
      data-od-id="selected-card-star"
      aria-hidden="true"
    />
  );
}

/** Shared Favorite ritual owner, kept beside the selected-choice star. */
export function FavoriteStar({
  active,
  visible = true,
  className = "",
}: {
  active: boolean;
  visible?: boolean;
  className?: string;
}) {
  const mode = useAppStore(state => state.mode);
  const reduced = useAppStore(state => state.preferences.reducedMotion);
  const live = useRef(active ? 1 : 0);
  const [progress, setProgress] = useState(live.current);
  useEffect(() => {
    const target = active ? 1 : 0, from = live.current;
    const duration = reduced || !visible ? 0 : 820 * Math.abs(target - from);
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
  }, [active, reduced, visible]);
  const satellite = (index: number) => {
    const p = Math.min(1, progress / (index ? .9 : .72));
    return { opacity: progress * p, transform: reduced || !visible ? "none" : `translate(${- (index ? 7 : 10) * (1 - p)}px, ${- (index ? 6 : 8) * (1 - p)}px)` };
  };
  const image = (part: string, state = "default") => `/assets/b-icons/favorite-${part}--day--${state}.png`;
  return (
    <View
      className={`favorite-star favorite-star--${mode.toLowerCase()}${active ? " favorite-star--active" : ""}${reduced ? " favorite-star--reduced" : ""} ${className}`}
      style={{ "--favorite-progress": progress } as CSSProperties}
      data-active={active}
      aria-hidden="true"
    >
      <View className="favorite-star__trail" style={{ opacity: progress }}>
        {mode === "DAY" ? <Image src={image("trail")} mode="aspectFit" /> : <View />}
      </View>
      <View className="favorite-star__rotor" style={{ transform: reduced || !visible ? "none" : `rotate(${360 * progress}deg) scale(${1 - .06 * progress})` }}>
        {mode === "DAY" ? <>
          <Image className="favorite-star__head" src={image("star")} mode="aspectFit" style={{ opacity: 1 - progress }} />
          <Image className="favorite-star__head" src={image("star", "selected")} mode="aspectFit" style={{ opacity: progress }} />
        </> : <View className="favorite-star__shape" />}
      </View>
      {[0, 1].map(index => <View key={index} className={`favorite-star__satellite favorite-star__satellite--${index}`} style={satellite(index)}>
        {mode === "DAY" ? <Image src={image("satellite")} mode="aspectFit" /> : <View />}
      </View>)}
    </View>
  );
}
