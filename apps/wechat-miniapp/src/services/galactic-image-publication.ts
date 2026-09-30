import type {GalacticImageManifestData} from "@starward/miniapp-contracts";

const sha=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
const file="2mass-galactic-2048x1024.jpg";
export function assertGalacticImageManifest(value:unknown):asserts value is GalacticImageManifestData {
  const root=value as GalacticImageManifestData;
  if(root?.schemaVersion!=="starward-2mass-galactic-v1"||!sha(root.publicationHash)||
    root.source?.provider!=="IPAC / Cool Cosmos"||
    root.source.recordUrl!=="https://coolcosmos.ipac.caltech.edu/images/142"||
    root.source.rightsUrl!=="https://coolcosmos.ipac.caltech.edu/page/image_use_policy"||
    root.source.galleryRightsUrl!=="https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html"||
    root.source.sourceSha256!=="c3a2ea0bebfe79eab5213480e3766c5437369a6da3d6f5ddec46860dfbf6a26c"||
    root.source.sourceUrl!=="https://coolcosmos.ipac.caltech.edu/system/avm_image_sqls/binaries/142/original/allsky-2mass.jpg?1373926530="||
    root.source.credit!=="2MASS/J. Carpenter, T. H. Jarrett, & R. Hurt; UMass/IPAC-Caltech/NASA/NSF"||
    root.projection?.kind!=="equirectangular"||
    root.projection.frame!=="galactic"||root.projection.centerLongitudeDeg!==0||
    root.projection.longitudeIncreases!=="left"||root.projection.north!=="up"||
    root.image?.file!==file||root.image.width!==2048||root.image.height!==1024||
    root.image.bytes!==703555||root.image.sha256!=="e3a70f835197c6a6965871fc4224635aa5d04a4874d2fa1c177a9a1470d1e2a0"||
    root.image.downloadUrl!==`/v2/sky/galactic/${root.publicationHash}/${file}`||
    !root.processing||!Array.isArray(root.limitations)||root.limitations.length<2)
    throw new Error("galactic_image_manifest_invalid");
}
