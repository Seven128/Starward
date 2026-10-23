import type { PreferenceProfile } from "./index";

export interface PreferenceRuntimeStorage {
  kind: "sqlite" | "web-key-value";
  read(key: string): Promise<string | null>;
  /** Atomically replace exactly the value read, including an absent row. */
  compareAndSwap(key: string, expected: string | null, value: string): Promise<boolean>;
  close?(): Promise<void> | void;
}

export interface PreferenceBoundary { invoke(request: unknown): Promise<unknown> }
export interface PreferenceRuntimeInput {
  outcome: "mobile-shell-and-preferences";
  actorId: string;
  operation: "preference.save" | "preference.activate" | "shell.location.set" | "shell.destination.set";
  /** Caller nonce at preparation; the returned command contains the fenced key. */
  idempotencyKey: string;
  payload: Record<string, unknown>;
}
export interface PreferenceRuntimeRequest extends PreferenceRuntimeInput {
  /** Absent only for replay of a retained legacy receipt. */
  baseRevision?: number;
}
export interface PreferenceRuntimeRecord extends Omit<PreferenceRuntimeInput, "payload"> {
  entityId: string;
  inputDigest: string;
  stateVersion: number;
  result: Record<string, unknown>;
  committedAt: string;
}
export interface PreferenceLocation {
  source: "unset" | "device" | "manual";
  label: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number | null;
  timestampMs?: number;
  coordinateSystem?: "WGS84";
  mocked?: boolean;
}
export type PreferenceDestination = "tonight" | "map" | "trips" | "sky" | "me";
export interface PreferenceProjection {
  profiles: PreferenceProfile[];
  activeProfileId?: string;
  location?: PreferenceLocation;
  activeDestination?: PreferenceDestination;
  revision: number;
}
