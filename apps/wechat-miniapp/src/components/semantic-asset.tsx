import { Image, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";

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
  | "settings"
  | "pencil"
  | "account-user"
  | "arrow-left"
  | "search"
  | "filter"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "location"
  | "layers"
  | "refresh"
  | "conditions"
  | "info"
  | "compass"
  | "horizon"
  | "undo"
  | "check"
  | "download"
  | "share"
  | "eye"
  | "bulb"
  | "cloud"
  | "wind"
  | "telescope"
  | "trash"
  | "wifi-off"
  | "images"
  | "sun"
  | "clock"
  | "moon"
  | "meteor"
  | "terrain"
  | "star";

export type SemanticIconState = "default" | "selected" | "draft" | "pending";

const B_ICON_ID: Record<SemanticIconName, string> = {
  settings: "settings", pencil: "pencil", "account-user": "account-user",
  "arrow-left": "arrow-left", search: "search", filter: "filter",
  "chevron-right": "chevron-right", "chevron-down": "chevron-down",
  "chevron-up": "chevron-up", close: "close", location: "location",
  layers: "layers", refresh: "refresh", conditions: "low-cloud", info: "info",
  compass: "compass", horizon: "horizon", undo: "undo", check: "check",
  download: "download", share: "share", eye: "eye", bulb: "bulb",
  cloud: "cloud", wind: "wind", telescope: "telescope", trash: "trash", "wifi-off": "wifi-off", images: "images",
  sun: "sun", clock: "clock", moon: "moon", meteor: "meteor",
  terrain: "terrain", star: "four-point-star",
};

function packageAssetPrefix() {
  const route = Taro.getCurrentPages().at(-1)?.route ?? "";
  if (route.startsWith("content/")) return "/content";
  if (route.startsWith("spot/")) return "/spot";
  if (route.startsWith("sky/")) return "/sky";
  return "";
}

export function adoptedBIconPath(name: SemanticIconName, state: SemanticIconState = "default") {
  return `${packageAssetPrefix()}/assets/b-icons/${B_ICON_ID[name]}--day--${state}.png`;
}

const SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  settings: "/assets/icons/settings.svg",
  pencil: "/assets/icons/pencil.svg",
  "account-user": "/assets/icons/account-user.svg",
  "arrow-left": "/assets/icons/arrow-left.png",
  "chevron-right": "/assets/icons/chevron-right.svg",
  download: "/content/assets/icons/download.svg",
  share: "/assets/icons/share.svg",
  eye: "/assets/icons/eye.svg",
  bulb: "/assets/icons/bulb.svg",
  cloud: "/assets/icons/cloud.svg",
  wind: "/content/assets/icons/wind.svg",
  telescope: "/assets/icons/telescope.svg",
  sun: "/assets/icons/sun.svg",
  moon: "/assets/icons/moon.svg",
  trash: "/content/assets/icons/trash-2.svg",
  "wifi-off": "/assets/icons/wifi-off.svg",
  images: "/assets/icons/images.svg",
  filter: "/assets/icons/filter.svg",
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
  state = "default",
}: {
  name: SemanticIconName;
  label?: string;
  decorative?: boolean;
  className?: string;
  state?: SemanticIconState;
}) {
  const mode = useAppStore((state) => state.mode);
  if (mode === "DAY") {
    return (
      <Image
        className={`semantic-icon semantic-icon--b semantic-icon--${name} ${className}`}
        src={adoptedBIconPath(name, state)}
        mode="aspectFit"
        {...(decorative
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? name })}
      />
    );
  }
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
            "/assets/icons/arrow-left-light.png"
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
        {(["night", "observation"] as const).map(theme => (
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
