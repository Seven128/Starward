import { equipmentKinds, facilityKinds, observerTypes, observingTargets, requirementLevels, travelModes, type PreferenceProfile } from "./index";
import type { PreferenceDestination, PreferenceLocation, PreferenceProjection, PreferenceRuntimeInput, PreferenceRuntimeRecord } from "./runtime-contract";
import { canonicalJson, isObject } from "./runtime-json";

export const STATE_KEY = "preferences-runtime-state";
export const SCHEMA = "starward-preferences-runtime-v2";
type CurrentProjection = Omit<PreferenceProjection, "revision">;
export interface RetainedReceipt { record: PreferenceRuntimeRecord; slots: string[]; legacy: boolean }
export interface ActorState { actorId: string; projection: CurrentProjection; receipts: RetainedReceipt[] }
export interface PreferenceState { schemaVersion: typeof SCHEMA; revision: number; actors: ActorState[] }
const destinations: PreferenceDestination[] = ["tonight", "map", "trips", "sky", "me"];
const operations = ["preference.save", "preference.activate", "shell.location.set", "shell.destination.set"];
const text = (v: unknown): v is string => typeof v === "string" && Boolean(v.trim());
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const enumArray = (v: unknown, choices: readonly string[]) => Array.isArray(v) && v.every(i => typeof i === "string" && choices.includes(i));
const bools = (v: unknown, keys: string[]) => isObject(v) && keys.every(key => typeof v[key] === "boolean");

function validProfile(v: unknown): v is PreferenceProfile {
  if (!isObject(v) || !text(v.id) || !text(v.name) || !integer(v.revision) || v.revision < 1
    || typeof v.startingPlace !== "string" || typeof v.city !== "string" || !text(v.createdAt) || !text(v.updatedAt)
    || !enumArray(v.observerTypes, observerTypes) || !enumArray(v.targets, observingTargets) || !enumArray(v.equipment, equipmentKinds)
    || !Array.isArray(v.lensFocalLengthsMm) || !v.lensFocalLengthsMm.every(n => nonnegative(n) && n > 0 && n <= 2000)
    || !bools(v.willingness, ["continuousLocationWhenFieldSessionStarts", "weatherAndAstronomyNotifications"])
    || !bools(v.travel, ["directAccessRequired", "acceptsMountainRoad", "acceptsUnpavedRoad", "acceptsNightWalking", "acceptsCamping", "acceptsOvernight"])
    || !isObject(v.travel) || !enumArray(v.travel.modes, travelModes)
    || !["maxOneWayMinutes", "maxDrivingKilometers", "maxWalkingKilometers"].every(key => v.travel && isObject(v.travel) && (v.travel[key] === null || nonnegative(v.travel[key])))
    || !isObject(v.facilities) || !facilityKinds.every(key => isObject(v.facilities) && requirementLevels.includes(v.facilities[key] as any))) return false;
  return true;
}

function coordinatesValid(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

/** Preserve the legacy reader's missing-provenance and invalid-late-fix behavior. */
export function restorePreferenceLocation(payload: Record<string, unknown>): PreferenceLocation | undefined {
  if (!text(payload.label) || !["unset", "device", "manual"].includes(String(payload.source))) return undefined;
  const location: PreferenceLocation = { source: payload.source as PreferenceLocation["source"], label: payload.label };
  if (payload.source === "device" && !coordinatesValid(payload.latitude, payload.longitude)) return undefined;
  if (coordinatesValid(payload.latitude, payload.longitude)) {
    location.latitude = payload.latitude as number;
    location.longitude = payload.longitude as number;
  }
  if (payload.coordinateSystem === "WGS84") location.coordinateSystem = "WGS84";
  else if (payload.coordinateSystem !== undefined) return undefined;
  if (payload.accuracyMeters === null || nonnegative(payload.accuracyMeters)) location.accuracyMeters = payload.accuracyMeters;
  if (nonnegative(payload.timestampMs)) location.timestampMs = payload.timestampMs;
  if (typeof payload.mocked === "boolean") location.mocked = payload.mocked;
  return location;
}

function validNewLocation(payload: Record<string, unknown>): boolean {
  return !!restorePreferenceLocation(payload)
    && (!("latitude" in payload) && !("longitude" in payload) || coordinatesValid(payload.latitude, payload.longitude))
    && (!("accuracyMeters" in payload) || payload.accuracyMeters === null || nonnegative(payload.accuracyMeters))
    && (!("timestampMs" in payload) || nonnegative(payload.timestampMs))
    && (!("mocked" in payload) || typeof payload.mocked === "boolean");
}

export function validateEnvelope(request: PreferenceRuntimeInput): void {
  if (!isObject(request) || request.outcome !== "mobile-shell-and-preferences") throw new Error("preference_runtime_outcome_invalid");
  if (!text(request.actorId)) throw new Error("preference_runtime_actor_required");
  if (!text(request.idempotencyKey)) throw new Error("preference_runtime_idempotency_required");
  if (!operations.includes(request.operation)) throw new Error("preference_runtime_operation_invalid");
  if (!isObject(request.payload) || !text(request.payload.token)) throw new Error("preference_runtime_payload_invalid");
}

export function validatePayload(operation: PreferenceRuntimeInput["operation"], payload: Record<string, unknown>): void {
  const valid = operation === "preference.save" ? validProfile(payload.profile)
    : operation === "preference.activate" ? text(payload.profileId)
    : operation === "shell.location.set" ? validNewLocation(payload)
    : destinations.includes(payload.destination as PreferenceDestination);
  if (!valid) throw new Error("preference_runtime_payload_invalid");
}

export function actorState(state: PreferenceState, actorId: string): ActorState {
  let actor = state.actors.find(a => a.actorId === actorId);
  if (!actor) { actor = { actorId, projection: { profiles: [] }, receipts: [] }; state.actors.push(actor); }
  return actor;
}
export function projectionOf(state: PreferenceState, actorId: string): PreferenceProjection {
  return structuredClone({ ...(state.actors.find(a => a.actorId === actorId)?.projection ?? { profiles: [] }), revision: state.revision });
}
export function emptyState(): PreferenceState { return { schemaVersion: SCHEMA, revision: 0, actors: [] }; }

function slotsFor(record: PreferenceRuntimeRecord): string[] {
  const payload = record.result.payload as Record<string, unknown>;
  if (record.operation === "preference.save") return [`profile:${(payload.profile as PreferenceProfile).id}`, "active"];
  return [record.operation === "preference.activate" ? "active" : record.operation === "shell.location.set" ? "location" : "destination"];
}

export function applyRecord(state: PreferenceState, record: PreferenceRuntimeRecord, legacy = false): void {
  const actor = actorState(state, record.actorId);
  const p = actor.projection;
  const payload = record.result.payload as Record<string, unknown>;
  if (record.operation === "preference.save") {
    const profile = payload.profile;
    if (!validProfile(profile)) throw new Error(legacy ? "preference_runtime_state_invalid" : "preference_runtime_payload_invalid");
    const previous = p.profiles.find(item => item.id === profile.id);
    if (!legacy && previous && profile.revision <= previous.revision) throw new Error("preference_runtime_profile_revision_conflict");
    if (previous) p.profiles = p.profiles.map(item => item.id === profile.id ? structuredClone(profile) : item);
    else p.profiles.push(structuredClone(profile));
    p.activeProfileId = profile.id;
  } else if (record.operation === "preference.activate") {
    if (!text(payload.profileId)) throw new Error("preference_runtime_state_invalid");
    if (!legacy && payload.profileId !== "base" && !p.profiles.some(item => item.id === payload.profileId)) throw new Error("preference_runtime_profile_not_found");
    p.activeProfileId = payload.profileId;
  } else if (record.operation === "shell.location.set") {
    const restored = restorePreferenceLocation(payload);
    if (restored) p.location = restored;
  } else {
    const d = legacy && payload.destination === "itinerary" ? "trips" : legacy && payload.destination === "profile" ? "me" : payload.destination;
    if (destinations.includes(d as PreferenceDestination)) p.activeDestination = d as PreferenceDestination;
    else if (!legacy) throw new Error("preference_runtime_payload_invalid");
  }
  const slots = slotsFor(record);
  actor.receipts = actor.receipts.map(receipt => ({ ...receipt, slots: receipt.slots.filter(slot => !slots.includes(slot)) })).filter(receipt => receipt.slots.length);
  actor.receipts.push({ record: structuredClone(record), slots, legacy });
}

function validRecord(v: unknown, revision: number): v is PreferenceRuntimeRecord {
  return isObject(v) && v.outcome === "mobile-shell-and-preferences" && text(v.actorId) && text(v.entityId) && text(v.idempotencyKey)
    && text(v.inputDigest) && operations.includes(v.operation as string) && integer(v.stateVersion) && v.stateVersion > 0 && v.stateVersion <= revision
    && text(v.committedAt) && isObject(v.result) && isObject(v.result.payload) && text(v.result.payload.token);
}

export function parseState(raw: string | null): { state: PreferenceState; migration: boolean } {
  if (raw === null) return { state: emptyState(), migration: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || !integer(parsed.revision)) throw new Error();
    if (parsed.schemaVersion === "starward-preferences-runtime-v1") {
      if (!isObject(parsed.records) || !isObject(parsed.idempotency)) throw new Error();
      const state = emptyState(); state.revision = parsed.revision;
      const records = Object.values(parsed.records);
      const versions = new Set<number>();
      for (const record of records) {
        if (!validRecord(record, state.revision) || versions.has(record.stateVersion)
          || parsed.records[record.entityId] !== record || parsed.idempotency[record.idempotencyKey] !== record.entityId) throw new Error();
        versions.add(record.stateVersion);
      }
      if (Object.keys(parsed.idempotency).length !== records.length) throw new Error();
      for (const record of (records as PreferenceRuntimeRecord[]).sort((a, b) => a.stateVersion - b.stateVersion)) applyRecord(state, record, true);
      return { state, migration: true };
    }
    if (parsed.schemaVersion !== SCHEMA || !Array.isArray(parsed.actors)) throw new Error();
    const actorIds = new Set<string>(), receiptKeys = new Set<string>(), entityIds = new Set<string>();
    for (const actor of parsed.actors) {
      if (!isObject(actor) || !text(actor.actorId) || actorIds.has(actor.actorId) || !isObject(actor.projection) || !Array.isArray(actor.receipts)) throw new Error();
      actorIds.add(actor.actorId);
      const p = actor.projection;
      if (!Array.isArray(p.profiles) || !p.profiles.every(validProfile) || new Set(p.profiles.map(i => i.id)).size !== p.profiles.length
        || ("activeProfileId" in p && !text(p.activeProfileId)) || ("location" in p && (!isObject(p.location) || !validNewLocation(p.location)))
        || ("activeDestination" in p && !destinations.includes(p.activeDestination as PreferenceDestination))) throw new Error();
      const ownedSlots = new Set<string>();
      for (const receipt of actor.receipts) {
        if (!isObject(receipt) || !validRecord(receipt.record, parsed.revision) || receipt.record.actorId !== actor.actorId
          || typeof receipt.legacy !== "boolean" || !Array.isArray(receipt.slots) || !receipt.slots.length
          || receiptKeys.has(receipt.record.idempotencyKey) || entityIds.has(receipt.record.entityId)) throw new Error();
        const payload = receipt.record.result.payload as Record<string, unknown>;
        if (!receipt.legacy) {
          validatePayload(receipt.record.operation, payload);
          if (!receipt.record.idempotencyKey.startsWith(`preferences-v2:${receipt.record.stateVersion - 1}:`)) throw new Error();
        }
        const allowed = slotsFor(receipt.record);
        for (const slot of receipt.slots) {
          if (typeof slot !== "string" || !allowed.includes(slot) || ownedSlots.has(slot)) throw new Error();
          ownedSlots.add(slot);
          if (slot.startsWith("profile:")) {
            const current = p.profiles.find(profile => `profile:${profile.id}` === slot);
            if (!validProfile(payload.profile) || !current || canonicalJson(current) !== canonicalJson(payload.profile)) throw new Error();
          } else if (slot === "active") {
            const activeId = receipt.record.operation === "preference.save" ? (payload.profile as PreferenceProfile).id : payload.profileId;
            if (p.activeProfileId !== activeId) throw new Error();
          } else if (slot === "location") {
            const restored = restorePreferenceLocation(payload);
            if (restored && canonicalJson(restored) !== canonicalJson(p.location)) throw new Error();
          } else if (slot === "destination") {
            const d = receipt.legacy && payload.destination === "itinerary" ? "trips" : receipt.legacy && payload.destination === "profile" ? "me" : payload.destination;
            if (destinations.includes(d as PreferenceDestination) && p.activeDestination !== d) throw new Error();
          }
        }
        receiptKeys.add(receipt.record.idempotencyKey); entityIds.add(receipt.record.entityId);
      }
      if (p.profiles.some(profile => !ownedSlots.has(`profile:${profile.id}`))) throw new Error();
      if (("activeProfileId" in p && !ownedSlots.has("active")) || ("location" in p && !ownedSlots.has("location"))
        || ("activeDestination" in p && !ownedSlots.has("destination"))) throw new Error();
    }
    return { state: parsed as unknown as PreferenceState, migration: false };
  } catch { throw new Error("preference_runtime_state_invalid"); }
}
