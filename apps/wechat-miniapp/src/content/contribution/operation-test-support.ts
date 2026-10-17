import type { AccountOperation } from "../../hooks/account-operation";

/** RAM ports for older single-factory checks; lifecycle/dispatch coverage executes the real owner separately. */
export function testOperation(assertCurrent: () => void = () => {}): AccountOperation {
  return { assertCurrent, authenticate: assertCurrent,
    isCurrent: () => { try { assertCurrent(); return true; } catch { return false; } },
    native: action => action(), renewSession: action => action(), release: () => {},
  };
}
