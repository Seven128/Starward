import { ToggleField } from "@/components/toggle-field";
import { displayBeijingTimestamp } from "@/utils/zoned-date";
import { Button, Text, View } from "@tarojs/components";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { errorMessage, MiniappApiError } from "@/services/api-client";
import {
  contributionStatusHistory,
  contributionConflictFacts,
  contributionHistoryLabel,
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
            {item.state === "PENDING" || item.state === "EXPIRED" ? (
              <SoftButton
                label={item.state === "EXPIRED" ? "重新上传媒体" : "续传媒体"}
                disabled={form.commandBusy}
                onClick={() => void commands.retryMedia(item.uploadId)}
              >
                {item.state === "EXPIRED" ? "重选" : "续传"}
              </SoftButton>
            ) : null}
            <SoftButton
              label="移除媒体"
              disabled={form.commandBusy || item.state === "ATTACHED" || contributionSubmissionState(form.draft ?? form.matchingDraft!) !== "DRAFT"}
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
            <SemanticIcon name="wifi-off" label="上传待处理" decorative={false} />
          </View>
          <View className="contribution-recovery-notice__copy">
            <Text className="type-label">还有媒体需要处理</Text>
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
                        disabled={form.commandBusy}
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
        <Text className="type-section">草稿与上传状态</Text>
        <Text className="type-caption">
          已保存的草稿可在当前账户继续编辑。未完成的图片可能需要重新选择；提交结果不确定时请先核对。
        </Text>
        <View className="contribution-recovery-point__axis">
          <Text className="type-caption">草稿</Text>
          <Text className="type-label">
            {draft ? "已保存" : "尚未保存"}
          </Text>
        </View>
        <View className="contribution-recovery-point__axis">
          <Text className="type-caption">上传</Text>
          <Text className="type-label">
            {recoveryMedia
              ? `${readyMedia.length} / ${media.length} 完成 · 仍需处理`
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

export function ContributionActions({
  form,
  commands,
}: {
  form: ContributionForm;
  commands: ContributionCommands;
}) {
  const disabled = form.commandBusy;
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
            <Text className="type-body">此记录已不再是草稿，不能继续覆盖。请先在我的投稿查看审核状态。</Text>
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
      <SoftButton
        variant="primary"
        label={form.pendingSubmission ? "确认上次提交结果" : "提交人工审核"}
        disabled={form.submissionCommandBusy || (!form.pendingSubmission && form.mediaNeedsRecovery)}
        onClick={() => void commands.submit()}
      >
        {form.submitting ? "提交中…" : form.pendingSubmission ? "确认上次提交结果" : "提交审核"}
      </SoftButton>
    </View>
  );
}

export function ContributionHistory({ form, onResume }: { form: ContributionForm; onResume?: () => void }) {
  const permissionDenied =
    form.history.isError &&
    form.history.error instanceof MiniappApiError &&
    form.history.error.code === "PERMISSION_DENIED";
  const filters = [
    ["ALL", `全部 ${form.history.data ? form.submissions.length : "—"}`],
    [
      "PENDING",
      `待审核 ${form.history.data ? form.submissions.filter((item) => contributionSubmissionState(item) === "PENDING_REVIEW").length : "—"}`,
    ],
    [
      "CHANGES_REQUESTED",
      `需补充 ${form.history.data ? form.submissions.filter((item) => contributionSubmissionState(item) === "CHANGES_REQUESTED").length : "—"}`,
    ],
  ] as const;
  return (
    <View
      className="contribution-history card"
      data-od-id="contribution-status-list"
      data-control="contribution-status-list"
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
      {form.history.refreshError || form.history.data?.dataState === "STALE_USABLE" ? (
        <StatusPanel
          state="STALE"
          detail="投稿状态尚未更新，暂时显示上次记录；当前输入已保留。"
          recoveryLabel="重新获取投稿"
          onRecover={() => void form.history.refetch().catch(() => {})}
        />
      ) : null}
      {form.history.isPending ? (
        <StatusPanel state="LOADING" detail="正在加载草稿和审核状态。" />
      ) : form.history.isError ? (
        <StatusPanel
          state={permissionDenied ? "PERMISSION_DENIED" : "ERROR"}
          detail={`${
            permissionDenied
              ? "当前账户无权查看这些投稿"
              : `暂时无法加载提交状态：${errorMessage(form.history.error)}`
          }。本页输入仍保留，请重试确认提交结果。`}
          recoveryLabel="重试"
          onRecover={() => void form.history.refetch().catch(() => {})}
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
                    更新 {displayBeijingTimestamp(item.updatedAt)}
                  </Text>
                </View>
              </View>
              <View
                className="contribution-axis-list"
                aria-label="审核、证据合并与公开状态"
              >
                <View className="contribution-axis" data-axis="submission">
                  <Text className="type-caption">投稿审核</Text>
                  <Text className="type-label">
                    {STATE_LABEL[state]}
                  </Text>
                </View>
                <View className="contribution-axis" data-axis="merge">
                  <Text className="type-caption">证据合并</Text>
                  <Text className="type-label">
                    {MERGE_STATE_LABEL[mergeState]}
                  </Text>
                </View>
                <View
                  className="contribution-axis"
                  data-axis="publication"
                >
                  <Text className="type-caption">公开影响</Text>
                  <Text className="type-label">
                    {PUBLICATION_IMPACT_LABEL[publicationImpact]}
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
                      {displayBeijingTimestamp(event.occurredAt)} · {contributionHistoryLabel(event.axis, event.to)}
                      {event.reason ? ` · ${event.reason}` : ""}
                    </Text>
                  ))}
                </View>
              ) : null}
              {state === "DRAFT" ? (
                <SoftButton
                  label="继续编辑草稿"
                  disabled={form.commandBusy}
                  onClick={() => { if (form.resumeDraft(item)) onResume?.(); }}
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
