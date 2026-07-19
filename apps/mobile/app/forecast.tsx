import { useLocalSearchParams } from "expo-router";
import { ForecastScreen } from "../src/features/forecast/ForecastScreen";

export default function ForecastRoute() {
  const params = useLocalSearchParams<{ acceptanceFixture?: string | string[] }>();
  const fixture = Array.isArray(params.acceptanceFixture) ? params.acceptanceFixture[0] : params.acceptanceFixture;
  return <ForecastScreen fixture={fixture} />;
}
