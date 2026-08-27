import { Image, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
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
  className = "",
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <View
      className={`favorite-star${active ? " favorite-star--active" : ""} ${className}`}
      data-active={active}
      aria-hidden="true"
    >
      <View className="favorite-star__shape" />
      {active ? (
        <View className="favorite-star__effect" aria-hidden="true">
          <View className="favorite-star__meteor favorite-star__meteor--one" />
          <View className="favorite-star__meteor favorite-star__meteor--two" />
          <View className="favorite-star__meteor favorite-star__meteor--three" />
        </View>
      ) : null}
    </View>
  );
}
