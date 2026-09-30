import { sha256 } from "@noble/hashes/sha2.js";

export interface SkyLandscapeResource {
  id: "overview" | "detail";
  image: { file: string; sha256: string; bytes: number; width: number; height: number; downloadUrl: string };
  alpha: { file: string; sha256: string; bytes: number; decodedSha256: string; downloadUrl: string };
}

/** A generic virtual scene. The photograph's location never supplies observer state. */
export interface SkyLandscapeManifestData {
  schemaVersion: "starward-simulated-landscape-v1";
  publicationId: "stara-lesna-meadows-derivative-v1";
  publicationHash: string;
  source: { title: string; author: string; recordUrl: string; originalUrl: string; originalSha256: string;
    originalBytes: number; originalDownloadUrl: string; packageLicense: "CC BY 4.0";
    registryLicense: "CC BY-SA 4.0"; derivativeLicense: "CC BY-SA 4.0"; rightsUrl: string; credit: string };
  projection: { kind: "equirectangular"; frame: "simulated-local-enu"; seamAzimuthDeg: 0;
    rowZero: "zenith"; longitudeIncreases: "clockwise"; registration: "virtual-not-site-survey" };
  resources: SkyLandscapeResource[];
  processing: string;
  limitations: string[];
}
export type SkyLandscapeAssetData = Uint8Array | SkyLandscapeAlphaData;
export interface SkyLandscapeAlphaData {
  schemaVersion: 1; encoding: "rows-rle-u8"; width: number; height: number; sourcePngSha256: string;
  meaning: string; mapping: string; sourceCredit: string;
  rows: Array<Array<readonly [number, number]>>;
}

export const SKY_LANDSCAPE_SOURCE = {
  title: "Stara Lesna Meadows", author: "Lubomir Hambalek",
  recordUrl: "https://stellarium.org/landscapes-europe.html",
  originalUrl: "https://github.com/Stellarium/stellarium-data/releases/download/landscapes/stara_lesna.zip",
  originalSha256: "a91d6eb884be3433258c8821d57d63aaad3c03e9922b51ba2627f18fbbba006d",
  originalBytes: 12377473, packageLicense: "CC BY 4.0", registryLicense: "CC BY-SA 4.0",
  derivativeLicense: "CC BY-SA 4.0", rightsUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  credit: "Stara Lesna Meadows — Lubomir Hambalek; resized and alpha encoded by Starward",
} as const;
export const SKY_LANDSCAPE_RESOURCES = [
  { id: "overview", image: { file: "panorama-1024.png", width: 1024, height: 512, bytes: 854784,
    sha256: "1e4222bb02d6b4c95c643047de6916581b5e2a665e00d9cc60edd94c3cb072d3" },
  alpha: { file: "panorama-1024.alpha-rle.json", bytes: 19943,
    sha256: "9ad34fafd073a01462d137ba88f95828fa5953b08f2ba682b4466e2c955d3f5e",
    decodedSha256: "2369353b77a364cb53f67f603f7e719eff89b9615f78bf6f6bf7eba5f4fa9567" } },
  { id: "detail", image: { file: "panorama-2048.png", width: 2048, height: 1024, bytes: 3316173,
    sha256: "fd6afeebba748eb84a15c0aea2a8ce0e363571685c6b181c8511f2bb5459bb32" },
  alpha: { file: "panorama-2048.alpha-rle.json", bytes: 54224,
    sha256: "d9e70cb3795e018b38642737f16f61f3a4a08f25435c7bebcce7c14e9327281c",
    decodedSha256: "55eeae11a014d444a04872d6d207093ac4975149cd2cb6c3ef868e87ab47af70" } },
] as const;

export function assertSkyLandscapeManifest(value: unknown): asserts value is SkyLandscapeManifestData {
  const root = value as SkyLandscapeManifestData;
  if (!root || root.schemaVersion !== "starward-simulated-landscape-v1" ||
    root.publicationId !== "stara-lesna-meadows-derivative-v1" ||
    typeof root.publicationHash !== "string" || !/^[a-f0-9]{64}$/u.test(root.publicationHash) ||
    !root.source || Object.entries(SKY_LANDSCAPE_SOURCE).some(([key, expected]) =>
      (root.source as unknown as Record<string, unknown>)[key] !== expected) ||
    root.source.originalDownloadUrl !== `/v2/sky/landscape/${root.publicationHash}/stara-lesna-original.zip` ||
    root.projection?.kind !== "equirectangular" || root.projection.frame !== "simulated-local-enu" ||
    root.projection.seamAzimuthDeg !== 0 || root.projection.rowZero !== "zenith" ||
    root.projection.longitudeIncreases !== "clockwise" || root.projection.registration !== "virtual-not-site-survey" ||
    typeof root.processing !== "string" || !root.processing.trim() || !Array.isArray(root.limitations) ||
    root.limitations.length < 2 || root.limitations.some(item => typeof item !== "string" || !item.trim()) ||
    !Array.isArray(root.resources) || root.resources.length !== SKY_LANDSCAPE_RESOURCES.length)
    throw new TypeError("sky_landscape_manifest_invalid");
  for (const [index, fixed] of SKY_LANDSCAPE_RESOURCES.entries()) {
    const resource = root.resources[index];
    if (!resource || resource.id !== fixed.id || !resource.image || !resource.alpha ||
      ["image", "alpha"].some(kind => {
        const expected = fixed[kind as "image" | "alpha"];
        const actual = resource[kind as "image" | "alpha"] as unknown as Record<string, unknown>;
        return Object.entries(expected).some(([key, item]) => actual[key] !== item) ||
          actual.downloadUrl !== `/v2/sky/landscape/${root.publicationHash}/${expected.file}`;
      })) throw new TypeError("sky_landscape_resource_invalid");
  }
}

/** Lossless, bounded decode. Missing rows never become invented transparent sky. */
export function decodeSkyLandscapeAlpha(value: unknown, resource: SkyLandscapeResource): Uint8Array {
  const root = value as SkyLandscapeAlphaData, { width, height, sha256: imageHash } = resource.image;
  if (!root || root.schemaVersion !== 1 || root.encoding !== "rows-rle-u8" || root.width !== width ||
    root.height !== height || root.sourcePngSha256 !== imageHash || !Array.isArray(root.rows) ||
    root.rows.length !== height || ![root.meaning, root.mapping, root.sourceCredit].every(item =>
      typeof item === "string" && item.length > 0) ||
    !SKY_LANDSCAPE_RESOURCES.some(item => item.image.sha256 === imageHash && item.image.width === width &&
      item.image.height === height && item.alpha.decodedSha256 === resource.alpha.decodedSha256))
    throw new TypeError("sky_landscape_alpha_identity_invalid");
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = root.rows[y]; let x = 0;
    if (!Array.isArray(row) || !row.length || row.length > width) throw new TypeError("sky_landscape_alpha_row_invalid");
    for (const run of row) {
      if (!Array.isArray(run) || run.length !== 2 || !Number.isInteger(run[0]) || run[0] < 0 || run[0] > 255 ||
        !Number.isInteger(run[1]) || run[1] <= 0 || x + run[1] > width)
        throw new TypeError("sky_landscape_alpha_run_invalid");
      result.fill(run[0], y * width + x, y * width + x + run[1]); x += run[1];
    }
    if (x !== width) throw new TypeError("sky_landscape_alpha_row_incomplete");
  }
  const hash = Array.from(sha256(result), item => item.toString(16).padStart(2, "0")).join("");
  if (hash !== resource.alpha.decodedSha256) throw new TypeError("sky_landscape_alpha_corrupt");
  return result;
}
