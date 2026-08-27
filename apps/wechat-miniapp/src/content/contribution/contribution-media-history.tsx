import { Button, Switch, Text, View } from "@tarojs/components";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { errorMessage } from "@/services/api-client";
import {
  contributionStatusHistory,
  contributionSubmissionState,
  KIND_LABEL,
  MERGE_STATE_LABEL,
  PUBLICATION_IMPACT_LABEL,
  STATE_LABEL,
} from "./contribution-model";
import type { ContributionCommands } from "./use-contribution-commands";
import type { ContributionForm } from "./use-contribution-form";

export function ContributionMediaSection({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const media = form.currentMedia;
  const disabled = !form.mediaEnabled || form.uploading || !form.rightsConfirmed;
  return (
    <View
      className="contribution-card contribution-media-card card"
      data-od-id="contribution-media-upload"
    >
      <View className="contribution-section-heading">
        <View>
          <Text className="type-section">补充媒体</Text>
          <Text className="type-caption">可选 · 最多 3 张 · JPEG / PNG</Text>
        </View>
        <Text className="type-caption">{media.length}/3</Text>
      </View>
      <View className="contribution-switch-row">
        <View>
          <Text className="type-label">我有权提交并用于点位核验</Text>
          <Text className="type-caption">
            上传前检查格式和大小；服务端负责 magic bytes 与元数据净化。
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
        <View
          className="contribution-media-row"
          data-media-state={item.state.toLowerCase()}
          key={item.uploadId}
        >
          <View className="contribution-media-row__copy">
            <Text className="type-label">{item.originalName}</Text>
            <Text className="type-caption">{mediaStateText(item)}</Text>
          </View>
          {item.state === "PENDING" || item.state === "EXPIRED" ? (
            <SoftButton
              label={item.state === "EXPIRED" ? "重新上传媒体" : "续传媒体"}
              disabled={form.uploading}
              onClick={() => void commands.retryMedia(item.uploadId)}
            >
              {item.state === "EXPIRED" ? "重新选" : "续传"}
            </SoftButton>
          ) : null}
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
      {media.some((item) => item.state === "PENDING" || item.state === "EXPIRED") ? (
        <Text className="type-caption contribution-media-warning">
          上传会话可恢复；完成前不会把媒体作为已就绪证据提交。
        </Text>
      ) : null}
    </View>
  );
}

function mediaStateText(
  media: NonNullable<ContributionForm["draft"]>["media"][number],
) {
  if (media.state === "UPLOADED" || media.state === "ATTACHED")
    return `已清理元数据 · ${Math.ceil((media.byteSize ?? 0) / 1024)} KB · ${media.state === "ATTACHED" ? "已关联证据" : "已就绪"}`;
  if (media.state === "EXPIRED") return "上传会话已过期，请重新选择后继续";
  return "连接中断或上传未完成 · 可续传";
}

export function ContributionUploadRecovery({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const media = form.currentMedia;
  const readyMedia = media.filter(
    (item) => item.state === "UPLOADED" || item.state === "ATTACHED",
  );
  const draft = form.draft ?? form.matchingDraft;
  const recoveryMedia = media.find(
    (item) => item.state === "PENDING" || item.state === "EXPIRED",
  );
  return (
    <View
      className="contribution-upload-recovery"
      data-od-id="contribution-upload-recovery"
    >
      {form.mediaNeedsRecovery ? (
        <View className="contribution-recovery-notice" role="status">
          <View className="contribution-recovery-notice__icon">
            <SemanticIcon name="wifi-off" label="网络中断" decorative={false} />
          </View>
          <View className="contribution-recovery-notice__copy">
            <Text className="type-label">网络刚刚中断过</Text>
            <Text className="type-caption">
              已完成的媒体不会重传；失败项可从当前记录继续。
            </Text>
          </View>
          <Text className="contribution-status-pill contribution-status-pill--warning">
            可恢复
          </Text>
        </View>
      ) : (
        <View className="contribution-recovery-notice contribution-recovery-notice--ready" role="status">
          <View className="contribution-recovery-notice__copy">
            <Text className="type-label">媒体已准备就绪</Text>
            <Text className="type-caption">提交审核仍不会直接改变公开地点。</Text>
          </View>
          <Text className="contribution-status-pill contribution-status-pill--success">
            已就绪
          </Text>
        </View>
      )}

      <View className="contribution-upload-section">
        <View className="contribution-section-heading">
          <Text className="type-section">
            媒体 {readyMedia.length} / {media.length} 就绪
          </Text>
          <Text className="type-caption">{uploadExpiryText(recoveryMedia)}</Text>
        </View>
        <View className="contribution-upload-stack">
          {media.length ? (
            media.map((item) => {
              const ready = item.state === "UPLOADED" || item.state === "ATTACHED";
              return (
                <View
                  className="contribution-media-row contribution-media-row--upload"
                  data-media-state={item.state.toLowerCase()}
                  key={item.uploadId}
                >
                  <View className="contribution-upload-thumb">
                    <SemanticIcon name="images" label="现场图片" decorative={false} />
                  </View>
                  <View className="contribution-media-row__copy">
                    <Text className="type-label">{item.originalName}</Text>
                    <Text className="type-caption">{mediaStateText(item)}</Text>
                    <View className="contribution-upload-progress" aria-hidden="true">
                      <View
                        className={`contribution-upload-progress__value${ready ? " contribution-upload-progress__value--ready" : ""}`}
                      />
                    </View>
                  </View>
                  {item.state === "PENDING" || item.state === "EXPIRED" ? (
                    <View className="contribution-upload-item-action">
                      <Text className="contribution-status-pill contribution-status-pill--danger">
                        {item.state === "EXPIRED" ? "过期" : "中断"}
                      </Text>
                      <SoftButton
                        label={item.state === "EXPIRED" ? "重新上传媒体" : "续传媒体"}
                        disabled={form.uploading}
                        onClick={() => void commands.retryMedia(item.uploadId)}
                      >
                        {item.state === "EXPIRED" ? "重选" : "续传"}
                      </SoftButton>
                    </View>
                  ) : (
                    <Text className="contribution-status-pill contribution-status-pill--success">
                      已就绪
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text className="type-caption contribution-upload-empty">
              当前草稿没有媒体，可返回现场表单继续补充。
            </Text>
          )}
        </View>
      </View>

      <View className="contribution-recovery-point">
        <Text className="type-section">恢复点已建立</Text>
        <Text className="type-caption">
          草稿 revision、上传会话与提交幂等键已绑定到当前账户。关闭页面后可继续；冲突时保留两份文本供选择。
        </Text>
        <View className="contribution-recovery-point__axis">
          <Text className="type-caption">草稿</Text>
          <Text className="type-label">
            {draft ? `rev.${draft.revision} · 已保存` : "尚未保存"}
          </Text>
        </View>
        <View className="contribution-recovery-point__axis">
          <Text className="type-caption">上传</Text>
          <Text className="type-label">
            {recoveryMedia
              ? `${maskUploadId(recoveryMedia.uploadId)} · ${readyMedia.length} / ${media.length} 完成`
              : `${readyMedia.length} / ${media.length} 完成`}
          </Text>
        </View>
        <View className="contribution-recovery-point__axis">
          <Text className="type-caption">提交</Text>
          <Text className="type-label">尚未创建投稿记录</Text>
        </View>
      </View>

      <View className="contribution-preflight">
        <Text className="type-section">提交前确认</Text>
        <View className="contribution-preflight__group">
          <SubmissionCheck
            label="类型与地点"
            value={`${KIND_LABEL[form.kind]} · ${form.routeSpotName || "候选地点"}`}
            complete={Boolean(draft)}
          />
          <SubmissionCheck
            label="媒体权利"
            value={form.rightsConfirmed ? "已确认；原始 EXIF 不保留" : "尚未确认媒体权利"}
            complete={form.rightsConfirmed}
          />
          <SubmissionCheck
            label="媒体上传"
            value={
              form.mediaNeedsRecovery
                ? `还有 ${media.length - readyMedia.length} 项需要续传`
                : media.length
                  ? "全部媒体已就绪"
                  : "没有待上传媒体"
            }
            complete={!form.mediaNeedsRecovery}
          />
        </View>
      </View>
    </View>
  );
}

function SubmissionCheck({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <View className="contribution-preflight__row">
      <View>
        <Text className="type-label">{label}</Text>
        <Text className="type-caption">{value}</Text>
      </View>
      <Text
        className={`contribution-status-pill contribution-status-pill--${complete ? "success" : "warning"}`}
      >
        {complete ? "完整" : "待处理"}
      </Text>
    </View>
  );
}

function uploadExpiryText(
  media: ContributionForm["currentMedia"][number] | undefined,
) {
  if (!media) return "没有待恢复会话";
  const remainingMinutes = Math.max(
    0,
    Math.ceil((Date.parse(media.expiresAt) - Date.now()) / 60_000),
  );
  return remainingMinutes
    ? `上传会话 ${remainingMinutes} 分钟后过期`
    : "上传会话已过期";
}

function maskUploadId(uploadId: string) {
  const suffix = uploadId.replace(/^upload:/u, "").slice(-4);
  return `upload_••${suffix}`;
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
        disabled={disabled || form.mediaNeedsRecovery}
        onClick={() => void commands.submit()}
      >
        {form.submitting ? "提交中…" : "提交审核"}
      </SoftButton>
    </View>
  );
}

export function ContributionHistory({ form }: { form: ContributionForm }) {
  const filters = [
    ["ALL", `全部 ${form.submissions.length}`],
    [
      "PENDING",
      `待审核 ${form.submissions.filter((item) => contributionSubmissionState(item) === "PENDING_REVIEW").length}`,
    ],
    [
      "CHANGES_REQUESTED",
      `需补充 ${form.submissions.filter((item) => contributionSubmissionState(item) === "CHANGES_REQUESTED").length}`,
    ],
  ] as const;
  return (
    <View
      className="contribution-history card"
      data-od-id="contribution-status-list"
    >
      <View className="contribution-history__heading">
        <View>
          <Text className="type-section">我的投稿</Text>
          <Text className="type-caption">只显示当前微信身份的记录</Text>
        </View>
      </View>
      <View className="contribution-history__filters" aria-label="投稿筛选">
        {filters.map(([value, label]) => (
          <Button
            className={`chip focus-ring${form.historyFilter === value ? " chip--selected" : ""}`}
            key={value}
            aria-pressed={form.historyFilter === value}
            onClick={() => form.setHistoryFilter(value)}
          >
            <Text>{label}</Text>
          </Button>
        ))}
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
      ) : form.visibleSubmissions.length ? (
        form.visibleSubmissions.map((item) => {
          const history = contributionStatusHistory(item).slice(-3).reverse();
          const state = contributionSubmissionState(item);
          const mergeState = item.mergeState ?? "NOT_STARTED";
          const publicationImpact = item.publicationImpact ?? "NONE";
          return (
            <View className="contribution-history__item" key={item.submissionId}>
              <View className="contribution-history__row">
                <View className="contribution-history__copy">
                  <Text className="type-label">
                    {submissionName(item)} · {KIND_LABEL[item.kind]}
                  </Text>
                  <Text className="type-caption">
                    更新 {item.updatedAt.slice(0, 16).replace("T", " ")}
                  </Text>
                </View>
                <Text className={`contribution-status-pill contribution-status-pill--${statusTone(state)}`}>
                  {STATE_LABEL[state]}
                </Text>
              </View>
              <View
                className="contribution-axis-list"
                aria-label="投稿三轴状态"
              >
                <View className="contribution-axis" data-axis="submission">
                  <Text className="type-caption">投稿审核</Text>
                  <Text className="type-label">
                    {STATE_LABEL[state]} · {state}
                  </Text>
                </View>
                <View className="contribution-axis" data-axis="merge">
                  <Text className="type-caption">证据合并</Text>
                  <Text className="type-label">
                    {MERGE_STATE_LABEL[mergeState]} · {mergeState}
                  </Text>
                </View>
                <View
                  className="contribution-axis"
                  data-axis="publication"
                >
                  <Text className="type-caption">公开影响</Text>
                  <Text className="type-label">
                    {PUBLICATION_IMPACT_LABEL[publicationImpact]} · {publicationImpact}
                  </Text>
                </View>
              </View>
              {item.review?.reason ? (
                <Text className="type-caption contribution-history__reason">
                  审核说明：{item.review.reason}
                </Text>
              ) : null}
              {history.length ? (
                <View className="contribution-history__events">
                  {history.map((event) => (
                    <Text className="type-caption" key={event.eventId}>
                      {event.occurredAt.slice(0, 16).replace("T", " ")} · {event.axis} → {event.to}
                      {event.reason ? ` · ${event.reason}` : ""}
                    </Text>
                  ))}
                </View>
              ) : null}
              {state === "DRAFT" ? (
                <SoftButton
                  label="继续编辑草稿"
                  onClick={() => form.applyDraft(item)}
                >
                  继续编辑
                </SoftButton>
              ) : null}
            </View>
          );
        })
      ) : (
        <Text className="type-caption">暂无符合当前筛选的投稿记录。</Text>
      )}
    </View>
  );
}

function statusTone(
  state: ReturnType<typeof contributionSubmissionState>,
) {
  if (state === "CHANGES_REQUESTED") return "warning";
  if (state === "ACCEPTED") return "success";
  if (state === "REJECTED" || state === "WITHDRAWN") return "danger";
  return "neutral";
}

function submissionName(item: ContributionForm["submissions"][number]) {
  return (
    item.spotNameSnapshot ?? item.candidateLocation?.displayName ?? "地点待定"
  );
}
