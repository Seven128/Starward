import { Stack } from "expo-router";
import { TabStackFrame } from "../../src/shell/TabStackFrame";

export const unstable_settings = { initialRouteName: "map" };

export default function MapStackLayout() {
  return <TabStackFrame><Stack screenOptions={{ headerShown: false }} /></TabStackFrame>;
}
