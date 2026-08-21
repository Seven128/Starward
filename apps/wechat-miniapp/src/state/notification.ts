export type NotificationTone = "error" | "warning" | "info" | "success";
export type NotificationPlacement = "inline" | "floating";

export interface NotificationAction {
  label: string;
  route?: string;
  navigation?: "navigateTo" | "switchTab";
}

export interface NotificationIntent {
  id?: string;
  owner: string;
  tone: NotificationTone;
  placement: NotificationPlacement;
  title: string;
  body: string;
  action?: NotificationAction;
  dismissible?: boolean;
  dedupeKey?: string;
}

export interface NotificationRecord extends NotificationIntent {
  id: string;
  createdAt: number;
  occurrences: number;
}

const TONE_PRIORITY: Readonly<Record<NotificationTone, number>> = {
  error: 4,
  warning: 3,
  info: 2,
  success: 1,
};

function identity(intent: NotificationIntent) {
  return (
    intent.dedupeKey ??
    [
      intent.owner,
      intent.placement,
      intent.tone,
      intent.title,
      intent.body,
    ].join("\u001f")
  );
}

function recordIdentity(record: NotificationRecord) {
  return identity(record);
}

export function enqueueNotification(
  queue: readonly NotificationRecord[],
  intent: NotificationIntent,
  now = Date.now(),
): NotificationRecord[] {
  const key = identity(intent);
  const existing = queue.find((item) => recordIdentity(item) === key);
  const next: NotificationRecord = existing
    ? {
        ...existing,
        ...intent,
        id: existing.id,
        createdAt: now,
        occurrences: existing.occurrences + 1,
      }
    : {
        ...intent,
        id: intent.id ?? `notification-${now}-${queue.length}`,
        createdAt: now,
        occurrences: 1,
      };
  return [next, ...queue.filter((item) => recordIdentity(item) !== key)].slice(
    0,
    24,
  );
}

export function dismissNotification(
  queue: readonly NotificationRecord[],
  id: string,
) {
  return queue.filter((item) => item.id !== id);
}

export function selectNotification(
  queue: readonly NotificationRecord[],
  placement: NotificationPlacement,
  owner?: string,
) {
  const eligible = queue
    .filter(
      (item) =>
        item.placement === placement &&
        (owner === undefined || item.owner === owner),
    )
    .sort(
      (left, right) =>
        TONE_PRIORITY[right.tone] - TONE_PRIORITY[left.tone] ||
        right.createdAt - left.createdAt,
    );
  return {
    current: eligible[0] ?? null,
    residualCount: Math.max(0, eligible.length - 1),
  };
}
