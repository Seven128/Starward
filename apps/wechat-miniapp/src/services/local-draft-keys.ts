const PLAN_DRAFT_PREFIX = "starward.plan-draft.v1:";
const CONTRIBUTION_DRAFT_PREFIX = "starward.contribution-draft.v1:";
const PROFILE_DRAFT_PREFIX = "starward.profile-draft.v1:";
export const planSaveStorageKey = (owner: string) => "starward.plan-save.v1:" + JSON.stringify([owner]);
export const planSaveBelongsTo = (key: string, owner: string) => key === planSaveStorageKey(owner);

export function profileDraftKey(userId: string | null): string | null {
  return userId ? PROFILE_DRAFT_PREFIX + JSON.stringify([userId]) : null;
}

export function profileDraftBelongsTo(key: string, userId: string): boolean {
  return key === profileDraftKey(userId);
}

export function contributionDraftKey(userId: string | null, routeSpotId: string | null): string | null {
  return userId ? CONTRIBUTION_DRAFT_PREFIX + JSON.stringify([userId, routeSpotId]) : null;
}

export function contributionDraftBelongsTo(key: string, userId: string): boolean {
  if (!key.startsWith(CONTRIBUTION_DRAFT_PREFIX)) return false;
  try {
    const value: unknown = JSON.parse(key.slice(CONTRIBUTION_DRAFT_PREFIX.length));
    return Array.isArray(value) && value.length === 2 && value[0] === userId &&
      (value[1] === null || typeof value[1] === "string");
  } catch { return false; }
}

export function planDraftKey(userId: string | null, planId: string | null, newSpotId: string | null = null): string | null {
  return userId ? PLAN_DRAFT_PREFIX + JSON.stringify(planId === null && newSpotId ? [userId, null, newSpotId] : [userId, planId]) : null;
}

export function planDraftBelongsTo(key: string, userId: string): boolean {
  if (!key.startsWith(PLAN_DRAFT_PREFIX)) return false;
  try {
    const value: unknown = JSON.parse(key.slice(PLAN_DRAFT_PREFIX.length));
    return Array.isArray(value) && value[0] === userId &&
      ((value.length === 2 && (value[1] === null || typeof value[1] === "string")) ||
       (value.length === 3 && value[1] === null && typeof value[2] === "string"));
  } catch { return false; }
}
