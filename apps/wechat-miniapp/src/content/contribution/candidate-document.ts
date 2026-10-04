import { candidateIntakeFields, emptyCandidateIntake, type CandidateIntakeIssue, type ContributionCandidateIntake, type ContributionCandidateProfile } from "@starward/miniapp-contracts";
import { spotDocumentProposal, type SpotDocumentValues } from "../spot-document";

/** Upgrade editable legacy input without guessing safety answers or permission to publish a phone. */
export function candidateIntakeFromProfile(profile: ContributionCandidateProfile | undefined): ContributionCandidateIntake {
  if (profile?.intake) return cloneIntake(profile.intake);
  const intake = emptyCandidateIntake();
  const openness = { "开放": "OPEN", "有条件开放": "CONDITIONAL", "不开放": "CLOSED" } as const;
  const access = { "允许进入": "PERMITTED", "需预约或其他条件": "CONDITIONAL", "禁止进入": "PROHIBITED" } as const;
  intake.openness = openness[profile?.fields.openness as keyof typeof openness] ?? null;
  intake.legalEntry = access[profile?.fields.access as keyof typeof access] ?? null;
  if (profile?.fields.contact?.trim()) intake.contact.legacyNote = profile.fields.contact;
  return intake;
}

/** One editable-document projection; server normalization separately rejects conflicting external input. */
export function candidateDocumentProposal(values: SpotDocumentValues, media: ContributionCandidateProfile["media"], intake: ContributionCandidateIntake): ContributionCandidateProfile {
  const proposal = spotDocumentProposal(values, media);
  const fields = { ...proposal.fields };
  delete fields.openness; delete fields.access; delete fields.contact;
  return { fields: { ...fields, ...candidateIntakeFields(intake) }, media, intake: cloneIntake(intake) };
}

function cloneIntake(intake: ContributionCandidateIntake): ContributionCandidateIntake {
  return { ...intake, contact: { ...intake.contact } };
}

export const CANDIDATE_INTAKE_OPTIONS = {
  openness: [["OPEN", "开放"], ["CONDITIONAL", "有条件开放"], ["CLOSED", "不开放"], ["UNKNOWN", "不清楚"]],
  legalEntry: [["PERMITTED", "允许进入"], ["CONDITIONAL", "需预约或许可"], ["PROHIBITED", "禁止进入"], ["UNKNOWN", "不清楚"]],
  nightSafety: [["NO_KNOWN_HAZARD", "未发现已知风险"], ["CAUTION", "需要注意"], ["DANGER", "有明显危险"], ["UNKNOWN", "不清楚"]],
  contact: [["PUBLIC_NUMBER", "有公开号码"], ["NOT_APPLICABLE", "无门禁或管理方"], ["NO_PUBLIC_NUMBER", "无公开号码"], ["UNKNOWN", "不清楚"]],
} as const;

export const CANDIDATE_INTAKE_ERRORS: Record<CandidateIntakeIssue, { field: string; message: string }> = {
  OPENNESS: { field: "openness", message: "请选择开放状态；不清楚可明确选择。" },
  LEGAL_ENTRY: { field: "access", message: "请选择进入规则；不清楚可明确选择。" },
  ENTRY_CONDITIONS: { field: "accessNote", message: "请补充预约、门禁或许可条件。" },
  NIGHT_SAFETY: { field: "nightSafety", message: "请选择夜间安全情况；不清楚可明确选择。" },
  SAFETY_DETAILS: { field: "safety", message: "请说明需要注意的风险或危险。" },
  GATE_CONTACT: { field: "contact", message: "请选择门禁或管理方的联系情况。" },
  CONTACT_NUMBER: { field: "contact-number", message: "请填写可公开的号码。" },
  CONTACT_PURPOSE: { field: "contact-purpose", message: "请说明号码用于什么咨询。" },
  CONTACT_PERMISSION: { field: "contact-permission", message: "请确认管理方允许公开此号码。" },
  CONTACT_SOURCE: { field: "contact-source", message: "请说明号码的公开出处。" },
};

/** Private owner record only; uses the supplied frozen profile and preserves all four contact meanings. */
export function candidateIntakeFacts(profile: ContributionCandidateProfile | undefined) {
  const intake = profile?.intake;
  if (!intake) return [];
  const label = (options: readonly (readonly [string, string])[], value: string | null) => options.find(([key]) => key === value)?.[1] ?? "未回答";
  return [
    { key: "openness-answer", label: "开放状态", value: label(CANDIDATE_INTAKE_OPTIONS.openness, intake.openness) },
    { key: "access-answer", label: "进入规则", value: label(CANDIDATE_INTAKE_OPTIONS.legalEntry, intake.legalEntry) },
    { key: "night-answer", label: "夜间安全情况", value: label(CANDIDATE_INTAKE_OPTIONS.nightSafety, intake.nightSafety) },
    { key: "contact-answer", label: "门禁或管理方联系", value: label(CANDIDATE_INTAKE_OPTIONS.contact, intake.contact.kind) },
    ...(intake.contact.kind === "PUBLIC_NUMBER" ? [
      { key: "contact-number", label: "公开号码", value: intake.contact.number },
      { key: "contact-purpose", label: "联系用途", value: intake.contact.purpose },
      { key: "contact-permission", label: "公开许可", value: intake.contact.publicPermissionConfirmed ? "已确认" : "未确认" },
      { key: "contact-source", label: "号码出处", value: intake.contact.source },
    ] : []),
    ...(intake.contact.legacyNote ? [{ key: "legacy-contact", label: "原联系说明（未作公开许可）", value: intake.contact.legacyNote }] : []),
  ];
}
