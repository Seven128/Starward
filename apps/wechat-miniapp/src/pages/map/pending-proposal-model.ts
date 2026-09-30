import type { ContributionFormalFieldKey, ContributionSubmission, ContributionUploadId } from "@starward/miniapp-contracts";

function submittedField(submission: ContributionSubmission, key: ContributionFormalFieldKey) {
  return submission.candidateProfile?.fields[key]?.trim() || undefined;
}

function value(submission: ContributionSubmission, key: ContributionFormalFieldKey) {
  return submittedField(submission, key) ?? "暂无数据";
}

export function pendingProposalPanelValues(submission: ContributionSubmission) {
  const name = submittedField(submission, "name");
  const address = submittedField(submission, "address");
  const media = (["parking", "toilet", "site"] as const).flatMap((kind) =>
    (submission.candidateProfile?.media[kind] ?? []).map((uploadId) => ({
      uploadId: uploadId as ContributionUploadId,
      label: kind === "parking" ? "停车照片" : kind === "toilet" ? "洗手间照片" : "现场照片",
    })),
  );
  return {
    name: name ?? (submission.candidateLocation?.displayName.trim() || "未命名观星点"),
    address: address ?? (submission.candidateLocation?.region.trim() || "暂无数据"),
    opening: [value(submission, "openness"), value(submission, "hours")],
    access: [value(submission, "access"), submittedField(submission, "accessNote")],
    road: submittedField(submission, "road"),
    safety: value(submission, "safety"),
    facilities: [
      ["停车", value(submission, "parking"), submittedField(submission, "parkingNote")],
      ["洗手间", value(submission, "toilet"), submittedField(submission, "toiletNote")],
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
