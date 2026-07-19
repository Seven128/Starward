import { useLocalSearchParams } from "expo-router";
import { MobileShellScreen } from "../src/shell/MobileShellScreen";

export default function IndexRoute() {
  const params = useLocalSearchParams<{ acceptanceFixture?: string | string[] }>();
  const fixture = Array.isArray(params.acceptanceFixture) ? params.acceptanceFixture[0] : params.acceptanceFixture;
  return <MobileShellScreen fixture={fixture} />;
}
