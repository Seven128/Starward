import { NATIVE_CHROME_THEME } from "./theme/design-tokens";

export default defineAppConfig({
  pages: ["pages/map/index", "pages/my/index", "pages/auth/index"],
  subPackages: [
    {
      root: "spot",
      pages: [
        "search/index",
        "guides/index",
        "field/index",
        "plan/index",
        "data-source/index",
      ],
    },
    {
      root: "sky",
      pages: ["detail/index", "sources/index"],
    },
    {
      root: "content",
      pages: [
        "article/detail/index",
        "plan/detail/index",
        "plan/list/index",
        "plan/edit/index",
        "achievement/index",
        "share/index",
        "event/list/index",
        "event/detail/index",
        "contribution/index",
        "spot-feedback/index",
        "settings/index",
      ],
    },
  ],
  window: {
    navigationStyle: "custom",
    navigationBarTitleText: "今晚去观星",
    navigationBarBackgroundColor: NATIVE_CHROME_THEME.DAY.canvas,
    navigationBarTextStyle: "black",
    backgroundColor: NATIVE_CHROME_THEME.DAY.canvas,
    backgroundTextStyle: "dark",
  },
  permission: {
    "scope.userLocation": {
      desc: "仅在定位附近观星点或主动选址时使用；拒绝后仍可浏览默认区域。",
    },
  },
  requiredPrivateInfos: ["getLocation", "chooseLocation"],
  lazyCodeLoading: "requiredComponents",
  // WEAPP only supports declarative package preloading. Keep speculative
  // downloads on Wi-Fi; cellular entry retains the normal on-demand route.
  preloadRule: {
    "pages/map/index": { network: "wifi", packages: ["sky"] },
  },
  sitemapLocation: "sitemap.json",
});
