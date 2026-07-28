import { Stack } from "expo-router";
import { TabStackFrame } from "../../src/shell/TabStackFrame";

export const unstable_settings = { initialRouteName: "me" };

export default function MeStackLayout() {
  return <TabStackFrame><Stack screenOptions={{ headerShown: false }} /></TabStackFrame>;
}
