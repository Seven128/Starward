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
  | "plan-header-chevron"
  | "plan-row-chevron"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "location"
  | "layers"
  | "refresh"
  | "conditions"
  | "bell"
  | "info"
  | "warning"
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
  | "more"
  | "terrain"
  | "star";

export type SemanticIconState = "default" | "selected" | "draft" | "pending";

// Most adopted icon IDs are the semantic name; record only actual aliases.
const B_ICON_ID: Partial<Record<SemanticIconName, string>> = {
  conditions: "low-cloud", star: "four-point-star",
  "plan-header-chevron": "chevron-right", "plan-row-chevron": "chevron-right",
};

// The current My source keeps line chevrons in its plan card. Other page
// chevrons retain the B family; unadopted themes retain their existing glyph.
const DAY_SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  "plan-header-chevron": "/assets/icons/my-plan-chevron-header.svg",
  "plan-row-chevron": "/assets/icons/my-plan-chevron-row.svg",
};

function packageAssetPrefix() {
  const route = Taro.getCurrentPages().at(-1)?.route ?? "";
  if (route.startsWith("content/")) return "/content";
  if (route.startsWith("spot/")) return "/spot";
  if (route.startsWith("sky/")) return "/sky";
  return "";
}

export function adoptedBIconPath(name: SemanticIconName, state: SemanticIconState = "default") {
  const prefix = packageAssetPrefix();
  // The 36px default My avatar shares the already packaged 192px Tab asset.
  // Content pages retain their package-local derivatives.
  const directory = !prefix && name === "account-user" ? "/assets/b-icons/weapp-tabbar" : `${prefix}/assets/b-icons`;
  return `${directory}/${B_ICON_ID[name] ?? name}--day--${state}.png`;
}

const SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  bell: "/content/assets/icons/bell.svg",
  warning: "/content/assets/icons/warning.svg",
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
    const source = DAY_SOURCE_ICON_FILE[name];
    return (
      <Image
        className={`semantic-icon semantic-icon--${source ? "source" : "b"} semantic-icon--${name} ${className}`}
        src={source ?? adoptedBIconPath(name, state)}
        mode="aspectFit"
        {...(decorative
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? name })}
      />
    );
  }
  const sourceName = name === "plan-header-chevron" || name === "plan-row-chevron" ? "chevron-right" : name;
  const source = sourceName === "star" ? "/assets/semantic/five-point-star.svg" : SOURCE_ICON_FILE[sourceName];
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
        className={`semantic-icon semantic-icon--source semantic-icon--${sourceName} semantic-icon--${mode.toLowerCase()} ${className}`}
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
