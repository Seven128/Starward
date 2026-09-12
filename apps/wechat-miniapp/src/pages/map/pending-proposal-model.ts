import type { ContributionFormalFieldKey, ContributionSubmission, ContributionUploadId } from "@starward/miniapp-contracts";

function value(submission: ContributionSubmission, key: ContributionFormalFieldKey) {
  return submission.candidateProfile?.fields[key]?.trim() || "暂无数据";
}

export function pendingProposalPanelValues(submission: ContributionSubmission) {
  const media = (["parking", "toilet", "site"] as const).flatMap((kind) =>
    (submission.candidateProfile?.media[kind] ?? []).map((uploadId) => ({
      uploadId: uploadId as ContributionUploadId,
      label: kind === "parking" ? "停车照片" : kind === "toilet" ? "洗手间照片" : "现场照片",
    })),
  );
  return {
    name: value(submission, "name") === "暂无数据"
      ? submission.candidateLocation?.displayName.trim() || "未命名观星点"
      : value(submission, "name"),
    address: value(submission, "address") === "暂无数据"
      ? submission.candidateLocation?.region.trim() || "暂无数据"
      : value(submission, "address"),
    opening: [value(submission, "openness"), value(submission, "hours")],
    access: [value(submission, "access"), value(submission, "accessNote")],
    road: value(submission, "road"),
    safety: value(submission, "safety"),
    facilities: [
      ["停车", value(submission, "parking"), value(submission, "parkingNote")],
      ["洗手间", value(submission, "toilet"), value(submission, "toiletNote")],
      ["观测平台", value(submission, "platform"), ""],
      ["通信与充电", value(submission, "signal"), ""],
    ] as const,
    site: [
      ["视野与遮挡", value(submission, "horizon")],
      ["现场灯光", value(submission, "light")],
      ["露营条件", value(submission, "camping")],
      ["场地联系", value(submission, "contact")],
    ] as const,
    detail: value(submission, "detail"),
    media,
  };
}
