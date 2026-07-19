type Candidate = {
  id: string;
  sky: number;
  weather: number;
  access: number;
  safety: number;
  preference: number;
  facilities?: boolean;
  roadClosure?: string;
};

const weights = {
  family: { sky: 0.1, weather: 0.15, access: 0.35, safety: 0.25, preference: 0.15 },
  "milky-way": { sky: 0.4, weather: 0.2, access: 0.1, safety: 0.1, preference: 0.2 },
} as const;

export function evaluateRecommendation(input: { candidates: Candidate[]; profile: keyof typeof weights; learning?: { modelVersion: string; scores: Record<string, number> } }) {
  const selectedWeights = weights[input.profile] ?? weights.family;
  const candidates = input.candidates.map((candidate) => {
    const safetyBlocked = candidate.roadClosure === "confirmed" || candidate.safety <= 0;
    const factors = { sky: candidate.sky, weather: candidate.weather, access: candidate.access, safety: candidate.safety, preference: candidate.preference };
    const deterministic = Object.entries(selectedWeights).reduce((total, [key, weight]) => total + factors[key as keyof typeof factors] * weight, 0);
    const learningAdjustment = safetyBlocked ? 0 : (input.learning?.scores[candidate.id] ?? 0) * 3;
    return { ...candidate, factors, safetyBlocked, status: safetyBlocked ? "blocked" : "eligible", total: safetyBlocked ? 0 : deterministic + learningAdjustment };
  });
  const primary = [...candidates].filter((candidate) => !candidate.safetyBlocked).sort((left, right) => right.total - left.total)[0];
  return { primaryId: primary?.id ?? null, candidates, learning: input.learning ? { modelVersion: input.learning.modelVersion, overrodeSafety: false } : undefined };
}

export function selectContinuousWindow(input: { cadenceMinutes: number; samples: Array<{ at: string; eligible: boolean }> }) {
  let best: Array<{ at: string; eligible: boolean }> = [];
  let current: Array<{ at: string; eligible: boolean }> = [];
  for (const sample of input.samples) {
    if (sample.eligible) current.push(sample);
    else { if (current.length > best.length) best = current; current = []; }
  }
  if (current.length > best.length) best = current;
  const start = best[0]?.at ?? null;
  const end = best.length ? new Date(new Date(best[best.length - 1].at).getTime() + input.cadenceMinutes * 60_000).toISOString().replace(".000Z", "Z") : null;
  return { start, end, cadenceMinutes: input.cadenceMinutes, sampleCount: best.length };
}

export function buildNightReport(input: { recommendation: { total: number; factors: Record<string, number>; blockers: string[]; confidence: number }; window: { start: string; end: string }; provenance: unknown[] }) {
  const ranked = Object.entries(input.recommendation.factors).sort((left, right) => right[1] - left[1]);
  return {
    summary: input.recommendation.blockers.length ? "当前存在安全或可达性阻断" : `观星条件综合评估 ${input.recommendation.total} 分`,
    window: input.window,
    reasons: ranked.slice(0, 3).map(([factor, value]) => ({ factor, value })),
    factorBreakdown: input.recommendation.factors,
    blockers: input.recommendation.blockers,
    confidence: input.recommendation.confidence,
    provenance: input.provenance,
  };
}
