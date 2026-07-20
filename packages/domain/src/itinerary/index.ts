export type ItineraryRole = "owner" | "editor" | "viewer";
export type StopRole = "primary" | "backup" | "candidate";
export interface ItineraryStop { id: string; spotId: string; role: StopRole; source: "user" | "friend" | "system" | "share-import"; coordinateVisibility: "private" | "invite_only" | "collaborators" | "members" | "approximate" | "public" }
export interface ItineraryStage { id: string; kind: "departure" | "scouting" | "blue-hour" | "observation" | "moonless" | "target-window" | "return" | "dawn"; startsAt: string; endsAt: string; stopId?: string }
export interface Itinerary { id: string; title: string; timezone: string; revision: number; sequence: number; ownerId: string; stops: ItineraryStop[]; stages: ItineraryStage[]; routeSnapshot: { id: string; generatedAt: string; driveMinutes: number; walkMinutes: number }; weatherSnapshot: { id: string; generatedAt: string }; operationLog: Operation[] }
export interface Operation { id: string; actorId: string; baseRevision: number; sequence: number; at: string; patch: Record<string, unknown> }

export function validateTimeline(stages: ItineraryStage[]) {
  const ordered = [...stages].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const conflicts: string[] = [];
  for (let i = 0; i < ordered.length; i += 1) { if (Date.parse(ordered[i].startsAt) >= Date.parse(ordered[i].endsAt)) conflicts.push(`${ordered[i].id}:invalid-range`); if (i && Date.parse(ordered[i].startsAt) < Date.parse(ordered[i - 1].endsAt)) conflicts.push(`${ordered[i - 1].id}:${ordered[i].id}:overlap`); }
  return { valid: conflicts.length === 0, conflicts, ordered };
}
export function applyItineraryPatch(current: Itinerary, input: { idempotencyKey: string; actorId: string; role: ItineraryRole; baseRevision: number; patch: Partial<Pick<Itinerary, "title" | "stops" | "stages">>; at: string }) {
  if (!input.idempotencyKey) throw new TypeError("idempotency_key_required");
  if (input.role === "viewer") return { status: "forbidden" as const, current };
  if (current.operationLog.some((item) => item.id === input.idempotencyKey)) return { status: "duplicate" as const, current };
  if (input.baseRevision !== current.revision) return { status: "conflict" as const, current, conflict: { baseRevision: input.baseRevision, serverRevision: current.revision, fields: Object.keys(input.patch) } };
  const next = { ...current, ...input.patch, revision: current.revision + 1, sequence: current.sequence + 1, operationLog: [...current.operationLog, { id: input.idempotencyKey, actorId: input.actorId, baseRevision: input.baseRevision, sequence: current.sequence + 1, at: input.at, patch: input.patch }] };
  const timeline = validateTimeline(next.stages); if (!timeline.valid) return { status: "invalid-timeline" as const, current, conflicts: timeline.conflicts };
  return { status: "applied" as const, value: next };
}

export function mergeOfflinePatches(current: Itinerary, left: Operation, right: Operation) {
  const leftFields = Object.keys(left.patch); const rightFields = Object.keys(right.patch); const conflicts = leftFields.filter((field) => rightFields.includes(field) && JSON.stringify(left.patch[field]) !== JSON.stringify(right.patch[field]));
  const nonConflicting = Object.fromEntries([...Object.entries(left.patch), ...Object.entries(right.patch)].filter(([field]) => !conflicts.includes(field)));
  return { mergedPatch: nonConflicting, conflicts: conflicts.map((field) => ({ field, original: left.patch[field], incoming: right.patch[field], originalActor: left.actorId, incomingActor: right.actorId })), requiresResolution: conflicts.length > 0, recoveryRevision: current.revision };
}

export function projectSharedItinerary(itinerary: Itinerary, viewer: "anonymous" | "invitee" | "member" | "owner") {
  const canSee = (stop: ItineraryStop) => viewer === "owner" || stop.coordinateVisibility === "public" || (viewer === "invitee" && stop.coordinateVisibility === "invite_only") || (viewer === "member" && ["members", "collaborators"].includes(stop.coordinateVisibility));
  return { id: itinerary.id, title: itinerary.title, revision: itinerary.revision, stops: itinerary.stops.map((stop) => ({ ...stop, spotId: canSee(stop) ? stop.spotId : `restricted:${stop.id}`, preciseCoordinateIncluded: canSee(stop) })), stages: itinerary.stages, route: { driveMinutes: itinerary.routeSnapshot.driveMinutes, walkMinutes: itinerary.routeSnapshot.walkMinutes }, primaryProduct: "react-native-ios-android" };
}
