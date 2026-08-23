import { Switch, Text, View } from "@tarojs/components";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { errorMessage } from "@/services/api-client";
import { KIND_LABEL, STATE_LABEL } from "./contribution-model";
import type { ContributionCommands } from "./use-contribution-commands";
import type { ContributionForm } from "./use-contribution-form";

export function ContributionMediaSection({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const media = form.draft?.media ?? form.matchingDraft?.media ?? [];
  const disabled = !form.mediaEnabled || form.uploading || !form.rightsConfirmed;
  return (
    <View
      className="contribution-card contribution-media-card card"
      data-od-id="contribution-media-upload"
    >
      <Text className="type-section">现场图片（可选）</Text>
      <View className="contribution-switch-row">
        <View>
          <Text className="type-label">我有权提交并用于点位核验</Text>
          <Text className="type-caption">
            最多 3 张；单张不超过 1.2 MB；仅 JPEG / PNG
          </Text>
        </View>
        <Switch
          className="contribution-media-rights"
          data-od-id="contribution-media-rights"
          checked={form.rightsConfirmed}
          color="var(--primary)"
          aria-label="确认拥有图片提交权利"
          onChange={(event) => form.setRightsConfirmed(event.detail.value)}
        />
      </View>
      {media.map((item) => (
        <View className="contribution-media-row" key={item.uploadId}>
          <Text className="type-label">{item.originalName}</Text>
          <Text className="type-caption">{mediaStateText(item)}</Text>
        </View>
      ))}
      <SoftButton
        label="选择并上传现场图片"
        disabled={disabled}
        onClick={() => void commands.addMedia()}
      >
        {form.uploading ? "正在安全上传…" : "选择图片"}
      </SoftButton>
      {!form.mediaEnabled ? (
        <Text className="type-caption">
          {form.capabilities.data?.data.mediaUpload.reason ??
            "当前环境未启用私有媒体存储；文字反馈仍可提交。"}
        </Text>
      ) : null}
    </View>
  );
}

function mediaStateText(
  media: NonNullable<ContributionForm["draft"]>["media"][number],
) {
  if (media.state === "UPLOADED" || media.state === "ATTACHED")
    return `已清理元数据 · ${Math.ceil((media.byteSize ?? 0) / 1024)} KB`;
  if (media.state === "EXPIRED") return "上传会话已过期，请重新选择";
  return "上传中";
}

export function ContributionActions({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const disabled = form.saving || form.submitting || form.uploading;
  return (
    <View className="contribution-actions" data-od-id="contribution-submit">
      <SoftButton
        label="保存现场反馈草稿"
        disabled={disabled}
        onClick={() => void commands.saveDraft()}
      >
        {form.saving ? "保存中…" : "保存草稿"}
      </SoftButton>
      <SoftButton
        variant="primary"
        label="提交人工审核"
        disabled={disabled}
        onClick={() => void commands.submit()}
      >
        {form.submitting ? "提交中…" : "提交审核"}
      </SoftButton>
    </View>
  );
}

export function ContributionHistory({ form }: { form: ContributionForm }) {
  return (
    <View
      className="contribution-history card"
      data-od-id="contribution-status-list"
    >
      <View className="contribution-history__heading">
        <Text className="type-section">我的提交</Text>
        <Text className="type-caption">只显示当前微信身份</Text>
      </View>
      {form.history.isPending ? (
        <StatusPanel state="LOADING" detail="正在回读草稿和审核状态。" />
      ) : form.history.isError ? (
        <StatusPanel
          state="ERROR"
          detail={`暂时无法回读提交状态：${errorMessage(form.history.error)}。本页未提交输入仍保留。`}
          recoveryLabel="重试回读"
          onRecover={() => void form.history.refetch()}
        />
      ) : form.submissions.length ? (
        form.submissions.map((item) => (
          <View className="contribution-history__row" key={item.submissionId}>
            <View className="contribution-history__copy">
              <Text className="type-label">
                {KIND_LABEL[item.kind]} · {submissionName(item)}
              </Text>
              <Text className="type-caption">
                {STATE_LABEL[item.state]} · 更新{" "}
                {item.updatedAt.slice(0, 16).replace("T", " ")}
                {item.review ? ` · ${item.review.reason}` : ""}
              </Text>
            </View>
            {item.state === "DRAFT" ? (
              <SoftButton
                label="继续编辑草稿"
                onClick={() => form.applyDraft(item)}
              >
                继续编辑
              </SoftButton>
            ) : null}
          </View>
        ))
      ) : (
        <Text className="type-caption">暂无草稿或已提交反馈。</Text>
      )}
    </View>
  );
}

function submissionName(item: ContributionForm["submissions"][number]) {
  return (
    item.spotNameSnapshot ?? item.candidateLocation?.displayName ?? "地点待定"
  );
}
