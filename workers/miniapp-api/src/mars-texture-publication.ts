import type {MarsTextureManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/mars/manifest.json",import.meta.url);
const RECORD="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m";
const WMS="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MDIM21_color&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export class MarsTexturePublicationService extends FixedBodyTexturePublicationService<MarsTextureManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-viking-mars-v1",
      file:"mars-mdim21-color-usgs-wms-1024x512.jpg",width:1024,height:512,bytes:94411,
      sha256:"cd324068ee22f66664d15ff5934ff6cfc195bb0e2ee8becba6092f078442d184",
      recordUrl:RECORD,rightsUrl:RECORD,wmsUrl:WMS,route:"/v2/sky/mars"});
  }
}
