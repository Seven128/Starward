import { View } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";
import { FloatingNotificationHost } from "@/components/notification";
import { useThemeClass } from "@/hooks/use-theme";
import { ContributionEditor } from "./contribution-editor";
import "./index.scss";

export default function ContributionPage() {
  const router = useRouter();
  const themeClass = useThemeClass();
  return (
    <View className={`${themeClass} contribution-route-root`}>
      <FloatingNotificationHost />
      {router.params.manage === "1" ? (
        <ContributionEditor managesRecords />
      ) : (
        <ContributionEditor />
      )}
    </View>
  );
}
