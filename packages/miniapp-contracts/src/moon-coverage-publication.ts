import type {MoonCoverageManifestData} from "./api-shapes.ts";

/** The reviewed scientific publication; server and client must agree on its bytes and meaning. */
export const MOON_COVERAGE_PUBLICATION = {
  schemaVersion:"starward-clementine-moon-coverage-v2",
  file:"clementine-uv750-v21-coverage-2048x1024.png", width:2048, height:1024,
  bytes:1595187, sha256:"ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6",
  route:"/v2/sky/moon/coverage",
  recordUrl:"https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m",
  rightsUrl:"https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted",
  rasterUrl:"https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif",
  sourceSha256:"51b2367ecbcc939c03a92297ecff7e35c592b17c12141e4ff152dd7e30459120",
  sourceBytes:4247470871,
} as const;

const text=(v:unknown):v is string=>typeof v==="string"&&v.trim().length>0;
export function isMoonCoverageMetadata(value:unknown):boolean {
  const root=value as MoonCoverageManifestData, fixed=MOON_COVERAGE_PUBLICATION;
  return root?.schemaVersion===fixed.schemaVersion&&text(root.publicationId)&&
    root.source?.provider==="USGS Astrogeology Science Center"&&text(root.source.title)&&text(root.source.credit)&&
    root.source.recordUrl===fixed.recordUrl&&root.source.rightsUrl===fixed.rightsUrl&&
    root.source.rasterUrl===fixed.rasterUrl&&root.source.sha256===fixed.sourceSha256&&root.source.bytes===fixed.sourceBytes&&
    root.projection?.kind==="simple-cylindrical"&&root.projection.latitude==="planetocentric"&&
    root.projection.longitude==="positive-east"&&JSON.stringify(root.projection.bboxDeg)==="[-180,-90,180,90]"&&
    root.image?.file===fixed.file&&root.image.width===fixed.width&&root.image.height===fixed.height&&
    root.image.sha256===fixed.sha256&&root.image.bytes===fixed.bytes&&
    root.coverage?.kind==="measured-area-fraction"&&root.coverage.sourceNoData===0&&root.coverage.footprintPixels===45&&
    root.coverage.fullyMissingOutputPixels===11540&&root.coverage.partialOutputPixels===57499&&
    root.coverage.fallback==="uniform-neutral-globe"&&text(root.processing)&&
    Array.isArray(root.limitations)&&root.limitations.length>=2&&root.limitations.every(text);
}

export function assertMoonCoverageManifest(value:unknown):asserts value is MoonCoverageManifestData {
  const root=value as MoonCoverageManifestData, fixed=MOON_COVERAGE_PUBLICATION;
  if(!isMoonCoverageMetadata(value)||typeof root.publicationHash!=="string"||!/^[a-f0-9]{64}$/u.test(root.publicationHash)||
    root.image.downloadUrl!==`${fixed.route}/${root.publicationHash}/${fixed.file}`)
    throw new Error("moon_coverage_manifest_invalid");
}
