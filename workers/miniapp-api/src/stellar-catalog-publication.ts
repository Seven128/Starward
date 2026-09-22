import { createHash, randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { loadBsc5pStarCatalog, type Bsc5pCatalogVersion } from "@starward/astronomy-core/bsc5p-catalog";
import { createStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import {
  assertStellarCatalogPublication, assertStellarCatalogReference,
  STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT,
  type ApiEnvelope, type StellarCatalogPublication, type StellarCatalogReference,
} from "@starward/miniapp-contracts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";

export class StellarCatalogPublicationService {
  private readonly publications = new Map<string, ApiEnvelope<StellarCatalogPublication>>();

  get(reference: StellarCatalogReference): ApiEnvelope<StellarCatalogPublication> {
    try { assertStellarCatalogReference(reference); }
    catch { throw new NotFoundException("stellar_catalog_not_found"); }
    const owner = loadBsc5pStarCatalog(reference.catalogVersion as Bsc5pCatalogVersion);
    if (owner.catalogHash !== reference.catalogHash) throw new NotFoundException("stellar_catalog_not_found");
    const cached = this.publications.get(reference.catalogVersion);
    if (cached) return cached;
    const data: StellarCatalogPublication = {
      format: STELLAR_GEOMETRY_FORMAT, referenceAt: STELLAR_GEOMETRY_REFERENCE_AT,
      catalogVersion: owner.catalogVersion, catalogHash: owner.catalogHash,
      magnitudeLimit: owner.magnitudeLimit, magnitudeBand: "V", colorIndexBand: "B-V",
      sources: Object.freeze(bsc5pCatalogSources(owner).map(source => Object.freeze({ ...source,
        limitations: Object.freeze([...source.limitations]),
      }))),
      rows: Object.freeze(owner.rows.map(row => Object.freeze([
        row.sourceId, row.properName, row.vMag, row.bV, ...createStellarMotion(row),
      ] as const))),
    };
    assertStellarCatalogPublication(data, reference);
    const text = JSON.stringify(data);
    // Fits the existing per-item response cache; no larger cache or setData payload.
    if (Buffer.byteLength(text, "utf8") >= 2 * 1024 * 1024) throw new Error("stellar_catalog_publication_size_invalid");
    const envelope: ApiEnvelope<StellarCatalogPublication> = Object.freeze({
      apiVersion: "v2", data: Object.freeze(data), dataState: "FRESH", generatedAt: new Date().toISOString(),
      validAt: null, sources: data.sources, warnings: Object.freeze([]),
      etag: `W/"${createHash("sha256").update(text).digest("hex")}"`, requestId: `stellar-catalog:${randomUUID()}`,
    });
    this.publications.set(reference.catalogVersion, envelope);
    return envelope;
  }
}
