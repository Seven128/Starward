import { useMemo, useRef } from "react";
import { skyGeometryWindow, type SkyGeometryWindowMode, type SkyReport, type SkyTimeModel, type SourceSummary } from "@starward/miniapp-contracts";
import { useResourceQuery } from "../../hooks/use-resource-query";
import { getSkyGeometryWindow } from "../../services/sky-celestial-client";
import { skyGeometryWindowKey, type SkyGeometryWindowBinding } from "../../services/sky-geometry-window-response";
import { MiniappRequestCancelled } from "../../services/request-lifecycle";
import { skyPresentationTimeModel } from "./sky-time-presentation";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { SkyTimeHeldEdit, SkyTimePreparationDemand } from "./sky-observation-time";

export type SkyGeometryDemand = Pick<SkyTimePreparationDemand, "at" | "fullWindow"> &
  Partial<Pick<SkyTimePreparationDemand, "generation" | "editing" | "hold">> & {
    epoch?: unknown; presented?: { at: string; generation: number; model: SkyTimeModel | null };
  };
type GeometryKey = ReturnType<typeof skyGeometryWindowKey>;
type GeometryRequest = { binding: SkyGeometryWindowBinding; key: GeometryKey; scope: string; epoch: unknown;
  hold: SkyTimeHeldEdit | null; serial: number; phase: "queued" | "fetching" | "complete" | "failed" };
let nextGeometryOwner = 0;
const sameKey = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((value, index) => value === b[index]);
const canonical = (at: string) => Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === at;
const sameHold = (a: SkyTimeHeldEdit | null | undefined, b: SkyTimeHeldEdit | null | undefined) => Boolean(a && b &&
  a.generation === b.generation && a.direction === b.direction && a.fromAt === b.fromAt);
const insideHold = (at: string, demand: SkyGeometryDemand) => Boolean(demand.hold && canonical(at) && canonical(demand.at) &&
  canonical(demand.hold.fromAt) && Date.parse(at) >= Math.min(Date.parse(demand.hold.fromAt), Date.parse(demand.at)) &&
  Date.parse(at) <= Math.max(Date.parse(demand.hold.fromAt), Date.parse(demand.at)));

function matchesWindow(request: GeometryRequest, demand: SkyGeometryDemand) {
  if ((demand.fullWindow ? "NIGHT" : "TWO_HOURS") !== request.binding.windowMode) return false;
  try { return skyGeometryWindow(demand.at, request.binding.timezone, request.binding.windowMode).startAt === request.key[6]; }
  catch { return false; }
}

function heldRequestCurrent(request: GeometryRequest, demand: SkyGeometryDemand) {
  if (!request.hold || demand.fullWindow || request.epoch !== demand.epoch) return false;
  if (sameHold(request.hold, demand.hold) && demand.generation === request.hold.generation)
    return insideHold(request.binding.at, demand);
  // Release reuses an already running window when it contains the exact final
  // target. A new touch, cancellation or Play cannot use this settlement path.
  return !demand.hold && demand.editing === false && demand.generation === request.hold.generation && matchesWindow(request, demand);
}

export function skyTimeModelCovers(model: SkyTimeModel | null, at: string): boolean {
  const value = Date.parse(at);
  return Boolean(model && Number.isFinite(value) && value >= Date.parse(model.startAt) && value <= Date.parse(model.endAt));
}

/** One admitted window on the visible page; request/cache/cancellation stay
 * with the existing Query and transport owners. No delayed response writes
 * the clock or Context. The latest clock intent decides what can be drawn. */
export function useSkyTimeGeometry(report: SkyReport | undefined, at: string, active: boolean, fullWindow: boolean,
  readDemand: () => SkyGeometryDemand | null) {
  const original = useMemo(() => skyPresentationTimeModel(report), [report]);
  const exact = Boolean(exactSkyTimeFrame(report?.hourly, at));
  const originalCovers = exact || skyTimeModelCovers(original, at);
  const context = report?.context;
  const observer = report?.observationFrames?.[0]?.observer;
  const scope = context ? `${context.spotId}:${context.contextId}:${context.contextRevision}:${context.contextFingerprint}:${context.dataRevision}` +
    `:${observer?.latitude}:${observer?.longitude}:${observer?.elevationM}` : "";
  const retained = useRef<{ scope: string; model: SkyTimeModel; sources: readonly SourceSummary[];
    windowMode: SkyGeometryWindowMode; sample: { at: string; hold: SkyTimeHeldEdit; epoch: unknown; serial: number } | null } | null>(null);
  if (retained.current?.scope !== scope) retained.current = null;
  const retainedModel = retained.current?.model;
  const originalPlaybackReady = Boolean(original && skyTimeModelCovers(original, at) &&
    Date.parse(at) < Date.parse(original.endAt));
  const retainedPlaybackReady = retained.current?.windowMode === "NIGHT" && skyTimeModelCovers(retainedModel ?? null, at) &&
    Date.parse(at) < Date.parse(retainedModel!.endAt);
  const originalUsable = originalCovers && (!fullWindow || originalPlaybackReady);
  const wantedBinding = useMemo<SkyGeometryWindowBinding | null>(() => {
    if (!context || !observer || originalUsable ||
      (skyTimeModelCovers(retainedModel ?? null, at) && (!fullWindow || retainedPlaybackReady)) || !active) return null;
    try {
      const windowMode = fullWindow ? "NIGHT" : "TWO_HOURS";
      skyGeometryWindow(at, context.timezone, windowMode);
      return { spotId: context.spotId, contextId: context.contextId, contextRevision: context.contextRevision,
        contextFingerprint: context.contextFingerprint, timezone: context.timezone, observer, at, windowMode };
    } catch { return null; }
  }, [context, observer, originalUsable, retainedModel, retainedPlaybackReady, fullWindow, active, at]);
  const wantedKey = skyGeometryWindowKey(wantedBinding, context?.dataRevision);
  const owner = useRef<{ id: number; serial: number; request: GeometryRequest | null } | null>(null);
  if (!owner.current) owner.current = { id: ++nextGeometryOwner, serial: 0, request: null };
  const demand = active ? readDemand() : null;
  let request = owner.current.request;
  const sameScope = Boolean(request && request.scope === scope && request.epoch === demand?.epoch);
  const hold = demand?.hold && !fullWindow && demand.generation === demand.hold.generation &&
    Number.isSafeInteger(demand.hold.generation) && canonical(demand.hold.fromAt) &&
    (demand.hold.direction === 1 || demand.hold.direction === -1) ? demand.hold : null;
  // Pin only actual in-flight work. A queued render never starts an obsolete
  // window merely because a continuous edit exists. All waiting inputs remain
  // the time owner's one latest scalar, not a list of requested windows.
  const keepRunning = Boolean(demand && request && sameScope && request.phase === "fetching" && heldRequestCurrent(request, demand));
  const prepared = retained.current?.sample;
  const preparedPresented = Boolean(prepared && demand?.presented && demand.presented.generation === prepared.hold.generation &&
    demand.presented.model === retained.current?.model && insideHold(demand.presented.at, demand));
  const originalServesDemand = Boolean(demand && (exactSkyTimeFrame(report?.hourly, demand.at) || skyTimeModelCovers(original, demand.at)));
  // Keep this prepared sample until the existing native-copy receipt confirms
  // it. Otherwise a fast next network result could replace its model before a
  // slower Canvas ever displays it, recreating starvation one layer later.
  const keepPrepared = Boolean(demand?.hold && request && sameScope && request.phase === "complete" &&
    heldRequestCurrent(request, demand) && prepared?.serial === request.serial && !preparedPresented &&
    !originalServesDemand);
  const keepSelected = Boolean(demand && request && sameScope && wantedBinding && sameKey(request.key, wantedKey) &&
    (request.hold ? heldRequestCurrent(request, demand) : !hold));
  if (!keepRunning && !keepPrepared && !keepSelected) request = wantedBinding && demand ? {
    binding: wantedBinding, key: wantedKey, scope, epoch: demand.epoch, hold,
    serial: ++owner.current.serial, phase: "queued",
  } : null;
  owner.current.request = request;
  const binding = request?.binding ?? null;
  // A held request's lease distinguishes reversal/Context ABA even when the
  // geometric grid key returns to its previous value. gcTime remains zero;
  // only this one observed query is kept, with no history or parallel cache.
  const queryKey = request?.hold ? [...request.key, "held", owner.current.id, request.serial]
    : request?.key ?? skyGeometryWindowKey(null, context?.dataRevision);
  const current = useRef({ request, readDemand, active });
  current.current = { request, readDemand, active };
  const demandCurrent = () => {
    const latest = current.current;
    if (!request || !latest.active || latest.request !== request) return false;
    const demand = latest.readDemand();
    if (!demand || request.epoch !== demand.epoch) return false;
    if (request.hold && !heldRequestCurrent(request, demand)) return false;
    if (!request.hold && demand.hold) return false;
    return matchesWindow(request, demand) || request.phase === "fetching" && Boolean(request.hold);
  };
  const admit = (response: Awaited<ReturnType<typeof getSkyGeometryWindow>>) => {
    if (!request) return;
    if (retained.current?.model === response.data.model && retained.current.sample?.serial === request.serial) return;
    const latest = current.current.readDemand();
    // The model can already cover a newer precise input in its own window.
    // Remember that legal sample instead of waiting for an obsolete request
    // second that the page's normal fast path may never paint.
    const sampleAt = latest && skyTimeModelCovers(response.data.model, latest.at) ? latest.at : request.binding.at;
    retained.current = { scope: request.scope, model: response.data.model, sources: response.sources,
      windowMode: request.binding.windowMode ?? "NIGHT", sample: request.hold
        ? { at: sampleAt, hold: request.hold, epoch: request.epoch, serial: request.serial } : null };
  };
  // A newer native input can precede Query's passive effect for an older
  // render. Read the existing clock at actual dispatch; equal window demand
  // still shares its request while seconds/minutes continue changing.
  // Once these queued options were disabled, keep that fact for Query's
  // previous-enabled comparison. A fresh A render can then restart after an
  // A -> B -> A input sequence even when the B render was coalesced away.
  let observerEnabled = true;
  const queryEnabled = () => {
    observerEnabled = observerEnabled && demandCurrent();
    return observerEnabled;
  };
  const query = useResourceQuery({ queryKey,
    queryFn: signal => {
      if (!demandCurrent()) return Promise.reject(new MiniappRequestCancelled("superseded"));
      request!.phase = "fetching";
      return getSkyGeometryWindow(binding!, signal).then(response => {
        if (signal?.aborted || !demandCurrent()) throw new MiniappRequestCancelled("superseded");
        admit(response); request!.phase = "complete";
        return response;
      }).catch(error => {
        request!.phase = "failed";
        // Failed intermediate work must not spend the retry backoff delaying a
        // different latest target. The exact current window keeps Query's
        // original genuine-failure retry policy and explicit retry action.
        if (!demandCurrent()) throw new MiniappRequestCancelled("superseded");
        throw error;
      });
    }, enabled: binding ? queryEnabled : false,
    staleTime: 30 * 60_000, gcTime: 0, structuralSharing: false });
  if (request && query.data && demandCurrent()) {
    admit(query.data);
    if (request.phase !== "fetching") request.phase = "complete";
  }
  const model = originalUsable || originalCovers && !skyTimeModelCovers(retained.current?.model ?? null, at)
    ? original : retained.current?.model ?? original;
  const playbackReady = model === original ? originalPlaybackReady
    : retained.current?.windowMode === "NIGHT" && skyTimeModelCovers(model, at) && Date.parse(at) < Date.parse(model!.endAt);
  const sample = retained.current?.sample;
  const heldSample = active && !fullWindow && !skyTimeModelCovers(model, at) && model === retained.current?.model && sample && demand &&
    sample.epoch === demand.epoch && sameHold(sample.hold, demand.hold) && demand.generation === sample.hold.generation && insideHold(sample.at, demand)
    ? { at: sample.at, generation: sample.hold.generation } : null;
  return { model, original, sources: model !== original ? retained.current?.sources : undefined, heldSample, playbackReady,
    playbackPending: Boolean(active && fullWindow && !playbackReady && binding && !query.isError),
    playbackFailed: Boolean(active && fullWindow && !playbackReady && (!binding || query.isError)),
    pending: Boolean(binding && !skyTimeModelCovers(model, at) && !query.isError),
    failed: Boolean(active && !originalCovers && !skyTimeModelCovers(model, at) && (!binding || query.isError)),
    retry: () => demandCurrent() ? query.refetch() : Promise.resolve(undefined) };
}
