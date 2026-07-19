export interface MapPort {
  openCoordinate(input: { latitude: number; longitude: number; coordinateSystem: "GCJ-02" }): Promise<void>;
}

export interface OrientationPort {
  availability(): Promise<"available" | "degraded" | "unsupported">;
}

export interface BrightnessPort {
  enterFieldMode(): Promise<{ previousLevel: number; applied: boolean }>;
  restore(previousLevel: number): Promise<void>;
}

export const nativeCapabilityBoundary = {
  maps: "platform-specific Expo native view",
  orientation: "platform-specific sensor adapter",
  ar: "optional custom Expo module with universal-sky fallback",
  brightness: "platform-specific, explicit user action only",
} as const;
