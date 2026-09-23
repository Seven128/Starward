import { elasticSpringFrames, type ElasticFrame } from "@/components/elastic-motion";

export type PanelSpringFrame = ElasticFrame;
export function panelSpringFrames(input: {
  from: number; to: number; velocity: number; min: number; max: number; reducedMotion?: boolean;
}): PanelSpringFrame[] {
  const { from, to, velocity, min, max } = input;
  if (![from, to, velocity, min, max].every(Number.isFinite) || min > max) return [];
  return elasticSpringFrames({ from, to: Math.max(min, Math.min(max, to)), velocity,
    ...(input.reducedMotion === undefined ? {} : { reducedMotion: input.reducedMotion }) });
}
