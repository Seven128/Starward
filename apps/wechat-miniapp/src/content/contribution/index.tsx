import { ScrollView, Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import {
  ContributionContextSection,
  ContributionEvidenceSection,
  ContributionLocationSection,
} from "./contribution-form-sections";
import {
  ContributionHistory,
  ContributionMediaSection,
  ContributionUploadRecovery,
} from "./contribution-media-history";
import { useContributionCommands } from "./use-contribution-commands";
import { useContributionForm } from "./use-contribution-form";
import "./index.scss";

export default function ContributionPage() {
  const themeClass = useThemeClass();
  const form = useContributionForm();
  const commands = useContributionCommands(form);
  const title =
    form.phase === "TYPE"
      ? "反馈现场情况"
      : form.phase === "FORM"
        ? "记录现场"
        : form.phase === "UPLOAD"
          ? "准备提交"
          : "我的投稿";
  const subtitle =
    form.phase === "TYPE"
      ? "真实观察会让下一位出发的人更安心"
      : form.phase === "FORM"
        ? `${form.routeSpotName || "候选地点"} · ${form.kind === "NEW_SPOT_PROPOSAL" ? "新增地点建议" : "当前正式地点"}`
        : form.phase === "UPLOAD"
          ? "上传、草稿与提交状态分开保存"
          : "只显示当前微信身份的记录";

  return (
    <View
      className={`${themeClass} contribution-page`}
      data-route="contribution-intake"
      data-od-id="miniapp-contribution-intake"
    >
      <CustomNav
        title={title}
        subtitle={subtitle}
        back
        backFallbackTab="/pages/my/index"
        right={
          form.phase === "HISTORY" ? null : (
            <SoftButton
              variant="ghost"
              label="查看我的投稿"
              onClick={form.goToHistory}
            >
              历史
            </SoftButton>
          )
        }
      />
      <ScrollView
        scrollY
        enhanced
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
          {form.phase === "FORM" ? (
            <ContributionProgress phase={form.phase} />
          ) : null}

          {form.phase === "TYPE" ? (
            <>
              <ContributionContextSection form={form} />
              <View className="contribution-meaning card">
                <Text className="type-label">提交不等于公开</Text>
                <Text className="type-caption">
                  投稿先进入人工审核；接收后仍需证据合并和新一轮发布完整度评估。
                </Text>
              </View>
            </>
          ) : null}

          {form.phase === "FORM" ? (
            <>
              <View className="contribution-context contribution-context--compact card">
                <Text className="type-label">
                  {form.routeSpotName || "新增地点候选"}
                </Text>
                <Text className="type-caption">
                  {form.hasFormalSpot
                    ? "正式地点上下文已绑定；不会重新读取当前位置。"
                    : "候选地点不会直接成为正式地点；精确坐标需单独同意。"}
                </Text>
              </View>
              <ContributionLocationSection form={form} commands={commands} />
              <ContributionEvidenceSection form={form} />
              <ContributionMediaSection form={form} commands={commands} />
              <View className="contribution-actions contribution-actions--flow">
                <SoftButton label="返回类型选择" onClick={form.goBackPhase}>
                  上一步
                </SoftButton>
                <SoftButton
                  label="保存现场反馈草稿"
                  disabled={form.saving || form.submitting || form.uploading}
                  onClick={() => void commands.saveDraft()}
                >
                  {form.saving ? "保存中…" : "保存草稿"}
                </SoftButton>
                <SoftButton
                  variant="primary"
                  label="进入上传与提交"
                  disabled={form.saving || form.submitting || form.uploading}
                  onClick={form.goToUpload}
                >
                  下一步
                </SoftButton>
              </View>
            </>
          ) : null}

          {form.phase === "UPLOAD" ? (
            <>
              <ContributionUploadRecovery form={form} commands={commands} />
              <View className="contribution-actions contribution-actions--submit">
                <SoftButton
                  variant="primary"
                  label={form.mediaNeedsRecovery ? "媒体就绪后提交" : "提交人工审核"}
                  disabled={
                    form.saving ||
                    form.submitting ||
                    form.uploading ||
                    form.mediaNeedsRecovery
                  }
                  onClick={() => void commands.submit()}
                >
                  {form.submitting
                    ? "提交中…"
                    : form.mediaNeedsRecovery
                      ? "媒体就绪后提交"
                      : "提交审核"}
                </SoftButton>
              </View>
            </>
          ) : null}

          {form.phase === "HISTORY" ? (
            <>
              <ContributionHistory form={form} />
              <SoftButton label="返回投稿类型" onClick={form.goBackPhase}>
                返回投稿
              </SoftButton>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ContributionProgress({
  phase,
}: {
  phase: "TYPE" | "FORM" | "UPLOAD" | "HISTORY";
}) {
  const steps = [
    ["TYPE", "类型"],
    ["FORM", "填写"],
    ["UPLOAD", "准备"],
    ["HISTORY", "状态"],
  ] as const;
  const currentIndex = steps.findIndex(([key]) => key === phase);
  return (
    <View
      className="contribution-progress"
      data-od-id="contribution-progress"
      aria-label={`投稿步骤 ${currentIndex + 1} / ${steps.length}`}
    >
      {steps.map(([key, label], index) => (
        <View
          className={`contribution-progress__step${index < currentIndex ? " contribution-progress__step--done" : ""}${index === currentIndex ? " contribution-progress__step--current" : ""}`}
          key={key}
        >
          <View className="contribution-progress__dot" aria-hidden="true" />
          <Text className="type-caption">{label}</Text>
        </View>
      ))}
    </View>
  );
}
