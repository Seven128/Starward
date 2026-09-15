import type { HourlySkyRow } from "@starward/miniapp-contracts";

export function exactSkyRow(rows: readonly HourlySkyRow[], at: string) {
  const instant = Date.parse(at);
  if (!Number.isFinite(instant)) return null;
  return rows.find((row) => Date.parse(row.at) === instant) ?? null;
}

export function formatMetric(value: number | null | undefined, unit: string, digits = 0) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "暂无数据"
    : `${value.toFixed(digits)}${unit}`;
}

export function windDirectionLabel(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "风向";
  const directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"] as const;
  const normalized = ((value % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length]!;
}

export function darknessLabel(value: HourlySkyRow["darkness"] | undefined) {
  return value === "ASTRONOMICAL_NIGHT" ? "天文夜" : value === "TWILIGHT" ? "暮光" : value === "DAY" ? "白昼" : "暂无数据";
}
