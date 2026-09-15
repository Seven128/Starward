import type { ObservationContext } from "@starward/miniapp-contracts";

/** One noon-to-noon axis shared by BFF map frames and their exact calculations. */
export function observationFrameTimes(context: Pick<ObservationContext, "nightStartUtc" | "nightEndUtc" | "selectedAtUtc">) {
  const start = Date.parse(context.nightStartUtc), end = Date.parse(context.nightEndUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("map_time_axis_invalid");
  const count = Math.ceil((end - start) / 1_800_000);
  if (count > 49) throw new Error("map_time_frame_limit_exceeded");
  const times = Array.from({ length: count }, (_, index) => start + index * 1_800_000);
  const selected = Date.parse(context.selectedAtUtc);
  if (Number.isFinite(selected) && selected >= start && selected < end && !times.includes(selected)) times.push(selected);
  if (times.length > 49) throw new Error("map_time_frame_limit_exceeded");
  return times.sort((a, b) => a - b).map(time => new Date(time).toISOString());
}
