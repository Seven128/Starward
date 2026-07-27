declare const require: (id: string) => any;

export const mobileShellMetadata = {
  runtime: "expo-react-native",
  architecture: "fabric-turbomodules",
  router: "expo-router",
  primaryDestinations: ["tonight", "map", "trips", "sky", "me"],
} as const;

export default function RootLayout() {
  const ReactRuntime = require("react");
  const Tabs = require("expo-router").Tabs;
  const RuntimeRoot = require("../src/shell/RuntimeRoot").default;
  const PrimaryTabBar = require("../src/shell/PrimaryTabBar").PrimaryTabBar;

  return (
    <RuntimeRoot>
      <Tabs
        backBehavior="history"
        detachInactiveScreens={false}
        screenOptions={{ headerShown: false, lazy: false, popToTopOnBlur: false }}
        tabBar={() => ReactRuntime.createElement(PrimaryTabBar)}
      >
        <Tabs.Screen name="tonight" options={{ title: "今晚" }} />
        <Tabs.Screen name="map" options={{ title: "地图" }} />
        <Tabs.Screen name="trips" options={{ title: "行程" }} />
        <Tabs.Screen name="sky" options={{ title: "天空" }} />
        <Tabs.Screen name="me" options={{ title: "我的" }} />
      </Tabs>
    </RuntimeRoot>
  );
}
