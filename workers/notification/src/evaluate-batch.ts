export function evaluateNotificationBatch(input: { events: Array<{ id: string; grid: string; version: number }>; subscriptions: Array<{ id: string; grid: string; cooldownUntil: string | null }> }) {
  const uniqueEvents = [...new Map(input.events.map((event) => [`${event.id}:${event.grid}:${event.version}`, event])).values()];
  const notifications = uniqueEvents.flatMap((event) => input.subscriptions.filter((subscription) => subscription.grid === event.grid && !subscription.cooldownUntil).map((subscription) => ({
    subscriptionId: subscription.id,
    eventId: event.id,
    idempotencyKey: `${event.id}:${event.version}:${subscription.id}`,
  })));
  return { notifications, audit: { duplicateEvents: input.events.length - uniqueEvents.length }, executionMode: "affected-grid-batch" };
}
