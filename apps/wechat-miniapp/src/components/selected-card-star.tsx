import { Image } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import "./selected-card-star.scss";

const MODE_FILE: Record<DisplayMode, string> = {
  DAY: "day",
  NIGHT: "night",
  OBSERVATION: "observation",
};

/** The selected-design half-clipped gradient star shared by choice cards. */
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
