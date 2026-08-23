import Taro from "@tarojs/taro";
import type {
  ContributionDraftRequest,
  ContributionKind,
  ContributionSubmission,
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

export const STATE_LABEL: Record<ContributionSubmission["state"], string> = {
  DRAFT: "草稿",
  PENDING_REVIEW: "待审核",
  APPROVED: "已采纳",
  REJECTED: "未采纳",
};

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
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function localTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function buildDraftInput(
  values: ContributionFormValues,
  announce: ContributionAnnouncement,
): ContributionDraftRequest | null {
  const candidate = values.kind === "NEW_SPOT_PROPOSAL";
  const parsedLatitude = Number(values.latitude);
  const parsedLongitude = Number(values.longitude);
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
  const observed = new Date(`${values.date}T${values.time}:00+08:00`);
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
    observedAt:
      values.kind === "CORRECTION" || !Number.isFinite(observed.getTime())
        ? null
        : observed.toISOString(),
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
  return /\.png(?:$|\?)/iu.test(filePath)
    ? ("image/png" as const)
    : ("image/jpeg" as const);
}
