declare const require: (id: string) => any;

export const mobileShellMetadata = {
  runtime: "expo-react-native",
  architecture: "fabric-turbomodules",
  primaryDestinations: ["tonight", "map", "itinerary", "sky", "profile"],
} as const;

export default function RootLayout() {
  const ReactRuntime = require("react");
  const RuntimeRoot = require("../src/shell/RuntimeRoot").default;
  return ReactRuntime.createElement(RuntimeRoot);
}
