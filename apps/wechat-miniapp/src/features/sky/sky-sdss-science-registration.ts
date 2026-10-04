import type { SdssScienceOpticalManifest, SkyObservationFrame } from "@starward/miniapp-contracts";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";

/** Preserve the science API; exact TAN geometry has one owner. */
export function registerSkyScienceOpticalField(publication: SdssScienceOpticalManifest,
  asset: SdssScienceOpticalManifest["levels"]["OVERVIEW"], observation: SkyObservationFrame | null) {
  return registerSkyTanOpticalField(publication, asset, observation);
}
