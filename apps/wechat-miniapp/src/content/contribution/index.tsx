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
      <CustomNav
        title="现场反馈与纠错"
        back
        backFallbackTab="/pages/my/index"
      />
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        className="contribution-page__scroll hide-scrollbar"
      >
        <View className="contribution-content page-inset safe-bottom">
          <NotificationRegion owner="contribution" placement="inline" />
          <StatusPanel
            state="PARTIAL"
            detail="提交内容先进入人工审核；审核通过也只代表可供运营合并，不会直接改变地图、详情或今晚结论。"
          />
          {form.pendingCount ? (
            <StatusPanel
              state="LOADING"
              detail={`你有 ${form.pendingCount} 条反馈正在审核；状态会保留在当前微信身份下。`}
            />
          ) : null}
          <ContributionContextSection form={form} />
          <ContributionLocationSection form={form} commands={commands} />
          <ContributionEvidenceSection form={form} />
          <ContributionMediaSection form={form} commands={commands} />
          <ContributionActions form={form} commands={commands} />
          <ContributionHistory form={form} />
        </View>
      </ScrollView>
    </View>
  );
}
