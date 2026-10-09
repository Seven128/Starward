import { ToggleField } from "@/components/toggle-field";
import { Text, View } from "@tarojs/components";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { contributionConflictFacts, contributionSubmissionState, KIND_LABEL, STATE_LABEL } from "./contribution-model";
import type { ContributionCommands } from "./use-contribution-commands";
import type { ContributionForm } from "./use-contribution-form";
import type { ContributionMediaUpload } from "@starward/miniapp-contracts";

export function ContributionMediaSection({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const media = form.currentMedia;
  const disabled = !form.mediaEnabled || form.commandBusy || !form.rightsConfirmed;
  return (
    <View
      className="contribution-card contribution-media-card card"
      data-od-id="contribution-media-upload"
      data-control="contribution-media-upload"
    >
      <View className="contribution-section-heading">
        <View>
          <Text className="type-section">补充媒体</Text>
          <Text className="type-caption">可选 · 最多 3 张 · JPEG / PNG</Text>
        </View>
        <Text className="type-caption">{media.length}/3</Text>
      </View>
      <ToggleField disabled={form.commandBusy} id="contribution-media-rights" label="我有权提交并用于点位核验" description="上传前会移除照片中的定位等元数据。" checked={form.rightsConfirmed} onChange={form.setRightsConfirmed} stateLabels={{ checked: "已确认", unchecked: "未确认" }} />
      {media.map((item) => (
        <View
          className="contribution-media-row contribution-media-cell"
          data-media-state={item.state.toLowerCase()}
          key={item.uploadId}
        >
          <View className="contribution-media-cell__thumb" aria-hidden="true">
            <SemanticIcon name="images" />
          </View>
          <View className="contribution-media-row__copy">
            <Text className="type-label">{item.originalName}</Text>
            <Text className="type-caption">{mediaStateText(item)}</Text>
            <View className="contribution-upload-progress" aria-hidden="true">
              <View
                className={`contribution-upload-progress__value${item.state === "UPLOADED" || item.state === "ATTACHED" ? " contribution-upload-progress__value--ready" : ""}`}
              />
            </View>
          </View>
          <View className="contribution-media-cell__actions">
            <ContributionMediaRecoveryAction media={item} busy={form.commandBusy} onRetry={commands.retryMedia} />
            <SoftButton
              label="移除媒体"
              disabled={form.commandBusy || !["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(contributionSubmissionState(form.draft ?? form.matchingDraft!))}
              onClick={() => void commands.removeMedia(item.uploadId)}
            >
              移除
            </SoftButton>
          </View>
        </View>
      ))}
      {media.length < 3 ? <SoftButton
        label="选择并上传现场图片"
        disabled={disabled}
        onClick={() => void commands.addMedia()}
      >
        {form.uploading ? "正在安全上传…" : "选择图片"}
      </SoftButton> : null}
      {!form.mediaEnabled ? (
        <Text className="type-caption">
          图片上传暂不可用，仍可提交文字反馈。
        </Text>
      ) : null}
      {media.some((item) => item.state === "PENDING" || item.state === "EXPIRED") ? (
        <Text className="type-caption contribution-media-warning">
          上传完成后才能提交审核；中断后可继续上传。
        </Text>
      ) : null}
    </View>
  );
}

export function ContributionMediaRecoveryAction({ media, busy, onRetry, className = "" }: {
  media: ContributionMediaUpload;
  busy: boolean;
  onRetry: ContributionCommands["retryMedia"];
  className?: string;
}) {
  if (media.state !== "PENDING" && media.state !== "EXPIRED") return null;
  return <SoftButton className={className} label={media.state === "EXPIRED" ? "重新上传媒体" : "续传媒体"}
    disabled={busy} onClick={() => void onRetry(media.uploadId)}>
    {media.state === "EXPIRED" ? "重选" : "续传"}
  </SoftButton>;
}

function mediaStateText(
  media: NonNullable<ContributionForm["draft"]>["media"][number],
) {
  if (media.state === "UPLOADED" || media.state === "ATTACHED") {
    const size = typeof media.byteSize === "number" && Number.isFinite(media.byteSize) && media.byteSize >= 0
      ? `${Math.ceil(media.byteSize / 1024)} KB`
      : "大小暂不可用";
    return `已清理元数据 · ${size} · ${media.state === "ATTACHED" ? "已关联证据" : "已就绪"}`;
  }
  if (media.state === "EXPIRED") return "上传会话已过期，请重新选择后继续";
  return "上传尚未完成 · 可续传";
}

export function ContributionActions({
  form,
  commands,
  onWithdrawn,
  placement = "inline",
}: {
  form: ContributionForm;
  commands: ContributionCommands;
  onWithdrawn?: () => void;
  placement?: "inline" | "sticky";
}) {
  const disabled = form.commandBusy;
  const draftState = form.draft ? contributionSubmissionState(form.draft) : null;
  const isResubmission = draftState === "REJECTED" || draftState === "CHANGES_REQUESTED";
  const submitLabel = form.pendingSubmission ? "确认上次提交结果" : isResubmission ? "再次提交" : "提交审核";
  return (
    <View
      className="contribution-actions"
      data-od-id="contribution-submit"
      data-control="contribution-submit"
    >
      {form.pendingSubmission ? <View className="contribution-draft-recovery" role="status">
        <Text className="type-section">上次提交结果待确认</Text>
        <Text className="type-body">内容和图片已保留。确认前暂不修改这份草稿；再次确认会继续同一次提交。</Text>
      </View> : null}
      {form.conflictDraft ? (
        <View className="contribution-draft-recovery">
          <Text className="type-section">核对最新草稿</Text>
          <Text className="type-body">{KIND_LABEL[form.conflictDraft.kind]} · {STATE_LABEL[contributionSubmissionState(form.conflictDraft)]}</Text>
          {contributionConflictFacts(form.conflictDraft).map((fact) => <Text className="type-body" key={fact}>{fact}</Text>)}
          <Text className="type-body">{form.conflictDraft.detail || "暂无现场说明"}</Text>
          <Text className="type-caption">本页输入仍保留，请核对最新草稿后再保存。</Text>
          {contributionSubmissionState(form.conflictDraft) === "DRAFT" ? (
            <SoftButton disabled={disabled} label="已核对，保留本页输入" onClick={form.keepConflictInput}>已核对，保留本页输入</SoftButton>
          ) : (
            <Text className="type-body">此记录已不再是草稿，不能继续覆盖。请先返回记录列表查看审核状态。</Text>
          )}
        </View>
      ) : null}
      <SoftButton
        label={form.kind === "NEW_SPOT_PROPOSAL" ? "保存新增观星点草稿" : "保存现场反馈草稿"}
        disabled={disabled}
        onClick={() => void commands.saveDraft()}
      >
        {form.saving ? "保存中…" : "保存草稿"}
      </SoftButton>
      {placement === "inline" ? <ContributionDeleteDraftAction form={form} commands={commands} onWithdrawn={onWithdrawn} /> : null}
      <SoftButton
        variant="primary"
        label={form.pendingSubmission ? "确认上次提交结果" : isResubmission ? "再次提交" : "提交人工审核"}
        disabled={form.submissionCommandBusy || (!form.pendingSubmission && form.mediaNeedsRecovery)}
        onClick={() => void commands.submit()}
      >
        {form.submitting ? "提交中…" : submitLabel}
      </SoftButton>
    </View>
  );
}

export function ContributionDeleteDraftAction({ form, commands, onWithdrawn }: {
  form: ContributionForm;
  commands: ContributionCommands;
  onWithdrawn?: (() => void) | undefined;
}) {
  if (!form.draft || contributionSubmissionState(form.draft) !== "DRAFT") return null;
  return <SoftButton variant="danger" label="删除当前草稿" disabled={form.commandBusy}
    onClick={() => void commands.withdrawDraft().then(withdrawn => { if (withdrawn) onWithdrawn?.(); })}>删除草稿</SoftButton>;
}
