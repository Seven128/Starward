import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";
import type { ContributionSubmission } from "@starward/miniapp-contracts";

const SAVE_TIMEZONE = "Asia/Shanghai";

export function contributionEditorSaveState(
  draft: Pick<ContributionSubmission, "updatedAt" | "review"> | null,
  saving: boolean,
  now = new Date(),
): { label: string; reviewed: boolean } {
  const resolution = draft?.review?.resolution;
  const reviewed = resolution === "REJECTED" || resolution === "CHANGES_REQUESTED";
  if (saving) return { label: "保存中…", reviewed };
  if (!draft) return { label: "尚未保存", reviewed: false };
  // A review changes updatedAt too. Only a later draft write is a new save.
  if (reviewed && Number.isFinite(Date.parse(draft.updatedAt)) &&
      Date.parse(draft.updatedAt) === Date.parse(draft.review!.reviewedAt)) {
    return { label: resolution === "REJECTED" ? "审核未通过" : "需补充", reviewed };
  }
  return { label: contributionSavedState(draft.updatedAt, now), reviewed };
}

export function contributionSavedState(
  updatedAt: string,
  now = new Date(),
): string {
  try {
    const updated = new Date(updatedAt);
    const savedDate = calendarDateInTimezone(updated, SAVE_TIMEZONE);
    const today = calendarDateInTimezone(now, SAVE_TIMEZONE);
    const time = clockTimeInTimezone(updated, SAVE_TIMEZONE);
    if (savedDate === today) return `${time} 已保存`;
    const date = savedDate.slice(0, 4) === today.slice(0, 4)
      ? savedDate.slice(5)
      : savedDate;
    return `${date} ${time} 已保存`;
  } catch {
    return "已保存";
  }
}
