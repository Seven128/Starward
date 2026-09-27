import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import type { BaseEventOrig, ScrollViewProps } from "@tarojs/components";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ContributionMediaKind, ContributionSubmission } from "@starward/miniapp-contracts";
import { parseCoordinateInput } from "./coordinate-input";
import { NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { SelectionTabs } from "@/components/selection-tabs";
import { CustomNav } from "@/components/custom-nav";
import { useThemeClass } from "@/hooks/use-theme";
import { contributionValidationAnchor } from "./validation-anchor";
import { ContributionCandidateAddressControl, ContributionCandidateCoordinateConsent, ContributionContextSection, ContributionEvidenceSection, ContributionLocationSection } from "./contribution-form-sections";
import { ContributionActions, ContributionDeleteDraftAction, ContributionMediaRecoveryAction, ContributionMediaSection } from "./contribution-media-history";
import { useContributionCommands } from "./use-contribution-commands";
import { useContributionForm, type ContributionForm } from "./use-contribution-form";
import { contributionRecordPrimaryAction, resolveContributionEditorRecord, type ContributionRecordGroup } from "./contribution-record-model";
import { ToggleField } from "@/components/toggle-field";
import { SpotDocumentFields } from "../spot-document-fields";
import { SPOT_DOCUMENT_CHAPTERS, type SpotDocumentChapter } from "../spot-document";
import { contributionSavedState } from "./contribution-save-state";
import { contributionSubmissionState } from "./contribution-model";
import { currentDraftUserId, getContributionMedia } from "@/services/api-client";
import { loadAvailableMediaPreviews } from "./media-preview";
import { confirmContributionEditorLeave } from "./leave-editor";
import { useNativeEditorLeaveGuard } from "@/hooks/use-editor-leave-guard";
import "./index.scss";

export interface ContributionCandidatePreview {
  name: string;
  latitude: number;
  longitude: number;
  selectionVersion: number;
}

export type ContributionLeaveGuard = () => Promise<boolean>;

export interface ContributionRecordsNavigation {
  onDetailOpen(): void;
  onDetailClose(): void;
  onGroupChange(group: ContributionRecordGroup): void;
  onFilterChange(): void;
}

export function ContributionEditor({ renderRecords, renderRecordDetail, embedded = false, embeddedHeightPx, forceNew, submissionId, onClose, onSubmitted, onCandidateChange, onLeaveGuardChange }: {
  renderRecords?: (form: ContributionForm, navigation: ContributionRecordsNavigation) => ReactNode;
  renderRecordDetail?: (item: ContributionSubmission, onBack: () => void) => ReactNode;
  embedded?: boolean; embeddedHeightPx?: number; forceNew?: boolean; submissionId?: string;
  onClose?: () => void; onSubmitted?: (submission: ContributionSubmission) => void;
  onCandidateChange?: (candidate: ContributionCandidatePreview | null) => void;
  onLeaveGuardChange?: (guard: ContributionLeaveGuard | null) => void;
}) {
  const managesRecords = renderRecords !== undefined;
  const themeClass = useThemeClass();
  const form = useContributionForm({
    ...(forceNew === undefined ? {} : { forceNew }),
    ...(submissionId ? { requestedSubmissionId: submissionId } : {}),
    ...(embedded ? { disableLocalPersistence: true } : {}),
  });
  const commands = useContributionCommands(form);
  const readonlyEntered = useRef(false);
  const recordId = !form.forceNew ? form.requestedSubmissionId || form.draft?.submissionId : form.draft?.submissionId;
  const editorRecord = recordId ? resolveContributionEditorRecord({ owner: form.owner,
    submissionId: recordId as ContributionSubmission["submissionId"] }, currentDraftUserId(),
    form.history.data?.data.submissions ?? null, form.draft) : null;
  const recordAction = editorRecord?.state === "CURRENT" ? contributionRecordPrimaryAction(editorRecord.item) : null;
  if (recordAction && recordAction !== "EDIT" && recordAction !== "REVIEW_AND_EDIT") readonlyEntered.current = true;
  if (form.phase === "HISTORY" && form.draft) readonlyEntered.current = true;
  const embeddedTerminalRecord = embedded && form.draft &&
    !["DRAFT", "CHANGES_REQUESTED", "REJECTED", "PENDING_REVIEW"].includes(contributionSubmissionState(form.draft));
  const readonlyRecord = (!embedded || embeddedTerminalRecord) && !managesRecords && Boolean(recordId) &&
    (readonlyEntered.current || Boolean(form.requestedSubmissionId && !form.forceNew && editorRecord?.state !== "CURRENT"));
  const isNewSpotDocument = !managesRecords && form.kind === "NEW_SPOT_PROPOSAL";
  const validationTarget = contributionValidationAnchor(form.validationField, isNewSpotDocument ? form.currentMedia : undefined);
  const [validationAnchor, setValidationAnchor] = useState("");
  const [pageVisible, setPageVisible] = useState(true);
  const [previewFailures, setPreviewFailures] = useState<readonly string[]>([]);
  useDidShow(() => { setPageVisible(true); setPreviewFailures([]); });
  useDidHide(() => setPageVisible(false));
  const [documentChapter, setDocumentChapter] = useState<SpotDocumentChapter>("place");
  const [recordsScrollTop, setRecordsScrollTop] = useState(0);
  const recordsScrollPosition = useRef(0);
  const recordsSavedPosition = useRef(0);
  const recordsScrollHeld = useRef(false);
  const recordsScrollTransition = useRef(0);
  const recordsGroup = useRef<ContributionRecordGroup>("CREATION");
  const recordsGroupPositions = useRef<Record<ContributionRecordGroup, number>>({ CREATION: 0, FEEDBACK: 0 });
  const submittedId = useRef("");
  const handoffWasOpen = useRef(false);
  useEffect(() => {
    if (commands.handoffActive) { handoffWasOpen.current = true; return; }
    if (!handoffWasOpen.current) return;
    handoffWasOpen.current = false;
    setValidationAnchor("");
    const timer = setTimeout(() => setValidationAnchor(`formal-feedback-${documentChapter}`), 32);
    return () => clearTimeout(timer);
  }, [commands.handoffActive, documentChapter]);
  useEffect(() => {
    setValidationAnchor("");
    const target = validationTarget;
    if (!target) return;
    const timer = setTimeout(() => setValidationAnchor(target), 0);
    return () => clearTimeout(timer);
  }, [validationTarget, form.validationAttempt]);
  useEffect(() => {
    if (form.ownerChanged || !embedded || !form.draft || form.draft.submissionState !== "PENDING_REVIEW" || submittedId.current === form.draft.submissionId) return;
    submittedId.current = form.draft.submissionId;
    onSubmitted?.(form.draft);
  }, [embedded, form.draft, form.ownerChanged, onSubmitted]);
  useEffect(() => {
    if (!embedded || form.kind !== "NEW_SPOT_PROPOSAL") return;
    const latitude = parseCoordinateInput(form.latitude);
    const longitude = parseCoordinateInput(form.longitude);
    if (form.ownerChanged || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
        (latitude === 0 && longitude === 0)) {
      onCandidateChange?.(null);
      return;
    }
    onCandidateChange?.({
      name: form.candidateName.trim() || "未命名观星点",
      latitude,
      longitude,
      selectionVersion: form.candidateSelectionVersion,
    });
  }, [embedded, form.candidateName, form.candidateSelectionVersion, form.kind, form.latitude, form.longitude, form.ownerChanged, onCandidateChange]);
  useEffect(() => {
    setPreviewFailures([]);
  }, [form.draft?.submissionId]);
  const previewDraftId = form.draft?.submissionId;
  const previewMediaKey = form.currentMedia.map(media => `${media.uploadId}:${media.state}`).join("|");
  const previewPathKey = Object.keys(form.candidateMediaPreviews).sort().join("|");
  const previewFailureKey = [...previewFailures].sort().join("|");
  useEffect(() => {
    if (form.ownerChanged || readonlyRecord || !pageVisible || form.kind !== "NEW_SPOT_PROPOSAL" || !previewDraftId) return;
    const missing = form.currentMedia.filter((media) =>
      (media.state === "UPLOADED" || media.state === "ATTACHED") &&
      !form.candidateMediaPreviews[media.uploadId] &&
      !previewFailures.includes(media.uploadId));
    if (!missing.length) return;
    let active = true;
    void loadAvailableMediaPreviews(missing.map(media => media.uploadId), async id => {
      const response = await getContributionMedia(previewDraftId, id as typeof missing[number]["uploadId"]);
      return `data:${response.data.mimeType};base64,${response.data.dataBase64}`;
    }).then(({ paths, failedIds }) => {
      if (!active) return;
      for (const [uploadId, path] of Object.entries(paths)) form.setCandidateMediaPreview(uploadId, path);
      setPreviewFailures(current => [...new Set([...current.filter(id => !(id in paths)), ...failedIds])]);
    });
    return () => { active = false; };
  }, [form.kind, form.ownerChanged, readonlyRecord, pageVisible, previewDraftId, previewFailureKey, previewMediaKey, previewPathKey]);

  const leaveState = useRef({ busy: !form.ownerChanged && form.commandBusy, dirty: form.hasUnsavedChanges });
  leaveState.current = { busy: !form.ownerChanged && form.commandBusy, dirty: form.hasUnsavedChanges };
  const confirmLeave = useCallback(() => confirmContributionEditorLeave({
    ...leaveState.current,
    confirm: async () => {
      const result = await Taro.showModal({ title: "放弃未保存的修改？", content: "已保存的远端草稿不会删除；本次未保存输入将被放弃。", confirmText: "放弃修改", confirmColor: "#b3261e" });
      return result.confirm;
    },
  }), []);
  useEffect(() => {
    if (!embedded) return;
    onLeaveGuardChange?.(confirmLeave);
    return () => onLeaveGuardChange?.(null);
  }, [confirmLeave, embedded, onLeaveGuardChange]);
  const nativeLeaveGuard = useNativeEditorLeaveGuard(!embedded && form.hasUnsavedChanges, "当前有未保存的观星点修改，确定离开吗？");
  const requestClose = async () => {
    if (await confirmLeave()) onClose?.();
  };
  const leaveAfterWithdrawal = () => {
    if (embedded) { onClose?.(); return; }
    const fallback = () => Taro.switchTab({ url: managesRecords ? "/pages/my/index" : "/pages/map/index" });
    let hasPriorPage = false;
    try { hasPriorPage = Taro.getCurrentPages().length > 1; } catch { /* No reliable back target. */ }
    void (hasPriorPage ? Taro.navigateBack().catch(fallback) : fallback()).catch(() => {
      form.selectKind(form.kind);
      form.announce("warning", "草稿已删除", "返回页面暂时失败；本页已解除旧草稿身份，请使用返回按钮离开。");
    });
  };
  const returnToRecords = () => {
    if (embedded) { onClose?.(); return; }
    const fallback = () => Taro.redirectTo({ url: "/content/contribution/index?manage=1" });
    let previousIsRecords = false;
    try {
      const previous = Taro.getCurrentPages().at(-2);
      previousIsRecords = previous?.route === "content/contribution/index" && previous.options?.manage === "1";
    } catch { /* Use the canonical records route if the stack cannot be inspected. */ }
    void (previousIsRecords ? Taro.navigateBack().catch(fallback) : fallback()).catch(() =>
      form.announce("warning", "暂时无法返回记录", "提交内容已保留，请稍后重试返回。"));
  };
  const title = readonlyRecord ? "本次提交记录" : form.kind === "NEW_SPOT_PROPOSAL"
    ? (forceNew ? "新增观星点" : form.draft ? "编辑观星点" : "新增观星点")
    : "现场反馈与纠错";
  const savedState = form.saving
    ? "保存中…"
    : form.draft
      ? contributionSavedState(form.draft.updatedAt)
      : "尚未保存";
  const jumpDocumentChapter = (chapter: SpotDocumentChapter) => {
    setDocumentChapter(chapter);
    setValidationAnchor(`formal-feedback-${chapter}`);
  };
  const openRecordDetail = () => {
    recordsScrollTransition.current++;
    recordsSavedPosition.current = recordsScrollPosition.current;
    recordsScrollHeld.current = true;
    setRecordsScrollTop(0);
  };
  const closeRecordDetail = () => {
    const version = ++recordsScrollTransition.current;
    recordsScrollPosition.current = recordsSavedPosition.current;
    setRecordsScrollTop(recordsSavedPosition.current);
    Taro.nextTick(() => { if (recordsScrollTransition.current === version) recordsScrollHeld.current = false; });
  };
  const settleRecordsScroll = () => {
    const version = ++recordsScrollTransition.current;
    recordsScrollHeld.current = true;
    Taro.nextTick(() => { if (recordsScrollTransition.current === version) recordsScrollHeld.current = false; });
  };
  const changeRecordsGroup = (next: ContributionRecordGroup) => {
    settleRecordsScroll();
    recordsGroupPositions.current[recordsGroup.current] = recordsScrollPosition.current;
    recordsGroup.current = next;
    recordsScrollPosition.current = recordsGroupPositions.current[next];
    setRecordsScrollTop(recordsScrollPosition.current);
  };
  const changeRecordsFilter = () => {
    settleRecordsScroll();
    recordsScrollPosition.current = 0;
    recordsGroupPositions.current[recordsGroup.current] = 0;
    setRecordsScrollTop(0);
  };
  const onRecordsScroll = (event: BaseEventOrig<ScrollViewProps.onScrollDetail>) => {
    if (recordsScrollHeld.current) return;
    recordsScrollPosition.current = event.detail.scrollTop;
    recordsGroupPositions.current[recordsGroup.current] = event.detail.scrollTop;
    setRecordsScrollTop(event.detail.scrollTop);
  };
  return <View className={`${themeClass} contribution-page${embedded ? " contribution-page--embedded" : ""}`} style={embedded ? { height: embeddedHeightPx === undefined ? "calc(100vh - 184Px)" : `${embeddedHeightPx}px`, minHeight: 0, maxHeight: "none" } : {}} data-route="contribution-intake">
    {commands.handoffWarning}
    {embedded ? <View className="contribution-editor-header"><Text className="type-section">{title}</Text>{!readonlyRecord ? <Text className="contribution-editor-save-state">{savedState}</Text> : null}<Button className="contribution-editor-close focus-ring" aria-label="关闭新增观星点" onClick={() => void requestClose()}>×</Button></View> : <CustomNav title={managesRecords ? "观星点创建与反馈" : readonlyRecord ? "本次提交记录" : form.hasFormalSpot ? "现场反馈与纠错" : title} back backFallbackTab={managesRecords ? "/pages/my/index" : "/pages/map/index"} beforeBack={confirmLeave} onBackAuthorized={nativeLeaveGuard.suspendForProgrammaticLeave} onBackFailure={nativeLeaveGuard.restoreAfterFailedProgrammaticLeave} />}
    {form.ownerChanged && !managesRecords ? <StatusPanel state="ERROR" title="账号已变化"
      detail="请返回地图后重新打开，原账号的输入不会交给当前账号。" recoveryLabel="返回地图"
      onRecover={() => embedded ? onClose?.() : void Taro.switchTab({ url: "/pages/map/index" })} /> : <>
    {isNewSpotDocument && !readonlyRecord ? <SelectionTabs
      className="formal-feedback-tabs contribution-document-tabs"
      items={SPOT_DOCUMENT_CHAPTERS.map(([id, label]) => ({ id, label }))}
      activeId={documentChapter}
      label="新增地点章节"
      onSelect={jumpDocumentChapter}
      activeItemClassName="is-active"
      indicatorClassName="formal-feedback-tabs__line"
    /> : null}
    <ScrollView scrollY {...(managesRecords ? { scrollTop: recordsScrollTop, onScroll: onRecordsScroll } : {})} scrollIntoView={validationAnchor} scrollWithAnimation={false} enhanced bounces={false} showScrollbar={false} className="contribution-page__scroll hide-scrollbar">
      <View className={`contribution-content${isNewSpotDocument && !readonlyRecord ? "" : " page-inset"} safe-bottom`}><NotificationRegion owner="contribution" placement="inline" />
        {form.capabilities.isError || form.capabilities.refreshError || form.capabilities.data?.dataState === "STALE_USABLE" ? (
          <StatusPanel state={form.capabilities.isError ? "ERROR" : "STALE"}
            detail="投稿能力状态暂时无法更新；当前输入仍会保留。"
            recoveryLabel="重新获取" onRecover={() => void form.capabilities.refetch()} />
        ) : null}
        {readonlyRecord ? <>
          {editorRecord?.state === "CURRENT" ? <>
            {form.history.refreshError || form.history.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
              detail="记录尚未确认最新状态，暂时显示上次内容。" recoveryLabel="重新获取" onRecover={() => void form.history.refetch().catch(() => {})} /> : null}
            {renderRecordDetail ? renderRecordDetail(editorRecord.item, returnToRecords) : <StatusPanel state="READY"
              detail="这条记录已结束编辑，请到我的页面中的观星点创建与反馈查看本次记录。"
              recoveryLabel="返回地图" onRecover={returnToRecords} />}
          </> : <>
            <StatusPanel state={form.history.isPending && editorRecord?.state === "UNAVAILABLE" ? "LOADING" : "ERROR"}
              title={editorRecord?.state === "MISSING" ? "记录已不可用" : editorRecord?.state === "ACCOUNT_CHANGED" ? "账号已变化" : undefined}
              detail="请重新获取当前账号的记录；不会继续编辑之前的提交。" recoveryLabel="重新获取"
              onRecover={() => void form.history.refetch().catch(() => {})} />
            <SoftButton label="返回记录列表" onClick={returnToRecords}>返回记录</SoftButton>
          </>}
        </> : managesRecords ? renderRecords(form, { onDetailOpen: openRecordDetail, onDetailClose: closeRecordDetail,
          onGroupChange: changeRecordsGroup, onFilterChange: changeRecordsFilter }) : <>
          {form.localRecovery ? <View className="contribution-card contribution-local-recovery card"><Text className="type-section">本机有未完成的输入</Text><Text className="type-body">可先恢复并核对，恢复不会自动提交审核。</Text><SoftButton label="恢复本机输入" disabled={form.submissionCommandBusy} onClick={() => void form.restoreLocalDraft()}>恢复输入</SoftButton><SoftButton label="放弃本机副本" disabled={form.submissionCommandBusy} onClick={() => form.discardLocalDraft()}>放弃本机副本</SoftButton></View> : null}
          {form.localStorageError ? <StatusPanel state="ERROR" detail="本机输入暂时无法保存，请先保留本页。" /> : null}
          {!embedded && !isNewSpotDocument ? <View id="feedback-context"><ContributionContextSection form={form} /></View> : null}
          {!isNewSpotDocument && recordAction === "REVIEW_AND_EDIT" && editorRecord?.state === "CURRENT" && editorRecord.item.review?.reason ?
            <View className="contribution-review-note"><Text className="type-label">审核意见</Text><Text className="type-body">{editorRecord.item.review.reason}</Text></View> : null}
          {isNewSpotDocument ? <View className="formal-feedback-body contribution-document-body" id="feedback-location">
            {recordAction === "REVIEW_AND_EDIT" && editorRecord?.state === "CURRENT" && editorRecord.item.review?.reason ?
              <View className="contribution-review-note"><Text className="type-label">审核意见</Text><Text className="type-body">{editorRecord.item.review.reason}</Text></View> : null}
            <SpotDocumentFields
              values={form.candidateFields}
              disabled={form.commandBusy}
              onChange={form.setCandidateField}
              addressControl={<ContributionCandidateAddressControl form={form} commands={commands} />}
              textareaFixed={embedded}
              renderPhotoGroup={(kind) => <CandidatePhotoGroup kind={kind} form={form} commands={commands} failedIds={previewFailures} onRetry={ids => setPreviewFailures(current => current.filter(id => !ids.includes(id)))} />}
              notesFooter={<>
                <ContributionCandidateCoordinateConsent form={form} commands={commands} />
                {form.currentMedia.length ? <ToggleField disabled={form.commandBusy} id="contribution-photo-rights" label="我有权使用这些照片" checked={form.rightsConfirmed} onChange={form.setRightsConfirmed} stateLabels={{ checked: "已确认", unchecked: "未确认" }} /> : null}
              </>}
            />
            <View className="contribution-document-delete"><ContributionDeleteDraftAction form={form} commands={commands} onWithdrawn={leaveAfterWithdrawal} /></View>
          </View> : <>
            <View id="feedback-evidence"><ContributionEvidenceSection form={form} /></View>
            <View id="feedback-location"><ContributionLocationSection form={form} commands={commands} /></View>
            <View id="feedback-media"><ContributionMediaSection form={form} commands={commands} /></View>
          </>}
          {!isNewSpotDocument ? <ContributionActions form={form} commands={commands} onWithdrawn={leaveAfterWithdrawal} /> : null}
        </>}
      </View>
    </ScrollView>
    {isNewSpotDocument && !readonlyRecord ? <View className="contribution-document-actions safe-bottom"><ContributionActions form={form} commands={commands} placement="sticky" /></View> : null}
    </>}
  </View>;
}

function CandidatePhotoGroup({ kind, form, commands, failedIds, onRetry }: {
  kind: ContributionMediaKind;
  form: ReturnType<typeof useContributionForm>;
  commands: ReturnType<typeof useContributionCommands>;
  failedIds: readonly string[];
  onRetry(ids: readonly string[]): void;
}) {
  const label = kind === "parking" ? "停车" : kind === "toilet" ? "洗手间" : "现场";
  const media = form.currentMedia.filter((item) => (item.kind ?? "site") === kind);
  return <View id={`contribution-media-${kind}`} className="formal-feedback-photo-group" data-media-kind={kind}>
    <View className="formal-feedback-photo-list">
      {media.map((item) => <View className="formal-feedback-photo contribution-document-photo" key={item.uploadId}>
        {form.candidateMediaPreviews[item.uploadId]
          ? <><Image src={form.candidateMediaPreviews[item.uploadId]!} mode="aspectFill" /><Text className="formal-feedback-photo__red-label">{label}照片</Text></>
          : <Text>{item.state === "UPLOADED" || item.state === "ATTACHED" ? `${label}照片` : item.state === "EXPIRED" ? "照片已过期" : "照片上传中"}</Text>}
        <Button disabled={form.commandBusy} aria-label={`移除${label}照片`} onClick={() => void commands.removeMedia(item.uploadId)}><Text className="formal-feedback-photo__remove-glyph">×</Text></Button>
      </View>)}
    </View>
    {media.filter(item => item.state === "PENDING" || item.state === "EXPIRED").map(item =>
      <View className="contribution-photo-recovery-row" key={item.uploadId}>
        <Text className="type-caption">{item.state === "EXPIRED" ? `${label}照片上传已过期，请重选` : `${label}照片尚未上传完成`}</Text>
        <ContributionMediaRecoveryAction media={item} busy={form.commandBusy} onRetry={commands.retryMedia} className="contribution-photo-recovery" />
      </View>)}
    {media.some(item => failedIds.includes(item.uploadId) && !form.candidateMediaPreviews[item.uploadId])
      ? <StatusPanel state="ERROR" detail={`${label}照片暂时无法预览，其他资料仍可查看。`} recoveryLabel="重试照片预览" onRecover={() => onRetry(media.map(item => item.uploadId))} />
      : null}
    <Button className="formal-feedback-photo-action" disabled={form.commandBusy || media.length >= 3} onClick={() => void commands.addMedia(kind)}>＋ 添加{label}照片</Button>
  </View>;
}
