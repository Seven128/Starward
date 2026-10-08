import rawPack from "../data/opengc-messier-deep-sky.v1.json" with { type: "json" };
import rawManifest from "../data/opengc-messier-deep-sky.v1.manifest.json" with { type: "json" };
import extendedPack from "../data/opengc-deep-sky.v2.json" with { type: "json" };
import extendedManifest from "../data/opengc-deep-sky.v2.manifest.json" with { type: "json" };
import { DEEP_SKY_MESSIER_CATALOG_VERSION, EXTENDED_DEEP_SKY_CATALOG_VERSION, isDeepSkyObjectReference } from "@starward/miniapp-contracts";

export const DEEP_SKY_CATALOG_VERSION = DEEP_SKY_MESSIER_CATALOG_VERSION;
export { EXTENDED_DEEP_SKY_CATALOG_VERSION };
export type DeepSkyObjectKind = "GALAXY" | "NEBULA";

export interface DeepSkyCatalogRow {
  objectRef: string;
  messier: number | null;
  ngcName: string;
  kind: DeepSkyObjectKind;
  raDeg: number;
  decDeg: number;
  constellation: string;
  majorAxisArcmin: number | null;
  minorAxisArcmin: number | null;
  positionAngleDeg: number | null;
  vMag: number | null;
  commonNames: readonly string[];
  openNgcType: string;
}

export interface DeepSkyCatalogPack {
  schemaVersion: "opengc-messier-deep-sky-v1" | "opengc-deep-sky-v2";
  catalogVersion: typeof DEEP_SKY_CATALOG_VERSION | typeof EXTENDED_DEEP_SKY_CATALOG_VERSION;
  frame: "ICRS J2000";
  license: "CC-BY-SA-4.0";
  rows: readonly DeepSkyCatalogRow[];
}

export interface DeepSkyCatalogManifest {
  schemaVersion: "opengc-messier-deep-sky-manifest-v1" | "opengc-deep-sky-manifest-v2";
  catalogVersion: typeof DEEP_SKY_CATALOG_VERSION | typeof EXTENDED_DEEP_SKY_CATALOG_VERSION;
  source: {
    provider: string;
    release: string;
    commit: string;
    sourceUrl: string;
    landingUrl: string;
    license: "CC-BY-SA-4.0";
    licenseUrl: string;
    responseSha256: string;
    responseBytes: number;
  };
  modifications: readonly string[];
  rowCount: number;
  derivedAssetSha256: string;
  derivedAssetBytes: number;
  retrievedAt: string;
}

function fail(reason: string): never { throw new Error(`deep_sky_catalog_invalid:${reason}`); }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }

function validate(value: unknown, extended = false): DeepSkyCatalogPack {
  if (!value || typeof value !== "object") fail("pack");
  const pack = value as DeepSkyCatalogPack;
  if (pack.schemaVersion !== (extended ? "opengc-deep-sky-v2" : "opengc-messier-deep-sky-v1") ||
    pack.catalogVersion !== (extended ? EXTENDED_DEEP_SKY_CATALOG_VERSION : DEEP_SKY_CATALOG_VERSION) || pack.frame !== "ICRS J2000" ||
    pack.license !== "CC-BY-SA-4.0" || !Array.isArray(pack.rows) || (extended ? pack.rows.length <= 51 : pack.rows.length !== 51))
    fail("identity");
  const ids = new Set<string>();
  const rows = pack.rows.map((candidate, index) => {
    const row = candidate as DeepSkyCatalogRow;
    const messier = /^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(row.objectRef) && row.objectRef === `M:${row.messier}`;
    const native = extended && isDeepSkyObjectReference(row.objectRef) && !row.objectRef.startsWith("M:") && row.messier === null &&
      row.ngcName === row.objectRef.replace(":", " ");
    if ((!messier && !native) || ids.has(row.objectRef)) fail(`row_${index}_identity`);
    ids.add(row.objectRef);
    if (row.kind !== "GALAXY" && row.kind !== "NEBULA") fail(`row_${index}_kind`);
    if (!finite(row.raDeg) || row.raDeg < 0 || row.raDeg >= 360 ||
      !finite(row.decDeg) || row.decDeg < -90 || row.decDeg > 90) fail(`row_${index}_coordinates`);
    for (const numeric of [row.majorAxisArcmin, row.minorAxisArcmin, row.positionAngleDeg, row.vMag])
      if (numeric !== null && !finite(numeric)) fail(`row_${index}_measurement`);
    if (!Array.isArray(row.commonNames) || row.commonNames.some((name) => typeof name !== "string" || !name.trim()))
      fail(`row_${index}_names`);
    return Object.freeze({ ...row, commonNames: Object.freeze([...row.commonNames]) });
  });
  if (!ids.has("M:31") || !ids.has("M:42")) fail("required_identity");
  return Object.freeze({ ...pack, rows: Object.freeze(rows) });
}

export const DEEP_SKY_CATALOG_PACK = validate(rawPack);
export const DEEP_SKY_CATALOG_MANIFEST = rawManifest as unknown as DeepSkyCatalogManifest;
export const EXTENDED_DEEP_SKY_CATALOG_PACK = validate(extendedPack, true);
export const EXTENDED_DEEP_SKY_CATALOG_MANIFEST = extendedManifest as unknown as DeepSkyCatalogManifest;
// The additive generation cannot rewrite existing identities or measurements.
for (const row of DEEP_SKY_CATALOG_PACK.rows) {
  if (JSON.stringify(EXTENDED_DEEP_SKY_CATALOG_PACK.rows.find(candidate => candidate.objectRef === row.objectRef)) !== JSON.stringify(row))
    fail("extended_legacy_row_changed");
}
