import Taro from "@tarojs/taro";
import type { ObservationContext, ObservationPlan } from "@starward/miniapp-contracts";
import { currentDraftUserId, getCurrentPlansAfterSave, idempotencyKey, MiniappApiError, sendObservationPlanSave } from "@/services/api-client";
import { clearPlanSaveRecovery, createPlanSaveRetry, PlanSaveReviewRequired, samePlanSaveIntent } from "@/services/plan-save-retry";

const retryPlanSave = createPlanSaveRetry(Taro, () => idempotencyKey("plan-save"),
  error => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);

export function clearObservationPlanSaveRecovery(owner: string) {
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开计划。");
  clearPlanSaveRecovery(Taro, owner);
}

export async function saveObservationPlan(
  plan: Omit<ObservationPlan, "revision" | "updatedAt" | "contextSnapshot">,
  observationContextId: ObservationContext["contextId"],
  expectedRevision: number | null,
  owner: string,
  contextIdentity = observationContextId as string,
) {
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  const input = { ...plan, observationContextId, expectedRevision, contextIdentity };
  const attempt = await retryPlanSave(owner, input, async (key, original) => {
    try { return await sendObservationPlanSave(original, key, owner); }
    catch (error) {
      if (!(error instanceof MiniappApiError) || error.statusCode !== 409) throw error;
      // An uncertain request may never have committed. Resolve its current
      // revision before explicit review releases this exact pending operation.
      const current = await getCurrentPlansAfterSave(owner);
      throw new PlanSaveReviewRequired(original.planId,
        current.data.plans.find(item => item.planId === original.planId) ?? null,
        null, { owner, key, planId: original.planId });
    }
  });
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  const current = await getCurrentPlansAfterSave(owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  const latest = current.data.plans.find(item => item.planId === attempt.input.planId) ?? null;
  if (!latest || latest.revision !== attempt.result.data.revision || !samePlanSaveIntent(input, attempt.input))
    throw new PlanSaveReviewRequired(attempt.input.planId, latest, attempt.result.data.revision, attempt.receipt);
  return { ...attempt.result, data: latest, saveReceipt: attempt.receipt };
}
