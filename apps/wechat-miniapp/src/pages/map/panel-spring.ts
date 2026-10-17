import { elasticPosition, elasticRawPosition, elasticSpringFrames, type ElasticFrame } from "@/components/elastic-motion";

export type PanelSpringFrame = ElasticFrame;
/** Small permits a bounded resisted pull; large never crosses the navigation stop. */
export function panelDragHeight(raw: number, min: number, max: number): number {
  return elasticPosition(Math.min(max, raw), min, max);
}

export function panelDragOriginHeight(visual: number, min: number, max: number): number {
  return elasticRawPosition(Math.min(max, visual), min, max);
}

export function panelSpringFrames(input: {
  from: number; to: number; velocity: number; min: number; max: number; reducedMotion?: boolean;
}): PanelSpringFrame[] {
  const { from, to, velocity, min, max } = input;
  if (![from, to, velocity, min, max].every(Number.isFinite) || min > max) return [];
  const target = Math.max(min, Math.min(max, to));
  if (Math.abs(from - target) < 0.5) return [{ height: target, duration: 0 }];
  const generate = (rate: number) => {
    // Scale velocity inversely with the solver clock: the visible initial
    // velocity remains the finger's release velocity when the clock accelerates.
    const frames = elasticSpringFrames({ from, to: target, velocity: Math.max(-3, Math.min(3, velocity)) / rate,
      ...(input.reducedMotion === undefined ? {} : { reducedMotion: input.reducedMotion }) });
    // A boundary snap must not pass the stop and then recoil. Preserve the
    // release position (including the user's elastic pull), but constrain every
    // subsequent sample to the approach side of that boundary.
    const boundedFrames = frames.map((frame, index) => {
      if (index === 0) return frame;
      // An elastic starting frame must approach any chosen anchor continuously,
      // even when release velocity projects past the nearest boundary anchor.
      const bounded = Math.max(Math.min(min, from), Math.min(Math.max(max, from), frame.height));
      return { ...frame, duration: frame.duration / rate, height: target === max && from > max ? Math.min(from, Math.max(target, frame.height))
        : target === min && from < min ? Math.max(from, Math.min(target, frame.height)) : bounded };
    });
    // A hard boundary can be reached long before the physical spring stops.
    // Retire its stationary tail; other anchors keep the whole trajectory within
    // the panel's adopted 280ms release limit without changing shared sheet physics.
    let end = boundedFrames.length - 1;
    while (end > 1 && boundedFrames[end - 1]!.height === target && boundedFrames[end]!.height === target) end--;
    const result = boundedFrames.slice(0, end + 1);
    return result;
  };
  const duration = (frames: readonly PanelSpringFrame[]) => frames.reduce((sum, frame) => sum + frame.duration, 0);
  let rate = 1, result = generate(rate);
  for (let attempt = 0; attempt < 3 && duration(result) > 280; attempt++) {
    rate *= duration(result) / 280;
    result = generate(rate);
  }
  // The shared solver's 650ms hard limit also bounds this exceptional path.
  return duration(result) > 280 ? generate(650 / 280) : result;
}
