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

export function useContributionForm() {
  const router = useRouter();
  const routeSpotId = safeParam(router.params.spotId);
  const routeSpotName = safeParam(router.params.spotName);
  const hasFormalSpot = routeSpotId.startsWith("spot:");
  const notify = useAppStore((state) => state.notify);
  const [draft, setDraft] = useState<ContributionSubmission | null>(null);
  const [kind, setKind] = useState<ContributionKind>(
    hasFormalSpot ? "FIELD_REPORT" : "NEW_SPOT_PROPOSAL",
  );
  const [topics, setTopics] = useState<ContributionTopic[]>(
    hasFormalSpot ? ["NIGHT_SAFETY"] : ["OTHER"],
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
      submissions.find(
        (item) =>
          item.state === "DRAFT" &&
          item.spotId === (hasFormalSpot ? routeSpotId : null) &&
          item.kind === kind,
      ) ?? null,
    [hasFormalSpot, kind, routeSpotId, submissions],
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
        routeSpotId,
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

  const applyDraft = (submission: ContributionSubmission) => {
    setDraft(submission);
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

  return {
    routeSpotId,
    routeSpotName,
    hasFormalSpot,
    draft,
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
    matchingDraft,
    pendingCount: submissions.filter((item) => item.state === "PENDING_REVIEW").length,
    mediaEnabled: capabilities.data?.data.mediaUpload.enabled ?? false,
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
  };
}

export type ContributionForm = ReturnType<typeof useContributionForm>;
