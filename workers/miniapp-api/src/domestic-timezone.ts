import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { find, setCache } from "geo-tz/all";
import type { SourceSummary } from "@starward/miniapp-contracts";

const publication = JSON.parse(readFileSync(new URL("../assets/timezone/geo-tz-8.1.10.publication.json", import.meta.url), "utf8")) as {
  schemaVersion: string; packageVersion: string; sourceUrl: string; verifiedAt: string;
  files: { file: string; byteSize: number; sha256: string }[];
};
const dataPath = path.resolve(path.dirname(createRequire(import.meta.url).resolve("geo-tz/all")), "../data");
if (publication.schemaVersion !== "starward-timezone-geo-publication-v1" || publication.packageVersion !== "8.1.10"
  || publication.files.length !== 2 || (process.env.GEO_TZ_DATA_PATH && path.resolve(process.env.GEO_TZ_DATA_PATH) !== dataPath))
  throw new Error("observation_timezone_publication_invalid");
for (const [index, file] of publication.files.entries()) {
  if (file.file !== ["timezones.geojson.index.json", "timezones.geojson.geo.dat"][index]) throw new Error("observation_timezone_publication_invalid");
  const bytes = readFileSync(path.join(dataPath, file.file));
  if (bytes.length !== file.byteSize || createHash("sha256").update(bytes).digest("hex") !== file.sha256)
    throw new Error("observation_timezone_publication_invalid");
}

// Do not preload worldwide geometry or keep an unbounded geographic history.
// Oversized decoded regions are usable for that lookup but are not retained.
class GeometryCache extends Map<string, unknown> {
  private readonly weights = new Map<string, number>();
  private bytes = 0;
  override set(key: string, value: unknown) {
    const weight = Buffer.byteLength(JSON.stringify(value));
    this.bytes -= this.weights.get(key) ?? 0;
    super.delete(key); this.weights.delete(key);
    if (weight > 8 * 1024 * 1024) return this;
    super.set(key, value); this.weights.set(key, weight); this.bytes += weight;
    while (this.size > 32 || this.bytes > 8 * 1024 * 1024) {
      const oldest = this.keys().next().value!;
      this.bytes -= this.weights.get(oldest)!; this.weights.delete(oldest); super.delete(oldest);
    }
    return this;
  }
}
setCache({ store: new GeometryCache() });

export const DOMESTIC_TIMEZONE_SOURCE: SourceSummary = {
  id: "tz-boundary:geo-tz:8.1.10:comprehensive", kind: "OPEN_DATA",
  provider: "Timezone Boundary Builder / OpenStreetMap", title: "地点时区边界",
  sourceUrl: publication.sourceUrl, license: "Open Database License (ODbL) 1.0",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  publishedAt: null, retrievedAt: publication.verifiedAt, validFrom: null, validTo: null,
  state: "ESTIMATED", confidence: null,
  precision: "geo-tz 8.1.10 完整时区身份的地理边界查询；不以设备时区或试点地点集合代替位置证据",
  limitations: ["边界依据OpenStreetMap，不代表法定行政区或海上专属经济区。", "大陆观测使用北京时间；新疆同时存在的Asia/Urumqi不替代Asia/Shanghai。"],
  attribution: { name: "Timezone Boundary Builder / OpenStreetMap contributors",
    url: "https://github.com/evansiroky/timezone-boundary-builder",
    statements: ["包含Timezone Boundary Builder基于OpenStreetMap的数据，依据ODbL 1.0开放数据库许可使用；geo-tz进行了索引与编码。"],
  },
};

/** Keep actual civil-zone identity. Outside supported domestic zones, a phone
 * hint cannot authorize a timezone; overlapping foreign borders stay unknown. */
export function domesticTimezone(latitude: number, longitude: number) {
  const zones = find(latitude, longitude);
  if (zones.includes("Asia/Shanghai") && zones.every(zone => zone === "Asia/Shanghai" || zone === "Asia/Urumqi")) return "Asia/Shanghai";
  if (zones.length === 1 && ["Asia/Hong_Kong", "Asia/Macau", "Asia/Taipei"].includes(zones[0]!)) return zones[0]!;
  throw new Error("observation_timezone_resolution_unavailable");
}
