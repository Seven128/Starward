import type { ContributionOperation } from "./command-lock";

/** RAM ports for older single-factory checks; lifecycle/dispatch coverage executes the real owner separately. */
export function testOperation(assertCurrent: () => void = () => {}): ContributionOperation {
  return { assertCurrent, authenticate: assertCurrent,
    isCurrent: () => { try { assertCurrent(); return true; } catch { return false; } },
    native: action => action(), renewSession: action => action(), release: () => {},
  };
}
