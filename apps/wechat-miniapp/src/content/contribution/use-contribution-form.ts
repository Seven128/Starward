import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { parseCoordinateInput } from "./coordinate-input";
import { parseObservationInput } from "./observation-input";
import { useEffect, useMemo, useRef, useState } from "react";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { clearContributionSubmitIntent, readContributionSubmitIntents } from "@/services/contribution-submit-retry";
import type {
  ContributionKind,
  ContributionSubmission,
  ContributionTopic,
} from "@starward/miniapp-contracts";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { currentDraftUserId, getCapabilities, getContributions, MiniappApiError } from "@/services/api-client";
import { useLocalContributionDraft } from "./use-local-draft";
import { useContributionHistory } from "@/hooks/use-contribution-history";
import { useAppStore } from "@/state/app-store";
import {
  buildDraftInput,
  contributionSubmissionState,
  localTime,
  localToday,
  safeParam,
} from "./contribution-model";
import {
  emptySpotDocumentValues,
  spotDocumentProposal,
  spotDocumentValuesFromProposal,
  type SpotDocumentValues,
} from "../spot-document";
import type { ContributionFormalFieldKey } from "@starward/miniapp-contracts";
import {
  contributionNeedsRecovery,
  countPendingContributions,
  currentContributionMedia,
  filterContributionHistory,
  findMatchingContributionDraft,
  initialContributionSelection,
  previousContributionPhase,
} from "./contribution-form-derived";

export type ContributionPhase = "TYPE" | "FORM" | "UPLOAD" | "HISTORY";
export type ContributionHistoryFilter =
  | "ALL"
  | "PENDING"
  | "CHANGES_REQUESTED";

export function useContributionForm(overrides: { forceNew?: boolean; requestedSubmissionId?: string; disableLocalPersistence?: boolean } = {}) {
  const router = useRouter();
  const initialSpotId = safeParam(router.params.spotId);
  const initialSpotName = safeParam(router.params.spotName);
  const requestedSubmissionId = overrides.requestedSubmissionId ?? safeParam(router.params.submissionId);
  const forceNew = overrides.forceNew ?? router.params.new === "1";
  const [boundSpotId, setBoundSpotId] = useState(initialSpotId);
  const [boundSpotName, setBoundSpotName] = useState(initialSpotName);
  const hasFormalSpot = boundSpotId.startsWith("spot:");
  const initialSelection = initialContributionSelection(hasFormalSpot);
  const notify = useAppStore((state) => state.notify);
  const accountOwnerId = useAppStore(state => state.accountOwnerId);
  const notificationVisible = useRef(true);
  const [pageVisible, setPageVisible] = useState(true);
  const hideNotifications = () => {
    notificationVisible.current = false;
    setPageVisible(false);
    useAppStore.getState().clearNotifications("contribution");
  };
  useDidHide(hideNotifications);
  useDidShow(() => { notificationVisible.current = true; setPageVisible(true); });
  useEffect(() => {
    notificationVisible.current = true;
    return hideNotifications;
  }, []);
  const [draft, setDraft] = useState<ContributionSubmission | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<ContributionSubmission | null>(null);
  const [conflictDraft, setConflictDraft] = useState<ContributionSubmission | null>(null);
  const [phase, setPhase] = useState<ContributionPhase>("TYPE");
  const [historyFilter, setHistoryFilter] =
    useState<ContributionHistoryFilter>("ALL");
  const [kind, setKind] = useState<ContributionKind>(initialSelection.kind);
  const [topics, setTopics] = useState<ContributionTopic[]>(
    initialSelection.topics,
  );
  const [date, setDate] = useState(localToday());
  const [time, setTime] = useState(localTime());
  const [detail, setDetail] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [preciseLocationConsent, setPreciseLocationConsent] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateRegion, setCandidateRegion] = useState("");
  const [candidatePlaceLabel, setCandidatePlaceLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [candidateSelectionVersion, setCandidateSelectionVersion] = useState(0);
  const [candidateFields, setCandidateFields] = useState<SpotDocumentValues>(emptySpotDocumentValues);
  const [candidateMedia, setCandidateMedia] = useState<NonNullable<ContributionSubmission["candidateProfile"]>["media"]>({});
  const [candidateMediaPreviews, setCandidateMediaPreviews] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationField, updateValidationField] = useState<string | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const setValidationField = (field: string | null) => {
    updateValidationField(field);
    if (field) setValidationAttempt((attempt) => attempt + 1);
  };

  const history = useContributionHistory(pageVisible);
  const capabilities = useResourceQuery({
    queryKey: ["capabilities"],
    queryFn: (signal) => getCapabilities(signal),
    staleTime: 60_000,
    enabled: pageVisible,
  });
  useEffect(() => {
    if (!pageVisible) return;
    const historyFailure = history.error ?? history.refreshError;
    const historyPermissionDenied = historyFailure instanceof MiniappApiError && historyFailure.code === "PERMISSION_DENIED";
    const failed = !historyPermissionDenied && (history.isError || history.refreshError || history.data?.dataState === "STALE_USABLE")
      ? ["投稿记录数据异常", "创建与反馈记录暂时无法更新，可在页面中重试。", "history"]
      : capabilities.isError || capabilities.refreshError || capabilities.data?.dataState === "STALE_USABLE"
        ? ["投稿能力数据异常", "投稿能力状态暂时无法更新，可在页面中重试。", "capabilities"]
        : null;
    if (!failed) return;
    notify({ owner: "contribution", placement: "floating", tone: "info",
      title: failed[0]!, body: failed[1]!, dedupeKey: `contribution-resource-failed:${failed[2]}` });
  }, [capabilities.data?.dataState, capabilities.isError, capabilities.refreshError,
    history.data?.dataState, history.error, history.isError, history.refreshError, notify, pageVisible]);
  const submissions = history.data?.data.submissions ?? [];
  const recoveryOwner = currentDraftUserId();
  const submissionRecovery = useMemo(() => {
    const owner = recoveryOwner;
    if (!owner) return { owner, intents: [], error: false };
    try { return { owner, intents: readContributionSubmitIntents(Taro, owner), error: false }; }
    catch { return { owner, intents: [], error: true }; }
  }, [history.data, pendingSubmission, recoveryOwner]);
  const matchingDraft = useMemo(
    () =>
      findMatchingContributionDraft(
        submissions,
        hasFormalSpot,
        boundSpotId,
        kind,
        requestedSubmissionId,
        forceNew,
      ),
    [boundSpotId, forceNew, hasFormalSpot, kind, requestedSubmissionId, submissions],
  );

  const localDraft = useLocalContributionDraft({
    schema: 1, baseSubmissionId: draft?.submissionId ?? null, baseRevision: draft?.revision ?? null,
    spotId: boundSpotId, spotName: boundSpotName, kind, topics, date, time, detail,
    candidateName, candidateRegion, latitude, longitude, rightsConfirmed, preciseLocationConsent,
    candidateProfile: spotDocumentProposal(candidateFields, candidateMedia),
  }, initialSpotId, Boolean(pendingSubmission) || Boolean(draft && !["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(contributionSubmissionState(draft))), !overrides.disableLocalPersistence);

  const ownerChanged = localDraft.owner !== null &&
    (accountOwnerId !== localDraft.owner || currentDraftUserId() !== localDraft.owner);

  const announce = (
    tone: "error" | "warning" | "info" | "success",
    title: string,
    body: string,
  ) => {
    if (!notificationVisible.current) return;
    notify({
      owner: "contribution",
      placement: tone === "error" || tone === "warning" ? "floating" : "inline",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `contribution-${tone}-${title}-${body.slice(0, 48)}`,
    });
  };

  const formInput = () => {
    setValidationField(null);
    if (!hasFormalSpot && kind !== "NEW_SPOT_PROPOSAL") {
      setValidationField("contribution-spot-context");
      announce("error", "缺少观星点", "请搜索并选择正式观星点，或改选新地点。 ");
      return null;
    }
    if (kind !== "CORRECTION" && kind !== "NEW_SPOT_PROPOSAL" && !parseObservationInput(date, time)) {
      setValidationField("contribution-observed-at");
      announce("error", "资料未保存", "请填写有效的现场日期和时间（北京时间）；本页输入保持不变。");
      return null;
    }
    return buildDraftInput(
      {
        kind,
        routeSpotId: boundSpotId,
        hasFormalSpot,
        candidateName,
        candidateRegion,
        latitude,
        longitude,
        date,
        time,
        topics,
        detail,
        rightsConfirmed,
        preciseLocationConsent,
        candidateProfile: spotDocumentProposal(candidateFields, candidateMedia),
      },
      announce,
    );
  };

  const applyDraft = (
    submission: ContributionSubmission,
    nextPhase: ContributionPhase = "FORM",
  ) => {
    localDraft.markSaved({
      schema: 1, baseSubmissionId: submission.submissionId, baseRevision: submission.revision,
      spotId: submission.spotId ?? "", spotName: submission.spotNameSnapshot ?? "",
      kind: submission.kind, topics: [...submission.topics],
      date: submission.observedAt ? calendarDateInTimezone(new Date(submission.observedAt), "Asia/Shanghai") : date,
      time: submission.observedAt ? clockTimeInTimezone(new Date(submission.observedAt), "Asia/Shanghai") : time,
      detail: submission.detail,
      candidateName: submission.candidateLocation?.displayName ?? candidateName,
      candidateRegion: submission.candidateLocation?.region ?? candidateRegion,
      latitude: submission.candidateLocation ? String(submission.candidateLocation.wgs84.latitude) : latitude,
      longitude: submission.candidateLocation ? String(submission.candidateLocation.wgs84.longitude) : longitude,
      rightsConfirmed: submission.rightsConfirmed, preciseLocationConsent: submission.preciseLocationConsent,
      ...(submission.candidateProfile ? { candidateProfile: submission.candidateProfile } : {}),
    });
    setDraft(submission);
    setPendingSubmission(null);
    setConflictDraft(null);
    setBoundSpotId(submission.spotId ?? "");
    setBoundSpotName(submission.spotNameSnapshot ?? "");
    setKind(submission.kind);
    setTopics([...submission.topics]);
    setDetail(submission.detail);
    setRightsConfirmed(submission.rightsConfirmed);
    setPreciseLocationConsent(submission.preciseLocationConsent);
    const nextCandidateFields = spotDocumentValuesFromProposal(submission.candidateProfile);
    if (!nextCandidateFields.name && submission.candidateLocation?.displayName)
      nextCandidateFields.name = submission.candidateLocation.displayName;
    if (!nextCandidateFields.address && submission.candidateLocation?.region)
      nextCandidateFields.address = submission.candidateLocation.region;
    setCandidateFields(nextCandidateFields);
    setCandidateMedia(submission.candidateProfile?.media ?? {});
    setCandidateMediaPreviews({});
    if (submission.observedAt) {
      const observed = new Date(submission.observedAt);
      setDate(calendarDateInTimezone(observed, "Asia/Shanghai"));
      setTime(clockTimeInTimezone(observed, "Asia/Shanghai"));
    }
    if (submission.candidateLocation) {
      setCandidateName(submission.candidateLocation.displayName);
      setCandidateRegion(submission.candidateLocation.region);
      setCandidatePlaceLabel(submission.candidateLocation.displayName);
      setLatitude(String(submission.candidateLocation.wgs84.latitude));
      setLongitude(String(submission.candidateLocation.wgs84.longitude));
    }
    setPhase(nextPhase);
  };

  const appliedRequestedDraft = useRef("");
  useEffect(() => {
    if (!requestedSubmissionId || !matchingDraft || draft || localDraft.recovery) return;
    if (appliedRequestedDraft.current === matchingDraft.submissionId) return;
    appliedRequestedDraft.current = matchingDraft.submissionId;
    applyDraft(matchingDraft);
  }, [draft, localDraft.recovery, matchingDraft, requestedSubmissionId]);

  const restoreLocalDraft = async () => {
    const local = localDraft.recovery;
    const owner = localDraft.owner;
    if (!local || !owner || commandBusy || currentDraftUserId() !== owner) return;
    setCommandBusy(true);
    try {
      let server: ContributionSubmission | null = null;
      if (local.baseSubmissionId) {
        const response = await getContributions(undefined, owner);
        server = response.data.submissions.find((item) => item.submissionId === local.baseSubmissionId) ?? null;
        if (!server || !["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(contributionSubmissionState(server))) {
          announce("warning", "请先核对投稿状态", "对应草稿已提交或不再可编辑。本机输入仍保留，请先查看近期反馈。");
          return;
        }
      }
      if (currentDraftUserId() !== owner) return;
      setDraft(server ? { ...server, revision: local.baseRevision! } : null);
      setConflictDraft(server && server.revision !== local.baseRevision ? server : null);
      setBoundSpotId(local.spotId); setBoundSpotName(local.spotName);
      setKind(local.kind); setTopics(local.topics); setDate(local.date); setTime(local.time);
      setDetail(local.detail); setCandidateName(local.candidateName); setCandidateRegion(local.candidateRegion);
      setCandidatePlaceLabel(local.candidateName);
      setLatitude(local.latitude); setLongitude(local.longitude);
      setRightsConfirmed(local.rightsConfirmed); setPreciseLocationConsent(local.preciseLocationConsent);
      const restoredCandidateFields = spotDocumentValuesFromProposal(local.candidateProfile);
      if (!restoredCandidateFields.name) restoredCandidateFields.name = local.candidateName;
      if (!restoredCandidateFields.address) restoredCandidateFields.address = local.candidateRegion;
      setCandidateFields(restoredCandidateFields);
      setCandidateMedia(local.candidateProfile?.media ?? {});
      setPhase("FORM"); localDraft.accept();
      announce("info", "已恢复本机输入", "尚未自动保存到服务端或提交审核，请核对后继续。");
    } catch {
      announce("warning", "暂时无法恢复草稿", "无法核对服务端记录，本机输入仍保留，恢复网络后可重试。");
    } finally { setCommandBusy(false); }
  };

  const selectKind = (nextKind: ContributionKind) => {
    setKind(nextKind);
    setDraft(null);
  };
  const restorePendingSubmission = async (submissionId: string, expectedRevision: number) => {
    const owner = submissionRecovery.owner;
    if (!owner || currentDraftUserId() !== owner || commandBusy || localDraft.recovery) return;
    setCommandBusy(true);
    try {
      const response = await getContributions(undefined, owner);
      if (currentDraftUserId() !== owner) return;
      const current = response.data.submissions.find((item) => item.submissionId === submissionId);
      if (!current) throw new Error("Missing submission");
      applyDraft(current, contributionSubmissionState(current) === "DRAFT" ? "FORM" : "HISTORY");
      if (contributionSubmissionState(current) === "DRAFT") {
        setPendingSubmission({ ...current, revision: expectedRevision });
        announce("info", "已找回上次提交", "请确认上次提交结果；将沿用原提交记录，不会重新保存草稿。");
      } else {
        try { clearContributionSubmitIntent(Taro, owner, submissionId, expectedRevision); } catch { /* Keep the server receipt authoritative. */ }
        await history.refetch().catch(() => undefined);
        announce("info", "已回读提交状态", "服务端已有审核状态，未重新提交。请查看近期反馈。");
      }
    } catch {
      announce("warning", "暂时无法确认提交", "无法核对服务端记录，恢复标识仍保留。请稍后重试。");
    } finally { setCommandBusy(false); }
  };
  const toggleTopic = (topic: ContributionTopic) =>
    setTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic],
    );

  const currentMedia = currentContributionMedia(draft, matchingDraft);
  const visibleSubmissions = filterContributionHistory(
    submissions,
    historyFilter,
  );
  const goToForm = () => setPhase("FORM");
  const goToUpload = () => setPhase("UPLOAD");
  const goToHistory = () => setPhase("HISTORY");
  const goBackPhase = () => setPhase(previousContributionPhase);

  return {
    submissionRecovery,
    restorePendingSubmission,
    localRecovery: localDraft.recovery,
    ownerChanged,
    hasUnsavedChanges: !ownerChanged && localDraft.hasUnsavedChanges,
    localStorageError: localDraft.storageError,
    restoreLocalDraft,
    discardLocalDraft: localDraft.clear,
    inheritedSpot: initialSpotId.startsWith("spot:"),
    forceNew,
    requestedSubmissionId,
    routeSpotId: boundSpotId,
    routeSpotName: boundSpotName,
    setRouteSpotId: setBoundSpotId,
    setRouteSpotName: setBoundSpotName,
    hasFormalSpot,
    draft,
    pendingSubmission,
    setPendingSubmission,
    conflictDraft,
    setConflictDraft,
    keepConflictInput: () => {
      if (!conflictDraft || commandBusy || contributionSubmissionState(conflictDraft) !== "DRAFT") return;
      setDraft(conflictDraft);
      setConflictDraft(null);
    },
    phase,
    historyFilter,
    kind,
    topics,
    date,
    time,
    detail,
    rightsConfirmed,
    preciseLocationConsent,
    candidateName,
    candidateRegion,
    candidatePlaceLabel,
    latitude,
    longitude,
    candidateSelectionVersion,
    candidateFields,
    candidateMedia,
    candidateMediaPreviews,
    saving,
    commandBusy: commandBusy || Boolean(pendingSubmission) || Boolean(localDraft.recovery),
    submissionCommandBusy: commandBusy,
    setCommandBusy,
    uploading,
    submitting,
    validationField,
    validationAttempt,
    history,
    capabilities,
    submissions,
    visibleSubmissions,
    matchingDraft,
    pendingCount: countPendingContributions(submissions),
    mediaEnabled: capabilities.data?.data.mediaUpload.enabled ?? false,
    currentMedia,
    mediaNeedsRecovery: contributionNeedsRecovery(draft, matchingDraft),
    announce,
    formInput,
    applyDraft,
    resumeDraft: (submission: ContributionSubmission) => {
      if (localDraft.hasUnsavedChanges || localDraft.recovery) {
        announce("warning", "请先处理当前编辑", "当前有未保存内容，请先保存或处理本机恢复内容，再打开历史草稿。");
        return false;
      }
      applyDraft(submission);
      return true;
    },
    applyMediaDraft: (submission: ContributionSubmission) => {
      localDraft.advanceSavedRevision(submission.submissionId, submission.revision);
      setDraft(submission);
      setCandidateMedia(submission.candidateProfile?.media ?? {});
    },
    selectKind,
    toggleTopic,
    setDate,
    setTime,
    setDetail,
    setRightsConfirmed,
    setPreciseLocationConsent,
    setCandidateName: (value: string) => {
      setCandidateName(value);
      setCandidateFields((current) => ({ ...current, name: value }));
    },
    setCandidateRegion: (value: string) => {
      setCandidateRegion(value);
      setCandidateFields((current) => ({ ...current, address: value }));
    },
    setCandidateField: (key: ContributionFormalFieldKey, value: string) => {
      setCandidateFields((current) => ({ ...current, [key]: value }));
      if (key === "name") setCandidateName(value);
      if (key === "address") setCandidateRegion(value);
    },
    setCandidateMediaPreview: (uploadId: string, path: string) =>
      setCandidateMediaPreviews((current) => ({ ...current, [uploadId]: path })),
    removeCandidateMediaPreview: (uploadId: string) =>
      setCandidateMediaPreviews((current) => {
        const next = { ...current };
        delete next[uploadId];
        return next;
      }),
    setLatitude,
    setLongitude,
    selectCandidateLocation: (selection: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    }) => {
      const suggestedName = selection.name.trim();
      const suggestedAddress = selection.address.trim();
      setCandidatePlaceLabel(suggestedName || suggestedAddress || `${selection.latitude.toFixed(4)}, ${selection.longitude.toFixed(4)}`);
      if (suggestedName) setCandidateName((current) => current.trim() ? current : suggestedName);
      setCandidateRegion(suggestedAddress);
      setCandidateFields((current) => ({
        ...current,
        name: current.name.trim() ? current.name : suggestedName,
        address: suggestedAddress,
      }));
      setLatitude(selection.latitude.toFixed(6));
      setLongitude(selection.longitude.toFixed(6));
      setCandidateSelectionVersion((version) => version + 1);
    },
    setSaving,
    setUploading,
    setSubmitting,
    setValidationField,
    setPhase,
    setHistoryFilter,
    goToForm,
    goToUpload,
    goToHistory,
    goBackPhase,
  };
}

export type ContributionForm = ReturnType<typeof useContributionForm>;
