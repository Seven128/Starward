import type {JupiterBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/jupiter/manifest.json",import.meta.url);
const RECORD="https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31";
const RIGHTS="https://archive.stsci.edu/hlsp/opal";
const FILE="jupiter-opal-2024c-median-bands-8x512.png";
const SHA="8c3e6e19f2f620581a859e5496ab0361544c3a20b1c903b0c4236e85d4d75a47";

export class JupiterBandsPublicationService extends FixedBodyTexturePublicationService<JupiterBandsManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-opal-jupiter-bands-v1",
      file:FILE,width:8,height:512,bytes:1026,sha256:SHA,
      recordUrl:RECORD,rightsUrl:RIGHTS,route:"/v2/sky/jupiter",format:"png",
      validateMetadata(value){
        const root=value as unknown as JupiterBandsManifestData;
        return root.source?.provider==="MAST / HST OPAL"&&
          root.source.license==="CC BY 4.0"&&
          root.source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"&&
          root.source.sourceFile==="hlsp_opal_hst_wfc3-uvis_jupiter-2024c_f395n-f467m-f658n_v1_globalmap.tif"&&
          root.source.sourceSha256==="b352755811130a1ede851f9c62de48454cc249f2047a763782870ac8d8a158e2"&&
          root.source.observationDate==="2024-11-19/2024-11-20"&&
          root.source.doi==="10.17909/T9G593"&&
          root.projection?.kind==="latitude-profile"&&
          root.projection.latitude==="planetographic"&&root.projection.longitude==="none"&&
          JSON.stringify(root.projection.boundsDeg)==="[-90,90]"&&root.image?.format==="png";
      }});
  }
}
