export function explainExposurePlan(input: { deterministic: { iso: number; seconds: number; aperture: number; ruleVersion: string }; aiSuggestion?: unknown }) {
  return {
    settings: { iso: input.deterministic.iso, seconds: input.deterministic.seconds, aperture: input.deterministic.aperture },
    ruleVersion: input.deterministic.ruleVersion,
    aiRole: "explanation-only",
    explanation: "曝光参数来自确定性器材与天体运动规则；AI 仅解释风险与调整方向。",
    ignoredSuggestion: Boolean(input.aiSuggestion),
  };
}
