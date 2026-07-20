type Candidate = {
  id: string;
  sky: number;
  weather: number;
  access: number;
  safety: number;
  preference: number;
  confidence?: number;
  hardBlocker?: boolean;
  facilities?: boolean;
  roadClosure?: string;
};

export const RECOMMENDATION_POLICY_VERSION = "starward-five-factor@1";

const weights = {
  neutral: { sky: 0.35, target: 0.20, place: 0.15, travel: 0.15, confidence: 0.15 },
  beginner: { sky: 0.25, target: 0.10, place: 0.25, travel: 0.25, confidence: 0.15 },
  // Approved family/beginner profile: sky/target/place/travel/confidence 25/10/25/25/15.
  family: { sky: 0.25, target: 0.10, place: 0.25, travel: 0.25, confidence: 0.15 },
  // Approved astrophotography profile: 35/25/15/10/15.
  "milky-way": { sky: 0.35, target: 0.25, place: 0.15, travel: 0.10, confidence: 0.15 },
  visual: { sky: 0.40, target: 0.20, place: 0.20, travel: 0.05, confidence: 0.15 },
  camping: { sky: 0.25, target: 0.10, place: 0.30, travel: 0.20, confidence: 0.15 },
} as const;

export function evaluateRecommendation(input: { candidates: Candidate[]; profile: keyof typeof weights; learning?: { modelVersion: string; scores: Record<string, number> } }) {
  const selectedWeights = weights[input.profile] ?? weights.family;
  const candidates = input.candidates.map((candidate) => {
    const safetyBlocked = candidate.hardBlocker === true || candidate.roadClosure === "confirmed" || candidate.safety <= 0;
    const factors = {
      sky: (candidate.sky + candidate.weather) / 2,
      target: candidate.preference,
      place: candidate.safety,
      travel: candidate.access,
      confidence: candidate.confidence ?? 75,
    };
    const deterministic = Object.entries(selectedWeights).reduce((total, [key, weight]) => total + factors[key as keyof typeof factors] * weight, 0);
    const learningAdjustment = safetyBlocked ? 0 : (input.learning?.scores[candidate.id] ?? 0) * 3;
    return { ...candidate, factors, safetyBlocked, status: safetyBlocked ? "blocked" : "eligible", total: safetyBlocked ? 0 : deterministic + learningAdjustment };
  });
  const primary = [...candidates].filter((candidate) => !candidate.safetyBlocked).sort((left, right) => right.total - left.total)[0];
  return { policyVersion: RECOMMENDATION_POLICY_VERSION, primaryId: primary?.id ?? null, candidates, learning: input.learning ? { modelVersion: input.learning.modelVersion, overrodeSafety: false } : undefined };
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
