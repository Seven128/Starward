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
      pages: ["detail/index"],
    },
    {
      root: "content",
      pages: [
        "article/detail/index",
        "plan/detail/index",
        "plan/list/index",
        "plan/edit/index",
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
  tabBar: {
    color: NATIVE_CHROME_THEME.DAY.color,
    selectedColor: NATIVE_CHROME_THEME.DAY.selectedColor,
    backgroundColor: NATIVE_CHROME_THEME.DAY.backgroundColor,
    borderStyle: NATIVE_CHROME_THEME.DAY.borderStyle,
    list: [
      {
        pagePath: "pages/map/index",
        text: "地图",
        iconPath: "assets/b-icons/weapp-tabbar/map--day--default.png",
        selectedIconPath: "assets/b-icons/weapp-tabbar/map--day--selected.png",
      },
      {
        pagePath: "pages/my/index",
        text: "我的",
        iconPath: "assets/b-icons/weapp-tabbar/account-user--day--default.png",
        selectedIconPath: "assets/b-icons/weapp-tabbar/account-user--day--selected.png",
      },
    ],
  },
  permission: {
    "scope.userLocation": {
      desc: "仅在定位附近观星点或主动选址时使用；拒绝后仍可浏览默认区域。",
    },
  },
  requiredPrivateInfos: ["getLocation", "chooseLocation"],
  lazyCodeLoading: "requiredComponents",
  sitemapLocation: "sitemap.json",
});
