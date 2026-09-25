import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { ringContainsOrBorders, type Ring } from "./timezone-polygon.ts";

type Polygon = readonly Ring[];

export const MACAO_TIMEZONE_SOURCE: SourceSummary = {
  id: "tz-boundary:asia-macau:2026d",
  kind: "OPEN_DATA",
  provider: "Timezone Boundary Builder / OpenStreetMap",
  title: "澳门时区边界（2026d）",
  sourceUrl: "https://github.com/evansiroky/timezone-boundary-builder/releases/tag/2026d",
  license: "Open Database License (ODbL) 1.0",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  publishedAt: "2026-09-16T05:14:41Z",
  retrievedAt: null,
  validFrom: null,
  validTo: null,
  state: "ESTIMATED",
  confidence: null,
  precision: "OpenStreetMap 近似时区边界；仅用于当前大湾区试点地点判定",
  limitations: ["不代表法定行政区边界或海上时区。", "2026d 快照需随来源更新复核。"],
  attribution: {
    name: "Timezone Boundary Builder / OpenStreetMap contributors",
    url: "https://github.com/evansiroky/timezone-boundary-builder/releases/tag/2026d",
    statements: ["包含 Timezone Boundary Builder 基于 OpenStreetMap 的数据，依据 ODbL 1.0 开放数据库许可使用。"],
  },
};

// A separately licensed, pinned timezone feature. The trial resolver uses it
// only for the Macao side of the neighboring Zhuhai/Macao area.
const polygons: readonly Polygon[] = (() => {
  const bytes = readFileSync(new URL("../assets/timezone/asia-macau-2026d.geojson", import.meta.url));
  if (createHash("sha256").update(bytes).digest("hex") !==
    "56cef0b6e06b101906528b167d39aa48a7af14ce80f971d350f65db35f0f9c58")
    throw new Error("observation_timezone_boundary_invalid");
  const feature: unknown = JSON.parse(bytes.toString("utf8"));
  if (!feature || typeof feature !== "object" || !("type" in feature) ||
    feature.type !== "Feature" || !("properties" in feature) ||
    !feature.properties || typeof feature.properties !== "object" ||
    !("tzid" in feature.properties) || feature.properties.tzid !== "Asia/Macau" ||
    !("geometry" in feature) || !feature.geometry ||
    typeof feature.geometry !== "object" || !("type" in feature.geometry) ||
    feature.geometry.type !== "MultiPolygon" ||
    !("coordinates" in feature.geometry) || !Array.isArray(feature.geometry.coordinates))
    throw new Error("observation_timezone_boundary_invalid");
  const coordinates: unknown = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 4 ||
    !coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 &&
      polygon.every((ring: unknown) => Array.isArray(ring) && ring.length >= 4 &&
        ring.every((point: unknown) => Array.isArray(point) && point.length === 2 &&
          point.every(Number.isFinite)))))
    throw new Error("observation_timezone_boundary_invalid");
  return coordinates as Polygon[];
})();

export function isMacaoTimezonePoint(latitude: number, longitude: number) {
  if (latitude < 22.076667 || latitude > 22.217036 ||
    longitude < 113.528167 || longitude > 113.630139) return false;
  return polygons.some(([outer, ...holes]) =>
    ringContainsOrBorders(outer!, longitude, latitude) &&
    !holes.some((hole) => ringContainsOrBorders(hole, longitude, latitude)));
}
