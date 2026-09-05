import { FloatingNotificationHost } from "@/components/notification";
import { ScrollView, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import {
  ContributionContextSection,
  ContributionEvidenceSection,
  ContributionLocationSection,
} from "./contribution-form-sections";
import {
  ContributionActions,
  ContributionHistory,
  ContributionMediaSection,
} from "./contribution-media-history";
import { useContributionCommands } from "./use-contribution-commands";
import { useContributionForm } from "./use-contribution-form";
import "./index.scss";

/**
 * Contribution is one keyboard-safe document. Spot Detail and My both enter
 * this same owner; the route only supplies optional spot context and never
 * mounts a second wizard/form store.
 */
export default function ContributionPage() {
  const themeClass = useThemeClass();
  const form = useContributionForm();
  const commands = useContributionCommands(form);

  return (
    <View
      className={`${themeClass} contribution-page`}
      data-route="contribution-intake"
      data-od-id="miniapp-contribution-intake"
    >
      <FloatingNotificationHost />
      <CustomNav
        title="现场反馈与纠错"
        back
        backFallbackTab="/pages/my/index"
      />
      <ScrollView
        scrollY
        enhanced
        bounces={false}
        showScrollbar={false}
        className="contribution-page__scroll hide-scrollbar"
      >
        <View className="contribution-content page-inset safe-bottom">
          <NotificationRegion owner="contribution" placement="inline" />
          {form.pendingCount ? (
            <StatusPanel
              state="PARTIAL"
              detail={`当前身份有 ${form.pendingCount} 条反馈正在审核或需要补充；审核、合并与公开影响会分别显示。`}
            />
          ) : null}

          <ContributionContextSection form={form} />
          <ContributionEvidenceSection form={form} />
          <ContributionLocationSection form={form} commands={commands} />
          <ContributionMediaSection form={form} commands={commands} />
          <ContributionActions form={form} commands={commands} />
          <ContributionHistory form={form} />
        </View>
      </ScrollView>
    </View>
  );
}
