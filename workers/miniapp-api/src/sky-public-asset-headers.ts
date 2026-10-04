import { readSkyImageDisplaySupport, type DeepSkyImageDescriptor } from "@starward/miniapp-contracts";

/** Immutable public response contract shared by API and static export.
 * Legacy selected W3 responses and mutable discovery keep their own policy. */
const SOURCES = {
  moon: "USGS Clementine UVVIS 750 nm",
  mars: "USGS Viking MDIM 2.1 colorized mosaic",
  mercury: "USGS MESSENGER 2013 750 nm mosaic",
  jupiter: "HST OPAL 2024c CC BY 4.0 latitude-median adaptation",
  saturn: "HST OPAL 2025a CC BY 4.0 latitude-median adaptation",
  uranus: "HST OPAL 2025a CC BY 4.0 latitude-median adaptation",
  neptune: "HST OPAL 2025b CC BY 4.0 latitude-median adaptation",
  galactic: "2MASS historical near-infrared false color",
  landscape: "Generic simulated landscape; Lubomir Hambalek; CC BY-SA 4.0 derivative",
  "wide-field": "AllWISE W3 12um infrared / CDS",
  "sdss-optical": "Sloan Digital Sky Survey - DR17 optical",
  "prepared-optical": "Historical prepared observation RGB",
  "deep-sky": "NASA/IPAC IRSA - AllWISE W3 12um",
} as const;
export type SkyPublicAssetKind = keyof typeof SOURCES | "constellations" | "wide-field-properties" | "sao";

export function skyPublicAssetHeaders(kind: SkyPublicAssetKind, contentType: string, fieldDegrees?: number,
  deepSky?: { publicationHash: string; sourceId: string; descriptor: DeepSkyImageDescriptor }): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": contentType,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
  };
  if (kind in SOURCES) headers["x-starward-image-source"] = SOURCES[kind as keyof typeof SOURCES];
  if (kind === "sao") headers["x-starward-data-source"] = "SAO visual stellar supplement / NASA dataset metadata";
  if (kind === "sdss-optical" || kind === "prepared-optical") {
    if (!Number.isFinite(fieldDegrees) || fieldDegrees! <= 0) throw new Error("sky_public_asset_field_invalid");
    headers["x-starward-image-field-degrees"] = String(fieldDegrees);
  }
  if (kind === "deep-sky") {
    const asset = deepSky?.descriptor;
    if (!asset || !/^[a-f0-9]{64}$/u.test(deepSky!.publicationHash) ||
        !/^imagery:[^:\r\n]+:[a-f0-9]{64}$/u.test(deepSky!.sourceId) ||
        !deepSky!.sourceId.endsWith(`:${deepSky!.publicationHash}`) ||
        !Number.isFinite(fieldDegrees) || fieldDegrees !== asset.fieldDegrees || fieldDegrees! <= 0 || fieldDegrees! > 8 ||
        ![256, 512].includes(asset.pixels) || !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
        contentType !== (asset.format === "png" ? "image/png" : "image/jpeg"))
      throw new Error("sky_public_asset_deep_sky_identity_invalid");
    headers["x-starward-image-field-degrees"] = String(asset.fieldDegrees);
    headers["x-starward-image-publication-hash"] = deepSky!.publicationHash;
    headers["x-starward-image-source-id"] = deepSky!.sourceId;
    headers["x-starward-image-pixels"] = String(asset.pixels);
    if (asset.sourceFiniteMask) {
      const mask = asset.sourceFiniteMask;
      if (asset.format !== "png" || mask.kind !== "NONFINITE_HIPS_SAMPLES" || !Number.isInteger(mask.missingPixels) || mask.missingPixels < 0 ||
          !Number.isInteger(mask.finitePixels) || mask.finitePixels <= 0 || mask.missingPixels + mask.finitePixels !== asset.pixels ** 2)
        throw new Error("sky_public_asset_deep_sky_availability_invalid");
      headers["x-starward-image-missing-pixels"] = String(mask.missingPixels);
    } else if (asset.format === "png") throw new Error("sky_public_asset_deep_sky_availability_invalid");
    if (asset.displaySupport) {
      const support = asset.format === "png" && readSkyImageDisplaySupport(asset.displaySupport, asset.pixels, asset.sha256);
      if (!support) throw new Error("sky_public_asset_deep_sky_display_support_invalid");
      headers["x-starward-image-display-support"] = JSON.stringify(support);
    }
  }
  return headers;
}
