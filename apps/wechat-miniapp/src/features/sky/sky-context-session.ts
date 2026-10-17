import { canApplyContextRestore, sameContextVersion, type ContextVersion } from "../../services/observation-context-version";

interface ContextSelection {
  observationContext: ContextVersion | null;
  selectedSpotId: string | null;
  mapResetVersion: number;
  spotOpenRequestVersion: number;
}

interface ContextRequest {
  epoch: number;
  expected: ContextSelection;
}

const snapshotOf = (state: ContextSelection): ContextSelection => ({
  observationContext: state.observationContext,
  selectedSpotId: state.selectedSpotId,
  mapResetVersion: state.mapResetVersion,
  spotOpenRequestVersion: state.spotOpenRequestVersion,
});

const sameLocationSelection = (expected: ContextSelection, current: ContextSelection) =>
  expected.selectedSpotId === current.selectedSpotId &&
  expected.mapResetVersion === current.mapResetVersion &&
  expected.spotOpenRequestVersion === current.spotOpenRequestVersion;
const sameSelection = (expected: ContextSelection, current: ContextSelection) =>
  sameLocationSelection(expected,current) &&
  sameContextVersion(expected.observationContext, current.observationContext);

/** Page-local ownership only; the store/API remain the sole Context data owners. */
export function createSkyContextSession(routeContextId: string, read: () => ContextSelection) {
  const entry = snapshotOf(read());
  let contextId = routeContextId;
  let lookupSettled = entry.observationContext?.contextId === contextId;
  let visible = true;
  let epoch = 0;
  let pending: ContextRequest | null = null;

  const canLookup = () => visible && !lookupSettled && sameSelection(entry, read());
  const ownsContext = (expected: ContextVersion) => {
    const current=read();
    return sameLocationSelection(entry,current)&&expected.contextId===contextId&&
      sameContextVersion(expected,current.observationContext);
  };
  const canRequest = (expected: ContextVersion) => visible && !pending && ownsContext(expected);
  const isCurrent = (request: ContextRequest) => visible && pending === request &&
    request.epoch === epoch && sameSelection(request.expected, read());

  return {
    get contextId() { return contextId; },
    get busy() { return pending !== null; },
    get visibilityRevision() { return epoch; },
    // Cleanup for this render may run during its first hide, but must not
    // retract a new interaction after show or a later visibility cycle.
    canRetireInteraction(revision: number) { return epoch === revision || (!visible && epoch === revision + 1); },
    canLookup,
    ownsContext,
    canRequest,
    acceptLookup(incoming: ContextVersion) {
      if (!canLookup() || incoming.contextId !== contextId ||
        !canApplyContextRestore(entry.observationContext, read().observationContext, incoming)) return false;
      lookupSettled = true;
      return true;
    },
    begin(expected: ContextVersion) {
      if (!canRequest(expected)) return null;
      pending = { epoch, expected: snapshotOf(read()) };
      return pending;
    },
    isCurrent,
    accept(request: ContextRequest, incoming: ContextVersion) {
      if (!isCurrent(request) ||
        !canApplyContextRestore(request.expected.observationContext, read().observationContext, incoming)) return false;
      contextId = incoming.contextId;
      lookupSettled = true;
      return true;
    },
    finish(request: ContextRequest) {
      if (!visible || request.epoch !== epoch || pending !== request) return false;
      pending = null;
      return true;
    },
    hide() { if (!visible) return; visible = false; epoch++; pending = null; },
    show() { visible = true; },
  };
}
