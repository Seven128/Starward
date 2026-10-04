import type { ContributionMediaKind } from "@starward/miniapp-contracts";

export function contributionValidationAnchor(field: string | null, candidateMedia?: readonly { kind?: ContributionMediaKind; state: string }[]): string {
  if (!field) return "";
  if (field.startsWith("contribution-intake-")) return field.startsWith("contribution-intake-contact") ? "formal-feedback-facilities" : "formal-feedback-access";
  if (field === "contribution-spot-context") return "feedback-context";
  if (field === "contribution-media-upload") {
    if (!candidateMedia) return "feedback-media";
    const unfinished = candidateMedia.find(item => item.state === "PENDING" || item.state === "EXPIRED");
    return unfinished ? `contribution-media-${unfinished.kind ?? "site"}` : "feedback-location";
  }
  if (field === "contribution-topic-control" || field === "contribution-detail" || field === "contribution-observed-at") return "feedback-evidence";
  if (field.startsWith("contribution-candidate-") || field === "contribution-location-consent") return "feedback-location";
  return "feedback-context";
}
