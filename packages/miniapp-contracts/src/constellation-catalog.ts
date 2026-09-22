export const CONSTELLATION_CATALOG_VERSION = "stellarium-modern-v24.4.v2";
export const CONSTELLATION_SOURCE_COMMIT = "ab961cbde42eec8121be0df6ff48292f8d492b54";
export const CONSTELLATION_SOURCE_BASE = `https://raw.githubusercontent.com/Stellarium/stellarium/${CONSTELLATION_SOURCE_COMMIT}/skycultures/modern/`;
/** Binary PNG or original source text; this route has no ApiEnvelope body. */
export type ConstellationAssetData = Uint8Array;
/** Definition HIP identifier, FK5 J2000 geometry, tangent mas/year, explicit
 * identity relation and source members. System centers are decorative only. */
export type ConstellationStar = readonly [number,number,number,number,number,
  "SAME_OBJECT" | "SYSTEM_MEMBERS" | "IAU_NAMED_COMPONENT", readonly string[]];
export interface ConstellationDefinition {
  iau: string;
  lines: readonly (readonly [number,number])[];
  artId: string;
}
export interface ConstellationArtwork {
  id: string;
  members: readonly string[];
  file: string;
  width: number;
  height: number;
  anchors: readonly { hip: number; pixel: readonly [number,number] }[];
  sha256: string;
  bytes: number;
  originalUrl: string;
}
export interface ConstellationCatalogPublication {
  format: "constellation-catalog-v2";
  catalogVersion: typeof CONSTELLATION_CATALOG_VERSION;
  catalogHash: string;
  commit: typeof CONSTELLATION_SOURCE_COMMIT;
  retrievedAt: string;
  astrometry: { frame: "FK5"; epochJulianYear: 2000; properMotionUnit: "mas/year"; raMotion: "cos(dec)*dRA/dt"; fields: readonly string[] };
  stars: readonly ConstellationStar[];
  geometryAsset: { file: "geometry-v2.json"; sha256: string; bytes: number };
  constellations: readonly ConstellationDefinition[];
  images: readonly ConstellationArtwork[];
  provenance: {
    definitions: { provider: string; url: string; license: string; licenseUrl: string; sourceFiles: Readonly<Record<string,string>>; modifications: string };
    art: { author: string; url: string; license: string; licenseUrl: string; modifications: string };
    astrometry: { provider: string; url: string; license: string; licenseUrl: string; licenseStatementUrl: string; usagePolicyUrl: string; sourceFiles: Readonly<Record<string,string>>; sourceUrls: Readonly<Record<string,string>>; modifications: string };
  };
  limitations: readonly string[];
}
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fail = (reason: string): never => { throw new TypeError(`constellation_catalog_invalid:${reason}`); };

/** Runs on server publication and after network/cache reads. No fallback source,
 * implicit endpoint substitution, or stale image anchors from another edition. */
export function assertConstellationCatalog(value: unknown): asserts value is ConstellationCatalogPublication {
  const p = value as ConstellationCatalogPublication;
  if (!p || p.format !== "constellation-catalog-v2" || p.catalogVersion !== CONSTELLATION_CATALOG_VERSION ||
    !hash(p.catalogHash) || p.commit !== CONSTELLATION_SOURCE_COMMIT || typeof p.retrievedAt !== "string" || !Number.isFinite(Date.parse(p.retrievedAt)) || p.astrometry?.frame !== "FK5" ||
    p.astrometry.epochJulianYear !== 2000 || p.astrometry.properMotionUnit !== "mas/year" || p.astrometry.raMotion !== "cos(dec)*dRA/dt" ||
    !Array.isArray(p.stars) || p.stars.length !== 713 || !Array.isArray(p.constellations) || p.constellations.length !== 88 ||
    !Array.isArray(p.images) || p.images.length !== 85) fail("identity");
  if (JSON.stringify(p.astrometry.fields) !== JSON.stringify(["hip","raDeg","decDeg","pmRaCosDecMasYr","pmDecMasYr","identityRelation","members"])) fail("fields");
  if (p.geometryAsset?.file !== "geometry-v2.json" || !hash(p.geometryAsset.sha256) ||
    !Number.isInteger(p.geometryAsset.bytes) || p.geometryAsset.bytes <= 0 || p.geometryAsset.bytes > 200000) fail("geometry_asset");
  const ids = new Set<number>();
  for (const row of p.stars) {
    if (!Array.isArray(row) || row.length !== 7 || !row.slice(0,5).every(finite) || !Number.isInteger(row[0]) || row[0] <= 0 || row[0] > 120000 ||
      ids.has(row[0]) || row[1] < 0 || row[1] >= 360 || Math.abs(row[2]) > 90 || !["SAME_OBJECT","SYSTEM_MEMBERS","IAU_NAMED_COMPONENT"].includes(row[5]) ||
      !Array.isArray(row[6]) || row[6].length < 1 || row[6].length > 3 || new Set(row[6]).size !== row[6].length ||
      !row[6].every(id=>typeof id === "string" && /^(HR|SAO):[1-9]\d*$/u.test(id)) ||
      (row[5] === "SYSTEM_MEMBERS" ? row[6].length < 2 : row[6].length !== 1) ||
      (row[5] === "IAU_NAMED_COMPONENT" && (row[0] !== 60718 || row[6][0] !== "HR:4730"))) fail("star");
    ids.add(row[0]);
  }
  const groups = new Map<string,ConstellationDefinition>();
  for (const c of p.constellations) {
    if (!c || typeof c.iau !== "string" || !/^[A-Z][A-Za-z]{2}$/u.test(c.iau) || groups.has(c.iau) ||
      !Array.isArray(c.lines) || c.lines.length === 0 || c.lines.length > 50 || typeof c.artId !== "string") fail("definition");
    groups.set(c.iau,c);
    for (const edge of c.lines) if (!Array.isArray(edge) || edge.length !== 2 || !ids.has(edge[0]) || !ids.has(edge[1]) || edge[0] === edge[1]) fail("line");
  }
  const images = new Set<string>(), files = new Set<string>();
  for (const a of p.images) {
    if (!a || !groups.has(a.id) || images.has(a.id) || typeof a.file !== "string" || !/^[a-z_-]+\.png$/u.test(a.file) || files.has(a.file) ||
      !Number.isInteger(a.width) || !Number.isInteger(a.height) || a.width < 1 || a.height < 1 || a.width > 512 || a.height > 512 ||
      !Number.isInteger(a.bytes) || a.bytes < 32 || a.bytes > 200000 || !hash(a.sha256) || a.originalUrl !== CONSTELLATION_SOURCE_BASE+a.file ||
      !Array.isArray(a.anchors) || a.anchors.length !== 3 || !Array.isArray(a.members) || !a.members.length) fail("image");
    images.add(a.id); files.add(a.file);
    for (const anchor of a.anchors) if (!anchor || !ids.has(anchor.hip) || !Array.isArray(anchor.pixel) || anchor.pixel.length !== 2 ||
      !anchor.pixel.every(finite) || anchor.pixel[0] < 0 || anchor.pixel[0] > a.width || anchor.pixel[1] < 0 || anchor.pixel[1] > a.height) fail("anchor");
    if (new Set(a.anchors.map(x=>x.hip)).size !== 3 || new Set(a.members).size !== a.members.length) fail("image_members");
    for (const member of a.members) if (groups.get(member)?.artId !== a.id) fail("image_members");
  }
  for (const c of p.constellations) if (!p.images.some(a=>a.id === c.artId && a.members.includes(c.iau))) fail("image_coverage");
  const art = p.provenance?.art, definitions = p.provenance?.definitions, astrometry = p.provenance?.astrometry;
  if (art?.author !== "Johan Meuris" || art.license !== "Free Art License 1.3" || art.licenseUrl !== "https://artlibre.org/licence/lal/en/" ||
    !art.url || !art.modifications || definitions?.license !== "CC BY-SA 4.0" || definitions.url !== CONSTELLATION_SOURCE_BASE ||
    definitions.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/" || !definitions.provider || !definitions.modifications ||
    !definitions.sourceFiles || !Object.values(definitions.sourceFiles).every(hash) ||
    astrometry?.url !== "https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html" ||
    astrometry.license !== "ODbL-1.0" || astrometry.licenseUrl !== "https://opendatacommons.org/licenses/odbl/1-0/" ||
    astrometry.licenseStatementUrl !== "https://simbad.cds.unistra.fr/simbad/" ||
    astrometry.usagePolicyUrl !== "https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html" || !astrometry.provider ||
    !astrometry.sourceFiles || Object.keys(astrometry.sourceFiles).length !== 5 || !Object.values(astrometry.sourceFiles).every(hash) ||
    !astrometry.sourceUrls || !Object.keys(astrometry.sourceFiles).every(key=>typeof astrometry.sourceUrls[key] === "string" && astrometry.sourceUrls[key].startsWith("https://")) || !astrometry.modifications || !Array.isArray(p.limitations) || !p.limitations.length ||
    !p.limitations.every(s=>typeof s === "string" && s.length > 0)) fail("provenance");
}
