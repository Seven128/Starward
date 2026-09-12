import type { ObservationPlan, PlanChecklistCompletionRequest } from "@starward/miniapp-contracts";
import type { createAuthenticatedOperationRequester } from "./authenticated-operation";
import { createMutationRetry } from "./mutation-retry";

export function createPlanChecklistClient(deps: {
  request: ReturnType<typeof createAuthenticatedOperationRequester>;
  currentUser(): string | null;
  makeKey(): string;
  confirmed(owner: string, plan: ObservationPlan): Promise<void>;
}) {
  const retry = createMutationRetry(deps.makeKey);
  return async (owner: string, planId: string, input: PlanChecklistCompletionRequest) => {
    const check = () => { if (!owner || deps.currentUser() !== owner) throw new Error("账户已变化，请重新打开计划。"); };
    check();
    const body = { reminderId: input.reminderId, itemId: input.itemId, completed: input.completed, expectedRevision: input.expectedRevision };
    const result = await retry(owner, { planId, ...body }, key => deps.request("plan-checklist:" + planId, "planChecklistCompletionPut", {
      auth: "REQUIRED", pathParams: { planId }, body, idempotencyKey: key,
    }, false, owner));
    check();
    await deps.confirmed(owner, result.data);
    check();
    return result;
  };
}
