/** Retained infrared publication and one selected optical display asset. Their
 * coordinate frames and provenance must never be interchangeable. */
export interface TwoMassGalacticImageManifestData {
  schemaVersion: "starward-2mass-galactic-v1";
  publicationId:string;
  publicationHash:string;
  source:{title:string;provider:"IPAC / Cool Cosmos";recordUrl:string;rightsUrl:string;
    galleryRightsUrl:string;credit:string;sourceUrl:string;sourceSha256:string};
  projection:{kind:"equirectangular";frame:"galactic";centerLongitudeDeg:0;
    longitudeIncreases:"left";north:"up"};
  image:{file:string;sha256:string;bytes:number;width:2048;height:1024;downloadUrl:string};
  processing:string;
  limitations:string[];
}

const STELLARIUM_REVISION="608db95859f2393d5cc5067d90850ab2d7560c0c";
/** Exact bundled bitmap covered by its specific credits grant. This does not
 * authorize other Mellinger products or establish scientific calibration. */
export const MELLINGER_OPTICAL_MILKY_WAY={
  revision:STELLARIUM_REVISION,
  source:{
    title:"Axel Mellinger optical Milky Way / Stellarium bundled display texture",
    provider:"Axel Mellinger / Stellarium bundled texture",
    recordUrl:`https://github.com/Stellarium/stellarium/blob/${STELLARIUM_REVISION}/textures/milkyway.png`,
    rightsUrl:`https://github.com/Stellarium/stellarium/blob/${STELLARIUM_REVISION}/CREDITS.md#full-reference--credits`,
    credit:"Milky Way panorama: Axel Mellinger; bundled display texture: Stellarium contributors",
    sourceUrl:`https://raw.githubusercontent.com/Stellarium/stellarium/${STELLARIUM_REVISION}/textures/milkyway.png`,
    sourceSha256:"95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97",
    grant:"Specific bundled Milky Way panorama: modification and redistribution permitted with credit to Axel Mellinger.",
    producerProcessing:"UNKNOWN",
  },
  image:{file:"milkyway.png",sha256:"95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97",
    bytes:1003398,width:2048,height:1024,format:"png"},
  projection:{kind:"equirectangular",frame:"equatorial-j2000",centerLongitudeDeg:-90,
    longitudeIncreases:"left",north:"up"},
} as const;

interface OpticalMilkyWayDisplayData {
  role:"OPTICAL_MILKY_WAY_DISPLAY";
  publicationId:string;
  publicationHash:string;
  source:typeof MELLINGER_OPTICAL_MILKY_WAY.source;
  projection:typeof MELLINGER_OPTICAL_MILKY_WAY.projection;
  image:typeof MELLINGER_OPTICAL_MILKY_WAY.image & {downloadUrl:string};
  scientificAvailability:"UNKNOWN";
  absoluteRegistration:"UNVERIFIED";
  processing:string;
  limitations:string[];
}
/** The immutable trial version remains distinguishable from the selected
 * ordinary display role; neither claims a calibrated survey or final acceptance. */
export type OpticalMilkyWayManifestData=OpticalMilkyWayDisplayData & (
  {schemaVersion:"starward-mellinger-optical-milky-way-trial-v1";scope:"TRIAL"} |
  {schemaVersion:"starward-mellinger-optical-milky-way-v1";scope:"DISPLAY"}
);
export type GalacticImageManifestData=TwoMassGalacticImageManifestData|OpticalMilkyWayManifestData;

const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);
const exactFields=(value:unknown,expected:Record<string,unknown>)=>Boolean(value)&&
  Object.entries(expected).every(([key,v])=>(value as Record<string,unknown>)[key]===v);

/** Shared server/client boundary: two exact assets with honest source/frame
 * contracts, never arbitrary URLs or a general panorama registry. */
export function assertGalacticImagePublication(value:unknown):asserts value is GalacticImageManifestData {
  const root=value as GalacticImageManifestData;
  const common=root&&typeof root.publicationId==="string"&&root.publicationId.length>0&&
    sha(root.publicationHash)&&typeof root.processing==="string"&&root.processing.length>0&&
    Array.isArray(root.limitations)&&root.limitations.length>=2&&
    root.limitations.every(v=>typeof v==="string"&&v.length>0)&&
    root.image?.downloadUrl===`/v2/sky/galactic/${root.publicationHash}/${root.image.file}`;
  const infrared=root?.schemaVersion==="starward-2mass-galactic-v1"&&exactFields(root.source,{
    provider:"IPAC / Cool Cosmos",recordUrl:"https://coolcosmos.ipac.caltech.edu/images/142",
    rightsUrl:"https://coolcosmos.ipac.caltech.edu/page/image_use_policy",
    galleryRightsUrl:"https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html",
    sourceSha256:"c3a2ea0bebfe79eab5213480e3766c5437369a6da3d6f5ddec46860dfbf6a26c",
    sourceUrl:"https://coolcosmos.ipac.caltech.edu/system/avm_image_sqls/binaries/142/original/allsky-2mass.jpg?1373926530=",
    credit:"2MASS/J. Carpenter, T. H. Jarrett, & R. Hurt; UMass/IPAC-Caltech/NASA/NSF",
  })&&exactFields(root.projection,{kind:"equirectangular",frame:"galactic",centerLongitudeDeg:0,
    longitudeIncreases:"left",north:"up"})&&exactFields(root.image,{
    file:"2mass-galactic-2048x1024.jpg",width:2048,height:1024,bytes:703555,
    sha256:"e3a70f835197c6a6965871fc4224635aa5d04a4874d2fa1c177a9a1470d1e2a0"});
  const optical=((root?.schemaVersion==="starward-mellinger-optical-milky-way-trial-v1"&&root.scope==="TRIAL")||
    (root?.schemaVersion==="starward-mellinger-optical-milky-way-v1"&&root.scope==="DISPLAY"))&&
    root.role==="OPTICAL_MILKY_WAY_DISPLAY"&&
    root.scientificAvailability==="UNKNOWN"&&root.absoluteRegistration==="UNVERIFIED"&&
    exactFields(root.source,MELLINGER_OPTICAL_MILKY_WAY.source)&&
    exactFields(root.projection,MELLINGER_OPTICAL_MILKY_WAY.projection)&&
    exactFields(root.image,MELLINGER_OPTICAL_MILKY_WAY.image);
  if(!common||!infrared&&!optical)throw new Error("galactic_image_manifest_invalid");
}

export function galacticImageFormat(publication:GalacticImageManifestData):"jpeg"|"png" {
  return publication.schemaVersion==="starward-2mass-galactic-v1"?"jpeg":"png";
}
