import { Image, View } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useAppStore } from "@/state/app-store";
import mainBIcons from "./main-b-icon-files.json";
import { primaryMapIconPath } from "@/navigation/primary-navigation";

const sharedMainBIcons = new Set(mainBIcons.files.filter(file => !mainBIcons.mainOnlyVariants.includes(file)));

export type SemanticAssetSubject =
  | "four-point-star"
  | "five-point-star"
  | "tent"
  | "telescope"
  | "binoculars"
  | "camera"
  | "backpack"
  | "neutral-avatar";

export type SkyControlIconName = `sky-${"door" | "search" | "clock" | "layers" | "observation" | "up" | "down" | "apply" | "play" | "pause" | "target" | "follow" | "source" | "hand" | "eye" | "chevronBack" | "cancel"}`;
export type SemanticIconName = SkyControlIconName
  | "source"
  | "map"
  | "menu"
  | "favorite-star"
  | "settings"
  | "pencil"
  | "account-user"
  | "arrow-left"
  | "search"
  | "add"
  | "filter"
  | "chevron-right"
  | "plan-header-chevron"
  | "plan-row-chevron"
  | "settings-choice-check"
  | "layer-choice-check"
  | "terrain-toggle-check"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "location"
  | "place-pin"
  | "parking"
  | "restroom"
  | "plan-suv"
  | "tent"
  | "walking"
  | "signal"
  | "charging"
  | "verified"
  | "layers"
  | "refresh"
  | "conditions"
  | "bell"
  | "info"
  | "warning"
  | "compass"
  | "navigation"
  | "horizon"
  | "undo"
  | "check"
  | "download"
  | "share"
  | "eye"
  | "bulb"
  | "cloud"
  | "wind"
  | "temperature"
  | "droplet"
  | "telescope"
  | "trash"
  | "wifi-off"
  | "images"
  | "sun"
  | "clock"
  | "moon"
  | "meteor"
  | "checklist"
  | "more"
  | "terrain"
  | "star";

export type SemanticIconState = "default" | "selected" | "draft" | "pending";

// Most adopted icon IDs are the semantic name; record only actual aliases.
const B_ICON_ID: Partial<Record<SemanticIconName, string>> = {
  conditions: "low-cloud", star: "four-point-star",
  "plan-header-chevron": "chevron-right", "plan-row-chevron": "chevron-right",
};

// Adopted consumers may retain precise line glyphs alongside the B family.
// Unrepresented themes retain the existing glyph for each role.
const DAY_SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  "plan-header-chevron": "/assets/icons/my-plan-chevron-header.svg",
  "plan-row-chevron": "/assets/icons/my-plan-chevron-row.svg",
  "settings-choice-check": "/content/assets/icons/settings-choice-check.svg",
  "layer-choice-check": "/assets/icons/map-layer-choice-check.svg",
  "terrain-toggle-check": "/assets/icons/terrain-toggle-check.png",
};

// These new DAY roles keep the existing presentation in unadopted modes.
const LEGACY_ICON_NAME: Partial<Record<SemanticIconName, SemanticIconName>> = {
  "favorite-star": "star",
  navigation: "compass", "place-pin": "location", parking: "location",
  restroom: "info", "plan-suv": "compass", tent: "location",
  walking: "compass", signal: "wifi-off", charging: "info", verified: "info",
  "plan-header-chevron": "chevron-right", "plan-row-chevron": "chevron-right",
  "settings-choice-check": "check",
  "layer-choice-check": "check",
  "terrain-toggle-check": "check",
  temperature: "sun", droplet: "conditions",
};

function packageAssetPrefix(pagePath: string) {
  const route = pagePath.replace(/^\//u, "");
  if (route.startsWith("content/")) return "/content";
  if (route.startsWith("spot/")) return "/spot";
  if (route.startsWith("sky/")) return "/sky";
  return "";
}

export function adoptedBIconPath(name: SemanticIconName, state: SemanticIconState = "default", pagePath: string = "") {
  const prefix = packageAssetPrefix(pagePath);
  const file = `${B_ICON_ID[name] ?? name}--day--${state}.png`;
  // Ordinary subpackages can use main-package resources. Preserve different
  // derivative sizes and subpackage-only icons in their current package.
  if (sharedMainBIcons.has(file)) return `/assets/b-icons/${file}`;
  // The 36px default My avatar shares the already packaged 192px Tab asset.
  // Content pages retain their package-local derivatives.
  const directory = !prefix && name === "account-user" ? "/assets/b-icons/weapp-tabbar" : `${prefix}/assets/b-icons`;
  return `${directory}/${file}`;
}

const SOURCE_ICON_FILE: Partial<Record<SemanticIconName, string>> = {
  bell: "/content/assets/icons/bell.svg",
  warning: "/assets/icons/warning.svg",
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
  "wifi-off": "/spot/assets/icons/wifi-off.svg",
  images: "/assets/icons/images.svg",
  filter: "/spot/assets/icons/filter.svg",
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
  presentation = "default",
}: {
  name: SemanticIconName;
  label?: string;
  decorative?: boolean;
  className?: string;
  state?: SemanticIconState;
  presentation?: "default" | "forecast";
}) {
  // Taro's default useRouter captures this instance's route. A retained page
  // can repaint while a child route is on top; that child's package is not
  // the asset owner of this icon.
  const router = useRouter();
  const mode = useAppStore((state) => state.mode);
  if (name === "map") return <Image className={`semantic-icon semantic-icon--map ${className}`}
    src={`/${primaryMapIconPath(mode)}`} mode="aspectFit"
    {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? "地图" })} />;
  if (name === "source") return <Image className={`semantic-icon semantic-icon--source-entry ${className}`}
    src={`/assets/icons/source-${mode === "OBSERVATION" ? "observation" : "normal"}.svg`} mode="aspectFit"
    {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? "来源" })} />;
  if (name.startsWith("sky-")) return <Image className={`semantic-icon semantic-icon--sky-control ${className}`}
    src={`/sky/assets/controls/${name.slice(4)}-${mode === "OBSERVATION" ? "observation" : "normal"}.svg`}
    mode="aspectFit" {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? name })} />;
  if (name === "menu") return <View className={`semantic-icon semantic-icon--menu semantic-icon--${mode.toLowerCase()} ${className}`}
    {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? "菜单" })}>
    <View className="semantic-icon__menu-line" />
  </View>;
  if (mode === "DAY") {
    const forecastKind = presentation === "forecast" && (name === "temperature" || name === "wind" || name === "droplet" || name === "warning" || name === "conditions")
      ? name === "conditions" ? "low-cloud" : name : null;
    // Keep icon-only controls local; these deferred ornaments have text peers.
    const mainKind = state === "default" && !packageAssetPrefix(router?.path ?? "") && (name === "images" || name === "plan-suv" || name === "clock" || name === "sun" || name === "telescope" || name === "share")
      ? name : null;
    const packagedKind = forecastKind ?? mainKind;
    if (packagedKind) {
      // Taro discovers native bindings from explicit props; JSX spreads lose them.
      return <packaged-icon
        kind={packagedKind}
        class={`semantic-icon semantic-icon--b${forecastKind && name !== "conditions" ? " semantic-icon--forecast" : ""} semantic-icon--${name} ${className}`}
        aria-hidden={decorative ? true : undefined}
        aria-role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label ?? name}
      />;
    }
    const source = DAY_SOURCE_ICON_FILE[name];
    return (
      <Image
        className={`semantic-icon semantic-icon--${source ? "source" : "b"} semantic-icon--${name} ${className}`}
        src={source ?? adoptedBIconPath(name, state, router?.path ?? "")}
        mode="aspectFit"
        {...(decorative
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? name })}
      />
    );
  }
  const sourceName = LEGACY_ICON_NAME[name] ?? name;
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
      className={`semantic-icon semantic-icon--${sourceName} semantic-icon--${mode.toLowerCase()} ${className}`}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label ?? name })}
    />
  );
}
