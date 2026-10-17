import type {MoonCoverageManifestData,MarsTextureManifestData,MercuryTextureManifestData,JupiterBandsManifestData,SaturnBandsManifestData,UranusBandsManifestData,NeptuneBandsManifestData} from "./api-shapes.ts";
import {MOON_COVERAGE_PUBLICATION,isMoonCoverageMetadata} from "./moon-coverage-publication.ts";

export interface BodyImagePublications {
  moon:MoonCoverageManifestData;
  mars:MarsTextureManifestData;
  mercury:MercuryTextureManifestData;
  jupiter:JupiterBandsManifestData;
  saturn:SaturnBandsManifestData;
  uranus:UranusBandsManifestData;
  neptune:NeptuneBandsManifestData;
}
export type BodyImageKind=keyof BodyImagePublications;
export const BODY_IMAGE_KINDS=Object.freeze(['moon','mars','mercury','jupiter','saturn','uranus','neptune'] as const);

/** Reviewed publication declarations shared by server admission and native clients.
 * Adding a source requires explicit review here; remote metadata cannot enroll itself. */
export const BODY_IMAGE_PUBLICATIONS={
  moon:{...MOON_COVERAGE_PUBLICATION,format:'png' as const},
  mars:{
    "schemaVersion": "starward-viking-mars-v1",
    "route": "/v2/sky/mars",
    "format": "jpeg",
    "file": "mars-mdim21-color-usgs-wms-1024x512.jpg",
    "sha256": "cd324068ee22f66664d15ff5934ff6cfc195bb0e2ee8becba6092f078442d184",
    "bytes": 94411,
    "width": 1024,
    "height": 512,
    "sourceIdentity": {
      "provider": "USGS Astrogeology Science Center",
      "recordUrl": "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
      "rightsUrl": "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
      "wmsUrl": "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MDIM21_color&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE"
    },
    "projection": {
      "kind": "simple-cylindrical",
      "latitude": "planetocentric",
      "longitude": "positive-east",
      "bboxDeg": [
        -180,
        -90,
        180,
        90
      ]
    }
  },
  mercury:{
    "schemaVersion": "starward-messenger-mercury-v1",
    "route": "/v2/sky/mercury",
    "format": "jpeg",
    "file": "mercury-messenger-2013-usgs-wms-1024x512.jpg",
    "sha256": "b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81",
    "bytes": 89984,
    "width": 1024,
    "height": 512,
    "sourceIdentity": {
      "provider": "USGS Astrogeology Science Center",
      "recordUrl": "https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m",
      "rightsUrl": "https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m",
      "wmsUrl": "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mercury/mercury_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MESSENGER_May2013&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE"
    },
    "projection": {
      "kind": "simple-cylindrical",
      "latitude": "planetocentric",
      "longitude": "positive-east",
      "bboxDeg": [
        -180,
        -90,
        180,
        90
      ]
    }
  },
  jupiter:{
    "schemaVersion": "starward-opal-jupiter-bands-v1",
    "route": "/v2/sky/jupiter",
    "format": "png",
    "file": "jupiter-opal-2024c-median-bands-8x512.png",
    "sha256": "8c3e6e19f2f620581a859e5496ab0361544c3a20b1c903b0c4236e85d4d75a47",
    "bytes": 1026,
    "width": 8,
    "height": 512,
    "sourceIdentity": {
      "provider": "MAST / HST OPAL",
      "recordUrl": "https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31",
      "rightsUrl": "https://archive.stsci.edu/hlsp/opal",
      "sourceFile": "hlsp_opal_hst_wfc3-uvis_jupiter-2024c_f395n-f467m-f658n_v1_globalmap.tif",
      "sourceSha256": "b352755811130a1ede851f9c62de48454cc249f2047a763782870ac8d8a158e2",
      "observationDate": "2024-11-19/2024-11-20",
      "license": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "doi": "10.17909/T9G593"
    },
    "projection": {
      "kind": "latitude-profile",
      "latitude": "planetographic",
      "longitude": "none",
      "boundsDeg": [
        -90,
        90
      ]
    }
  },
  saturn:{
    "schemaVersion": "starward-opal-saturn-bands-v1",
    "route": "/v2/sky/saturn",
    "format": "png",
    "file": "saturn-opal-2025a-median-bands-8x512.png",
    "sha256": "68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c",
    "bytes": 1003,
    "width": 8,
    "height": 512,
    "sourceIdentity": {
      "provider": "MAST / HST OPAL",
      "recordUrl": "https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32",
      "rightsUrl": "https://archive.stsci.edu/hlsp/opal",
      "sourceFile": "hlsp_opal_hst_wfc3-uvis_saturn-2025a_f395n-f502n-f631n_v1_globalmap.tif",
      "sourceSha256": "c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7",
      "observationDate": "2025-08-29",
      "license": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "doi": "10.17909/T9G593"
    },
    "projection": {
      "kind": "latitude-profile",
      "latitude": "planetographic",
      "longitude": "none",
      "boundsDeg": [
        -90,
        90
      ]
    }
  },
  uranus:{
    "schemaVersion": "starward-opal-uranus-bands-v1",
    "route": "/v2/sky/uranus",
    "format": "png",
    "file": "uranus-opal-2025a-median-bands-8x512.png",
    "sha256": "308d1521b5f0adebc14249c686664907335cdf8e0334a5a7008392b62b66c817",
    "bytes": 421,
    "width": 8,
    "height": 512,
    "sourceIdentity": {
      "provider": "MAST / HST OPAL",
      "recordUrl": "https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33",
      "rightsUrl": "https://archive.stsci.edu/hlsp/opal",
      "sourceFile": "hlsp_opal_hst_wfc3-uvis_uranus-2025a_f657n-f547m-f467m_v1_globalmap.tif",
      "sourceSha256": "854ba9d0b744c2d6e6b646d315847a3528b94b4f0b8970cc4285d71228e69c7b",
      "observationDate": "2025-10-23",
      "license": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "doi": "10.17909/T9G593"
    },
    "projection": {
      "kind": "latitude-profile",
      "latitude": "planetographic",
      "longitude": "none",
      "boundsDeg": [
        -90,
        90
      ]
    }
  },
  neptune:{
    "schemaVersion": "starward-opal-neptune-bands-v1",
    "route": "/v2/sky/neptune",
    "format": "png",
    "file": "neptune-opal-2025b-median-bands-8x512.png",
    "sha256": "447b4fc50a47b025cbaf5c1e4e5a0a8df8b1403c3706ba4b46fd432e7de391e0",
    "bytes": 527,
    "width": 8,
    "height": 512,
    "sourceIdentity": {
      "provider": "MAST / HST OPAL",
      "recordUrl": "https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32",
      "rightsUrl": "https://archive.stsci.edu/hlsp/opal",
      "sourceFile": "hlsp_opal_hst_wfc3-uvis_neptune-2025b_f467m-f547m-f657n_v1_globalmap.tif",
      "sourceSha256": "8c17a2872b5d55577c63abe7ba1369997ff32bb83e0f9b9c350a46db96713cb8",
      "observationDate": "2025-08-24",
      "license": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "doi": "10.17909/T9G593"
    },
    "projection": {
      "kind": "latitude-profile",
      "latitude": "planetographic",
      "longitude": "none",
      "boundsDeg": [
        -90,
        90
      ]
    }
  },
} as const;

const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
export function isBodyImageKind(value:string):value is BodyImageKind {
  return Object.prototype.hasOwnProperty.call(BODY_IMAGE_PUBLICATIONS,value);
}
export function isBodyImageMetadata(kind:BodyImageKind,value:unknown):boolean {
  if(!isBodyImageKind(kind))return false;
  if(kind==='moon')return isMoonCoverageMetadata(value);
  const fixed=BODY_IMAGE_PUBLICATIONS[kind],root=value as BodyImagePublications[BodyImageKind];
  if(!root||!root.projection||root.schemaVersion!==fixed.schemaVersion||!text(root.publicationId)||
    !text(root.source?.title)||!text(root.source?.credit)||!text(root.processing)||
    !Array.isArray(root.limitations)||root.limitations.length<(fixed.format==='png'?3:2)||!root.limitations.every(text))return false;
  const source=root.source as unknown as Record<string,unknown>;
  if(!Object.entries(fixed.sourceIdentity).every(([key,expected])=>source[key]===expected)||
    !Object.entries(fixed.projection).every(([key,expected])=>JSON.stringify((root.projection as unknown as Record<string,unknown>)[key])===JSON.stringify(expected)))return false;
  return Boolean(root.image&&(['file','width','height','bytes','sha256'] as const).every(key=>root.image[key]===fixed[key])&&
    (fixed.format!=='png'||('format' in root.image&&root.image.format==='png')));
}
export function assertBodyImageManifest<K extends BodyImageKind>(kind:K,value:unknown):asserts value is BodyImagePublications[K] {
  const root=value as BodyImagePublications[K],fixed=BODY_IMAGE_PUBLICATIONS[kind];
  if(!isBodyImageMetadata(kind,value)||!hash(root.publicationHash)||
    root.image.downloadUrl!==`${fixed.route}/${root.publicationHash}/${fixed.file}`)throw new Error('body_image_manifest_invalid');
}
export function bodyImageManifestPath(kind:BodyImageKind,publicationHash?:string){
  if(!isBodyImageKind(kind)||(publicationHash!==undefined&&!hash(publicationHash)))throw new Error('body_image_selection_invalid');
  return `${BODY_IMAGE_PUBLICATIONS[kind].route}/${publicationHash===undefined?'':publicationHash+'/'}manifest`;
}
