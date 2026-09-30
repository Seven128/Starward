import { isCelestialObjectReference, celestialReferenceKindMatches, type ApiEnvelope, type CelestialObjectInformationData } from "@starward/miniapp-contracts";

/** Reject a wrong or malformed cached/network identity before either the
 * object modal or its source route can display it. */
export function matchingCelestialInformationResponse(
  response: ApiEnvelope<CelestialObjectInformationData>, reference: string, imagePublicationHash?: string,
) {
  const data = response?.data;
  const kindMatches = celestialReferenceKindMatches(reference, data?.kind);
  if (!isCelestialObjectReference(reference) || !data || data.reference !== reference || !kindMatches ||
    typeof data.displayName !== "string" || !data.displayName.trim() ||
    typeof data.catalogId !== "string" ||
    !Array.isArray(data.aliases) || !data.aliases.every(value => typeof value === "string") ||
    !(data.introduction === null || typeof data.introduction === "string") ||
    !Array.isArray(data.facts) || !data.facts.every(fact => fact && typeof fact.label === "string" &&
      typeof fact.value === "string" && (fact.unit === null || typeof fact.unit === "string")) ||
    !["READY", "BASIC_ONLY"].includes(data.contentState) ||
    typeof data.contentRevision !== "string" ||
    !Array.isArray(data.limitations) || !data.limitations.every(value => typeof value === "string") ||
    !Array.isArray(data.sources) || !data.sources.every(source => source &&
      typeof source.id === "string" && typeof source.kind === "string" && typeof source.provider === "string" &&
      typeof source.title === "string" && typeof source.license === "string" &&
      Array.isArray(source.limitations) && source.limitations.every((value: unknown) => typeof value === "string") &&
      (!source.attribution || typeof source.attribution.name === "string" &&
        typeof source.attribution.url === "string" && Array.isArray(source.attribution.statements) &&
        source.attribution.statements.every((value: unknown) => typeof value === "string"))))
    throw new Error("celestial_information_response_invalid");
  if (imagePublicationHash) {
    const imageSources = data.sources.filter(source => source.id.startsWith("imagery:"));
    if (!/^[a-f0-9]{64}$/u.test(imagePublicationHash) ||
      imageSources.some(source => !/^imagery:[^:]+:[a-f0-9]{64}$/u.test(source.id) || !source.id.endsWith(`:${imagePublicationHash}`)) ||
      (!imageSources.length && response.dataState !== "PARTIAL"))
      throw new Error("celestial_information_image_source_invalid");
  }
  return response;
}
