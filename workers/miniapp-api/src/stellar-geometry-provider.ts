import { bsc5pHorizontalFrame } from "@starward/astronomy-core/bsc5p-catalog";
import { assertStellarGeometryFrame, type StellarGeometryIdentity, type StellarGeometryFrame, type StellarGeometryObserver } from "@starward/miniapp-contracts";

/** Astronomy Engine remains the sole producer of the observer/time transform. */
export function createBsc5pGeometryFrame(catalog: StellarGeometryIdentity, input: StellarGeometryObserver & { at: Date }): StellarGeometryFrame {
  const projected = bsc5pHorizontalFrame(input);
  const observer = Object.freeze({ latitude: input.latitude, longitude: input.longitude, elevationM: input.elevationM });
  const frame: StellarGeometryFrame = {
    format: catalog.format, catalogVersion: catalog.catalogVersion, catalogHash: catalog.catalogHash,
    referenceAt: catalog.referenceAt, ...projected, observer,
    equatorialToEnu: Object.freeze(projected.equatorialToEnu),
  };
  assertStellarGeometryFrame(frame, { catalog, at: input.at.toISOString(), observer: input });
  return Object.freeze(frame);
}
