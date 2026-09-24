import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  type ContributionConflictResolution,
  type ContributionFormalBaseline,
  type ContributionFormalConflict,
  type ContributionFormalFieldKey,
  type ContributionFormalMediaUpload,
  type ContributionFormalProposal,
  type ContributionFormalUploadIntent,
  type ContributionSubmission,
  type ContributionUploadId,
  type ContributionMediaKind,
  resolveContributionFormalRebase,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost, NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SelectionTabs } from "@/components/selection-tabs";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { completeFormalContributionUpload, createFormalContributionUpload, createFormalUploadIntent, errorMessage, getContributionFormalBaseline, getContributionMedia, getContributions, getSpotContributionMedia, getSpotSite, MiniappApiError, removeFormalContributionUpload, submitFormalContribution } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { ToggleField } from "@/components/toggle-field";
import { mediaFileName, mediaMimeType, readBase64 } from "../contribution/contribution-model";
import { appendFormalMedia, createFormalMediaSelection, formalMediaProposal, removeFormalMedia, type FormalMediaSelection } from "./formal-media-selection";
import { confirmEditorLeave } from "@/hooks/editor-leave";
import { useNativeEditorLeaveGuard } from "@/hooks/use-editor-leave-guard";
import { SpotDocumentFields } from "../spot-document-fields";
import {
  SPOT_DOCUMENT_CHAPTERS as CHAPTERS,
  SPOT_DOCUMENT_LABELS as LABELS,
  emptySpotDocumentValues,
  type SpotDocumentValues,
} from "../spot-document";
import "./index.scss";
import { MEDIA_RIGHTS_MODAL } from "../contribution/media-rights-modal";
import { useRedLightHandoff } from "@/components/red-light-handoff";

function valuesFrom(baseline: ContributionFormalBaseline) {
  const values = emptySpotDocumentValues();
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) values[key] = baseline.fields[key] ?? "";
  return values;
}

function proposalFrom(baseline: ContributionFormalBaseline, values: SpotDocumentValues): ContributionFormalProposal {
  const fields: Partial<Record<ContributionFormalFieldKey, string>> = {};
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) if (values[key] !== (baseline.fields[key] ?? "")) fields[key] = values[key];
  return { fields, media: {} };
}

function sameConflictValue(left: string | null | readonly string[], right: string | null | readonly string[]) {
  return Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((value, index) => value === right[index])
    : left === right;
}

function mediaKindOf(feedback: NonNullable<ContributionSubmission["formalFeedback"]>, uploadId: ContributionUploadId): ContributionMediaKind {
  return (["parking", "toilet", "site"] as const).find(kind => feedback.resolvedProposal.media[kind]?.includes(uploadId)) ?? "site";
}

export default function FormalFeedbackEditor() {
  const router = useRouter();
  const spotId = decodeURIComponent(router.params.spotId ?? "");
  const spotName = decodeURIComponent(router.params.spotName ?? "");
  const submissionId = decodeURIComponent(router.params.submissionId ?? "");
  const themeClass = useThemeClass();
  const mediaHandoff = useRedLightHandoff();
  const notify = useAppStore(state => state.notify);
  const [pageVisible, setPageVisible] = useState(true);
  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));
  const query = useResourceQuery({ queryKey: ["contribution-formal-baseline", spotId], queryFn: signal => getContributionFormalBaseline(spotId, signal), enabled: pageVisible && Boolean(spotId), staleTime: 0 });
  const history = useResourceQuery({ queryKey: ["contributions", "formal-feedback", spotId], queryFn: signal => getContributions(signal), enabled: pageVisible && Boolean(spotId), staleTime: 0 });
  const site = useResourceQuery({ queryKey: ["spot-site", "formal-feedback", spotId], queryFn: signal => getSpotSite(spotId, signal), enabled: pageVisible && Boolean(spotId), staleTime: 0 });
  const [baseline, setBaseline] = useState<ContributionFormalBaseline | null>(null);
  const [values, setValues] = useState<SpotDocumentValues | null>(null);
  const [chapter, setChapter] = useState<(typeof CHAPTERS)[number][0]>("place");
  const [scrollAnchor, setScrollAnchor] = useState("formal-feedback-place");
  const handoffWasOpen = useRef(false);
  useEffect(() => {
    if (mediaHandoff.active) { handoffWasOpen.current = true; return; }
    if (!handoffWasOpen.current) return;
    handoffWasOpen.current = false;
    setScrollAnchor("");
    const timer = setTimeout(() => setScrollAnchor(`formal-feedback-${chapter}`), 32);
    return () => clearTimeout(timer);
  }, [mediaHandoff.active, chapter]);
  const [busy, setBusy] = useState(false);
  const submitBusy = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [conflicts, setConflicts] = useState<readonly ContributionFormalConflict[]>([]);
  const [currentBaseline, setCurrentBaseline] = useState<ContributionFormalBaseline | null>(null);
  const [resolutions, setResolutions] = useState<Partial<Record<string, ContributionConflictResolution>>>({});
  const [uploadIntent, setUploadIntent] = useState<ContributionFormalUploadIntent | null>(null);
  const [previewPaths, setPreviewPaths] = useState<Record<string, string>>({});
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resubmissionRevision, setResubmissionRevision] = useState<number | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [recordError, setRecordError] = useState("");
  const [activeSubmissionId, setActiveSubmissionId] = useState("");
  const [priorMedia, setPriorMedia] = useState<readonly ContributionFormalMediaUpload[]>([]);
  const [mediaSelection, setMediaSelection] = useState<FormalMediaSelection | null>(null);
  useEffect(() => {
    if (!pageVisible) return;
    const failed = query.isError || query.refreshError || query.data?.dataState === "STALE_USABLE"
      ? ["正式资料数据异常", "当前正式地点资料暂时无法更新，可在页面中重试。", "baseline"]
      : history.isError || history.refreshError || history.data?.dataState === "STALE_USABLE"
        ? ["反馈记录数据异常", "本人反馈状态暂时无法更新，可在页面中重试。", "history"]
        : site.isError || site.refreshError || site.data?.dataState === "STALE_USABLE"
          ? ["场地数据异常", "场地与媒体资料暂时无法更新，已填写内容仍会保留。", "site"]
          : null;
    if (!failed) return;
    notify({ owner: "contribution", placement: "floating", tone: "info",
      title: failed[0]!, body: failed[1]!, dedupeKey: `formal-feedback-resource-failed:${spotId}:${failed[2]}` });
  }, [history.data?.dataState, history.isError, history.refreshError, notify, pageVisible, query.data?.dataState,
    query.isError, query.refreshError, site.data?.dataState, site.isError, site.refreshError, spotId]);
  useEffect(() => {
    if (!query.data?.data || !history.data?.data || baseline) return;
    if (submissionId) {
      const record = history.data.data.submissions.find(item => item.submissionId === submissionId);
      if (!record?.formalFeedback || !["REJECTED", "CHANGES_REQUESTED"].includes(record.submissionState)) {
        setRecordError("这条反馈不存在、已进入其他状态，或不属于当前账号。");
        return;
      }
      const prior = record.formalFeedback;
      const restored = valuesFrom(prior.baseline);
      for (const [key,value] of Object.entries(prior.proposal.fields)) restored[key as ContributionFormalFieldKey] = value ?? "";
      const restoredMedia = record.media.map(media => ({ ...media, kind: mediaKindOf(prior, media.uploadId) }));
      setBaseline(prior.baseline); setValues(restored); setResubmissionRevision(record.revision); setReviewReason(record.review?.reason ?? ""); setActiveSubmissionId(record.submissionId);
      setPriorMedia(restoredMedia); setMediaSelection(createFormalMediaSelection(prior.baseline, prior.proposal, restoredMedia.map(media => media.uploadId)));
      setRightsConfirmed(record.rightsConfirmed);
      const check = resolveContributionFormalRebase({ baseline: prior.baseline, current: query.data.data, proposal: prior.proposal });
      setCurrentBaseline(query.data.data); setConflicts(check.conflicts);
      return;
    }
    const pending = history.data.data.submissions.find(item => item.spotId === spotId && item.submissionState === "PENDING_REVIEW" && item.formalFeedback);
    if (pending?.formalFeedback) {
      const frozen = pending.formalFeedback;
      const restored = valuesFrom(frozen.baseline);
      for (const [key, value] of Object.entries(frozen.resolvedProposal.fields)) restored[key as ContributionFormalFieldKey] = value ?? "";
      const frozenMedia = pending.media.map(media => ({ ...media, kind: mediaKindOf(frozen, media.uploadId) }));
      setBaseline(frozen.baseline); setValues(restored); setSubmitted(true); setActiveSubmissionId(pending.submissionId);
      setPriorMedia(frozenMedia); setMediaSelection(createFormalMediaSelection(frozen.baseline, frozen.resolvedProposal, frozenMedia.map(media => media.uploadId)));
      setRightsConfirmed(pending.rightsConfirmed);
      return;
    }
    setBaseline(query.data.data); setValues(valuesFrom(query.data.data)); setMediaSelection(createFormalMediaSelection(query.data.data));
  }, [baseline, history.data, query.data, spotId, submissionId]);
  useEffect(() => {
    if (!activeSubmissionId || !priorMedia.length) return;
    let active = true;
    void Promise.all(priorMedia.map(async media => {
      const response = await getContributionMedia(activeSubmissionId as never, media.uploadId);
      return [media.uploadId, `data:${response.data.mimeType};base64,${response.data.dataBase64}`] as const;
    })).then(entries => { if (active) setPreviewPaths(current => ({ ...current, ...Object.fromEntries(entries) })); }).catch(() => undefined);
    return () => { active = false; };
  }, [activeSubmissionId, priorMedia]);
  useEffect(() => {
    if (!baseline || !site.data?.data) return;
    let active = true;
    const canonical = new Map(site.data.data.media.map(media => [media.id, media.thumbnailPath || media.localPath]));
    const ids = [...new Set(Object.values(baseline.media).flat())];
    void Promise.all(ids.map(async id => {
      const known = canonical.get(id);
      if (known && !known.startsWith("/v2/spots/")) return [id, known] as const;
      if (!id.startsWith("upload:")) return [id, known ?? ""] as const;
      const response = await getSpotContributionMedia(spotId, id as ContributionUploadId);
      return [id, `data:${response.data.mimeType};base64,${response.data.dataBase64}`] as const;
    })).then(entries => {
      if (active) setPreviewPaths(current => ({ ...current, ...Object.fromEntries(entries.filter(([, path]) => path)) }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [baseline, site.data, spotId]);
  const proposal = useMemo(() => baseline && values ? proposalFrom(baseline, values) : null, [baseline, values]);
  const changedKeys = proposal ? Object.keys(proposal.fields) as ContributionFormalFieldKey[] : [];
  const mediaProposal = useMemo(() => baseline && mediaSelection ? formalMediaProposal(baseline, mediaSelection) : {}, [baseline, mediaSelection]);
  const visibleUploads = useMemo(() => [...priorMedia, ...(uploadIntent?.uploads ?? [])], [priorMedia, uploadIntent]);
  const activeConflicts = useMemo(() => conflicts.flatMap(conflict => {
    const proposed = conflict.kind === "FIELD" ? proposal?.fields[conflict.key] : mediaProposal[conflict.key];
    if (proposed === undefined) return [];
    const same = sameConflictValue(proposed, conflict.currentValue);
    return same ? [] : [{ ...conflict, proposedValue: proposed } as ContributionFormalConflict];
  }), [conflicts, mediaProposal, proposal]);
  const hasChanges = changedKeys.length > 0 || Object.keys(mediaProposal).length > 0;
  const leaveState = useRef({ busy: busy || uploading, dirty: hasChanges && !submitted });
  leaveState.current = { busy: busy || uploading, dirty: hasChanges && !submitted };
  const confirmLeave = useCallback(() => confirmEditorLeave({
    ...leaveState.current,
    confirm: async () => (await Taro.showModal({
      title: "放弃未提交的反馈？",
      content: "本页修改尚未提交，离开后将丢失。",
      confirmText: "放弃修改",
      confirmColor: "#b3261e",
      cancelText: "继续编辑",
    })).confirm,
  }), []);
  const nativeLeaveGuard = useNativeEditorLeaveGuard(hasChanges && !submitted, "当前反馈尚未提交，确定离开吗？");
  const setField = (key: ContributionFormalFieldKey, value: string) => setValues(current => current ? { ...current, [key]: value } : current);
  const jump = (next: typeof chapter) => { setChapter(next); setScrollAnchor(`formal-feedback-${next}`); };
  const syncMediaProposal = (intent: ContributionFormalUploadIntent) => {
    if (!baseline) return;
    setValues(current => current ? { ...current } : current);
    // proposalFrom reads text values; media is merged at submission/render time.
    setUploadIntent(intent);
  };
  const addPhoto = async (kind: ContributionMediaKind) => {
    if (!baseline || busy || uploading || submitted) return;
    const allowed = await mediaHandoff.confirm("微信相册、相机及图片授权界面可能较亮，无法跟随红光模式。");
    if (!allowed) return;
    if (!rightsConfirmed) {
      const consent = await Taro.showModal(MEDIA_RIGHTS_MODAL);
      if (!consent.confirm) return;
      setRightsConfirmed(true);
    }
    try {
      const choice = await Taro.chooseImage({ count: 1, sizeType: ["compressed"], sourceType: ["album", "camera"] });
      const file = choice.tempFiles[0]; if (!file) return;
      if (typeof file.size !== "number" || file.size <= 0 || file.size > 1_200_000) throw new Error("单张图片必须小于 1.2 MB");
      setUploading(true);
      let intent = uploadIntent;
      if (!intent) intent = (await createFormalUploadIntent({ spotId: baseline.spotId, baselineRevision: baseline.revision })).data;
      const created = (await createFormalContributionUpload(intent.intentId, { kind, originalName: mediaFileName(file.path), mimeType: mediaMimeType(file.path), byteSize: file.size, expectedRevision: intent.revision })).data;
      const known = new Set(intent.uploads.map(value => value.uploadId));
      const upload = created.uploads.find(value => !known.has(value.uploadId)); if (!upload) throw new Error("上传会话未建立");
      const completed = (await completeFormalContributionUpload(created.intentId, upload.uploadId, { dataBase64: await readBase64(file.path) })).data;
      setPreviewPaths(current => ({ ...current, [upload.uploadId]: file.path })); setMediaSelection(current => current ? appendFormalMedia(current, kind, upload.uploadId) : current); syncMediaProposal(completed);
    } catch (error) {
      const message = errorMessage(error); if (!/cancel/iu.test(message)) notify({ owner: "contribution", placement: "floating", tone: "error", title: "图片上传失败", body: `${message}；文字修改仍保留。`, dismissible: true });
    } finally { setUploading(false); }
  };
  const removePhoto = async (uploadId: string) => {
    if (busy || uploading || submitted) return;
    if (priorMedia.some(media => media.uploadId === uploadId)) {
      const kind = priorMedia.find(media => media.uploadId === uploadId)!.kind;
      setPriorMedia(current => current.filter(media => media.uploadId !== uploadId));
      setMediaSelection(current => current ? removeFormalMedia(current, kind, uploadId) : current);
      setPreviewPaths(current => { const copy = { ...current }; delete copy[uploadId]; return copy; });
      return;
    }
    const currentUpload = uploadIntent?.uploads.find(upload => upload.uploadId === uploadId);
    if (!uploadIntent || !currentUpload) {
      const kind = (["parking", "toilet", "site"] as const).find(value => mediaSelection?.[value].includes(uploadId));
      if (kind) setMediaSelection(current => current ? removeFormalMedia(current, kind, uploadId) : current);
      return;
    }
    setUploading(true);
    try { const next=(await removeFormalContributionUpload(uploadIntent.intentId,uploadId,uploadIntent.revision)).data; setMediaSelection(current => current ? removeFormalMedia(current, currentUpload.kind, uploadId) : current); setPreviewPaths(current=>{const copy={...current};delete copy[uploadId];return copy;});syncMediaProposal(next); }
    catch(error){notify({owner:"contribution",placement:"floating",tone:"error",title:"暂时无法移除图片",body:errorMessage(error),dismissible:true});}
    finally{setUploading(false);}
  };
  const submit = async () => {
    if (!baseline || !proposal || !hasChanges || busy || submitBusy.current || submitted) return;
    if (activeConflicts.length && activeConflicts.some(conflict => !resolutions[`${conflict.kind}:${conflict.key}`])) {
      notify({ owner: "contribution", placement: "floating", tone: "warning", title: "请先处理资料冲突", body: "每一项冲突都要选择使用当前资料或我的修改。", dismissible: true });
      return;
    }
    submitBusy.current = true;
    setBusy(true);
    try {
      const fieldResolutions: Record<string, ContributionConflictResolution> = {};
      const mediaResolutions: Record<string, ContributionConflictResolution> = {};
      for (const [key, value] of Object.entries(resolutions)) {
        if (!value) continue;
        (key.startsWith("FIELD:") ? fieldResolutions : mediaResolutions)[key.slice(key.indexOf(":") + 1)] = value;
      }
      const response = await submitFormalContribution({
        kind: "CORRECTION", baseline, proposal: { ...proposal, media: mediaProposal }, observedAt: null, rightsConfirmed,
        ...(uploadIntent ? { uploadIntentId: uploadIntent.intentId, expectedUploadIntentRevision: uploadIntent.revision } : {}),
        ...(activeSubmissionId && resubmissionRevision ? { submissionId: activeSubmissionId as never, expectedSubmissionRevision: resubmissionRevision } : {}),
        ...(Object.keys(resolutions).length ? { resolutions: { fields: fieldResolutions, media: mediaResolutions } } : {}),
      });
      if (response.data.state === "CONFLICT") {
        setConflicts(response.data.conflicts); setCurrentBaseline(response.data.currentBaseline); setResolutions({});
        notify({ owner: "contribution", placement: "floating", tone: "warning", title: "正式资料已有更新", body: "请在下方逐项核对原值、当前值和你的修改。", dismissible: true });
      } else {
        setSubmitted(true); setConflicts([]);
        notify({ owner: "contribution", placement: "inline", tone: "success", title: "已提交反馈", body: "反馈已进入审核，正式地点资料暂不改变。", dismissible: true });
      }
    } catch (error) {
      const rejected = error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408 && !error.retryable;
      notify({ owner: "contribution", placement: "floating", tone: rejected ? "error" : "warning", title: rejected ? "提交失败" : "提交结果未确认", body: rejected ? `${errorMessage(error)}；本页输入仍保留。` : `${errorMessage(error)}；本页输入仍保留，请原样重试或到“我的”核对待审记录。`, dismissible: true });
    } finally { submitBusy.current = false; setBusy(false); }
  };

  return <View className={`${themeClass} formal-feedback-page`} data-route="formal-spot-feedback" data-od-id="formal-feedback-editor">
    {mediaHandoff.warning}
    <FloatingNotificationHost />
    <CustomNav title={`${baseline?.fields.name ?? (spotName || "观星点")}反馈页`} back beforeBack={confirmLeave} onBackAuthorized={nativeLeaveGuard.suspendForProgrammaticLeave} onBackFailure={nativeLeaveGuard.restoreAfterFailedProgrammaticLeave} backFallbackTab="/pages/map/index" />
    <SelectionTabs className="formal-feedback-tabs"
      items={CHAPTERS.map(([id, label]) => ({ id, label }))}
      activeId={chapter}
      label="反馈章节"
      onSelect={jump}
      activeItemClassName="is-active"
      indicatorClassName="formal-feedback-tabs__line" />
    <ScrollView scrollY scrollIntoView={scrollAnchor} enhanced bounces={false} showScrollbar={false} className="formal-feedback-scroll">
      <View className="formal-feedback-body safe-bottom">
        <NotificationRegion owner="contribution" placement="inline" />
        {query.refreshError || query.data?.dataState === "STALE_USABLE" ||
        history.refreshError || history.data?.dataState === "STALE_USABLE" ||
        site.isError || site.refreshError || site.data?.dataState === "STALE_USABLE" ? (
          <StatusPanel state="STALE" detail="部分正式地点或反馈资料尚未确认最新状态，当前输入仍会保留。"
            recoveryLabel="重新获取" onRecover={() => {
              if (query.refreshError || query.data?.dataState === "STALE_USABLE") void query.refetch();
              else if (history.refreshError || history.data?.dataState === "STALE_USABLE") void history.refetch();
              else void site.refetch();
            }} />
        ) : null}
        {query.isError || history.isError ? <StatusPanel state="ERROR" detail={`暂时无法读取正式资料或本人反馈状态：${errorMessage(query.error ?? history.error)}`} recoveryLabel="重试" onRecover={() => { void query.refetch(); void history.refetch(); }} /> : recordError ? <StatusPanel state="ERROR" detail={recordError} /> : query.isPending || history.isPending || !values || !baseline ? <StatusPanel state="LOADING" detail="正在读取当前正式地点资料与本人反馈状态。" /> : <>
          {submitted ? <Text className="formal-feedback-review-tag">审核中</Text> : null}
          {reviewReason ? <View className="formal-feedback-review-note"><Text>审核意见</Text><Text>{reviewReason}</Text></View> : null}
          <SpotDocumentFields
            values={values}
            baseline={baseline}
            disabled={busy || submitted}
            onChange={setField}
            renderPhotoGroup={(kind) => <PhotoGroup kind={kind} ids={mediaSelection?.[kind] ?? []} uploads={visibleUploads} paths={previewPaths} disabled={busy||uploading||submitted} onAdd={addPhoto} onRemove={removePhoto} />}
            notesFooter={<>
              {visibleUploads.length ? <ToggleField disabled={busy||uploading||submitted} id="formal-feedback-photo-rights" label="我有权使用这些照片" checked={rightsConfirmed} onChange={setRightsConfirmed} stateLabels={{checked:"已确认",unchecked:"未确认"}} /> : null}
            <View className="formal-feedback-changes">
              <Text className="formal-feedback-section-title">本次修改</Text>
              {changedKeys.map(key => <View className="formal-feedback-delta" key={key}><Text>{LABELS[key]}</Text><View><Text className="formal-feedback-delta__old">{baseline.fields[key] || "未填写"}</Text><Text className="formal-feedback-delta__arrow">→</Text><Text>{values[key] || "已清空"}</Text></View></View>)}
              {Object.entries(mediaProposal).map(([kind, ids]) => <View className="formal-feedback-delta" key={kind}><Text>{kind === "parking" ? "停车照片" : kind === "toilet" ? "洗手间照片" : "现场照片"}</Text><View><Text>{baseline.media[kind as ContributionMediaKind].length} 张</Text><Text className="formal-feedback-delta__arrow">→</Text><Text>{ids?.length ?? 0} 张</Text></View></View>)}
              {!hasChanges ? <Text className="formal-feedback-empty">尚未修改任何信息</Text> : null}
            </View>
            {activeConflicts.length ? <View className="formal-feedback-conflicts"><Text className="formal-feedback-section-title">资料冲突</Text><Text className="formal-feedback-empty">正式资料已从版本 {baseline.revision} 更新到版本 {currentBaseline?.revision ?? "—"}，请逐项选择。</Text>{activeConflicts.map(conflict => <Conflict key={`${conflict.kind}:${conflict.key}`} conflict={conflict} value={resolutions[`${conflict.kind}:${conflict.key}`]} onChange={value => setResolutions(current => ({ ...current, [`${conflict.kind}:${conflict.key}`]: value }))} />)}</View> : null}
            </>}
          />
        </>}
      </View>
    </ScrollView>
    <View className="formal-feedback-submit safe-bottom"><Button disabled={busy || uploading || submitted || !hasChanges} onClick={() => void submit()}>{busy ? "提交中…" : submitted ? "审核中" : "提交反馈"}</Button></View>
  </View>;
}

function Conflict({ conflict, value, onChange }: { conflict: ContributionFormalConflict; value: ContributionConflictResolution | undefined; onChange(value: ContributionConflictResolution): void }) {
  const display = (input: string | null | readonly string[]) => Array.isArray(input) ? (input.length ? input.join("、") : "无图片") : input || "未填写";
  return <View className="formal-feedback-conflict">
    <Text className="formal-feedback-conflict__label">{LABELS[conflict.key as ContributionFormalFieldKey] ?? conflict.key}</Text>
    <Text>原值：{display(conflict.baselineValue)}</Text><Text>当前：{display(conflict.currentValue)}</Text><Text>我的修改：{display(conflict.proposedValue)}</Text>
    <View><Button className={value === "CURRENT" ? "is-selected" : ""} onClick={() => onChange("CURRENT")}>使用当前资料</Button><Button className={value === "PROPOSED" ? "is-selected" : ""} onClick={() => onChange("PROPOSED")}>保留我的修改</Button></View>
  </View>;
}

function PhotoGroup({ kind, ids, uploads: allUploads, paths, disabled, onAdd, onRemove }: { kind: ContributionMediaKind; ids: readonly string[]; uploads: readonly ContributionFormalMediaUpload[]; paths: Record<string,string>; disabled: boolean; onAdd(kind: ContributionMediaKind): Promise<void>; onRemove(uploadId: string): Promise<void> }) {
  const label = kind === "parking" ? "停车" : kind === "toilet" ? "洗手间" : "现场";
  const uploads = new Map<string, ContributionFormalMediaUpload>(allUploads.filter(value => value.kind === kind).map(value => [value.uploadId, value]));
  return <View className="formal-feedback-photo-group">
    <View className="formal-feedback-photo-list">{ids.map(id => <View className="formal-feedback-photo" key={id}>{paths[id] ? <><Image src={paths[id]!} mode="aspectFill" /><Text className="formal-feedback-photo__red-label">{label}照片</Text></> : <Text>{uploads.has(id) ? "图片" : "原照片"}</Text>}<Button disabled={disabled} ariaLabel={`移除${label}照片`} onClick={() => void onRemove(id)}><Text className="formal-feedback-photo__remove-glyph">×</Text></Button></View>)}</View>
    <Button className="formal-feedback-photo-action" disabled={disabled || ids.length >= 3} onClick={() => void onAdd(kind)}>＋ 添加{label}照片</Button>
  </View>;
}
