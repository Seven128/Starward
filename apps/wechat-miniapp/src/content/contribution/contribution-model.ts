import { calendarDateInTimezone, clockTimeInTimezone } from "../../utils/zoned-date";
import Taro from "@tarojs/taro";
import { parseCoordinateInput } from "./coordinate-input";
import { parseObservationInput } from "./observation-input";
import type {
  ContributionDraftRequest,
  ContributionKind,
  ContributionMergeState,
  ContributionPublicationImpact,
  ContributionSubmission,
  ContributionSubmissionState,
  ContributionStatusHistoryEntry,
  ContributionTopic,
} from "@starward/miniapp-contracts";

export const TOPICS: ReadonlyArray<{
  key: ContributionTopic;
  label: string;
}> = [
  { key: "LAST_ROAD", label: "末段道路" },
  { key: "PARKING", label: "停车" },
  { key: "FACILITIES", label: "设施" },
  { key: "OPENNESS", label: "开放情况" },
  { key: "LEGAL_ACCESS", label: "进入规则" },
  { key: "NIGHT_SAFETY", label: "夜间安全" },
  { key: "HORIZON", label: "地平遮挡" },
  { key: "SITE_MEDIA", label: "现场照片" },
  { key: "OTHER", label: "其他" },
];

export const KIND_LABEL: Record<ContributionKind, string> = {
  FIELD_REPORT: "现场反馈",
  CORRECTION: "资料纠错",
  NEW_SPOT_PROPOSAL: "新增地点建议",
};

export function contributionConflictFacts(submission: ContributionSubmission): string[] {
  const candidate = submission.candidateLocation;
  let observed = "未填写";
  if (submission.observedAt) {
    try {
      const date = new Date(submission.observedAt);
      observed = `${calendarDateInTimezone(date, "Asia/Shanghai")} ${clockTimeInTimezone(date, "Asia/Shanghai")}（北京时间）`;
    } catch { observed = "时间暂不可用"; }
  }
  return [
    `地点：${candidate?.displayName ?? submission.spotNameSnapshot ?? "正式地点名称暂不可用"}`,
    ...(candidate ? [`地区：${candidate.region}`, `坐标：${candidate.wgs84.latitude}，${candidate.wgs84.longitude}`] : []),
    `现场时间：${observed}`,
    `涉及事实：${submission.topics.map((topic) => TOPICS.find((item) => item.key === topic)?.label ?? "其他").join("、") || "未选择"}`,
    `图片权利：${submission.rightsConfirmed ? "已确认" : "未确认"}`,
    `精确坐标提交：${submission.preciseLocationConsent ? "已同意" : "未同意"}`,
    `媒体：${submission.media.length} 张`,
  ];
}

export const STATE_LABEL: Record<ContributionSubmissionState, string> = {
  DRAFT: "草稿",
  PENDING_REVIEW: "待审核",
  CHANGES_REQUESTED: "需补充",
  ACCEPTED: "已接收",
  REJECTED: "未采纳",
  WITHDRAWN: "已撤回",
};

export const MERGE_STATE_LABEL: Record<ContributionMergeState, string> = {
  NOT_STARTED: "尚未开始",
  READY: "准备合并",
  MERGED: "已合并",
  SUPERSEDED: "已被替代",
};

export const PUBLICATION_IMPACT_LABEL: Record<
  ContributionPublicationImpact,
  string
> = {
  NONE: "没有",
  CANDIDATE_UPDATED: "候选地点已更新",
  ACTIVE_REVISION_UPDATED: "正式地点资料已更新",
  SPOT_PUBLISHED: "正式地点已发布",
};

export type ContributionAxis = "SUBMISSION" | "MERGE" | "PUBLICATION";

export function contributionHistoryLabel(axis: ContributionAxis, state: string): string {
  const axes = {
    SUBMISSION: { label: "投稿审核", states: STATE_LABEL },
    MERGE: { label: "证据合并", states: MERGE_STATE_LABEL },
    PUBLICATION: { label: "公开影响", states: PUBLICATION_IMPACT_LABEL },
  };
  const entry = axes[axis];
  return `${entry.label}：${(entry.states as Record<string, string>)[state] ?? "状态待更新"}`;
}

export interface ContributionAxisPresentation {
  axis: ContributionAxis;
  label: string;
  code: string;
  value: string;
}

/**
 * The first API version only exposed `state`. Keep this fallback at the
 * presentation boundary so old cached records cannot be mistaken for a
 * second client-side status truth once the three axes are available.
 */
export function contributionSubmissionState(
  submission: ContributionSubmission,
): ContributionSubmissionState {
  const current = submission.submissionState;
  if (current) return current;
  switch (submission.state) {
    case "DRAFT":
      return "DRAFT";
    case "PENDING_REVIEW":
      return "PENDING_REVIEW";
    case "APPROVED":
      return "ACCEPTED";
    case "ACCEPTED":
      return "ACCEPTED";
    case "CHANGES_REQUESTED":
      return "CHANGES_REQUESTED";
    case "WITHDRAWN":
      return "WITHDRAWN";
    case "REJECTED":
      return "REJECTED";
    default:
      return "DRAFT";
  }
}

export function contributionAxisPresentation(
  submission: ContributionSubmission,
): readonly ContributionAxisPresentation[] {
  const submissionState = contributionSubmissionState(submission);
  const mergeState = submission.mergeState ?? "NOT_STARTED";
  const publicationImpact = submission.publicationImpact ?? "NONE";
  return [
    {
      axis: "SUBMISSION",
      label: "投稿审核",
      code: submissionState,
      value: STATE_LABEL[submissionState],
    },
    {
      axis: "MERGE",
      label: "证据合并",
      code: mergeState,
      value: MERGE_STATE_LABEL[mergeState],
    },
    {
      axis: "PUBLICATION",
      label: "公开影响",
      code: publicationImpact,
      value: PUBLICATION_IMPACT_LABEL[publicationImpact],
    },
  ];
}

export function contributionStatusHistory(
  submission: ContributionSubmission,
): readonly ContributionStatusHistoryEntry[] {
  return Array.isArray(submission.statusHistory)
    ? submission.statusHistory
    : [];
}

export function contributionNeedsMediaRecovery(
  submission: ContributionSubmission | null,
) {
  return Boolean(
    submission?.media.some(
      (media) => media.state === "PENDING" || media.state === "EXPIRED",
    ),
  );
}

export type ContributionAnnouncement = (
  tone: "error" | "warning" | "info" | "success",
  title: string,
  body: string,
) => void;

export interface ContributionFormValues {
  kind: ContributionKind;
  routeSpotId: string;
  hasFormalSpot: boolean;
  candidateName: string;
  candidateRegion: string;
  latitude: string;
  longitude: string;
  date: string;
  time: string;
  topics: ContributionTopic[];
  detail: string;
  rightsConfirmed: boolean;
  preciseLocationConsent: boolean;
}

export function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export function localToday() {
  return calendarDateInTimezone(new Date(), "Asia/Shanghai");
}

export function localTime() {
  return clockTimeInTimezone(new Date(), "Asia/Shanghai");
}

export function buildDraftInput(
  values: ContributionFormValues,
  announce: ContributionAnnouncement,
): ContributionDraftRequest | null {
  const candidate = values.kind === "NEW_SPOT_PROPOSAL";
  const parsedLatitude = parseCoordinateInput(values.latitude);
  const parsedLongitude = parseCoordinateInput(values.longitude);
  if (candidate && (!values.candidateName.trim() || !values.candidateRegion.trim())) {
    announce("error", "资料未保存", "请填写地点名称和地区；本页输入保持不变。");
    return null;
  }
  if (
    candidate &&
    (!Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      Math.abs(parsedLatitude) > 90 ||
      Math.abs(parsedLongitude) > 180 ||
      (parsedLatitude === 0 && parsedLongitude === 0))
  ) {
    announce("error", "资料未保存", "请填写有效的纬度和经度；不会后台持续定位。");
    return null;
  }
  if (!candidate && !values.hasFormalSpot) {
    announce("error", "缺少观星点", "请从正式观星点详情进入现场反馈或纠错。");
    return null;
  }
  const observed = parseObservationInput(values.date, values.time);
  if (values.kind !== "CORRECTION" && !observed) {
    announce("error", "资料未保存", "请填写有效的现场日期和时间（北京时间）；本页输入保持不变。");
    return null;
  }
  return {
    kind: values.kind,
    spotId: candidate ? null : values.routeSpotId,
    candidateLocation: candidate
      ? {
          displayName: values.candidateName.trim(),
          region: values.candidateRegion.trim(),
          wgs84: {
            system: "WGS84",
            latitude: parsedLatitude,
            longitude: parsedLongitude,
          },
        }
      : null,
    observedAt: values.kind === "CORRECTION" ? null : observed,
    topics: values.topics,
    detail: values.detail,
    rightsConfirmed: values.rightsConfirmed,
    preciseLocationConsent: candidate && values.preciseLocationConsent,
  };
}

export function readBase64(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    Taro.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success(result) {
        if (typeof result.data === "string") resolve(result.data);
        else reject(new Error("contribution_media_read_invalid"));
      },
      fail(error) {
        reject(new Error(error.errMsg || "contribution_media_read_failed"));
      },
    });
  });
}

export function mediaFileName(filePath: string) {
  return filePath.split(/[\\/]/u).pop() || "现场照片.jpg";
}

export function mediaMimeType(filePath: string) {
  if (/\.png(?:$|\?)/iu.test(filePath)) return "image/png" as const;
  if (/\.(?:jpe?g)(?:$|\?)/iu.test(filePath)) return "image/jpeg" as const;
  throw new Error("仅支持 JPEG 或 PNG 图片");
}
