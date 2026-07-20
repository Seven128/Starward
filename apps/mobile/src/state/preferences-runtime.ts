import { createPreferencesRuntime, type PreferenceRuntimeRecord } from "@starward/domain/preferences/runtime";
import * as Crypto from "expo-crypto";
import type { PreferenceProfile } from "@starward/domain/preferences";
import type { LocationSource, PrimaryDestination } from "./shell-store";
import { createPreferenceStorage } from "./preferences-storage";

const ACTOR_ID = "personal-trial-owner";

async function digest(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

let runtimePromise: ReturnType<typeof createPreferencesRuntime> | null = null;

function runtime() {
  runtimePromise ??= (async () => createPreferencesRuntime({
    storage: await createPreferenceStorage(),
    digest,
    releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false },
  }))();
  return runtimePromise;
}

function key(prefix: string): string {
  return `${prefix}:${Crypto.randomUUID()}`;
}

export async function persistPreferenceProfile(profile: PreferenceProfile) {
  return (await runtime()).execute({
    outcome: "mobile-shell-and-preferences",
    actorId: ACTOR_ID,
    operation: "preference.save",
    idempotencyKey: `preference:${profile.id}:${profile.revision}`,
    payload: { token: profile.name, profile },
  });
}

export async function persistActiveProfile(profileId: string) {
  return (await runtime()).execute({
    outcome: "mobile-shell-and-preferences",
    actorId: ACTOR_ID,
    operation: "preference.activate",
    idempotencyKey: key(`activate:${profileId}`),
    payload: { token: profileId, profileId },
  });
}

export async function persistShellLocation(location: { source: LocationSource; label: string; latitude?: number; longitude?: number }) {
  return (await runtime()).execute({
    outcome: "mobile-shell-and-preferences",
    actorId: ACTOR_ID,
    operation: "shell.location.set",
    idempotencyKey: key(`location:${location.source}`),
    payload: { token: location.label, ...location },
  });
}

export async function persistShellDestination(destination: PrimaryDestination) {
  return (await runtime()).execute({
    outcome: "mobile-shell-and-preferences",
    actorId: ACTOR_ID,
    operation: "shell.destination.set",
    idempotencyKey: key(`destination:${destination}`),
    payload: { token: destination, destination },
  });
}

export interface HydratedPreferenceRuntimeState {
  profiles: PreferenceProfile[];
  activeProfileId?: string;
  location?: { source: LocationSource; label: string; latitude?: number; longitude?: number };
  activeDestination?: PrimaryDestination;
}

function payloadOf(record: PreferenceRuntimeRecord): Record<string, unknown> {
  const resultPayload = record.result.payload;
  return resultPayload && typeof resultPayload === "object" && !Array.isArray(resultPayload) ? resultPayload as Record<string, unknown> : {};
}

export async function hydratePreferenceRuntime(): Promise<HydratedPreferenceRuntimeState> {
  const records = await (await runtime()).list({ actorId: ACTOR_ID });
  const ordered = [...records].sort((left, right) => left.stateVersion - right.stateVersion);
  const profiles = new Map<string, PreferenceProfile>();
  let activeProfileId: string | undefined;
  let location: HydratedPreferenceRuntimeState["location"];
  let activeDestination: PrimaryDestination | undefined;
  for (const record of ordered) {
    const payload = payloadOf(record);
    if (record.operation === "preference.save" && payload.profile && typeof payload.profile === "object") {
      const profile = payload.profile as PreferenceProfile;
      profiles.set(profile.id, profile);
      activeProfileId = profile.id;
    } else if (record.operation === "preference.activate" && typeof payload.profileId === "string") {
      activeProfileId = payload.profileId;
    } else if (record.operation === "shell.location.set" && typeof payload.label === "string" && ["unset", "device", "manual"].includes(String(payload.source))) {
      location = { source: payload.source as LocationSource, label: payload.label, latitude: typeof payload.latitude === "number" ? payload.latitude : undefined, longitude: typeof payload.longitude === "number" ? payload.longitude : undefined };
    } else if (record.operation === "shell.destination.set" && ["tonight", "map", "itinerary", "sky", "profile"].includes(String(payload.destination))) {
      activeDestination = payload.destination as PrimaryDestination;
    }
  }
  return { profiles: [...profiles.values()], activeProfileId, location, activeDestination };
}
