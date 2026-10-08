import { isSkyPlanetReference } from "./sky-planet-identity.ts";
import { isSkyLuminaryReference, skyLuminaryBody, SKY_LUMINARY_NAMES } from "./sky-luminary-identity.ts";

/** BSC5P component identities; HIP aliases cannot be used as runtime keys. */
export function isBrightStarReference(value: unknown): value is string {
  return typeof value === "string" && /^HR:[1-9]\d{0,3}$/u.test(value) && Number(value.slice(3)) <= 9110;
}
export function isCelestialObjectReference(value: unknown): value is string {
  return isBrightStarReference(value) || isSaoStarReference(value) || isSkyPlanetReference(value) || isSkyLuminaryReference(value) || isDeepSkyObjectReference(value);
}
export function isDeepSkyObjectReference(value: unknown): value is string {
  return typeof value === "string" && (/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(value) ||
    /^(?:NGC|IC):[1-9]\d*$/u.test(value) && Number.isSafeInteger(Number(value.split(":")[1])));
}
/** Additive catalog generations are opt-in on report/search requests; older
 * clients keep the original default, references, bytes and derived hash. */
export const DEEP_SKY_MESSIER_CATALOG_VERSION = "opengc-messier-deep-sky.v20260501" as const;
export const EXTENDED_DEEP_SKY_CATALOG_VERSION = "opengc-deep-sky.v20260501-extended-v1" as const;
export function isDeepSkyCatalogVersion(value: unknown): value is typeof DEEP_SKY_MESSIER_CATALOG_VERSION | typeof EXTENDED_DEEP_SKY_CATALOG_VERSION {
  return value === DEEP_SKY_MESSIER_CATALOG_VERSION || value === EXTENDED_DEEP_SKY_CATALOG_VERSION;
}
/** Shared identity/category boundary for search, cached facts and their consumers. */
export function celestialReferenceKindMatches(reference: unknown, kind: unknown): boolean {
  if (!isCelestialObjectReference(reference)) return false;
  const luminary = skyLuminaryBody(reference);
  if (luminary) return kind === SKY_LUMINARY_NAMES[luminary].kind;
  if (isSkyPlanetReference(reference)) return kind === "PLANET";
  if (isBrightStarReference(reference) || isSaoStarReference(reference)) return kind === "STAR";
  return kind === "GALAXY" || kind === "NEBULA";
}
export function isSaoStarReference(value:unknown):value is string {
  return typeof value==='string'&&/^SAO:[1-9]\d{0,5}$/u.test(value)&&Number(value.slice(4))<=258997;
}
