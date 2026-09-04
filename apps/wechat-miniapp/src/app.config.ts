export default defineAppConfig({
  pages: ["pages/map/index", "pages/my/index", "pages/auth/index"],
  subPackages: [
    {
      root: "spot",
      pages: [
        "search/index",
        "guides/index",
        "field/index",
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
        "contribution/index",
        "settings/index",
        "profile/links/index",
        "import/index",
      ],
    },
  ],
  window: {
    navigationStyle: "custom",
    navigationBarTitleText: "今晚去观星",
    navigationBarBackgroundColor: "#FFFFFF",
    navigationBarTextStyle: "black",
    backgroundColor: "#FFFFFF",
    backgroundTextStyle: "dark",
  },
  tabBar: {
    color: "#5E655F",
    selectedColor: "#4859B8",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/map/index",
        text: "地图",
        iconPath: "assets/icons/tab-map.png",
        selectedIconPath: "assets/icons/tab-map-selected.png",
      },
      {
        pagePath: "pages/my/index",
        text: "我的",
        iconPath: "assets/icons/tab-my.png",
        selectedIconPath: "assets/icons/tab-my-selected.png",
      },
    ],
  },
  permission: {
    "scope.userLocation": {
      desc: "仅主动查找附近观星点时定位一次；拒绝后仍可浏览默认区域。",
    },
  },
  requiredPrivateInfos: ["getLocation"],
  lazyCodeLoading: "requiredComponents",
  sitemapLocation: "sitemap.json",
});
