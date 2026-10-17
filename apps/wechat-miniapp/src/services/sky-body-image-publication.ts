import type {MoonCoverageManifestData,MarsTextureManifestData,MercuryTextureManifestData,
  JupiterBandsManifestData,SaturnBandsManifestData,UranusBandsManifestData,NeptuneBandsManifestData,SourceSummary} from "@starward/miniapp-contracts";
import {getBodyImageManifest} from "./body-image-client";
import {skyBodyImageProfile} from "./sky-body-image-profile";
export interface SkyBodyImagePublications {
  "SOLAR:MOON":MoonCoverageManifestData;
  "PLANET:MARS":MarsTextureManifestData;
  "PLANET:MERCURY":MercuryTextureManifestData;
  "PLANET:JUPITER":JupiterBandsManifestData;
  "PLANET:SATURN":SaturnBandsManifestData;
  "PLANET:URANUS":UranusBandsManifestData;
  "PLANET:NEPTUNE":NeptuneBandsManifestData;
}
export type SkyBodyImageReference=keyof SkyBodyImagePublications;
export function isSkyBodyImageReference(reference:string):reference is SkyBodyImageReference {
  return skyBodyImageProfile(reference)!==undefined;
}

/** Read the selected immutable edition. Discovery is never a fallback for a missing version. */
export async function getSkyBodyImagePublication(reference:SkyBodyImageReference,publicationHash:string,signal?:AbortSignal){
  if(!isSkyBodyImageReference(reference)||!/^[a-f0-9]{64}$/u.test(publicationHash))
    throw new Error("sky_body_image_selection_invalid");
  const publication=await getBodyImageManifest(skyBodyImageProfile(reference)!.kind,signal,publicationHash);
  if(publication.publicationHash!==publicationHash)throw new Error("sky_body_image_version_unavailable");
  return publication;
}

/** These older static information sources describe the default image edition.
 * Selected-image routes replace them with the validated selected publication;
 * independent shape, position and editorial sources remain visible. */
export function isDefaultSkyBodyImageSource(source:Pick<SourceSummary,"id">){
  return new Set([
    'usgs-clementine-uv750-v2','usgs-clementine-uv750-v21-coverage',
    'mast-hst-opal-jupiter-2024c-latitude-bands','mast-hst-opal-saturn-2025a-latitude-bands',
    'mast-hst-opal-uranus-2025a-latitude-bands','mast-hst-opal-neptune-2025b-latitude-bands',
  ]).has(source.id);
}

export function skyBodyImageSource(reference:SkyBodyImageReference,publication:SkyBodyImagePublications[SkyBodyImageReference]):SourceSummary{
  const source=publication.source;
  return {id:`body-image:${reference}:${publication.publicationHash}`,kind:"OPEN_DATA",
    provider:source.provider,title:source.title,sourceUrl:source.recordUrl,
    license:"license" in source?source.license:"USGS public-domain data; retain source credit",
    licenseUrl:"licenseUrl" in source?source.licenseUrl:source.rightsUrl,
    attribution:{name:source.credit,url:source.recordUrl,statements:[publication.processing,
      ...("doi" in source?[`Original maps DOI ${source.doi}.`]:[])]},
    publishedAt:null,retrievedAt:null,validFrom:null,validTo:null,state:"FRESH",confidence:1,
    precision:"历史影像；位置、相位与本体方向使用当前观测报告，不代表实时或自然真彩。",
    limitations:publication.limitations};
}
