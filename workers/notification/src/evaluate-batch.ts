export interface NotificationEvent { id: string; grid: string; version: number; category?: "pretrip" | "intrip" | "long-term"; occurredAt?: string; previousValue?: number; currentValue?: number; threshold?: number; direction?: "above" | "below" }
export interface NotificationSubscription { id: string; grid: string; cooldownUntil: string | null; enabled?: boolean; categoryEnabled?: boolean; quietHours?: { start: number; end: number; timezone: string }; lastEdgeState?: boolean; channel?: "local" | "inbox" | "apns" | "fcm" | "vendor" | "expo-poc" }
const crossed = (event: NotificationEvent) => event.threshold === undefined || event.currentValue === undefined ? true : event.direction === "below" ? (event.previousValue ?? Infinity) >= event.threshold && event.currentValue < event.threshold : (event.previousValue ?? -Infinity) < event.threshold && event.currentValue >= event.threshold;
const inCooldown = (value: string | null, now: string) => Boolean(value && Date.parse(value) > Date.parse(now));
export function evaluateNotificationBatch(input: { events: NotificationEvent[]; subscriptions: NotificationSubscription[]; now?: string }) {
  const now = input.now ?? new Date().toISOString();
  const uniqueEvents = [...new Map(input.events.map((event) => [`${event.id}:${event.grid}:${event.version}`, event])).values()];
  const audit: Array<{ subscriptionId: string; eventId: string; result: string }> = [];
  const notifications = uniqueEvents.flatMap((event) => input.subscriptions.filter((subscription) => subscription.grid === event.grid).flatMap((subscription) => {
    const result = subscription.enabled === false || subscription.categoryEnabled === false ? "disabled" : inCooldown(subscription.cooldownUntil, now) ? "cooldown" : !crossed(event) || subscription.lastEdgeState === true ? "no-edge" : "eligible";
    audit.push({ subscriptionId: subscription.id, eventId: event.id, result });
    return result === "eligible" ? [{ subscriptionId: subscription.id, eventId: event.id, idempotencyKey: `${event.id}:${event.version}:${subscription.id}`, channel: subscription.channel ?? "inbox", snapshotAt: event.occurredAt ?? now }] : [];
  }));
  return { notifications, audit: { duplicateEvents: input.events.length - uniqueEvents.length, evaluations: audit }, executionMode: "affected-grid-batch" as const, perUserPolling: false };
}
