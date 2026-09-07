import { Image, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import "./semantic-asset.scss";

export type SemanticAssetSubject =
  | "four-point-star"
  | "five-point-star"
  | "tent"
  | "telescope"
  | "binoculars"
  | "camera"
  | "backpack"
  | "neutral-avatar";

export type SemanticIconName =
  | "arrow-left"
  | "search"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "location"
  | "refresh"
  | "conditions"
  | "info"
  | "compass"
  | "horizon"
  | "undo"
  | "check"
  | "download"
  | "trash"
  | "wifi-off"
  | "images"
  | "sun"
  | "moon"
  | "star";

const SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  "arrow-left": "/assets/icons/arrow-left.png",
  "chevron-right": "/assets/icons/chevron-right.svg",
  download: "/assets/icons/download.svg",
  trash: "/assets/icons/trash-2.svg",
  "wifi-off": "/assets/icons/wifi-off.svg",
  images: "/assets/icons/images.svg",
};

const MODE_FILE: Record<DisplayMode, string> = {
  DAY: "day",
  NIGHT: "night",
  OBSERVATION: "observation",
};

export function SemanticAsset({
  subject,
  mode,
  label,
  className = "",
}: {
  subject: SemanticAssetSubject;
  mode: DisplayMode;
  label: string;
  className?: string;
}) {
  return (
    <Image
      className={`semantic-asset ${className}`}
      src={`/assets/semantic/${subject}-${MODE_FILE[mode]}.svg`}
      mode="aspectFit"
      aria-label={label}
    />
  );
}

/**
 * The Mini Program semantic icon adapter. Keep page-level icon vocabulary
 * behind this existing asset owner; pages must not draw their own glyphs.
 */
export function SemanticIcon({
  name,
  label,
  decorative = true,
  className = "",
}: {
  name: SemanticIconName;
  label?: string;
  decorative?: boolean;
  className?: string;
}) {
  const mode = useAppStore((state) => state.mode);
  const source = name === "star" ? "/assets/semantic/five-point-star.svg" : SOURCE_ICON_FILE[name];
  if (name === "arrow-left") {
    return (
      <View
        className={`semantic-icon semantic-icon--arrow-left semantic-icon--${mode.toLowerCase()} ${className}`}
        {...(decorative
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? name })}
      >
        {mode !== "OBSERVATION" ? <Image
          className="semantic-icon__arrow-source"
          src={
            mode === "DAY"
              ? "/assets/icons/arrow-left.png"
              : "/assets/icons/arrow-left-light.png"
          }
          mode="aspectFit"
          aria-hidden
        /> : null}
      </View>
    );
  }
  if (source) {
    return (
      <View
        className={`semantic-icon semantic-icon--source semantic-icon--${name} semantic-icon--${mode.toLowerCase()} ${className}`}
        {...(decorative
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? name })}
      >
        {Object.values(MODE_FILE).map(theme => (
          <Image
            key={theme}
            className={`semantic-icon__theme-source semantic-icon__theme-source--${theme}`}
            src={source.replace(/\.svg$/, `-${theme}.svg`)}
            mode="aspectFit"
            aria-hidden
          />
        ))}
      </View>
    );
  }
  return (
    <View
      className={`semantic-icon semantic-icon--${name} semantic-icon--${mode.toLowerCase()} ${className}`}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label ?? name })}
    />
  );
}
