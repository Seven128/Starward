import { SKY_PLANET_ORDER, type SkyPlanetBody } from "./types.ts";

/** Static Solar System identities; observing positions always come from a report row. */
export const SKY_PLANET_CATALOG_VERSION = "solar-system-planets@1";
/** SHA-256 of solar-system-planets@1:MERCURY,VENUS,MARS,JUPITER,SATURN,URANUS,NEPTUNE. */
export const SKY_PLANET_CATALOG_HASH = "72a6778eb982744ce16c4ba8129b42c22c66837fd63874cd97eb9e78ecf8e96d";
export const SKY_PLANET_NAMES: Readonly<Record<SkyPlanetBody, { zh: string; en: string }>> = {
  MERCURY: { zh: "水星", en: "Mercury" },
  VENUS: { zh: "金星", en: "Venus" },
  MARS: { zh: "火星", en: "Mars" },
  JUPITER: { zh: "木星", en: "Jupiter" },
  SATURN: { zh: "土星", en: "Saturn" },
  URANUS: { zh: "天王星", en: "Uranus" },
  NEPTUNE: { zh: "海王星", en: "Neptune" },
};
export function isSkyPlanetReference(value: unknown): value is `PLANET:${SkyPlanetBody}` {
  return typeof value === "string" && SKY_PLANET_ORDER.some(body => value === `PLANET:${body}`);
}
export function skyPlanetBody(reference: string): SkyPlanetBody | null {
  return isSkyPlanetReference(reference) ? reference.slice(7) as SkyPlanetBody : null;
}
