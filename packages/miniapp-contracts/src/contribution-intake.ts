import type { ContributionFormalProposal } from "./contribution-feedback.ts";

export const CANDIDATE_OPENNESS = ["OPEN", "CONDITIONAL", "CLOSED", "UNKNOWN"] as const;
export const CANDIDATE_LEGAL_ENTRY = ["PERMITTED", "CONDITIONAL", "PROHIBITED", "UNKNOWN"] as const;
export const CANDIDATE_NIGHT_SAFETY = ["NO_KNOWN_HAZARD", "CAUTION", "DANGER", "UNKNOWN"] as const;
export const CANDIDATE_CONTACT = ["PUBLIC_NUMBER", "NOT_APPLICABLE", "NO_PUBLIC_NUMBER", "UNKNOWN"] as const;

/** Contributor answers are intake evidence, never verified publication claims. */
export interface ContributionCandidateIntake {
  version: 1;
  openness: (typeof CANDIDATE_OPENNESS)[number] | null;
  legalEntry: (typeof CANDIDATE_LEGAL_ENTRY)[number] | null;
  nightSafety: (typeof CANDIDATE_NIGHT_SAFETY)[number] | null;
  contact: {
    kind: (typeof CANDIDATE_CONTACT)[number] | null;
    number: string;
    purpose: string;
    publicPermissionConfirmed: boolean;
    source: string;
    /** Preserved private legacy text; never projected as a public contact. */
    legacyNote?: string;
  };
}

/** Old profiles omit intake; reading them cannot invent answers or permission. */
export interface ContributionCandidateProfile extends ContributionFormalProposal {
  intake?: ContributionCandidateIntake;
}

export function emptyCandidateIntake(): ContributionCandidateIntake {
  return { version: 1, openness: null, legalEntry: null, nightSafety: null,
    contact: { kind: null, number: "", purpose: "", publicPermissionConfirmed: false, source: "" } };
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T | null {
  if (value === null) return null;
  if (typeof value !== "string" || !choices.includes(value as T)) throw new Error("contribution_candidate_intake_invalid");
  return value as T;
}
function text(value: unknown, maximum: number) {
  if (typeof value !== "string" || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))
    throw new Error("contribution_candidate_intake_invalid");
  return value.trim();
}
export function normalizeCandidateIntake(value: unknown): ContributionCandidateIntake {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("contribution_candidate_intake_invalid");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !raw.contact || typeof raw.contact !== "object" || Array.isArray(raw.contact))
    throw new Error("contribution_candidate_intake_invalid");
  const contact = raw.contact as Record<string, unknown>;
  if (typeof contact.publicPermissionConfirmed !== "boolean") throw new Error("contribution_candidate_intake_invalid");
  const kind = choice(contact.kind, CANDIDATE_CONTACT);
  const number = text(contact.number, 80), purpose = text(contact.purpose, 300), source = text(contact.source, 300);
  if (kind !== "PUBLIC_NUMBER" && (number || purpose || source || contact.publicPermissionConfirmed))
    throw new Error("contribution_candidate_contact_invalid");
  return { version: 1, openness: choice(raw.openness, CANDIDATE_OPENNESS), legalEntry: choice(raw.legalEntry, CANDIDATE_LEGAL_ENTRY),
    nightSafety: choice(raw.nightSafety, CANDIDATE_NIGHT_SAFETY), contact: {
      kind, number, purpose, publicPermissionConfirmed: contact.publicPermissionConfirmed, source,
      ...(contact.legacyNote === undefined ? {} : { legacyNote: text(contact.legacyNote, 300) }),
    } };
}

/** The legacy scalar projection has one authority when versioned intake exists. */
export function candidateIntakeFields(intake: ContributionCandidateIntake): Pick<ContributionFormalProposal, "fields">["fields"] {
  const fields: Partial<Record<"openness" | "access" | "contact", string>> = {};
  const openness = { OPEN: "开放", CONDITIONAL: "有条件开放", CLOSED: "不开放" };
  const access = { PERMITTED: "允许进入", CONDITIONAL: "需预约或其他条件", PROHIBITED: "禁止进入" };
  if (intake.openness !== null && intake.openness !== "UNKNOWN") fields.openness = openness[intake.openness];
  if (intake.legalEntry !== null && intake.legalEntry !== "UNKNOWN") fields.access = access[intake.legalEntry];
  const number = intake.contact.number.trim(), purpose = intake.contact.purpose.trim(), source = intake.contact.source.trim();
  if (intake.contact.kind === "PUBLIC_NUMBER" && intake.contact.publicPermissionConfirmed && number && purpose && source) {
    const contact = `${number}（${purpose}）`;
    if (contact.length > 300) throw new Error("contribution_candidate_contact_invalid");
    fields.contact = contact;
  }
  return fields;
}

export type CandidateIntakeIssue = "OPENNESS" | "LEGAL_ENTRY" | "ENTRY_CONDITIONS" | "NIGHT_SAFETY" | "SAFETY_DETAILS" |
  "GATE_CONTACT" | "CONTACT_NUMBER" | "CONTACT_PURPOSE" | "CONTACT_PERMISSION" | "CONTACT_SOURCE";

/** Drafts may be incomplete. Only a new submit requires explicit core answers. */
export function candidateIntakeIssues(profile: ContributionCandidateProfile): readonly CandidateIntakeIssue[] {
  const intake = profile.intake;
  if (!intake) return ["OPENNESS", "LEGAL_ENTRY", "NIGHT_SAFETY", "GATE_CONTACT"];
  const issues: CandidateIntakeIssue[] = [];
  if (intake.openness === null) issues.push("OPENNESS");
  if (intake.legalEntry === null) issues.push("LEGAL_ENTRY");
  if ((intake.openness === "CONDITIONAL" || intake.legalEntry === "CONDITIONAL") && !profile.fields.accessNote?.trim()) issues.push("ENTRY_CONDITIONS");
  if (intake.nightSafety === null) issues.push("NIGHT_SAFETY");
  if ((intake.nightSafety === "CAUTION" || intake.nightSafety === "DANGER") && !profile.fields.safety?.trim()) issues.push("SAFETY_DETAILS");
  if (intake.contact.kind === null) issues.push("GATE_CONTACT");
  if (intake.contact.kind === "PUBLIC_NUMBER") {
    if (!intake.contact.number.trim()) issues.push("CONTACT_NUMBER");
    if (!intake.contact.purpose.trim()) issues.push("CONTACT_PURPOSE");
    if (!intake.contact.publicPermissionConfirmed) issues.push("CONTACT_PERMISSION");
    if (!intake.contact.source.trim()) issues.push("CONTACT_SOURCE");
  }
  return issues;
}
