export const fieldCapabilityNames = ["observation-pack", "parking-route", "backup-switch", "safety-session", "location-share", "offline-replay"] as const;
export type FieldCapability = typeof fieldCapabilityNames[number];
/** No native/file/provider capability has been supplied to this API composition. */
export interface FieldStatus {
  schemaVersion: "starward-field-v2";
  generatedAt: string;
  capabilities: Record<FieldCapability, "unavailable">;
}
