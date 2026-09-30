import type {SaturnBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/saturn/manifest.json",import.meta.url);
const RECORD="https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32";
const RIGHTS="https://archive.stsci.edu/hlsp/opal";
const FILE="saturn-opal-2025a-median-bands-8x512.png";
const SHA="68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c";

export class SaturnBandsPublicationService extends FixedBodyTexturePublicationService<SaturnBandsManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-opal-saturn-bands-v1",
      file:FILE,width:8,height:512,bytes:1003,sha256:SHA,
      recordUrl:RECORD,rightsUrl:RIGHTS,route:"/v2/sky/saturn",format:"png",
      validateMetadata(value){
        const root=value as unknown as SaturnBandsManifestData;
        return root.source?.provider==="MAST / HST OPAL"&&
          root.source.license==="CC BY 4.0"&&
          root.source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"&&
          root.source.sourceFile==="hlsp_opal_hst_wfc3-uvis_saturn-2025a_f395n-f502n-f631n_v1_globalmap.tif"&&
          root.source.sourceSha256==="c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7"&&
          root.source.observationDate==="2025-08-29"&&
          root.source.doi==="10.17909/T9G593"&&
          root.projection?.kind==="latitude-profile"&&
          root.projection.latitude==="planetographic"&&root.projection.longitude==="none"&&
          JSON.stringify(root.projection.boundsDeg)==="[-90,90]"&&root.image?.format==="png";
      }});
  }
}
