/** Task template, installed ONLY into a task staging copy's src/services.
 * One real terrain mutation is delayed at BOTH native completion channels.
 * No timer, fabricated outcome, storage, request, image or position recording.
 */
import type { MapGroundOverlayContext } from "../pages/map/map-ground-overlay";

type MapStatus = "ready" | "pending" | "error";
type Method = "add" | "update" | "remove";
type Outcome = "none" | "success" | "failure";
type Scalar = string | number | boolean | null;
type Row = { sequence: number; atMs: number; event: string; [key: string]: Scalar };
type Selected = {
  mapId: string; method: "add" | "update"; id: number;
  callback: Outcome; callbackForwarded: boolean; promise: Outcome; promiseForwarded: boolean;
  returnedPromise: boolean | null; releaseAuthorized: boolean; invocationThrew: boolean;
  recoveryRequired: boolean; oldRemoveAcknowledged: boolean;
};
type ActualOutcome = { ok: true; value?: unknown } | { ok: false; value: unknown };
type Hold = {
  released: boolean; callbackOutcome: ActualOutcome | null; promiseOutcome: ActualOutcome | null;
  success: (() => void) | null; fail: ((error: unknown) => void) | null;
  resolve: ((value: unknown) => void) | null; reject: ((error: unknown) => void) | null;
};
type ResourceGroup = {
  mapId: string; label: string;
  pinRetains: number; pinReleases: number; pinBalance: number; pinRetainThrows: number; pinReleaseThrows: number;
  removeDispatched: number; removeSyncThrows: number; removeAwaitingOutcome: number;
  removeCallbackSuccess: number; removeCallbackFailure: number; removePromiseSuccess: number; removePromiseFailure: number;
  removeReturnedPromise: number; removeReturnedWithoutPromise: number;
};
type CoordinatorObservation = {
  ownerId: number; mapId: string; label: string; disposeCalls: number; disposeResults: number;
  disposeSyncThrows: number; disposeRejections: number; lastDisposeComplete: boolean | null;
  remainingIdsCount: number | null; retired: boolean; retirementRejected: boolean;
};
type ObservedCoordinator = {
  dispose(): Promise<{ complete: boolean; remainingIds: readonly number[] }>;
  retired: Promise<void>;
};

export function createF04NativeRecoveryObserver(options: { sourceSha256: string; now?: () => number; resourceObservation?: boolean }) {
  const now = options.now ?? Date.now;
  const rows: Row[] = [];
  const resourceObservation = options.resourceObservation === true;
  // These arrays contain scalars only. No source path, resource/Map/context,
  // callback, coordinator or Promise becomes an observer-global witness.
  const groups: ResourceGroup[] = [], coordinators: CoordinatorObservation[] = [];
  let droppedGroupObservations = 0, droppedCoordinators = 0, removeCallSequence = 0, ownerSequence = 0;
  let sequence = 0, droppedRows = 0, armConsumed = false, armedMapId: string | null = null;
  let current: { mapId: string; generation: number; status: MapStatus; terrainAcknowledged: boolean } | null = null;
  let selected: Selected | null = null, held: Hold | null = null;
  let successor: { mapId: string; generation: number; onUpdated: boolean; terrainAcknowledged: boolean; displayAccepted: boolean } | null = null;
  const record = (event: string, facts: Record<string, Scalar> = {}) => {
    const row = { sequence: ++sequence, atMs: now(), event, ...facts };
    if (rows.length < (resourceObservation ? 256 : 64)) rows.push(row); else droppedRows++;
  };
  const resourceGroup = (mapId: string, label: string): ResourceGroup | null => {
    if (!resourceObservation) return null;
    const found = groups.find(group => group.mapId === mapId && group.label === label);
    if (found) return found;
    if (groups.length >= 12) { droppedGroupObservations++; return null; }
    const group: ResourceGroup = { mapId, label, pinRetains: 0, pinReleases: 0, pinBalance: 0,
      pinRetainThrows: 0, pinReleaseThrows: 0, removeDispatched: 0, removeSyncThrows: 0, removeAwaitingOutcome: 0,
      removeCallbackSuccess: 0, removeCallbackFailure: 0, removePromiseSuccess: 0, removePromiseFailure: 0,
      removeReturnedPromise: 0, removeReturnedWithoutPromise: 0 };
    groups.push(group); return group;
  };
  const status = () => ({ schema: "starward-f04-native-recovery-v1", scope: "TASK_ONLY_NOT_ACCEPTANCE",
    sourceSha256: options.sourceSha256, armConsumed, armed: armedMapId !== null,
    current: current ? { ...current } : null, selected: selected ? { ...selected } : null,
    successor: successor ? { ...successor } : null, heldCalls: held ? 1 : 0,
    eventCount: sequence, droppedRows, physicalMapRelease: "unknown",
    ...(resourceObservation ? { resourceObservation: { schema: "starward-f04-resource-observation-v1",
      maxGroups: 12, maxCoordinators: 24, maxRows: 256, droppedGroupObservations, droppedCoordinators,
      groups: groups.map(group => ({ ...group })), coordinators: coordinators.map(owner => ({ ...owner })) } } : {}) });
  const readback = () => ({ ...status(), rows: rows.map(row => ({ ...row })) });
  const forward = (call: Hold) => {
    if (!call.released || !selected) return;
    const callback = call.callbackOutcome;
    if (callback && !selected.callbackForwarded) {
      selected.callbackForwarded = true; call.callbackOutcome = null;
      const success = call.success, fail = call.fail; call.success = call.fail = null;
      record("old_callback_forwarded", { ok: callback.ok });
      if (callback.ok) success?.(); else fail?.(callback.value);
    }
    const promise = call.promiseOutcome;
    if (promise && !selected.promiseForwarded) {
      selected.promiseForwarded = true; call.promiseOutcome = null;
      const resolve = call.resolve, reject = call.reject; call.resolve = call.reject = null;
      record("old_promise_forwarded", { ok: promise.ok });
      if (promise.ok) resolve?.(promise.value); else reject?.(promise.value);
    }
  };
  const releaseIfReady = () => {
    if (!held || !selected || !successor?.onUpdated || !successor.terrainAcknowledged
      || current?.mapId !== successor.mapId || current.generation !== successor.generation) return;
    const call = held;
    call.released = true; selected.releaseAuthorized = true; held = null;
    record("release_authorized", { mapId: successor.mapId, actualOnUpdated: true, actualTerrainAck: true });
    // Missing actual outcomes stay missing. The real callbacks/Promise can
    // still arrive later; no observer-global reference retains their closures.
    forward(call);
  };
  const actualResult = (mapId: string, method: Method, id: number, channel: "callback" | "promise", ok: boolean) => {
    if (method !== "remove" && ok && current?.mapId === mapId) current.terrainAcknowledged = true;
    if (successor?.mapId === mapId && current?.mapId === mapId && method !== "remove" && ok && !successor.terrainAcknowledged) {
      successor.terrainAcknowledged = true;
      record("successor_terrain_ack", { mapId, method, id, channel }); releaseIfReady();
    }
    if (selected?.mapId === mapId && method === "remove") {
      if (ok && id === selected.id) selected.oldRemoveAcknowledged = true;
      record("old_remove_result", { mapId, id, selectedId: id === selected.id, channel, ok });
    }
  };
  const mapState = (mapId: string, generation: number, mapStatus: MapStatus, isCurrent: boolean) => {
    if (!isCurrent) return;
    if (current?.mapId === mapId && current.generation === generation && current.status === mapStatus) return;
    if (armedMapId && armedMapId !== mapId) {
      armedMapId = null; record("arm_cancelled_map_changed");
    }
    current = { mapId, generation, status: mapStatus, terrainAcknowledged: current?.mapId === mapId && current.terrainAcknowledged };
    record("current_map_state", { mapId, generation, status: mapStatus });
  };
  const arm = () => {
    const reason = armConsumed ? "one_shot_already_consumed" : !current ? "no_current_map"
      : current.status !== "ready" ? "current_map_not_ready" : !current.terrainAcknowledged ? "no_actual_terrain_ack" : null;
    if (reason) return { ok: false, reason, status: status() };
    armConsumed = true; armedMapId = current!.mapId;
    record("armed", { mapId: armedMapId });
    return { ok: true, reason: null, status: status() };
  };
  const recoveryStarted = (oldMapId: string, mapId: string, generation: number) => {
    mapState(mapId, generation, "pending", true);
    if (!selected || selected.mapId !== oldMapId || oldMapId === mapId || successor) return;
    successor = { mapId, generation, onUpdated: false, terrainAcknowledged: false, displayAccepted: false };
    record("successor_created_by_retry", { oldMapId, mapId, generation });
  };
  const mapUpdated = (mapId: string, generation: number) => {
    // The transform calls this only after the production isCurrent/pending
    // guard inside the ACTUAL Map onUpdated handler, never from mapState.
    if (!successor || successor.mapId !== mapId || successor.generation !== generation || successor.onUpdated
      || current?.mapId !== mapId || current.generation !== generation) return;
    successor.onUpdated = true; record("successor_on_updated", { mapId, generation }); releaseIfReady();
  };
  const terrainResult = (mapId: string, label: string, isCurrent: boolean, failed: boolean,
    requiresMapRecovery: boolean, phase: string, hasTarget: boolean, presentationUnknown: boolean) => {
    if (label !== "地形" || !isCurrent || phase === "pending") return;
    if (selected?.mapId === mapId && requiresMapRecovery && !selected.recoveryRequired) {
      selected.recoveryRequired = true; record("terrain_recovery_required", { mapId, failed, phase });
    }
    if (successor?.mapId === mapId && !failed && hasTarget && !presentationUnknown && phase === "display" && !successor.displayAccepted) {
      successor.displayAccepted = true; record("successor_display_accepted", { mapId });
    }
  };
  const wrapResources = <T extends { retainPath(path: string): () => void }>(mapId: string, label: string, resources: T): T => {
    const group = resourceGroup(mapId, label);
    if (!group) return resources;
    return { ...resources, retainPath(path: string) {
      let release: () => void;
      try { release = resources.retainPath(path); }
      catch (error) { group.pinRetainThrows++; record("pin_retain_threw", { mapId, label }); throw error; }
      group.pinRetains++; group.pinBalance++;
      record("pin_retained", { mapId, label, pinBalance: group.pinBalance });
      let released = false;
      return function (this: unknown) {
        // Count a released claim only after the real release returns. Do not
        // suppress a second invocation or change the real owner's idempotency.
        try { release.call(this); }
        catch (error) { group.pinReleaseThrows++; record("pin_release_threw", { mapId, label }); throw error; }
        if (!released) {
          released = true; group.pinReleases++; group.pinBalance--;
          record("pin_released", { mapId, label, pinBalance: group.pinBalance });
        }
      };
    } };
  };
  const observeCoordinator = <T extends ObservedCoordinator>(mapId: string, label: string, coordinator: T): T => {
    if (!resourceObservation) return coordinator;
    resourceGroup(mapId, label);
    const ownerId = ++ownerSequence;
    if (coordinators.length >= 24) { droppedCoordinators++; return coordinator; }
    const owner: CoordinatorObservation = { ownerId, mapId, label, disposeCalls: 0, disposeResults: 0,
      disposeSyncThrows: 0, disposeRejections: 0, lastDisposeComplete: null, remainingIdsCount: null,
      retired: false, retirementRejected: false };
    coordinators.push(owner); record("coordinator_observed", { ownerId, mapId, label });
    void coordinator.retired.then(() => {
      owner.retired = true; record("coordinator_retired", { ownerId, mapId, label });
    }, () => {
      owner.retirementRejected = true; record("coordinator_retirement_rejected", { ownerId, mapId, label });
    });
    return { ...coordinator, dispose() {
      owner.disposeCalls++; record("coordinator_dispose_called", { ownerId, mapId, label, call: owner.disposeCalls });
      let returned: ReturnType<ObservedCoordinator["dispose"]>;
      try { returned = coordinator.dispose(); }
      catch (error) {
        owner.disposeSyncThrows++; record("coordinator_dispose_threw", { ownerId, mapId, label }); throw error;
      }
      void returned.then(result => {
        owner.disposeResults++; owner.lastDisposeComplete = result.complete; owner.remainingIdsCount = result.remainingIds.length;
        record("coordinator_dispose_result", { ownerId, mapId, label, complete: result.complete, remainingIdsCount: result.remainingIds.length });
      }, () => {
        owner.disposeRejections++; record("coordinator_dispose_rejected", { ownerId, mapId, label });
      });
      // The actual Promise is returned unchanged; observing it never waits for
      // retirement, changes cleanup success, or fabricates an acknowledgement.
      return returned;
    } } as T;
  };
  const wrapContext = (mapId: string, label: string, context: MapGroundOverlayContext): MapGroundOverlayContext => {
    if (label !== "地形" && !resourceObservation) return context;
    const invoke = (method: Method, id: number, success: () => void, fail: (error: unknown) => void,
      action: (callbacks: { success(): void; fail(error: unknown): void }) => unknown): unknown => {
      const shouldHold = label === "地形" && method !== "remove" && armedMapId === mapId && current?.mapId === mapId;
      if (!shouldHold) {
        const group = method === "remove" ? resourceGroup(mapId, label) : null;
        const callId = group ? ++removeCallSequence : null;
        let ended = false, callbackObserved = false, promiseObserved = false;
        const observeResult = (channel: "callback" | "promise", ok: boolean) => {
          if (group && !(channel === "callback" ? callbackObserved : promiseObserved)) {
            if (channel === "callback") {
              callbackObserved = true;
              if (ok) group.removeCallbackSuccess++; else group.removeCallbackFailure++;
            } else {
              promiseObserved = true;
              if (ok) group.removePromiseSuccess++; else group.removePromiseFailure++;
            }
            if (!ended) { ended = true; group.removeAwaitingOutcome--; }
            record("native_remove_result", { mapId, label, id, callId, channel, ok });
          }
          if (label === "地形") actualResult(mapId, method, id, channel, ok);
        };
        if (group) {
          group.removeDispatched++; group.removeAwaitingOutcome++;
          // This point is before the real call. A synchronous platform throw
          // can therefore be distinguished from a never-dispatched remove.
          record("native_remove_dispatched", { mapId, label, id, callId });
        }
        let returned: unknown;
        try { returned = action({ success() { observeResult("callback", true); success(); },
          fail(error) { observeResult("callback", false); fail(error); } }); }
        catch (error) {
          if (group) {
            group.removeSyncThrows++;
            if (!ended) { ended = true; group.removeAwaitingOutcome--; }
            record("native_remove_invocation_threw", { mapId, label, id, callId });
          }
          throw error;
        }
        if (group) {
          const returnedPromise = Boolean(returned && typeof (returned as PromiseLike<unknown>).then === "function");
          if (returnedPromise) group.removeReturnedPromise++; else group.removeReturnedWithoutPromise++;
          record("native_remove_return_type", { mapId, label, id, callId, returnedPromise });
        }
        if (returned && typeof (returned as PromiseLike<unknown>).then === "function")
          (returned as PromiseLike<unknown>).then(() => observeResult("promise", true),
            () => observeResult("promise", false));
        return returned;
      }
      armedMapId = null;
      selected = { mapId, method, id, callback: "none", callbackForwarded: false, promise: "none", promiseForwarded: false,
        returnedPromise: null, releaseAuthorized: false, invocationThrew: false, recoveryRequired: false, oldRemoveAcknowledged: false };
      const call: Hold = { released: false, callbackOutcome: null, promiseOutcome: null, success, fail, resolve: null, reject: null };
      held = call; record("real_native_call_selected", { mapId, method, id });
      const callback = (outcome: ActualOutcome) => {
        if (selected!.callback !== "none") return;
        selected!.callback = outcome.ok ? "success" : "failure"; call.callbackOutcome = outcome;
        record("old_actual_callback", { ok: outcome.ok }); forward(call);
      };
      let returned: unknown;
      try { returned = action({ success: () => callback({ ok: true }), fail: error => callback({ ok: false, value: error }) }); }
      catch (error) {
        // A synchronous native throw is a different mechanism: preserve it
        // exactly, and make this attempt explicitly ineligible as F04 evidence.
        selected.invocationThrew = true;
        record("native_invocation_threw"); throw error;
      }
      selected.returnedPromise = Boolean(returned && typeof (returned as PromiseLike<unknown>).then === "function");
      record("native_return_type", { returnedPromise: selected.returnedPromise });
      if (!selected.returnedPromise) return returned;
      const gated = new Promise<unknown>((resolve, reject) => { call.resolve = resolve; call.reject = reject; });
      const settled = (outcome: ActualOutcome) => {
        if (selected!.promise !== "none") return;
        selected!.promise = outcome.ok ? "success" : "failure"; call.promiseOutcome = outcome;
        record("old_actual_promise", { ok: outcome.ok }); forward(call);
      };
      (returned as PromiseLike<unknown>).then(value => settled({ ok: true, value }), error => settled({ ok: false, value: error }));
      return gated;
    };
    const wrapped: MapGroundOverlayContext = {
      addGroundOverlay: options => invoke("add", options.id, options.success, options.fail,
        callbacks => context.addGroundOverlay({ ...options, ...callbacks })),
      removeGroundOverlay: options => invoke("remove", options.id, options.success, options.fail,
        callbacks => context.removeGroundOverlay({ ...options, ...callbacks })),
    };
    if (typeof context.updateGroundOverlay === "function") wrapped.updateGroundOverlay = options =>
      invoke("update", options.id, options.success, options.fail, callbacks => context.updateGroundOverlay!({ ...options, ...callbacks }));
    return wrapped;
  };
  return { arm, status, readback, mapState, recoveryStarted, mapUpdated, terrainResult, wrapContext, wrapResources, observeCoordinator };
}

export const f04NativeRecovery = createF04NativeRecoveryObserver({ sourceSha256: "__F04_NATIVE_RECOVERY_SOURCE_SHA256__",
  resourceObservation: false /* __F04_RESOURCE_OBSERVATION__ */ });
// Console control exists only in the injected task candidate, in the same
// appservice JS global as the Map owner. Root must verify that VM on the phone.
const consoleControl = Object.freeze({ arm: f04NativeRecovery.arm, status: f04NativeRecovery.status, readback: f04NativeRecovery.readback });
Object.defineProperty(globalThis, "__STARWARD_F04__", { value: consoleControl, configurable: true });
