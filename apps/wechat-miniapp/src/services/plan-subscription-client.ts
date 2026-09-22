import type { ReminderSubscriptionReportRequest } from "@starward/miniapp-contracts";
import type { createAuthenticatedOperationRequester } from "./authenticated-operation";

/** Transport only: preparing a challenge must never open a native subscription prompt. */
export function createPlanSubscriptionClient(deps: {
  request: ReturnType<typeof createAuthenticatedOperationRequester>;
  currentUser(): string | null;
  confirmed(owner: string): Promise<void>;
}) {
  const check = (owner: string) => {
    if (!owner || deps.currentUser() !== owner) throw new Error("账户已变化，请重新打开计划。");
  };
  return {
    async prepare(owner: string, planId: string, reminderId: string) {
      check(owner);
      const result = await deps.request("plan-subscription:" + planId, "reminderSubscriptionPreparePost", {
        auth: "REQUIRED", pathParams: { planId }, body: { reminderId },
      }, false, owner);
      check(owner);
      return result;
    },
    async report(owner: string, challengeId: string, choice: ReminderSubscriptionReportRequest["choice"]) {
      check(owner);
      const result = await deps.request("plan-subscription-report:" + challengeId, "reminderSubscriptionReportPut", {
        auth: "REQUIRED", pathParams: { challengeId }, body: { choice },
      }, false, owner);
      check(owner);
      if (result.data.recorded) {
        await deps.confirmed(owner);
        check(owner);
      }
      return result;
    },
  };
}
