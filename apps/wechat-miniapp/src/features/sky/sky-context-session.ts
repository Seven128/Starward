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

// Query can outlive the page. Shared prototype methods cannot inherit a render
// closure when the compressor inlines the factory into a page's useMemo.
class SkyContextSession {
  private readonly entry: ContextSelection;
  private acceptedContextId: string;
  private lookupSettled: boolean;
  private visible = true;
  private epoch = 0;
  private pending: ContextRequest | null = null;

  constructor(routeContextId: string, private readonly read: () => ContextSelection) {
    this.entry = snapshotOf(read());
    this.acceptedContextId = routeContextId;
    this.lookupSettled = this.entry.observationContext?.contextId === routeContextId;
  }

  get contextId() { return this.acceptedContextId; }
  get busy() { return this.pending !== null; }
  get visibilityRevision() { return this.epoch; }
  // Cleanup for this render may run during its first hide, but must not
  // retract a new interaction after show or a later visibility cycle.
  canRetireInteraction(revision: number) {
    return this.epoch === revision || (!this.visible && this.epoch === revision + 1);
  }
  canLookup() { return this.visible && !this.lookupSettled && sameSelection(this.entry, this.read()); }
  ownsContext(expected: ContextVersion) {
    const current = this.read();
    return sameLocationSelection(this.entry, current) && expected.contextId === this.acceptedContextId &&
      sameContextVersion(expected, current.observationContext);
  }
  canRequest(expected: ContextVersion) { return this.visible && !this.pending && this.ownsContext(expected); }
  isCurrent(request: ContextRequest) {
    return this.visible && this.pending === request && request.epoch === this.epoch &&
      sameSelection(request.expected, this.read());
  }
  acceptLookup(incoming: ContextVersion) {
    if (!this.canLookup() || incoming.contextId !== this.acceptedContextId ||
      !canApplyContextRestore(this.entry.observationContext, this.read().observationContext, incoming)) return false;
    this.lookupSettled = true;
    return true;
  }
  begin(expected: ContextVersion) {
    if (!this.canRequest(expected)) return null;
    this.pending = { epoch: this.epoch, expected: snapshotOf(this.read()) };
    return this.pending;
  }
  accept(request: ContextRequest, incoming: ContextVersion) {
    if (!this.isCurrent(request) ||
      !canApplyContextRestore(request.expected.observationContext, this.read().observationContext, incoming)) return false;
    this.acceptedContextId = incoming.contextId;
    this.lookupSettled = true;
    return true;
  }
  finish(request: ContextRequest) {
    if (!this.visible || request.epoch !== this.epoch || this.pending !== request) return false;
    this.pending = null;
    return true;
  }
  hide() { if (!this.visible) return; this.visible = false; this.epoch++; this.pending = null; }
  show() { this.visible = true; }
}

/** Page-local ownership only; the store/API remain the sole Context data owners. */
export function createSkyContextSession(routeContextId: string, read: () => ContextSelection): Pick<SkyContextSession, keyof SkyContextSession> {
  return new SkyContextSession(routeContextId, read);
}
