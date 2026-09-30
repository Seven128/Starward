import type {UranusBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/uranus/manifest.json",import.meta.url);
const RECORD="https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33";
const RIGHTS="https://archive.stsci.edu/hlsp/opal";
const FILE="uranus-opal-2025a-median-bands-8x512.png";
const SHA="308d1521b5f0adebc14249c686664907335cdf8e0334a5a7008392b62b66c817";

export class UranusBandsPublicationService extends FixedBodyTexturePublicationService<UranusBandsManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-opal-uranus-bands-v1",
      file:FILE,width:8,height:512,bytes:421,sha256:SHA,
      recordUrl:RECORD,rightsUrl:RIGHTS,route:"/v2/sky/uranus",format:"png",
      validateMetadata(value){
        const root=value as unknown as UranusBandsManifestData;
        return root.source?.provider==="MAST / HST OPAL"&&
          root.source.license==="CC BY 4.0"&&
          root.source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"&&
          root.source.sourceFile==="hlsp_opal_hst_wfc3-uvis_uranus-2025a_f657n-f547m-f467m_v1_globalmap.tif"&&
          root.source.sourceSha256==="854ba9d0b744c2d6e6b646d315847a3528b94b4f0b8970cc4285d71228e69c7b"&&
          root.source.observationDate==="2025-10-23"&&
          root.source.doi==="10.17909/T9G593"&&
          root.projection?.kind==="latitude-profile"&&
          root.projection.latitude==="planetographic"&&root.projection.longitude==="none"&&
          JSON.stringify(root.projection.boundsDeg)==="[-90,90]"&&root.image?.format==="png";
      }});
  }
}
