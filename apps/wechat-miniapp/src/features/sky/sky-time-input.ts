import { localParts, zonedLocalToUtc } from "@starward/miniapp-contracts";

export type SkyTimeField = "year" | "month" | "day" | "hour" | "minute" | "second";
export const SKY_TIME_FIELDS = ["year", "month", "day", "hour", "minute", "second"] as const;
export type SkyCivilTime = Record<SkyTimeField, number>;
const pad = (value: number, length = 2) => String(value).padStart(length, "0");
const monthDays = (year: number, month: number) => {
  const date = new Date(0); date.setUTCFullYear(year, month, 0); return date.getUTCDate();
};

/** The existing zoned converter owns offsets. Validate the complete civil
 * instant, including seconds; no per-field future comparison or fixed UTC+8. */
export function skyCivilInstant(value: SkyCivilTime, timezone: string): string | null {
  if (!SKY_TIME_FIELDS.every(field => Number.isInteger(value[field])) || value.year < 1 || value.year > 9999 ||
    value.month < 1 || value.month > 12 || value.day < 1 || value.day > monthDays(value.year, value.month) ||
    value.hour < 0 || value.hour > 23 || value.minute < 0 || value.minute > 59 || value.second < 0 || value.second > 59) return null;
  try {
    const minute = zonedLocalToUtc({ localDate: `${pad(value.year, 4)}-${pad(value.month)}-${pad(value.day)}`,
      localTime: `${pad(value.hour)}:${pad(value.minute)}`, timezone });
    const at = new Date(Date.parse(minute) + value.second * 1000).toISOString();
    const actual = localParts(new Date(at), timezone);
    return SKY_TIME_FIELDS.every(field => actual[field] === value[field]) ? at : null;
  } catch { return null; }
}

export function skyTimeInputAllowed(at: string, now: number): boolean {
  const value = Date.parse(at);
  return Number.isFinite(value) && Number.isFinite(now) && value <= now;
}

export function stepSkyCivilTime(at: string, timezone: string, field: SkyTimeField, delta: number, now: number): string | null {
  if (!Number.isInteger(delta)) return null;
  try {
    const next = { ...localParts(new Date(at), timezone) };
    if (field === "month" || field === "year") {
      const month = next.year * 12 + next.month - 1 + (field === "year" ? delta * 12 : delta);
      next.year = Math.floor(month / 12); next.month = ((month % 12) + 12) % 12 + 1;
      next.day = Math.min(next.day, monthDays(next.year, next.month));
    } else {
      const date = new Date(0);
      date.setUTCFullYear(next.year, next.month - 1, next.day);
      date.setUTCHours(next.hour, next.minute, next.second, 0);
      const setters = { day: "setUTCDate", hour: "setUTCHours", minute: "setUTCMinutes", second: "setUTCSeconds" } as const;
      date[setters[field]](next[field] + delta);
      next.year = date.getUTCFullYear(); next.month = date.getUTCMonth() + 1; next.day = date.getUTCDate();
      next.hour = date.getUTCHours(); next.minute = date.getUTCMinutes(); next.second = date.getUTCSeconds();
    }
    const civil = skyCivilInstant(next, timezone);
    const result = civil ? new Date(Date.parse(civil) + new Date(at).getUTCMilliseconds()).toISOString() : null;
    return result && skyTimeInputAllowed(result, now) ? result : null;
  } catch { return null; }
}

/** One repeat for all twelve arrows. Revocation clears the only pending task;
 * an elapsed compatibility click is consumed even after leaving the button. */
export function createSkyTimeRepeat(clock: {
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
  now?: () => number;
}) {
  let timer: unknown = null, generation = 0, touchedUntil = 0;
  const now = clock.now ?? Date.now;
  const stop = () => {
    generation++; if (timer !== null) clock.cancel(timer); timer = null;
    if (touchedUntil === Infinity) touchedUntil = now() + 500;
  };
  return {
    stop,
    start(step: () => boolean) {
      stop(); touchedUntil = Infinity;
      if (!step()) return;
      const expected = generation;
      const tick = () => {
        if (generation !== expected) return;
        timer = null;
        if (!step()) return;
        timer = clock.schedule(tick, 70);
      };
      timer = clock.schedule(tick, 380);
    },
    click(step: () => boolean) { const touched = now() <= touchedUntil; touchedUntil = 0; if (!touched) step(); },
  };
}
