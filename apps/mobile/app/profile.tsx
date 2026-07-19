import { useLocalSearchParams } from "expo-router";
import { ProfilePrivacyScreen } from "../src/features/profile/ProfilePrivacyScreen";

export default function ProfileRoute() {
  const params = useLocalSearchParams<{ acceptanceFixture?: string | string[] }>();
  const fixture = Array.isArray(params.acceptanceFixture) ? params.acceptanceFixture[0] : params.acceptanceFixture;
  return <ProfilePrivacyScreen fixture={fixture} />;
}
