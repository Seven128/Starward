/** Logical-pixel motion shared by Mini Program sheets; consumers own anchors and gestures. */
export const ELASTIC_LIMIT = 72;

export function elasticPosition(raw: number, min: number, max: number): number {
  if (raw < min) { const distance = min - raw; return min - ELASTIC_LIMIT * distance / (ELASTIC_LIMIT + distance); }
  if (raw > max) { const distance = raw - max; return max + ELASTIC_LIMIT * distance / (ELASTIC_LIMIT + distance); }
  return raw;
}

export function elasticVelocityFactor(raw: number, min: number, max: number): number {
  const distance = raw < min ? min - raw : raw > max ? raw - max : 0;
  return (ELASTIC_LIMIT / (ELASTIC_LIMIT + distance)) ** 2;
}

export type ElasticFrame = { height: number; duration: number };

/** A mass-1, stiffness-420, damping-34 spring. Velocity is logical px/ms. */
export function elasticSpringFrames(input: {
  from: number; to: number; velocity: number; reducedMotion?: boolean;
}): ElasticFrame[] {
  const { from, to, velocity } = input;
  if (![from, to, velocity].every(Number.isFinite)) return [];
  if (input.reducedMotion) return [{ height: to, duration: 0 }];
  const frames: ElasticFrame[] = [{ height: from, duration: 0 }];
  let height = from;
  let speed = Math.max(-3, Math.min(3, velocity)) * 1000;
  for (let elapsed = 16; elapsed <= 640; elapsed += 16) {
    for (let step = 0; step < 4; step++) {
      const dt = 0.004;
      speed += (-420 * (height - to) - 34 * speed) * dt;
      height += speed * dt;
    }
    if (Math.abs(height - to) < 0.25 && Math.abs(speed) < 5) {
      frames.push({ height: to, duration: 16 });
      return frames;
    }
    frames.push({ height, duration: 16 });
  }
  frames.push({ height: to, duration: 10 });
  return frames;
}
