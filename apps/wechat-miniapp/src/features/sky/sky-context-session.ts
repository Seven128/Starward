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

const sameSelection = (expected: ContextSelection, current: ContextSelection) =>
  expected.selectedSpotId === current.selectedSpotId &&
  expected.mapResetVersion === current.mapResetVersion &&
  expected.spotOpenRequestVersion === current.spotOpenRequestVersion &&
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
  const isCurrent = (request: ContextRequest) => visible && pending === request &&
    request.epoch === epoch && sameSelection(request.expected, read());

  return {
    get contextId() { return contextId; },
    get busy() { return pending !== null; },
    canLookup,
    acceptLookup(incoming: ContextVersion) {
      if (!canLookup() || incoming.contextId !== contextId ||
        !canApplyContextRestore(entry.observationContext, read().observationContext, incoming)) return false;
      lookupSettled = true;
      return true;
    },
    begin(expected: ContextVersion) {
      const current = snapshotOf(read());
      if (!visible || pending || expected.contextId !== contextId ||
        !sameContextVersion(expected, current.observationContext)) return null;
      pending = { epoch, expected: current };
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
    hide() { visible = false; epoch++; pending = null; },
    show() { visible = true; },
  };
}
