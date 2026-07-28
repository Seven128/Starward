import { Stack } from "expo-router";
import { TabStackFrame } from "../../src/shell/TabStackFrame";

export const unstable_settings = { initialRouteName: "tonight" };

export default function TonightStackLayout() {
  return <TabStackFrame><Stack screenOptions={{ headerShown: false }} /></TabStackFrame>;
}
