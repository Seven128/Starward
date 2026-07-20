export { FieldScreen } from "./FieldScreen";
export { activatePackFiles, enqueueOfflineWrite, loadReplayQueue, openOfflineDatabase, provisionPackEncryptionKey, revokePackEncryptionKey, savePackManifest } from "../../data/offline/offline-storage";

export const fieldCapabilityBoundary = Object.freeze({
  offline: ["verified-pack", "map-snapshot", "parking", "sky-orientation", "shooting", "checklist", "draft-report", "backup-switch"],
  networkRequired: ["fresh-weather", "active-alerts", "live-road-status", "external-delivery-receipt"],
  backgroundLocation: { default: "off", activation: "explicit-safety-session", autoStop: true, deliveryGuarantee: false },
  storage: { structured: "expo-sqlite-wal", files: "expo-file-system", smallSecrets: "expo-secure-store" },
});
