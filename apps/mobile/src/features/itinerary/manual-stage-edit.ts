import { isObservingNight, normalizeUtcMoment } from "../../../../../packages/contracts/src/observing-time";
import { validateTimeline, type ItineraryStage } from "../../../../../packages/domain/src/itinerary/index";

export const stageNames: Record<ItineraryStage["kind"], string> = { departure: "出发", scouting: "勘察", "blue-hour": "蓝调", observation: "观测", moonless: "无月时段", "target-window": "目标窗口", return: "返回", dawn: "清晨" };
export const manualStageKinds = ["departure", "scouting", "observation", "return"] as const;
export type ManualStageKind = typeof manualStageKinds[number];
export interface StageMomentInput { date: string; time: string; selectedInstant: string | null; originalInstant: string | null }
export interface ManualStageInput { id: string; kind: ManualStageKind; start: StageMomentInput; end: StageMomentInput }
interface LocalMoment { date: string; time: string }
export interface StageMomentChoice { instant: string; offset: string }

/** Local clock editing stays at this feature boundary. UTC qualification and
 * overlap rules remain with their existing contract/domain owners. */
export function manualStageClock(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, calendar: "iso8601", era: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const local = (instant: string): LocalMoment => {
    const date = new Date(instant), parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    const year = parts.era === "BC" ? 1 - Number(parts.year) : Number(parts.year);
    return { date: `${String(year).padStart(4, "0")}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}.${String(date.getUTCMilliseconds()).padStart(3, "0")}` };
  };
  const localAnchor = (value: LocalMoment) => isObservingNight(value.date) && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/u.test(value.time)
    ? normalizeUtcMoment(`${value.date}T${value.time.length === 5 ? `${value.time}:00` : value.time}Z`) : null;
  const offsetAt = (instant: string) => {
    const wall = localAnchor(local(instant));
    return wall === null ? null : Date.parse(wall) - Date.parse(instant);
  };
  const choices = (value: StageMomentInput): StageMomentChoice[] => {
    const anchor = localAnchor(value); if (!anchor) return [];
    const at = Date.parse(anchor), offsets = new Set<number>();
    // Get the zone's offsets on both sides of this local date, then qualify
    // every candidate by an exact local roundtrip. No device-zone parsing or
    // silent spring-gap adjustment supplies a result.
    for (const sample of [new Date(at - 86_400_000).toISOString(), anchor, new Date(at + 86_400_000).toISOString(), value.originalInstant]) {
      if (!sample) continue; const offset = offsetAt(sample); if (offset !== null) offsets.add(offset);
    }
    return [...offsets].flatMap(offset => {
      const instant = new Date(at - offset).toISOString();
      if (localAnchor(local(instant)) !== anchor || normalizeUtcMoment(instant) === null) return [];
      const absoluteSeconds = Math.abs(offset / 1000), hours = Math.floor(absoluteSeconds / 3600), minutes = Math.floor(absoluteSeconds / 60) % 60, seconds = absoluteSeconds % 60;
      return [{ instant, offset: `UTC${offset < 0 ? "−" : "+"}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}${seconds ? `:${String(seconds).padStart(2, "0")}` : ""}` }];
    }).sort((a, b) => Date.parse(a.instant) - Date.parse(b.instant));
  };
  const inspect = (value: StageMomentInput) => {
    const possible = choices(value);
    return { choices: possible, instant: possible.length === 1 ? possible[0].instant : possible.find(choice => choice.instant === value.selectedInstant)?.instant ?? null };
  };
  return {
    local, choices, inspect,
    input(instant: string): StageMomentInput {
      const originalInstant = normalizeUtcMoment(instant); if (!originalInstant) throw new TypeError("itinerary_stage_time_invalid");
      return { ...local(originalInstant), selectedInstant: originalInstant, originalInstant };
    },
    resolve(value: StageMomentInput): string | null {
      return inspect(value).instant;
    },
  };
}

export function manualStageInputs(stages: ItineraryStage[], timezone: string): ManualStageInput[] | null {
  try {
    const clock = manualStageClock(timezone), ids = new Set<string>();
    return stages.map(stage => {
      if (!manualStageKinds.includes(stage.kind as ManualStageKind) || ids.has(stage.id) || Object.keys(stage).some(key => !["id", "kind", "startsAt", "endsAt"].includes(key))) throw new TypeError("itinerary_stage_not_manually_editable");
      ids.add(stage.id);
      return { id: stage.id, kind: stage.kind as ManualStageKind, start: clock.input(stage.startsAt), end: clock.input(stage.endsAt) };
    });
  } catch { return null; }
}

export function resolveManualStages(values: ManualStageInput[], timezone: string): { stages: ItineraryStage[]; error: null } | { stages: null; error: string } {
  const clock = manualStageClock(timezone), stages: ItineraryStage[] = [];
  for (const [index, value] of values.entries()) {
    const startsAt = clock.resolve(value.start), endsAt = clock.resolve(value.end);
    if (!startsAt || !endsAt) return { stages: null, error: `第 ${index + 1} 阶段的时刻未核对，请检查日期、时间或重复时刻的选择。` };
    stages.push({ id: value.id, kind: value.kind, startsAt, endsAt });
  }
  const timeline = validateTimeline(stages);
  if (!timeline.valid) return { stages: null, error: "阶段结束须晚于开始，且各阶段不能重叠。原安排尚未保存。" };
  return { stages, error: null };
}

export function stageComparisonTime(value: string, timezone: string) {
  const instant = normalizeUtcMoment(value); if (!instant) return "时刻不可用";
  const local = new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(instant));
  return `${local}（${instant.replace("T", " ").replace("Z", " UTC")}）`;
}
