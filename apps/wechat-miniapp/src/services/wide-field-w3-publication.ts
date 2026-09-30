import type {WideFieldW3ManifestData} from "@starward/miniapp-contracts";

const hash=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
const sourceRoot="https://alasky.cds.unistra.fr/AllWISE/W3";

/** Treat missing, changed or mislabelled infrared metadata as unavailable.
 * A provider name alone cannot authorize a different tile URL or spectrum. */
export function assertWideFieldW3Manifest(value:unknown):asserts value is WideFieldW3ManifestData{
  const root=value as WideFieldW3ManifestData;
  if(root?.schemaVersion!=="starward-allwise-w3-wide-v1"||!hash(root.publicationHash)||
    !hash(root.propertiesSha256)||
    root.propertiesUrl!==`/v2/sky/wide-field/${root.publicationHash}/properties`||
    root.source?.masterUrl!==sourceRoot||
    root.source.originalRightsUrl!=="https://irsa.ipac.caltech.edu/data_use_terms.html"||
    root.source.originalCopyright!=="IPAC/NASA"||root.source.hipsCopyright!=="CNRS/Unistra"||
    root.source.hipsLicense!=="ODbL-1.0"||
    root.source.hipsDoi!=="10.26093/cds/aladin/na1n-03"||
    ![root.source.title,root.source.recordUrl,root.source.acknowledgmentUrl,
      root.source.hipsLicenseUrl,root.source.atlasDoi,root.source.acknowledgment,
      root.processing].every(item=>typeof item==="string"&&item.length>0)||
    !Array.isArray(root.limitations)||root.limitations.length<2||
    root.hips?.frame!=="equatorial"||root.hips.order!==0||root.hips.tileWidth!==512||
    root.hips.tileFormat!=="jpeg"||root.hips.status!=="public partial unclonable"||
    !Array.isArray(root.tiles)||root.tiles.length!==12)
    throw new Error("wide_field_w3_manifest_invalid");
  const seen=new Set<number>();
  for(const tile of root.tiles){
    if(!Number.isInteger(tile.pixel)||tile.pixel<0||tile.pixel>11||seen.has(tile.pixel)||
      tile.file!==`Norder0/Dir0/Npix${tile.pixel}.jpg`||
      tile.sourceUrl!==`${sourceRoot}/${tile.file}`||
      tile.downloadUrl!==`/v2/sky/wide-field/${root.publicationHash}/${tile.file}`||
      !hash(tile.sha256)||!Number.isInteger(tile.bytes)||tile.bytes<100||tile.bytes>1_000_000)
      throw new Error("wide_field_w3_manifest_invalid");
    seen.add(tile.pixel);
  }
}
