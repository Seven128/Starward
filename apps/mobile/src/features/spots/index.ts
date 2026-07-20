export function presentSpotFact(input: { state: "known" | "unknown" | "temporary-unavailable" | "conflict"; value: unknown }) {
  if (input.state === "conflict") return { label: "资料冲突", usable: false, requiresReview: true };
  if (input.state === "temporary-unavailable") return { label: "临时不可用", usable: false, requiresReview: true };
  if (input.state === "unknown") return { label: "未知", usable: false, requiresReview: true };
  return { label: input.value === null ? "未知" : String(input.value), usable: input.value !== null, requiresReview: false };
}

export function safetyOverridesRecommendation(input: { status: "open" | "caution" | "closed"; safetyConservative: boolean; score: number | null }) {
  const blocked = input.status === "closed" || input.safetyConservative;
  return { blocked, scoreVisible: !blocked && input.score !== null, disposition: blocked ? "do-not-navigate" : input.status === "caution" ? "verify-before-departure" : "eligible" };
}
