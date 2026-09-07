/** Critically damped height trajectory. Units are logical px and milliseconds. */
export type PanelSpringFrame = { height: number; duration: number };
export function panelSpringFrames(input: {
  from: number; to: number; velocity: number; min: number; max: number; reducedMotion?: boolean;
}): PanelSpringFrame[] {
  const { from, to, velocity, min, max } = input;
  if (![from, to, velocity, min, max].every(Number.isFinite) || min > max) return [];
  const clamp = (height: number) => Math.max(min, Math.min(max, height));
  const start = clamp(from), target = clamp(to);
  if (input.reducedMotion) return [{ height: target, duration: 0 }];
  const omega = 0.024;
  const displacement = start - target;
  const initialVelocity = Math.max(-3, Math.min(3, velocity));
  const coefficient = initialVelocity + omega * displacement;
  const frames: PanelSpringFrame[] = [{ height: start, duration: 0 }];
  for (let elapsed = 16; elapsed <= 640; elapsed += 16) {
    const decay = Math.exp(-omega * elapsed);
    const offset = (displacement + coefficient * elapsed) * decay;
    const speed = (coefficient - omega * (displacement + coefficient * elapsed)) * decay;
    const settled = Math.abs(offset) < 0.25 && Math.abs(speed) < 0.005;
    frames.push({ height: settled || elapsed === 640 ? target : clamp(target + offset), duration: 16 });
    if (settled) break;
  }
  return frames;
}
