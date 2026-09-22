/** BSC5P component identities; HIP aliases cannot be used as runtime keys. */
export function isBrightStarReference(value: unknown): value is string {
  return typeof value === "string" && /^HR:[1-9]\d{0,3}$/u.test(value) && Number(value.slice(3)) <= 9110;
}
export function isCelestialObjectReference(value: unknown): value is string {
  return isBrightStarReference(value) || isSaoStarReference(value) || typeof value === "string" && /^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(value);
}
export function isSaoStarReference(value:unknown):value is string {
  return typeof value==='string'&&/^SAO:[1-9]\d{0,5}$/u.test(value)&&Number(value.slice(4))<=258997;
}
