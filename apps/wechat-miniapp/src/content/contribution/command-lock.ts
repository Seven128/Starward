import type { RequestOperationScope } from "@/services/authenticated-operation";

export interface ContributionOperationState {
  userId: string | null;
  ownerId: string | null;
  reset: number;
  page: unknown;
  target: string;
}

export interface ContributionOperation extends RequestOperationScope {
  isCurrent(): boolean;
  authenticate(): void;
  native<T>(action: () => Promise<T>): Promise<T>;
  release(): void;
}

/** One editor owns one intent. Returning to A can start a new intent, never revive an old one. */
export function createContributionOperationOwner(read: () => ContributionOperationState, onBusy: (busy: boolean) => void) {
  let mounted = true, visible = true;
  let pending: { state: ContributionOperationState; bootstrap: boolean; initialized: boolean; nativeDepth: number; returning: boolean; renewal: { owner: string; cleared: boolean } | null } | undefined;
  const retire = () => {
    if (!pending) return;
    pending = undefined;
    if (mounted) onBusy(false);
  };
  const same = (a: ContributionOperationState, b: ContributionOperationState) =>
    a.userId === b.userId && a.ownerId === b.ownerId && a.reset === b.reset && a.page === b.page && a.target === b.target;
  const observe = () => {
    if (!pending) return;
    const attempt = pending;
    const next = read();
    if (pending !== attempt) return;
    const previous = attempt.state;
    if (same(previous, next)) return;
    if (attempt.renewal && next.page === previous.page && next.target === previous.target && next.reset === previous.reset + 1) {
      const renewal = attempt.renewal;
      if (!renewal.cleared && previous.ownerId === renewal.owner && next.ownerId === null && next.userId === null) {
        renewal.cleared = true; attempt.state = next; return;
      }
      if (renewal.cleared && previous.ownerId === null && next.ownerId === renewal.owner && next.userId === renewal.owner) {
        attempt.renewal = null; attempt.state = next; return;
      }
    }
    // ensureSession writes native identity, then binds null→A exactly once. No later reset is initialization.
    if (attempt.bootstrap && !attempt.initialized && previous.ownerId === null && next.ownerId &&
      next.userId === next.ownerId && (previous.userId === null || previous.userId === next.userId) &&
      next.reset === previous.reset + 1 && next.page === previous.page && next.target === previous.target) {
      attempt.state = next;
      attempt.initialized = true;
      return;
    }
    retire();
  };
  const begin = ({ allowAuthentication = false }: { allowAuthentication?: boolean } = {}): ContributionOperation | undefined => {
    observe();
    if (!mounted || !visible || pending) return;
    const state = read();
    if (!state.page || (state.ownerId && state.userId !== state.ownerId) ||
      (!allowAuthentication && (!state.userId || state.userId !== state.ownerId))) return;
    const attempt = { state, bootstrap: allowAuthentication && !state.ownerId, initialized: false, nativeDepth: 0, returning: false, renewal: null as { owner: string; cleared: boolean } | null };
    pending = attempt;
    const isCurrent = () => {
      observe();
      return mounted && pending === attempt && (visible || attempt.nativeDepth > 0 || attempt.returning);
    };
    const assertCurrent = () => { if (!isCurrent()) throw new Error("contribution_operation_retired"); };
    onBusy(true);
    return {
      isCurrent, assertCurrent,
      authenticate() {
        assertCurrent();
        if (!attempt.state.userId || attempt.state.userId !== attempt.state.ownerId) throw new Error("contribution_account_unresolved");
        attempt.bootstrap = false;
      },
      async renewSession(action) {
        assertCurrent();
        if ((attempt.bootstrap && !attempt.initialized) || attempt.renewal || !attempt.state.userId || attempt.state.userId !== attempt.state.ownerId)
          throw new Error("contribution_account_unresolved");
        // The first authenticated history read may reject the just-projected stored token
        // before its caller reaches authenticate(). Its completed bootstrap is not a new account allowance.
        attempt.bootstrap = false;
        attempt.renewal = { owner: attempt.state.userId, cleared: false };
        try { return await action(); }
        finally {
          if (pending === attempt) {
            observe();
            if (pending === attempt && (!attempt.state.userId || attempt.state.userId !== attempt.state.ownerId)) retire();
            attempt.renewal = null;
          }
        }
      },
      async native(action) {
        assertCurrent();
        attempt.nativeDepth++;
        try { return await action(); }
        finally {
          attempt.nativeDepth--;
          // A native callback can arrive before didShow. Only the known handoff may bridge that order.
          if (pending === attempt && !visible) attempt.returning = true;
        }
      },
      release() { if (pending === attempt) retire(); },
    };
  };
  return { begin, observe, retire,
    hide() { visible = false; if (pending && pending.nativeDepth === 0 && !pending.returning) retire(); },
    show() { visible = true; if (pending) pending.returning = false; observe(); },
    dispose() { mounted = false; retire(); },
  };
}
