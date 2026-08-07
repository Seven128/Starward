export default defineAppConfig({
  pages: ["pages/map/index", "pages/my/index", "pages/auth/index"],
  subPackages: [
    {
      root: "spot",
      pages: [
        "detail/index",
        "guides/index",
        "field/index",
        "sky/index",
        "photos/index",
        "data-source/index",
      ],
    },
    {
      root: "sky",
      pages: ["detail/index", "map/index", "observe/index", "targets/index"],
    },
    {
      root: "content",
      pages: [
        "article/detail/index",
        "favorite/list/index",
        "plan/detail/index",
        "profile/links/index",
        "import/index",
        "settings/index",
      ],
    },
  ],
  window: {
    navigationStyle: "custom",
    navigationBarTitleText: "今晚去观星",
    navigationBarBackgroundColor: "#F5F8FC",
    navigationBarTextStyle: "black",
    backgroundColor: "#F5F8FC",
    backgroundTextStyle: "dark",
  },
  tabBar: {
    color: "#5C7186",
    selectedColor: "#1769D2",
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
      desc: "仅在你主动请求附近观星点时获取一次位置；拒绝后仍可使用默认试点区域。",
    },
  },
  requiredPrivateInfos: ["getLocation"],
  lazyCodeLoading: "requiredComponents",
  sitemapLocation: "sitemap.json",
});
