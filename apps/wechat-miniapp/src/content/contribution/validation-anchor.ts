export function contributionValidationAnchor(field: string | null): string {
  if (!field) return "";
  if (field === "contribution-spot-context") return "feedback-context";
  if (field === "contribution-media-upload") return "feedback-media";
  if (field === "contribution-topic-control" || field === "contribution-detail" || field === "contribution-observed-at") return "feedback-evidence";
  if (field.startsWith("contribution-candidate-") || field === "contribution-location-consent") return "feedback-location";
  return "feedback-context";
}
