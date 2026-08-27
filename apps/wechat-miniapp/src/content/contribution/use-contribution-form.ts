import { useMemo, useState } from "react";
import { useRouter } from "@tarojs/taro";
import type {
  ContributionKind,
  ContributionSubmission,
  ContributionTopic,
} from "@starward/miniapp-contracts";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getCapabilities, getContributions } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import {
  buildDraftInput,
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
  const [draft, setDraft] = useState<ContributionSubmission | null>(null);
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
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const history = useResourceQuery({
    queryKey: ["contributions"],
    queryFn: (signal) => getContributions(signal),
    staleTime: 10_000,
  });
  const capabilities = useResourceQuery({
    queryKey: ["capabilities"],
    queryFn: (signal) => getCapabilities(signal),
    staleTime: 60_000,
  });
  const submissions = history.data?.data.submissions ?? [];
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

  const announce = (
    tone: "error" | "warning" | "info" | "success",
    title: string,
    body: string,
  ) =>
    notify({
      owner: "contribution",
      placement: "inline",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `contribution-${tone}-${title}-${body.slice(0, 48)}`,
    });

  const formInput = () =>
    buildDraftInput(
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

  const applyDraft = (
    submission: ContributionSubmission,
    nextPhase: ContributionPhase = "FORM",
  ) => {
    setDraft(submission);
    setBoundSpotId(submission.spotId ?? "");
    setBoundSpotName(submission.spotNameSnapshot ?? "");
    setKind(submission.kind);
    setTopics([...submission.topics]);
    setDetail(submission.detail);
    setRightsConfirmed(submission.rightsConfirmed);
    setPreciseLocationConsent(submission.preciseLocationConsent);
    if (submission.observedAt) {
      const observed = new Date(submission.observedAt);
      setDate(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(observed),
      );
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Shanghai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(observed),
      );
    }
    if (submission.candidateLocation) {
      setCandidateName(submission.candidateLocation.displayName);
      setCandidateRegion(submission.candidateLocation.region);
      setLatitude(String(submission.candidateLocation.wgs84.latitude));
      setLongitude(String(submission.candidateLocation.wgs84.longitude));
    }
    setPhase(nextPhase);
  };

  const selectKind = (nextKind: ContributionKind) => {
    setKind(nextKind);
    setDraft(null);
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
    routeSpotId: boundSpotId,
    routeSpotName: boundSpotName || initialSpotName,
    hasFormalSpot,
    draft,
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
    uploading,
    submitting,
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
    setPhase,
    setHistoryFilter,
    goToForm,
    goToUpload,
    goToHistory,
    goBackPhase,
  };
}

export type ContributionForm = ReturnType<typeof useContributionForm>;
