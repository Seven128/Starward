import {
  assertStellarCatalogPublication, assertStellarCatalogReference,
  type ApiEnvelope, type StellarCatalogPublication, type StellarCatalogReference,
} from "@starward/miniapp-contracts";

interface Dependencies {
  request(reference: StellarCatalogReference, signal?: AbortSignal): Promise<ApiEnvelope<StellarCatalogPublication>>;
  invalidate(reference: StellarCatalogReference): void;
}

// Only this transport owner can admit an identity, after full validation and
// freezing validated catalogue fields below. Copying or shallow-freezing input is not admission.
const admittedPublications = new WeakSet<StellarCatalogPublication>();

/** Admission only establishes this exact transport object's validated fields;
 * consumers must still bind it to their requested version/hash. */
export function isAdmittedStellarCatalogPublication(value: StellarCatalogPublication): boolean {
  return admittedPublications.has(value);
}

/** Same operation/cache owner as reports; validates all network and cached representations. */
export function createStellarCatalogClient(deps: Dependencies) {
  return async function getStellarCatalog(reference: StellarCatalogReference, signal?: AbortSignal) {
    assertStellarCatalogReference(reference);
    const target = Object.freeze({ catalogVersion: reference.catalogVersion, catalogHash: reference.catalogHash });
    const envelope = await deps.request(target, signal);
    try {
      assertStellarCatalogPublication(envelope.data, target);
      if (JSON.stringify(envelope.sources) !== JSON.stringify(envelope.data.sources))
        throw new TypeError("stellar_publication_invalid:envelope_sources");
    } catch (error) {
      deps.invalidate(target);
      throw error;
    }
    // The transport may return its cached object on 304. Protect the stored
    // facts as well as the return value without duplicating the 8404-row body.
    envelope.data.rows.forEach(Object.freeze);
    Object.freeze(envelope.data.rows);
    for (const sources of [envelope.data.sources, envelope.sources]) {
      for (const source of sources) { Object.freeze(source.limitations); Object.freeze(source); }
      Object.freeze(sources);
    }
    Object.freeze(envelope.data);
    admittedPublications.add(envelope.data);
    Object.freeze(envelope.warnings);
    return Object.freeze(envelope);
  };
}
