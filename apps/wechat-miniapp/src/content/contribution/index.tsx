import { FloatingNotificationHost } from "@/components/notification";
import { ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { contributionValidationAnchor } from "./validation-anchor";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
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
  const [validationAnchor, setValidationAnchor] = useState("");
  const [resumeAttempt, setResumeAttempt] = useState(0);
  useEffect(() => {
    setValidationAnchor("");
    const target = contributionValidationAnchor(form.validationField);
    if (!target) return;
    const timer = setTimeout(() => setValidationAnchor(target), 0);
    return () => clearTimeout(timer);
  }, [form.validationField, form.validationAttempt]);
  useEffect(() => {
    if (!resumeAttempt) return;
    setValidationAnchor("");
    const timer = setTimeout(() => setValidationAnchor("feedback-context"), 0);
    return () => clearTimeout(timer);
  }, [resumeAttempt]);

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
        scrollIntoView={validationAnchor}
        scrollWithAnimation={false}
        enhanced
        bounces={false}
        showScrollbar={false}
        className="contribution-page__scroll hide-scrollbar"
      >
        <View className="contribution-content page-inset safe-bottom">
          <NotificationRegion owner="contribution" placement="inline" />
          {form.localRecovery ? (
            <View className="contribution-card card">
              <Text className="type-section">本机有未完成的输入</Text>
              <Text className="type-body">可先恢复并核对，恢复不会自动提交审核。放弃仅清除这份本机副本。</Text>
              <SoftButton label="恢复本机输入" disabled={form.submissionCommandBusy} onClick={() => void form.restoreLocalDraft()}>恢复输入</SoftButton>
              <SoftButton label="放弃本机副本" disabled={form.submissionCommandBusy} onClick={() => form.discardLocalDraft()}>放弃本机副本</SoftButton>
            </View>
          ) : null}
          {form.localStorageError ? <StatusPanel state="ERROR" detail="本机草稿暂时无法保存。请暂留此页，并尝试保存草稿。" /> : null}
          {form.submissionRecovery.error ? <StatusPanel state="ERROR" detail="暂时无法读取本机提交恢复记录，请稍后重新进入并核对近期反馈。" /> : null}
          {!form.pendingSubmission && form.submissionRecovery.intents.length ? (
            <View className="contribution-card card">
              <Text className="type-section">有待确认的提交</Text>
              <Text className="type-body">请先核对上次提交的结果。若有本机输入，请先恢复或放弃；核对不会再次提交。</Text>
              {form.submissionRecovery.intents.map((intent, index) => (
                <SoftButton key={`${intent.submissionId}:${intent.expectedRevision}`} label={`核对第${index + 1}份提交`} disabled={form.submissionCommandBusy || Boolean(form.localRecovery)} onClick={() => void form.restorePendingSubmission(intent.submissionId, intent.expectedRevision)}>
                  {`核对提交 ${index + 1}`}
                </SoftButton>
              ))}
            </View>
          ) : null}
          {form.pendingCount ? (
            <StatusPanel
              state="PARTIAL"
              detail={`当前身份有 ${form.pendingCount} 条反馈正在审核或需要补充；审核、合并与公开影响会分别显示。`}
            />
          ) : null}

          <View id="feedback-context"><ContributionContextSection form={form} /></View>
          <View id="feedback-evidence"><ContributionEvidenceSection form={form} /></View>
          <View id="feedback-location"><ContributionLocationSection form={form} commands={commands} /></View>
          <View id="feedback-media"><ContributionMediaSection form={form} commands={commands} /></View>
          <ContributionActions form={form} commands={commands} />
          <ContributionHistory form={form} onResume={() => setResumeAttempt(value => value + 1)} />
        </View>
      </ScrollView>
    </View>
  );
}
