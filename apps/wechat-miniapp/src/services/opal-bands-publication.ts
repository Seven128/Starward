import type {JupiterBandsManifestData,SaturnBandsManifestData,UranusBandsManifestData,NeptuneBandsManifestData} from "@starward/miniapp-contracts";

type Manifest=JupiterBandsManifestData|SaturnBandsManifestData|UranusBandsManifestData|NeptuneBandsManifestData;
type Expected={schema:Manifest["schemaVersion"];body:"jupiter"|"saturn"|"uranus"|"neptune";file:string;
  imageSha:string;sourceSha:string;sourceFile:string;record:string;date:string;bytes:1026|1003|421|527};
const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);

/** The same pinned-rights, projection and immutable-asset boundary for OPAL profiles. */
export function assertOpalBandsManifest<T extends Manifest>(value:unknown,expected:Expected):asserts value is T{
  const root=value as Manifest;
  if(root?.schemaVersion!==expected.schema||!root.publicationId||
    !sha(root.publicationHash)||root.source?.provider!=="MAST / HST OPAL"||
    root.source.recordUrl!==expected.record||root.source.rightsUrl!=="https://archive.stsci.edu/hlsp/opal"||
    !root.source.credit||root.source.sourceFile!==expected.sourceFile||
    root.source.sourceSha256!==expected.sourceSha||root.source.observationDate!==expected.date||
    root.source.license!=="CC BY 4.0"||
    root.source.licenseUrl!=="https://creativecommons.org/licenses/by/4.0/"||
    root.source.doi!=="10.17909/T9G593"||!root.processing||
    root.projection?.kind!=="latitude-profile"||root.projection.latitude!=="planetographic"||
    root.projection.longitude!=="none"||JSON.stringify(root.projection.boundsDeg)!=="[-90,90]"||
    root.image?.file!==expected.file||root.image.width!==8||root.image.height!==512||
    root.image.bytes!==expected.bytes||root.image.format!=="png"||root.image.sha256!==expected.imageSha||
    root.image.downloadUrl!==`/v2/sky/${expected.body}/${root.publicationHash}/${expected.file}`||
    !Array.isArray(root.limitations)||root.limitations.length<3)
    throw new Error(`${expected.body}_bands_manifest_invalid`);
}
