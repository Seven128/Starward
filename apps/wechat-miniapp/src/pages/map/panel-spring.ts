import { elasticPosition, elasticSpringFrames, type ElasticFrame } from "@/components/elastic-motion";

export type PanelSpringFrame = ElasticFrame;
/** The large snap is the top stop; releasing there must not move the sheet down. */
export function panelDragHeight(raw: number, min: number, max: number): number {
  return Math.min(max, elasticPosition(raw, min, max));
}

export function panelSpringFrames(input: {
  from: number; to: number; velocity: number; min: number; max: number; reducedMotion?: boolean;
}): PanelSpringFrame[] {
  const { from, to, velocity, min, max } = input;
  if (![from, to, velocity, min, max].every(Number.isFinite) || min > max) return [];
  const target = Math.max(min, Math.min(max, to));
  if (Math.abs(from - target) < 0.5) return [{ height: target, duration: 0 }];
  const frames = elasticSpringFrames({ from, to: target, velocity,
    ...(input.reducedMotion === undefined ? {} : { reducedMotion: input.reducedMotion }) });
  // A boundary snap must not pass the stop and then recoil. Preserve the
  // release position (including the user's elastic pull), but constrain every
  // subsequent sample to the approach side of that boundary.
  return frames.map((frame, index) => {
    if (index === 0) return frame;
    const bounded = Math.max(min, Math.min(max, frame.height));
    return { ...frame, height: target === max && from > max ? Math.min(from, Math.max(target, frame.height))
      : target === min && from < min ? Math.max(from, Math.min(target, frame.height)) : bounded };
  });
}
