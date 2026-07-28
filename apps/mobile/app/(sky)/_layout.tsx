import { Stack } from "expo-router";
import { TabStackFrame } from "../../src/shell/TabStackFrame";

export const unstable_settings = { initialRouteName: "sky" };

export default function SkyStackLayout() {
  return <TabStackFrame><Stack screenOptions={{ headerShown: false }} /></TabStackFrame>;
}
