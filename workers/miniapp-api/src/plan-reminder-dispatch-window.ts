/** Both the public projection and the dispatcher use the same hard boundary.
 * No configuration means no grace window. Restart recovery adds its own cutoff. */
export function reminderTriggerMissed(triggerAt: string, state: string, now: Date, maxLatenessMs = 0): boolean {
  const trigger = Date.parse(triggerAt);
  return !Number.isFinite(trigger) || (state === "SCHEDULED" && maxLatenessMs > 0
    ? now.getTime() > trigger + maxLatenessMs : now.getTime() >= trigger);
}
