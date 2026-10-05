import { createAccountOperationOwner } from "../../../hooks/account-operation";

/** Actual operation owner with explicit RAM page/identity ports for extracted page commands. */
export function createPlanTestOperations(readUser: () => string | null, busy: { current: boolean }, readPage?: () => unknown) {
  const page = {};
  return createAccountOperationOwner(() => {
    const userId = readUser();
    return { userId, ownerId: userId, reset: 0, page: readPage ? readPage() : page, target: "plan-test" };
  }, value => { busy.current = value; });
}
