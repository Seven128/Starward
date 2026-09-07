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
import { currentDraftUserId, getCapabilities, getContributions } from "@/services/api-client";
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

export function useContributionForm() {
  const router = useRouter();
  const initialSpotId = safeParam(router.params.spotId);
  const initialSpotName = safeParam(router.params.spotName);
  const [boundSpotId, setBoundSpotId] = useState(initialSpotId);
  const [boundSpotName, setBoundSpotName] = useState(initialSpotName);
  const hasFormalSpot = boundSpotId.startsWith("spot:");
  const initialSelection = initialContributionSelection(hasFormalSpot);
  const notify = useAppStore((state) => state.notify);
  const notificationVisible = useRef(true);
  const hideNotifications = () => {
    notificationVisible.current = false;
    useAppStore.getState().clearNotifications("contribution");
  };
  useDidHide(hideNotifications);
  useDidShow(() => { notificationVisible.current = true; });
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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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

  const history = useContributionHistory();
  const capabilities = useResourceQuery({
    queryKey: ["capabilities"],
    queryFn: (signal) => getCapabilities(signal),
    staleTime: 60_000,
  });
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
      ),
    [boundSpotId, hasFormalSpot, kind, submissions],
  );

  const localDraft = useLocalContributionDraft({
    schema: 1, baseSubmissionId: draft?.submissionId ?? null, baseRevision: draft?.revision ?? null,
    spotId: boundSpotId, spotName: boundSpotName, kind, topics, date, time, detail,
    candidateName, candidateRegion, latitude, longitude, rightsConfirmed, preciseLocationConsent,
  }, initialSpotId, Boolean(pendingSubmission) || Boolean(draft && contributionSubmissionState(draft) !== "DRAFT"));

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
    if (kind === "NEW_SPOT_PROPOSAL") {
      if (!candidateName.trim()) {
        setValidationField("contribution-candidate-name");
        announce("error", "资料未保存", "请填写地点名称；本页输入保持不变。 ");
        return null;
      }
      if (!candidateRegion.trim()) {
        setValidationField("contribution-candidate-region");
        announce("error", "资料未保存", "请填写地区；本页输入保持不变。 ");
        return null;
      }
      const parsedLatitude = parseCoordinateInput(latitude);
      const parsedLongitude = parseCoordinateInput(longitude);
      const latitudeInvalid =
        !Number.isFinite(parsedLatitude) || Math.abs(parsedLatitude) > 90;
      const longitudeInvalid =
        !Number.isFinite(parsedLongitude) || Math.abs(parsedLongitude) > 180;
      if (
        latitudeInvalid ||
        longitudeInvalid ||
        (parsedLatitude === 0 && parsedLongitude === 0)
      ) {
        setValidationField(
          latitudeInvalid
            ? "contribution-candidate-latitude"
            : "contribution-candidate-longitude",
        );
        announce("error", "资料未保存", "请填写有效的纬度和经度；不会后台持续定位。 ");
        return null;
      }
    }
    if (kind !== "CORRECTION" && !parseObservationInput(date, time)) {
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
    if (submission.observedAt) {
      const observed = new Date(submission.observedAt);
      setDate(calendarDateInTimezone(observed, "Asia/Shanghai"));
      setTime(clockTimeInTimezone(observed, "Asia/Shanghai"));
    }
    if (submission.candidateLocation) {
      setCandidateName(submission.candidateLocation.displayName);
      setCandidateRegion(submission.candidateLocation.region);
      setLatitude(String(submission.candidateLocation.wgs84.latitude));
      setLongitude(String(submission.candidateLocation.wgs84.longitude));
    }
    setPhase(nextPhase);
  };

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
        if (!server || contributionSubmissionState(server) !== "DRAFT") {
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
      setLatitude(local.latitude); setLongitude(local.longitude);
      setRightsConfirmed(local.rightsConfirmed); setPreciseLocationConsent(local.preciseLocationConsent);
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
    localStorageError: localDraft.storageError,
    restoreLocalDraft,
    discardLocalDraft: localDraft.clear,
    inheritedSpot: initialSpotId.startsWith("spot:"),
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
    latitude,
    longitude,
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
    },
    selectKind,
    toggleTopic,
    setDate,
    setTime,
    setDetail,
    setRightsConfirmed,
    setPreciseLocationConsent,
    setCandidateName,
    setCandidateRegion,
    setLatitude,
    setLongitude,
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
