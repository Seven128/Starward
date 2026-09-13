import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ContributionActions, ContributionHistory, ContributionMediaSection } from "./contribution-media-history";
import { useContributionCommands } from "./use-contribution-commands";
import { useContributionForm } from "./use-contribution-form";
import { ContributionRecords } from "./contribution-records";
import { ToggleField } from "@/components/toggle-field";
import { SpotDocumentFields } from "../spot-document-fields";
import { SPOT_DOCUMENT_CHAPTERS, type SpotDocumentChapter } from "../spot-document";
import { contributionSavedState } from "./contribution-save-state";
import { getContributionMedia } from "@/services/api-client";
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

export function ContributionEditor({ managesRecords = false, embedded = false, embeddedHeightPx, forceNew, submissionId, onClose, onSubmitted, onCandidateChange, onLeaveGuardChange }: {
  managesRecords?: boolean; embedded?: boolean; embeddedHeightPx?: number; forceNew?: boolean; submissionId?: string;
  onClose?: () => void; onSubmitted?: (submission: ContributionSubmission) => void;
  onCandidateChange?: (candidate: ContributionCandidatePreview | null) => void;
  onLeaveGuardChange?: (guard: ContributionLeaveGuard | null) => void;
}) {
  const themeClass = useThemeClass();
  const form = useContributionForm({
    ...(forceNew === undefined ? {} : { forceNew }),
    ...(submissionId ? { requestedSubmissionId: submissionId } : {}),
    ...(embedded ? { disableLocalPersistence: true } : {}),
  });
  const commands = useContributionCommands(form);
  const [validationAnchor, setValidationAnchor] = useState("");
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const [documentChapter, setDocumentChapter] = useState<SpotDocumentChapter>("place");
  const submittedId = useRef("");
  useEffect(() => {
    setValidationAnchor("");
    const target = contributionValidationAnchor(form.validationField);
    if (!target) return;
    const timer = setTimeout(() => setValidationAnchor(target), 0);
    return () => clearTimeout(timer);
  }, [form.validationField, form.validationAttempt]);
  useEffect(() => {
    if (!resumeAttempt) return;
    const timer = setTimeout(() => setValidationAnchor("feedback-context"), 0);
    return () => clearTimeout(timer);
  }, [resumeAttempt]);
  useEffect(() => {
    if (!embedded || !form.draft || form.draft.submissionState !== "PENDING_REVIEW" || submittedId.current === form.draft.submissionId) return;
    submittedId.current = form.draft.submissionId;
    onSubmitted?.(form.draft);
  }, [embedded, form.draft, onSubmitted]);
  useEffect(() => {
    if (!embedded || form.kind !== "NEW_SPOT_PROPOSAL") return;
    const latitude = parseCoordinateInput(form.latitude);
    const longitude = parseCoordinateInput(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
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
  }, [embedded, form.candidateName, form.candidateSelectionVersion, form.kind, form.latitude, form.longitude, onCandidateChange]);
  useEffect(() => {
    if (form.kind !== "NEW_SPOT_PROPOSAL" || !form.draft) return;
    const missing = form.currentMedia.filter((media) =>
      (media.state === "UPLOADED" || media.state === "ATTACHED") &&
      !form.candidateMediaPreviews[media.uploadId]);
    if (!missing.length) return;
    let active = true;
    void Promise.all(missing.map(async (media) => {
      const response = await getContributionMedia(form.draft!.submissionId, media.uploadId);
      return [media.uploadId, `data:${response.data.mimeType};base64,${response.data.dataBase64}`] as const;
    })).then((entries) => {
      if (!active) return;
      for (const [uploadId, path] of entries) form.setCandidateMediaPreview(uploadId, path);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [form.candidateMediaPreviews, form.currentMedia, form.draft, form.kind]);

  const leaveState = useRef({ busy: form.commandBusy, dirty: form.hasUnsavedChanges });
  leaveState.current = { busy: form.commandBusy, dirty: form.hasUnsavedChanges };
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
  const title = form.kind === "NEW_SPOT_PROPOSAL"
    ? (forceNew ? "新增观星点" : form.draft ? "编辑观星点" : "新增观星点")
    : "现场反馈与纠错";
  const savedState = form.saving
    ? "保存中…"
    : form.draft
      ? contributionSavedState(form.draft.updatedAt)
      : "尚未保存";
  const isNewSpotDocument = !managesRecords && form.kind === "NEW_SPOT_PROPOSAL";
  const jumpDocumentChapter = (chapter: SpotDocumentChapter) => {
    setDocumentChapter(chapter);
    setValidationAnchor(`formal-feedback-${chapter}`);
  };
  return <View className={`${themeClass} contribution-page${embedded ? " contribution-page--embedded" : ""}`} style={embedded ? { height: embeddedHeightPx === undefined ? "calc(100vh - 184Px)" : `${embeddedHeightPx}px`, minHeight: 0, maxHeight: "none" } : {}} data-route="contribution-intake">
    {embedded ? <View className="contribution-editor-header"><Text className="type-section">{title}</Text><Text className="contribution-editor-save-state">{savedState}</Text><Button className="contribution-editor-close focus-ring" aria-label="关闭新增观星点" onClick={() => void requestClose()}>×</Button></View> : <CustomNav title={managesRecords ? "观星点创建与反馈" : form.hasFormalSpot ? "现场反馈与纠错" : title} back backFallbackTab={managesRecords ? "/pages/my/index" : "/pages/map/index"} beforeBack={confirmLeave} onBackAuthorized={nativeLeaveGuard.suspendForProgrammaticLeave} onBackFailure={nativeLeaveGuard.restoreAfterFailedProgrammaticLeave} />}
    {isNewSpotDocument ? <SelectionTabs
      className="formal-feedback-tabs contribution-document-tabs"
      items={SPOT_DOCUMENT_CHAPTERS.map(([id, label]) => ({ id, label }))}
      activeId={documentChapter}
      label="新增地点章节"
      onSelect={jumpDocumentChapter}
      activeItemClassName="is-active"
      indicatorClassName="formal-feedback-tabs__line"
    /> : null}
    <ScrollView scrollY scrollIntoView={validationAnchor} scrollWithAnimation={false} enhanced bounces={false} showScrollbar={false} className="contribution-page__scroll hide-scrollbar">
      <View className={`contribution-content${isNewSpotDocument ? "" : " page-inset"} safe-bottom`}><NotificationRegion owner="contribution" placement="inline" />
        {managesRecords ? <ContributionRecords form={form} /> : <>
          {form.localRecovery ? <View className="contribution-card contribution-local-recovery card"><Text className="type-section">本机有未完成的输入</Text><Text className="type-body">可先恢复并核对，恢复不会自动提交审核。</Text><SoftButton label="恢复本机输入" disabled={form.submissionCommandBusy} onClick={() => void form.restoreLocalDraft()}>恢复输入</SoftButton><SoftButton label="放弃本机副本" disabled={form.submissionCommandBusy} onClick={() => form.discardLocalDraft()}>放弃本机副本</SoftButton></View> : null}
          {form.localStorageError ? <StatusPanel state="ERROR" detail="本机输入暂时无法保存，请先保留本页。" /> : null}
          {!embedded && !isNewSpotDocument ? <View id="feedback-context"><ContributionContextSection form={form} /></View> : null}
          {isNewSpotDocument ? <View className="formal-feedback-body contribution-document-body" id="feedback-location">
            <SpotDocumentFields
              values={form.candidateFields}
              disabled={form.commandBusy}
              onChange={form.setCandidateField}
              addressControl={<ContributionCandidateAddressControl form={form} commands={commands} />}
              textareaFixed={embedded}
              renderPhotoGroup={(kind) => <CandidatePhotoGroup kind={kind} form={form} commands={commands} />}
              notesFooter={<>
                <ContributionCandidateCoordinateConsent form={form} commands={commands} />
                {form.currentMedia.length ? <ToggleField disabled={form.commandBusy} id="contribution-photo-rights" label="我有权使用这些照片" checked={form.rightsConfirmed} onChange={form.setRightsConfirmed} stateLabels={{ checked: "已确认", unchecked: "未确认" }} /> : null}
              </>}
            />
          </View> : <>
            <View id="feedback-evidence"><ContributionEvidenceSection form={form} /></View>
            <View id="feedback-location"><ContributionLocationSection form={form} commands={commands} /></View>
            <View id="feedback-media"><ContributionMediaSection form={form} commands={commands} /></View>
          </>}
          {!isNewSpotDocument ? <ContributionActions form={form} commands={commands} onWithdrawn={() => embedded ? onClose?.() : void Taro.navigateBack()} /> : null}
          {!embedded ? <ContributionHistory form={form} onResume={() => setResumeAttempt(value => value + 1)} /> : null}
        </>}
      </View>
    </ScrollView>
    {isNewSpotDocument ? <View className="contribution-document-actions safe-bottom"><ContributionActions form={form} commands={commands} onWithdrawn={() => embedded ? onClose?.() : void Taro.navigateBack()} /></View> : null}
  </View>;
}

function CandidatePhotoGroup({ kind, form, commands }: {
  kind: ContributionMediaKind;
  form: ReturnType<typeof useContributionForm>;
  commands: ReturnType<typeof useContributionCommands>;
}) {
  const label = kind === "parking" ? "停车" : kind === "toilet" ? "洗手间" : "现场";
  const media = form.currentMedia.filter((item) => item.kind === kind);
  return <View className="formal-feedback-photo-group" data-media-kind={kind}>
    <View className="formal-feedback-photo-list">
      {media.map((item) => <View className="formal-feedback-photo contribution-document-photo" key={item.uploadId}>
        {form.candidateMediaPreviews[item.uploadId]
          ? <Image src={form.candidateMediaPreviews[item.uploadId]!} mode="aspectFill" />
          : <Text>{item.state === "UPLOADED" || item.state === "ATTACHED" ? `${label}照片` : item.state === "EXPIRED" ? "照片已过期" : "照片上传中"}</Text>}
        <Button disabled={form.commandBusy} aria-label={`移除${label}照片`} onClick={() => void commands.removeMedia(item.uploadId)}>×</Button>
      </View>)}
    </View>
    <Button className="formal-feedback-photo-action" disabled={form.commandBusy || media.length >= 3} onClick={() => void commands.addMedia(kind)}>＋ 添加{label}照片</Button>
  </View>;
}
