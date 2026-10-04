import { SystemMotionProbe } from "@/components/system-motion-probe";
import { View } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";
import { FloatingNotificationHost } from "@/components/notification";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { ContributionEditor } from "./contribution-editor";
import { ContributionRecords } from "./contribution-records";
import { ContributionRecordDetail } from "./contribution-record-detail";
import "./index.scss";

export default function ContributionPage() {
  const router = useRouter();
  const themeClass = useThemeClass();
  return (
    <><SystemMotionProbe /><View className={`${themeClass} contribution-route-root`}>
      <FloatingNotificationHost />
      {router.params.manage === "1" ? (
        <ContributionEditor renderRecords={(form, navigation) => <ContributionRecords form={form} {...navigation} />} />
      ) : (
        <ContributionEditor renderRecordDetail={(item, onBack) => <ContributionRecordDetail item={item} onBack={onBack} />} />
      )}
    </View></>
  );
}
