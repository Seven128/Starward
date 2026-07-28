import { Stack } from "expo-router";
import { TabStackFrame } from "../../src/shell/TabStackFrame";

export const unstable_settings = { initialRouteName: "trips" };

export default function TripsStackLayout() {
  return <TabStackFrame><Stack screenOptions={{ headerShown: false }} /></TabStackFrame>;
}
