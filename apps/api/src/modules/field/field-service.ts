import type { FieldStatus } from "../../../../../packages/domain/src/offline/field-status";

/** Capability availability only; no made-up pack, device permission or mutable UI mode. */
export class FieldService {
  constructor(private readonly now = () => new Date().toISOString()) {}
  get(): FieldStatus {
    return { schemaVersion: "starward-field-v2", generatedAt: this.now(), capabilities: {
      "observation-pack": "unavailable", "parking-route": "unavailable", "backup-switch": "unavailable",
      "safety-session": "unavailable", "location-share": "unavailable", "offline-replay": "unavailable",
    } };
  }
}
