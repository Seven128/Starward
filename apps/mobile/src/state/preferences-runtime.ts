import { createPreferencesRuntime, type PreferenceRuntimeInput, type PreferenceRuntimeRequest } from "@starward/domain/preferences/runtime";
import * as Crypto from "expo-crypto";
import type { PreferenceProfile } from "@starward/domain/preferences";
import type { PrimaryDestination } from "./shell-store";
import { restoreShellLocation, type ShellLocation } from "./shell-location";
import { createPreferenceStorage } from "./preferences-storage";

const ACTOR_ID = "personal-trial-owner";

async function digest(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

let runtimePromise: ReturnType<typeof createPreferencesRuntime> | null = null;

function runtime() {
  if (!runtimePromise) {
    const attempt = (async () => createPreferencesRuntime({
      storage: await createPreferenceStorage(),
      digest,
      releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false },
    }))();
    runtimePromise = attempt;
    void attempt.catch(() => { if (runtimePromise === attempt) runtimePromise = null; });
  }
  return runtimePromise;
}

function commandAttempt(operation: PreferenceRuntimeInput["operation"], payload: Record<string, unknown>) {
  let prepared: Promise<PreferenceRuntimeRequest> | undefined;
  let mayHaveCommitted = false;
  let inFlight: Promise<Awaited<ReturnType<Awaited<ReturnType<typeof createPreferencesRuntime>>["execute"]>>> | undefined;
  const execute = async () => {
    const owner = await runtime();
    if (!prepared) {
      const preparation = owner.prepare({
        outcome: "mobile-shell-and-preferences", actorId: ACTOR_ID, operation,
        idempotencyKey: Crypto.randomUUID(), payload,
      });
      prepared = preparation;
      // Preparation cannot have committed a command. A failed preparation is
      // retryable; once prepared, an uncertain execute retains its fence/key.
      void preparation.catch(() => { if (prepared === preparation) prepared = undefined; });
    }
    const command = await prepared;
    try {
      const result = await owner.execute(command);
      mayHaveCommitted = true;
      return result;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      // A first stale fence or CAS conflict proves this intent never committed.
      // Once any earlier reply was uncertain/successful, a retired receipt must
      // not renew that intent. Only a subsequent explicit call can prepare again.
      if (!mayHaveCommitted && ["preference_runtime_conflict", "preference_runtime_stale_command"].includes(code)) prepared = undefined;
      else if (!["preference_runtime_conflict", "preference_runtime_stale_command", "preference_runtime_profile_revision_conflict"].includes(code)) mayHaveCommitted = true;
      throw error;
    }
  };
  return () => {
    if (inFlight) return inFlight;
    const attempt = execute();
    inFlight = attempt;
    const settled = () => { if (inFlight === attempt) inFlight = undefined; };
    void attempt.then(settled, settled);
    return attempt;
  };
}

// A save candidate is an immutable user intent. Its consumer keeps this object
// across a failed/unknown response; a new draft supplies a new candidate.
const profileAttempts = new WeakMap<PreferenceProfile, { fingerprint: string; run: ReturnType<typeof commandAttempt> }>();

export function persistPreferenceProfile(profile: PreferenceProfile) {
  const fingerprint = JSON.stringify(profile);
  let attempt = profileAttempts.get(profile);
  if (attempt && attempt.fingerprint !== fingerprint) return Promise.reject(new Error("preference_runtime_candidate_changed"));
  if (!attempt) {
    attempt = { fingerprint, run: commandAttempt("preference.save", { token: profile.name, profile }) };
    profileAttempts.set(profile, attempt);
  }
  return attempt.run();
}

const pendingChoices = new Map<string, { fingerprint: string; run: ReturnType<typeof commandAttempt> }>();

async function persistChoice(operation: PreferenceRuntimeInput["operation"], payload: Record<string, unknown>) {
  const fingerprint = JSON.stringify(payload);
  let attempt = pendingChoices.get(operation);
  if (!attempt || attempt.fingerprint !== fingerprint) {
    attempt = { fingerprint, run: commandAttempt(operation, payload) };
    pendingChoices.set(operation, attempt);
  }
  const result = await attempt.run();
  // A subsequent deliberate choice is a new intent. Only unresolved choices
  // keep their command identity, with one pending candidate per responsibility.
  if (pendingChoices.get(operation) === attempt) pendingChoices.delete(operation);
  return result;
}

export function persistActiveProfile(profileId: string) {
  return persistChoice("preference.activate", { token: profileId, profileId });
}

export function persistShellLocation(location: ShellLocation) {
  const payload = Object.fromEntries(Object.entries({ token: location.label, ...location }).filter(([, value]) => value !== undefined));
  return persistChoice("shell.location.set", payload);
}

export function persistShellDestination(destination: PrimaryDestination) {
  return persistChoice("shell.destination.set", { token: destination, destination });
}

export interface HydratedPreferenceRuntimeState {
  profiles: PreferenceProfile[];
  activeProfileId?: string;
  location?: ShellLocation;
  activeDestination?: PrimaryDestination;
}

export async function hydratePreferenceRuntime(): Promise<HydratedPreferenceRuntimeState> {
  const { profiles, activeProfileId, location, activeDestination } = await (await runtime()).getProjection({ actorId: ACTOR_ID });
  return { profiles, activeProfileId, location: location ? restoreShellLocation({ ...location }) : undefined, activeDestination };
}
