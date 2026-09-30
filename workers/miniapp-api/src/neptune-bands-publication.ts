import type {NeptuneBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/neptune/manifest.json",import.meta.url);
const RECORD="https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32";
const RIGHTS="https://archive.stsci.edu/hlsp/opal";
const FILE="neptune-opal-2025b-median-bands-8x512.png";
const SHA="447b4fc50a47b025cbaf5c1e4e5a0a8df8b1403c3706ba4b46fd432e7de391e0";

export class NeptuneBandsPublicationService extends FixedBodyTexturePublicationService<NeptuneBandsManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-opal-neptune-bands-v1",
      file:FILE,width:8,height:512,bytes:527,sha256:SHA,
      recordUrl:RECORD,rightsUrl:RIGHTS,route:"/v2/sky/neptune",format:"png",
      validateMetadata(value){
        const root=value as unknown as NeptuneBandsManifestData;
        return root.source?.provider==="MAST / HST OPAL"&&
          root.source.license==="CC BY 4.0"&&
          root.source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"&&
          root.source.sourceFile==="hlsp_opal_hst_wfc3-uvis_neptune-2025b_f467m-f547m-f657n_v1_globalmap.tif"&&
          root.source.sourceSha256==="8c17a2872b5d55577c63abe7ba1369997ff32bb83e0f9b9c350a46db96713cb8"&&
          root.source.observationDate==="2025-08-24"&&
          root.source.doi==="10.17909/T9G593"&&
          root.projection?.kind==="latitude-profile"&&
          root.projection.latitude==="planetographic"&&root.projection.longitude==="none"&&
          JSON.stringify(root.projection.boundsDeg)==="[-90,90]"&&root.image?.format==="png";
      }});
  }
}
