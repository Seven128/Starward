import { isSkyPlanetReference } from "./sky-planet-identity.ts";
import { isSkyLuminaryReference, skyLuminaryBody, SKY_LUMINARY_NAMES } from "./sky-luminary-identity.ts";

/** BSC5P component identities; HIP aliases cannot be used as runtime keys. */
export function isBrightStarReference(value: unknown): value is string {
  return typeof value === "string" && /^HR:[1-9]\d{0,3}$/u.test(value) && Number(value.slice(3)) <= 9110;
}
export function isCelestialObjectReference(value: unknown): value is string {
  return isBrightStarReference(value) || isSaoStarReference(value) || isSkyPlanetReference(value) || isSkyLuminaryReference(value) || typeof value === "string" && /^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(value);
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
