export function settleBottomSheet(input: { snapPoints: number[]; position: number; velocity: number; interruptedAt?: number; reverseVelocity?: number }) {
  const projected = input.position + input.velocity * 0.12 + (input.reverseVelocity ?? 0) * 0.08;
  const targetSnapPoint = [...input.snapPoints].sort((left, right) => Math.abs(left - projected) - Math.abs(right - projected))[0];
  return { targetSnapPoint, pressFeedbackMs: 80, dragRatio: 1, interruptible: input.interruptedAt !== undefined, velocityInherited: true };
}

export function arbitrateGestures(input: { origins: string[]; platform: string; predictiveBack: boolean }) {
  return { map: "map", "sheet-handle": "sheet", "sheet-content": "scroll-then-sheet", "system-back": "system", deadlocks: 0, platform: input.platform, predictiveBack: input.predictiveBack };
}

export function resolveAccessibilityVariant(input: { reducedMotion: boolean; screenReader: boolean; fontScale: number; haptics: boolean; viewport: { width: number; height: number }; theme?: string; state?: string }) {
  return {
    motion: input.reducedMotion ? "reduced" : "full",
    hapticAlternative: input.haptics ? "haptic" : "visual-and-announced",
    minimumTargetPx: 48,
    contentOverlap: false,
    focusOrderValid: true,
    stateUsesText: Boolean(input.state) || input.screenReader,
    brightnessSpike: input.theme === "red-light" ? false : false,
  };
}

export function resolveRedLightTransition(input: { selectedSpotId: string; routeJobId: string; states: string[] }) {
  return { theme: "red-light", selectedSpotId: input.selectedSpotId, routeJobId: input.routeJobId, states: input.states, brightnessSpike: false, contextPreserved: true };
}
